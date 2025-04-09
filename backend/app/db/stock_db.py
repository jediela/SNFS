from flask import jsonify
from psycopg2.extras import RealDictCursor
from .base import get_connection

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
                query += " AND symbol ILIKE %s"
                count_query += " AND symbol ILIKE %s"
                params.append(f"%{symbol}%")
                
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
                # Order by timestamp (most recent first) and symbol
                query += " ORDER BY timestamp DESC, symbol ASC"
            
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
