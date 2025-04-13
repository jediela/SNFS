from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


def create_portfolio(user_id, portfolio_name):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO Portfolios (user_id, name) VALUES (%s, %s) RETURNING *;",
                (user_id, portfolio_name),
            )
            portfolio = cur.fetchone()
        conn.commit()
        if portfolio:
            return jsonify(
                {"message": "Portfolio created", "portfolio": portfolio}
            ), 201
        else:
            return jsonify({"error": "Portfolio creation failed"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def view_user_portfolios(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM Portfolios WHERE user_id = %s ORDER BY portfolio_id ASC;",
                (user_id,),
            )
            portfolios = cur.fetchall()
        if portfolios:
            return jsonify({"portfolios": portfolios}), 200
        else:
            return jsonify({"message": "No portfolios found", "portfolios": []}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_portfolio_by_id(portfolio_id, user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM Portfolios WHERE portfolio_id = %s AND user_id = %s;",
                (portfolio_id, user_id),
            )
            portfolio = cur.fetchone()
        if portfolio:
            return jsonify({"portfolio": portfolio}), 200
        else:
            return jsonify({"message": "Portfolio not found or access denied"}), 404
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def transfer_funds(from_id, to_id, amount):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if both portfolios exist
            cur.execute(
                "SELECT balance FROM Portfolios WHERE portfolio_id = %s", (from_id,)
            )
            from_portfolio = cur.fetchone()
            if not from_portfolio:
                return jsonify({"error": "Source portfolio not found"}), 404

            cur.execute(
                "SELECT balance FROM Portfolios WHERE portfolio_id = %s", (to_id,)
            )
            to_portfolio = cur.fetchone()
            if not to_portfolio:
                return jsonify({"error": "Target portfolio not found"}), 404

            from_balance = float(from_portfolio["balance"])

            # Check sufficient funds
            if from_balance < amount:
                return jsonify({"error": "Insufficient funds in source portfolio"}), 400

            # Transfer money
            cur.execute(
                "UPDATE Portfolios SET balance = balance - %s WHERE portfolio_id = %s",
                (amount, from_id),
            )
            cur.execute(
                "UPDATE Portfolios SET balance = balance + %s WHERE portfolio_id = %s",
                (amount, to_id),
            )

        conn.commit()
        return jsonify(
            {
                "message": f"Transferred ${amount:.2f} from portfolio {from_id} to portfolio {to_id}"
            }
        ), 200

    except psycopg2.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
