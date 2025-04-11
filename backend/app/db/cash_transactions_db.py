from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection

def handle_cash_transaction(portfolio_id, transaction_type, amount):
    """
    Handle both deposits and withdrawals with validation
    """
    conn = get_connection()
    try:
        # Validate transaction type first
        if transaction_type not in ['deposit', 'withdrawal']:
            return jsonify({"error": "Invalid transaction type"}), 400

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Atomic operation: Update balance + record transaction
            cur.execute("""
                WITH balance_update AS (
                    UPDATE Portfolios
                    SET balance = balance + %s * CASE %s WHEN 'deposit' THEN 1 ELSE -1 END
                    WHERE portfolio_id = %s
                    AND (
                        %s = 'deposit' 
                        OR 
                        (balance >= %s AND %s = 'withdrawal')
                    )
                    RETURNING balance
                )
                INSERT INTO CashTransactions (portfolio_id, type, amount)
                SELECT %s, %s, %s
                WHERE EXISTS (SELECT 1 FROM balance_update)
                RETURNING *;
            """, (
                amount, transaction_type, portfolio_id,
                transaction_type, amount, transaction_type,
                portfolio_id, transaction_type, amount
            ))

            transaction = cur.fetchone()
            conn.commit()

            if transaction:
                return jsonify({
                    "message": f"{transaction_type.capitalize()} successful",
                    "transaction": transaction,
                    "new_balance": transaction['balance']
                }), 201
                
            # If no rows affected
            error_msg = "Withdrawal failed: Insufficient funds" if transaction_type == 'withdrawal' \
                      else "Deposit failed: Invalid portfolio"
            return jsonify({"error": error_msg}), 400

    except psycopg2.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_cash_transactions(portfolio_id, user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Verify portfolio ownership
            cur.execute("""
                SELECT 1 FROM Portfolios
                WHERE portfolio_id = %s
                AND user_id = %s
            """, (portfolio_id, user_id))
            
            if not cur.fetchone():
                return jsonify({"error": "Unauthorized access"}), 403

            # Fetch transactions
            cur.execute("""
                SELECT transaction_id, type, amount, timestamp 
                FROM CashTransactions
                WHERE portfolio_id = %s
                ORDER BY timestamp DESC
            """, (portfolio_id,))
            
            transactions = cur.fetchall()
            return jsonify({"transactions": transactions}), 200
            
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()