from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection
from datetime import datetime

def handle_stock_transaction(portfolio_id, symbol, transaction_type, num_shares, price_per_share, user_id):
    """Handle stock purchases and sales with validation and updates to balance and holdings"""
    conn = get_connection()
    try:
        # Validate transaction type
        if transaction_type not in ['buy', 'sell']:
            return jsonify({"error": "Invalid transaction type"}), 400
            
        # Validate number of shares
        if num_shares <= 0:
            return jsonify({"error": "Number of shares must be positive"}), 400
            
        # Validate price
        if price_per_share <= 0:
            return jsonify({"error": "Price per share must be positive"}), 400
            
        # Get current date for recording price data
        current_date = datetime.now().strftime('%Y-%m-%d')
        
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # First verify user owns the portfolio
            cur.execute(
                "SELECT user_id FROM Portfolios WHERE portfolio_id = %s",
                (portfolio_id,)
            )
            portfolio = cur.fetchone()
            
            if not portfolio:
                return jsonify({"error": "Portfolio not found"}), 404
                
            if portfolio['user_id'] != user_id:
                return jsonify({"error": "You don't have permission to modify this portfolio"}), 403
            
            # Check if the stock exists in the system
            cur.execute("SELECT * FROM Stocks WHERE symbol = %s", (symbol,))
            stock = cur.fetchone()
            
            if not stock:
                # Stock doesn't exist, so add it
                cur.execute(
                    "INSERT INTO Stocks (symbol, company_name) VALUES (%s, %s)",
                    (symbol, f"Company {symbol}")
                )
            
            # Get most recent stock price for validation
            cur.execute(
                "SELECT * FROM StockPrices WHERE symbol = %s ORDER BY timestamp DESC LIMIT 1",
                (symbol,)
            )
            latest_price = cur.fetchone()
            
            # For selling, check if user owns enough shares
            if transaction_type == 'sell':
                cur.execute(
                    "SELECT num_shares FROM StockHoldings WHERE portfolio_id = %s AND symbol = %s",
                    (portfolio_id, symbol)
                )
                holdings = cur.fetchone()
                
                if not holdings or holdings['num_shares'] < num_shares:
                    return jsonify({"error": f"Not enough shares of {symbol} to sell"}), 400
            
            # For buying, check if user has enough funds
            total_amount = num_shares * price_per_share
            if transaction_type == 'buy':
                cur.execute(
                    "SELECT balance FROM Portfolios WHERE portfolio_id = %s",
                    (portfolio_id,)
                )
                balance_info = cur.fetchone()
                
                if balance_info['balance'] < total_amount:
                    return jsonify({"error": "Insufficient funds for purchase"}), 400
            
            # Start transaction - all or nothing
            # 1. Update portfolio balance
            balance_change = -total_amount if transaction_type == 'buy' else total_amount
            cur.execute(
                "UPDATE Portfolios SET balance = balance + %s WHERE portfolio_id = %s",
                (balance_change, portfolio_id)
            )
            
            # 2. Update or insert stock holding
            if transaction_type == 'buy':
                cur.execute("""
                    INSERT INTO StockHoldings (portfolio_id, symbol, num_shares) 
                    VALUES (%s, %s, %s)
                    ON CONFLICT (portfolio_id, symbol) 
                    DO UPDATE SET num_shares = StockHoldings.num_shares + %s
                """, (portfolio_id, symbol, num_shares, num_shares))
            else:  # sell
                cur.execute("""
                    UPDATE StockHoldings 
                    SET num_shares = num_shares - %s 
                    WHERE portfolio_id = %s AND symbol = %s
                """, (num_shares, portfolio_id, symbol))
                
                # Remove holding if shares become zero
                cur.execute("""
                    DELETE FROM StockHoldings 
                    WHERE portfolio_id = %s AND symbol = %s AND num_shares <= 0
                """, (portfolio_id, symbol))
            
            # 3. Record the stock transaction
            cur.execute("""
                INSERT INTO StockTransactions 
                (portfolio_id, symbol, type, num_shares, price) 
                VALUES (%s, %s, %s, %s, %s)
                RETURNING *
            """, (portfolio_id, symbol, transaction_type, num_shares, price_per_share))
            
            transaction = cur.fetchone()
            
            # 4. Record the price data if it's for today and doesn't exist yet
            # Check if we already have price data for this stock on this date
            cur.execute(
                "SELECT * FROM StockPrices WHERE symbol = %s AND timestamp = %s",
                (symbol, current_date)
            )
            existing_price_data = cur.fetchone()
            
            if not existing_price_data and current_date >= '2018-02-08':
                # Record this transaction's price as today's price
                # We'll use the same price for open, high, low, close as a simplification
                cur.execute("""
                    INSERT INTO StockPrices (symbol, timestamp, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                """, (
                    symbol, current_date, price_per_share, price_per_share, 
                    price_per_share, price_per_share, num_shares
                ))
                
            # Commit the transaction
            conn.commit()
            
            # Get updated balance and holdings for response
            cur.execute("SELECT balance FROM Portfolios WHERE portfolio_id = %s", (portfolio_id,))
            updated_balance = cur.fetchone()['balance']
            
            cur.execute(
                "SELECT num_shares FROM StockHoldings WHERE portfolio_id = %s AND symbol = %s",
                (portfolio_id, symbol)
            )
            holding_result = cur.fetchone()
            updated_shares = holding_result['num_shares'] if holding_result else 0
            
            return jsonify({
                "message": f"Stock {transaction_type} successful",
                "transaction": transaction,
                "updated_balance": updated_balance,
                "updated_shares": updated_shares,
                "symbol": symbol
            }), 201
            
    except psycopg2.Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

def get_portfolio_stock_transactions(portfolio_id, user_id):
    """Get all stock transactions for a portfolio"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Verify user owns the portfolio
            cur.execute(
                "SELECT 1 FROM Portfolios WHERE portfolio_id = %s AND user_id = %s",
                (portfolio_id, user_id)
            )
            
            if not cur.fetchone():
                return jsonify({"error": "Portfolio not found or access denied"}), 403
                
            # Get all transactions for the portfolio
            cur.execute("""
                SELECT st.*, s.company_name 
                FROM StockTransactions st
                JOIN Stocks s ON st.symbol = s.symbol
                WHERE st.portfolio_id = %s
                ORDER BY st.timestamp DESC
            """, (portfolio_id,))
            
            transactions = cur.fetchall()
            
            return jsonify({"transactions": transactions}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

def get_stock_holdings(portfolio_id, user_id):
    """Get current stock holdings for a portfolio"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Verify user owns the portfolio
            cur.execute(
                "SELECT 1 FROM Portfolios WHERE portfolio_id = %s AND user_id = %s",
                (portfolio_id, user_id)
            )
            
            if not cur.fetchone():
                return jsonify({"error": "Portfolio not found or access denied"}), 403
                
            # Get all holdings for the portfolio with latest prices
            cur.execute("""
                SELECT sh.symbol, sh.num_shares, s.company_name,
                    (SELECT close FROM StockPrices sp 
                     WHERE sp.symbol = sh.symbol 
                     ORDER BY timestamp DESC LIMIT 1) as current_price
                FROM StockHoldings sh
                JOIN Stocks s ON sh.symbol = s.symbol
                WHERE sh.portfolio_id = %s
                ORDER BY s.company_name
            """, (portfolio_id,))
            
            holdings = cur.fetchall()
            
            # Calculate total value for each holding
            for holding in holdings:
                if holding['current_price'] is not None:
                    holding['total_value'] = holding['num_shares'] * holding['current_price']
                else:
                    holding['total_value'] = None
            
            return jsonify({"holdings": holdings}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
