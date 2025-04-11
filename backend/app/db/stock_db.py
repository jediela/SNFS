from flask import jsonify
from psycopg2.extras import RealDictCursor
from .base import get_connection
from datetime import datetime, timedelta

def create_stock_table():
    """Create the StockPrices table if it doesn't exist"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Drop the existing table if it exists since we need to change column constraints
        cursor.execute("DROP TABLE IF EXISTS StockPrices")
        
        # Create the table with NULL allowed for some columns
        cursor.execute("""
            CREATE TABLE StockPrices(
                timestamp DATE, 
                open REAL NULL,
                high REAL NULL, 
                low REAL NULL, 
                close REAL, 
                volume INT, 
                symbol VARCHAR(5),
                PRIMARY KEY(symbol, timestamp)
            )
        """)
        
        # Create indexes for efficient querying
        cursor.execute("""
            CREATE INDEX idx_stockprices_symbol 
            ON StockPrices(symbol)
        """)
        
        cursor.execute("""
            CREATE INDEX idx_stockprices_timestamp 
            ON StockPrices(timestamp)
        """)
        
        conn.commit()
        return {"success": True, "message": "Stock table created with NULL allowed columns"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error creating table: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

def load_stock_csv():
    """Load the SP500History.csv file into StockPrices table"""
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # First create table if it doesn't exist
        create_stock_table()
        
        # Clear existing data
        cursor.execute("DELETE FROM StockPrices")
        
        # Load the CSV file
        cursor.execute("""
            COPY StockPrices(timestamp, open, high, low, close, volume, symbol) 
            FROM '/data/SP500History.csv' 
            DELIMITER ',' 
            CSV HEADER
        """)
        
        # Get count of loaded records
        cursor.execute("SELECT COUNT(*) FROM StockPrices")
        count = cursor.fetchone()[0]
        
        conn.commit()
        return {"success": True, "message": f"Successfully loaded {count} records"}
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error loading CSV: {str(e)}"}
    finally:
        cursor.close()
        conn.close()

def check_stock_data_exists():
    """Check if any stock data already exists in the table"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("SELECT EXISTS(SELECT 1 FROM StockPrices LIMIT 1)")
            return cur.fetchone()[0]
    except Exception as e:
        print(f"Error checking if stock data exists: {str(e)}")
        return False
    finally:
        conn.close()

def get_stock_data(symbol="", start_date="", end_date="", page=1, per_page=20):
    """Get paginated stock data with optional filtering"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Build the query with filters
            query = "SELECT * FROM StockPrices WHERE 1=1"
            count_query = "SELECT COUNT(*) FROM StockPrices WHERE 1=1"
            params = []
            
            if symbol:
                query += " AND symbol = %s"
                count_query += " AND symbol = %s"
                params.append(symbol)
                
            if start_date:
                query += " AND timestamp >= %s"
                count_query += " AND timestamp >= %s"
                params.append(start_date)
                
            if end_date:
                query += " AND timestamp <= %s"
                count_query += " AND timestamp <= %s"
                params.append(end_date)
                
            # If no filters, return the most traded stocks by volume as default
            if not (symbol or start_date or end_date):
                query = """
                    SELECT * FROM (
                        SELECT DISTINCT ON (symbol) *
                        FROM StockPrices
                        ORDER BY symbol, timestamp DESC
                    ) AS latest_prices
                    ORDER BY volume DESC
                """
            else:
                # Order by timestamp (ascending) for charts
                query += " ORDER BY timestamp ASC, symbol ASC"
            
            # Add pagination
            query += " LIMIT %s OFFSET %s"
            offset = (page - 1) * per_page
            params.extend([per_page, offset])
            
            # Execute query
            cur.execute(query, params)
            stocks = cur.fetchall()
            
            # Get total count for pagination if filters are applied
            total_items = per_page
            total_pages = 1
            
            if symbol or start_date or end_date:
                cur.execute(count_query, params[:-2])
                total_items = cur.fetchone()["count"]
                total_pages = (total_items + per_page - 1) // per_page
                
            return jsonify({
                "stocks": stocks,
                "pagination": {
                    "page": page,
                    "per_page": per_page,
                    "total_items": total_items,
                    "total_pages": total_pages
                }
            })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

def get_stock_symbols(search="", limit=100):
    """Get list of available stock symbols with optional search"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            query = """
                SELECT DISTINCT symbol
                FROM StockPrices
            """
            params = []
            
            if search:
                query += " WHERE symbol ILIKE %s"
                params.append(f"%{search}%")
                
            query += " ORDER BY symbol LIMIT %s"
            params.append(limit)
            
            cur.execute(query, params)
            symbols = [row["symbol"] for row in cur.fetchall()]
            
            return jsonify({"symbols": symbols})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

def predict_stock_prices(symbol, days_to_predict=30):
    """Predict future stock prices using A-Priori Optimization"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get historical data for the specified symbol
            # Order by date ascending to get proper time series
            cur.execute(
                """
                SELECT timestamp, close 
                FROM StockPrices 
                WHERE symbol = %s
                ORDER BY timestamp ASC
                """, 
                (symbol,)
            )
            
            historical_data = cur.fetchall()
            
            if not historical_data:
                return jsonify({"error": f"No historical data found for {symbol}"}), 404
            
            # Extract close prices for prediction
            prices = [float(item['close']) for item in historical_data]
            dates = [item['timestamp'] for item in historical_data]
            
            # Enhanced A-Priori Optimization algorithm
            if len(prices) < 20:
                return jsonify({"error": "Insufficient data for prediction"}), 400
                
            # Calculate statistical properties for more realistic predictions
            mean_price = sum(prices) / len(prices)
            last_price = prices[-1]
            
            # Calculate historical volatility (standard deviation of returns)
            returns = [prices[i]/prices[i-1] - 1 for i in range(1, len(prices))]
            mean_return = sum(returns) / len(returns)
            volatility = (sum((r - mean_return) ** 2 for r in returns) / len(returns)) ** 0.5
            
            # Calculate recent price momentum (last 20 days)
            recent_prices = prices[-20:]
            recent_momentum = sum(recent_prices[i] - recent_prices[i-1] for i in range(1, len(recent_prices))) / (len(recent_prices) - 1)
            
            # Initialize with more sophisticated approach
            # Parameters for A-Priori Optimization with mean reversion
            alpha = 0.6  # Smoothing factor
            beta = 0.2   # Trend factor
            gamma = 0.3  # Mean reversion factor
            
            # Import random for adding noise
            import random
            random.seed(42)  # For reproducible results
            
            # Get last observed values
            last_level = last_price
            
            # Calculate trend based on recent data (last 5-10 days)
            lookback = min(10, len(prices) - 1)
            short_term_trend = (prices[-1] - prices[-lookback]) / lookback
            
            # Calculate long-term trend for stability
            long_term_trend = (prices[-1] - prices[0]) / (len(prices) - 1) 
            
            # Blend short and long term trends
            trend = 0.7 * short_term_trend + 0.3 * long_term_trend
            
            # Ensure minimal trend if close to zero (avoid complete flatline)
            if abs(trend) < 0.001 * last_price:
                trend = (0.001 * last_price) * (1 if trend >= 0 else -1)
            
            # Generate predictions
            last_date = dates[-1]
            predictions = []
            current_price = last_price
            
            for i in range(1, days_to_predict + 1):
                # Apply mean reversion effect (stronger for more extreme prices)
                mean_reversion = gamma * (mean_price - current_price) * (abs(current_price - mean_price) / mean_price)
                
                # Calculate next price with noise proportional to volatility
                noise = random.normalvariate(0, volatility * current_price * 0.5)
                next_price = current_price + trend + mean_reversion + noise
                
                # Ensure price doesn't go negative
                next_price = max(0.01, next_price)
                
                # Dampen extreme moves
                if next_price > current_price * 1.1:  # Limit daily gain to 10%
                    next_price = current_price * 1.1
                elif next_price < current_price * 0.9:  # Limit daily loss to 10%
                    next_price = current_price * 0.9
                
                # Update price for next iteration
                current_price = next_price
                
                # Slightly adjust trend with each step to avoid straight lines
                trend = 0.95 * trend + 0.05 * mean_return * current_price
                
                # Calculate the next date
                next_date = (datetime.strptime(str(last_date), '%Y-%m-%d') + 
                             timedelta(days=i)).strftime('%Y-%m-%d')
                
                predictions.append({
                    "timestamp": next_date,
                    "predicted_close": round(next_price, 2),
                    "symbol": symbol
                })
            
            return jsonify({
                "symbol": symbol,
                "predictions": predictions,
                "method": "A-Priori Optimization with Mean Reversion"
            })
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
