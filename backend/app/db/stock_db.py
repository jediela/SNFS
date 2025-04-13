from flask import jsonify
from psycopg2.extras import RealDictCursor
from .base import get_connection
from datetime import datetime, timedelta
import random

def create_stock_table():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DROP TABLE IF EXISTS StockPrices")

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

        # Indexes for efficient querying
        cursor.execute("""
            CREATE INDEX idx_stockprices_symbol 
            ON StockPrices(symbol)
        """)

        cursor.execute("""
            CREATE INDEX idx_stockprices_timestamp 
            ON StockPrices(timestamp)
        """)

        conn.commit()
        return {
            "success": True,
            "message": "Stock table created with NULL allowed columns",
        }
    except Exception as e:
        conn.rollback()
        return {"success": False, "message": f"Error creating table: {str(e)}"}
    finally:
        cursor.close()
        conn.close()


def load_stock_csv():
    conn = get_connection()
    cursor = conn.cursor()
    try:
        create_stock_table()
        cursor.execute("DELETE FROM StockPrices")
        cursor.execute("""
            COPY StockPrices(timestamp, open, high, low, close, volume, symbol) 
            FROM '/data/SP500History.csv' 
            DELIMITER ',' 
            CSV HEADER
        """)

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
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
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

            # Default return most traded stocks by volume
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

            # Pagination
            query += " LIMIT %s OFFSET %s"
            offset = (page - 1) * per_page
            params.extend([per_page, offset])

            # Execute query
            cur.execute(query, params)
            stocks = cur.fetchall()

            total_items = per_page
            total_pages = 1

            if symbol or start_date or end_date:
                cur.execute(count_query, params[:-2])
                total_items = cur.fetchone()["count"]
                total_pages = (total_items + per_page - 1) // per_page

            return jsonify(
                {
                    "stocks": stocks,
                    "pagination": {
                        "page": page,
                        "per_page": per_page,
                        "total_items": total_items,
                        "total_pages": total_pages,
                    },
                }
            )
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_stock_symbols(search="", limit=100):
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
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT timestamp, close 
                FROM StockPrices 
                WHERE symbol = %s
                ORDER BY timestamp ASC
                """,
                (symbol,),
            )

            historical_data = cur.fetchall()

            if not historical_data:
                return jsonify({"error": f"No historical data found for {symbol}"}), 404

            # Extract close prices for prediction
            prices = [float(item["close"]) for item in historical_data]
            dates = [item["timestamp"] for item in historical_data]

            # A-Priori Optimization algorithm
            if len(prices) < 20:
                return jsonify({"error": "Insufficient data for prediction"}), 400

            # Calculate statistical properties
            mean_price = sum(prices) / len(prices)
            last_price = prices[-1]

            # Calculate historical volatility
            returns = [prices[i] / prices[i - 1] - 1 for i in range(1, len(prices))]
            mean_return = sum(returns) / len(returns)
            volatility = (
                sum((r - mean_return) ** 2 for r in returns) / len(returns)
            ) ** 0.5

            # Mean reversion factor
            gamma = min(0.3, volatility * 2)

            # Calculate trend based on recent data (last 5-10 days)
            lookback = min(10, len(prices) - 1)
            short_term_trend = (prices[-1] - prices[-lookback]) / lookback

            # Calculate long-term trend
            long_term_trend = (prices[-1] - prices[0]) / (len(prices) - 1)

            # Blend short and long term trends based on volatility
            trend_weight = max(0.3, 1.0 - volatility * 3)
            trend = (
                trend_weight * short_term_trend + (1 - trend_weight) * long_term_trend
            )

            # Ensure minimal trend if close to zero (avoid complete flatline)
            if abs(trend) < 0.001 * last_price:
                trend = (0.001 * last_price) * (1 if trend >= 0 else -1)

            # Generate predictions
            last_date = dates[-1]
            predictions = []
            current_price = last_price

            # Use combination of symbol and days to ensure consistent predictions for same parameters
            random.seed(hash(symbol) + days_to_predict)

            for i in range(1, days_to_predict + 1):
                # Apply mean reversion effect
                deviation_from_mean = (current_price - mean_price) / mean_price
                mean_reversion = (
                    gamma * mean_price * deviation_from_mean * abs(deviation_from_mean)
                )

                # Calculate next price with volatility-scaled noise
                noise_scale = volatility * current_price * 0.5
                noise = random.normalvariate(0, noise_scale)

                # Combine factors to predict next price
                next_price = current_price + trend - mean_reversion + noise

                # Ensure price doesn't go negative
                next_price = max(0.01, next_price)

                # Dampen extreme moves based on historical volatility
                max_daily_move = max(0.1, volatility * 2) * current_price
                if next_price > current_price + max_daily_move:
                    next_price = current_price + max_daily_move
                elif next_price < current_price - max_daily_move:
                    next_price = current_price - max_daily_move

                # Update price for next iteration
                current_price = next_price

                # Slightly adjust trend to avoid straight lines
                trend = 0.95 * trend + 0.05 * mean_return * current_price

                # Calculate next date
                next_date = (
                    datetime.strptime(str(last_date), "%Y-%m-%d") + timedelta(days=i)
                ).strftime("%Y-%m-%d")

                predictions.append(
                    {
                        "timestamp": next_date,
                        "predicted_close": round(next_price, 2),
                        "symbol": symbol,
                    }
                )

            return jsonify(
                {
                    "symbol": symbol,
                    "predictions": predictions,
                    "method": "A-Priori Optimization with Mean Reversion and Volatility Scaling",
                }
            )

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def add_custom_stock_data(
    symbol, timestamp, open_price, high, low, close, volume
):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if this entry already exists
            cur.execute(
                "SELECT * FROM StockPrices WHERE symbol = %s AND timestamp = %s",
                (symbol, timestamp),
            )
            existing_entry = cur.fetchone()

            if existing_entry:
                cur.execute(
                    """
                    UPDATE StockPrices 
                    SET open = %s, high = %s, low = %s, close = %s, volume = %s
                    WHERE symbol = %s AND timestamp = %s
                    RETURNING *
                    """,
                    (open_price, high, low, close, volume, symbol, timestamp),
                )
                updated_entry = cur.fetchone()
                conn.commit()

                return jsonify(
                    {
                        "message": "Stock data updated successfully",
                        "data": updated_entry,
                    }
                ), 200
            else:
                cur.execute(
                    """
                    INSERT INTO StockPrices (symbol, timestamp, open, high, low, close, volume)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    RETURNING *
                    """,
                    (symbol, timestamp, open_price, high, low, close, volume),
                )
                new_entry = cur.fetchone()
                conn.commit()

                return jsonify(
                    {"message": "Stock data added successfully", "data": new_entry}
                ), 201

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
