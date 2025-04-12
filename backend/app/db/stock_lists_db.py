from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection
from datetime import datetime


def get_user_id_by_username(username):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT user_id FROM Users WHERE username = %s", (username,))
            result = cur.fetchone()
            return result["user_id"] if result else None
    except psycopg2.Error as e:
        raise e
    finally:
        conn.close()


def create_stock_list(user_id, name, visibility):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO StockLists (user_id, name, visibility) VALUES (%s, %s, %s) RETURNING *;",
                (user_id, name, visibility),
            )
            stock_list = cur.fetchone()
        conn.commit()
        if stock_list:
            return jsonify(
                {"message": "Stock list created", "stockList": stock_list}
            ), 201
        else:
            return jsonify({"error": "Stock list creation failed"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def add_item_to_stock_list(list_id, symbol, num_shares):
    conn = get_connection()
    try:
        # First check if the stock exists in the Stocks table
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM Stocks WHERE symbol = %s;", (symbol,))
            stock = cur.fetchone()

            # If stock doesn't exist, add it with a generic company name
            if not stock:
                cur.execute(
                    "INSERT INTO Stocks (symbol, company_name) VALUES (%s, %s);",
                    (symbol, f"Company {symbol}"),
                )

            # Add the stock to the list
            cur.execute(
                "INSERT INTO StockListItems (list_id, symbol, num_shares) VALUES (%s, %s, %s) RETURNING *;",
                (list_id, symbol, num_shares),
            )
            item = cur.fetchone()
        conn.commit()
        if item:
            return jsonify({"message": "Stock added to list", "item": item}), 201
        else:
            return jsonify({"error": "Failed to add stock to list"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_accessible_stock_lists(user_id=None, search_term=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Base query with parameters
            params = []

            if user_id:
                # Get all lists accessible to the user:
                # 1. Lists created by the user (private, shared or public)
                # 2. Lists shared specifically with this user
                # 3. Public lists created by any user
                query = """
                    SELECT sl.*, u.username as creator_name, 
                           CASE 
                               WHEN sl.user_id = %s THEN 'owned' 
                               WHEN EXISTS (SELECT 1 FROM SharedLists WHERE list_id = sl.list_id AND shared_user = %s) THEN 'shared'
                               ELSE 'public' 
                           END as access_type
                    FROM StockLists sl
                    JOIN Users u ON sl.user_id = u.user_id
                    WHERE (sl.user_id = %s
                       OR EXISTS (SELECT 1 FROM SharedLists WHERE list_id = sl.list_id AND shared_user = %s)
                       OR (sl.visibility = 'public'))
                """
                params.extend([user_id, user_id, user_id, user_id])
            else:
                # If no user_id is provided, return only public lists
                query = """
                    SELECT sl.*, u.username as creator_name, 'public' as access_type
                    FROM StockLists sl
                    JOIN Users u ON sl.user_id = u.user_id
                    WHERE sl.visibility = 'public'
                """

            # Add search condition if provided
            if search_term:
                query += " AND sl.name ILIKE %s"
                params.append(f"%{search_term}%")

            query += " ORDER BY sl.list_id DESC;"

            # Execute the query with parameters
            cur.execute(query, params)
            lists = cur.fetchall()

            # For each list, get its items
            for stock_list in lists:
                cur.execute(
                    """
                    SELECT sli.*, s.company_name
                    FROM StockListItems sli
                    JOIN Stocks s ON sli.symbol = s.symbol
                    WHERE sli.list_id = %s;
                    """,
                    (stock_list["list_id"],),
                )
                items = cur.fetchall()
                stock_list["items"] = items

            return jsonify({"stockLists": lists}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def verify_user_owns_list(user_id, list_id):
    """Verify that a user owns a specific stock list"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM StockLists WHERE list_id = %s AND user_id = %s)",
                (list_id, user_id),
            )
            exists = cur.fetchone()[0]
            return exists
    except psycopg2.Error:
        return False
    finally:
        conn.close()


def delete_stock_list(list_id, user_id):
    """Delete a stock list if it belongs to the user"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # First check if the list belongs to the user
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM StockLists WHERE list_id = %s AND user_id = %s)",
                (list_id, user_id),
            )
            exists = cur.fetchone()[0]

            if not exists:
                return jsonify(
                    {
                        "error": "You don't have permission to delete this list or it doesn't exist"
                    }
                ), 403

            # First explicitly delete all stock items in this list
            cur.execute(
                "DELETE FROM StockListItems WHERE list_id = %s",
                (list_id,)
            )
            items_deleted = cur.rowcount
            
            # Then delete the list itself
            cur.execute(
                "DELETE FROM StockLists WHERE list_id = %s AND user_id = %s",
                (list_id, user_id),
            )
            
            conn.commit()

            return jsonify(
                {
                    "message": f"Stock list {list_id} deleted successfully", 
                    "items_removed": items_deleted
                }
            ), 200
    except psycopg2.Error as e:
        conn.rollback()  # Add rollback to ensure atomicity
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_stock_list_by_id(list_id, user_id=None):
    """Get a single stock list by ID if the user has access to it"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # First check if the list exists
            cur.execute(
                """
                SELECT sl.*, u.username as creator_name
                FROM StockLists sl
                JOIN Users u ON sl.user_id = u.user_id
                WHERE sl.list_id = %s
                """,
                (list_id,),
            )
            stock_list = cur.fetchone()

            if not stock_list:
                return jsonify({"error": "Stock list not found"}), 404

            # Check if the user has access
            has_access = False

            # Lists are accessible if they're public
            if stock_list["visibility"] == "public":
                has_access = True
            # If user_id is provided, check for ownership or shared access
            elif user_id:
                # User owns the list
                if stock_list["user_id"] == user_id:
                    has_access = True
                # List is shared with the user
                elif stock_list["visibility"] == "shared":
                    cur.execute(
                        "SELECT EXISTS(SELECT 1 FROM SharedLists WHERE list_id = %s AND shared_user = %s)",
                        (list_id, user_id),
                    )
                    if cur.fetchone()[0]:
                        has_access = True

            if not has_access:
                return jsonify({"error": "You don't have access to this stock list"}), 403

            # Get list items
            cur.execute(
                """
                SELECT sli.*, s.company_name
                FROM StockListItems sli
                JOIN Stocks s ON sli.symbol = s.symbol
                WHERE sli.list_id = %s;
                """,
                (list_id,),
            )
            items = cur.fetchall()
            stock_list["items"] = items

            return jsonify({"stockList": stock_list}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def update_stock_list(list_id, user_id, name, visibility):
    """Update a stock list's name and visibility"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE StockLists
                SET name = %s, visibility = %s
                WHERE list_id = %s AND user_id = %s
                RETURNING *;
                """,
                (name, visibility, list_id, user_id),
            )
            updated_list = cur.fetchone()
            
            if not updated_list:
                return jsonify({"error": "Failed to update stock list or not found"}), 404
                
            conn.commit()
            return jsonify({"message": "Stock list updated successfully", "stockList": updated_list}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def remove_item_from_stock_list(list_id, symbol):
    """Remove an item from a stock list"""
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM StockListItems WHERE list_id = %s AND symbol = %s",
                (list_id, symbol),
            )
            if cur.rowcount == 0:
                return jsonify({"error": f"Item with symbol {symbol} not found in list"}), 404
                
            conn.commit()
            return jsonify({"message": f"Removed {symbol} from stock list"}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_user_stock_lists(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM StockLists WHERE user_id = %s ORDER BY list_id DESC;",
                (user_id,),
            )
            lists = cur.fetchall()
        if lists:
            return jsonify({"stockLists": lists}), 200
        else:
            return jsonify({"message": "No stock lists found", "stockLists": []}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
        

def share_stock_list(owner_id, list_id, receiver_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if the stock list exists and is owned by the owner_id
            cur.execute("""
                SELECT 1 FROM StockLists 
                WHERE list_id = %s AND user_id = %s
            """, (list_id, owner_id))
            if not cur.fetchone():
                return jsonify({
                    "error": "You don't have permission to share this list or it doesn't exist"
                }), 403

            # Prevent sharing to self
            if owner_id == receiver_id:
                return jsonify({"error": "You cannot share with yourself"}), 400

            # Check if they are friends
            user1, user2 = sorted([owner_id, receiver_id])
            cur.execute("""
                SELECT 1 FROM Friends 
                WHERE user1_id = %s AND user2_id = %s
            """, (user1, user2))
            if not cur.fetchone():
                return jsonify({"error": "You can only share with friends"}), 403

            # Insert into SharedLists if not already there
            cur.execute("""
                INSERT INTO SharedLists (list_id, shared_user)
                VALUES (%s, %s)
                ON CONFLICT DO NOTHING;
            """, (list_id, receiver_id))

            conn.commit()
            return jsonify({
                "message": f"Stock list {list_id} shared"
            }), 200

    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_stocklist_statistics(list_id, user_id, start_date=None, end_date=None):
    """Calculate statistics for a stock list: beta, CoV, correlation matrix"""
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # 1. Validate access: list must be owned, shared, or public
            cur.execute("""
                SELECT 1
                FROM StockLists sl
                LEFT JOIN SharedLists sh ON sl.list_id = sh.list_id AND sh.shared_user = %s
                WHERE sl.list_id = %s AND (
                    sl.user_id = %s OR sl.visibility = 'public' OR sh.shared_user = %s
                )
            """, (user_id, list_id, user_id, user_id))
            
            if not cur.fetchone():
                return jsonify({"error": "Stock list not found or access denied"}), 403

            # 2. Fetch stock list items
            cur.execute("""
                SELECT symbol, num_shares
                FROM StockListItems
                WHERE list_id = %s
            """, (list_id,))
            holdings = cur.fetchall()

            if not holdings:
                return jsonify({"error": "No stocks found in this list"}), 404

            symbols = [h['symbol'] for h in holdings]

            # 3. Determine date range
            if not end_date:
                end_date = datetime.now().strftime('%Y-%m-%d')
            if not start_date:
                cur.execute("""
                    SELECT MIN(timestamp) FROM StockPrices
                    WHERE symbol IN %s
                """, (tuple(symbols),))
                min_date = cur.fetchone()['min']
                if not min_date:
                    return jsonify({"error": "No historical data available for selected stocks"}), 404
                start_date = min_date.strftime('%Y-%m-%d')

            symbols_str = "','".join(symbols)

            # 4. Daily return stats
            cur.execute(f"""
                WITH daily_prices AS (
                    SELECT 
                        symbol,
                        timestamp,
                        close,
                        LAG(close) OVER (PARTITION BY symbol ORDER BY timestamp) AS prev_close
                    FROM StockPrices
                    WHERE symbol IN ('{symbols_str}')
                    AND timestamp BETWEEN %s AND %s
                ),
                daily_returns AS (
                    SELECT
                        symbol,
                        timestamp,
                        ((close - prev_close) / prev_close) AS daily_return
                    FROM daily_prices
                    WHERE prev_close IS NOT NULL
                ),
                stock_stats AS (
                    SELECT
                        symbol,
                        AVG(daily_return) AS mean_return,
                        STDDEV(daily_return) AS stddev_return,
                        COUNT(*) AS days
                    FROM daily_returns
                    GROUP BY symbol
                )
                SELECT
                    symbol,
                    mean_return,
                    stddev_return,
                    CASE 
                        WHEN mean_return = 0 THEN NULL
                        ELSE stddev_return / ABS(mean_return)
                    END AS coefficient_of_variation,
                    days
                FROM stock_stats
            """, (start_date, end_date))

            stock_stats = cur.fetchall()

            # 5. Market returns for beta (NVDA proxy)
            market_symbol = 'NVDA'
            cur.execute("""
                WITH prices AS (
                    SELECT timestamp, close,
                    LAG(close) OVER (ORDER BY timestamp) AS prev_close
                    FROM StockPrices
                    WHERE symbol = %s AND timestamp BETWEEN %s AND %s
                )
                SELECT timestamp, ((close - prev_close) / prev_close) AS market_return
                FROM prices
                WHERE prev_close IS NOT NULL
            """, (market_symbol, start_date, end_date))
            market_returns = {r['timestamp']: r['market_return'] for r in cur.fetchall()}

            # 6. Beta for each stock
            betas = {}
            for symbol in symbols:
                cur.execute("""
                    WITH prices AS (
                        SELECT timestamp, close,
                        LAG(close) OVER (ORDER BY timestamp) AS prev_close
                        FROM StockPrices
                        WHERE symbol = %s AND timestamp BETWEEN %s AND %s
                    )
                    SELECT timestamp, ((close - prev_close) / prev_close) AS stock_return
                    FROM prices
                    WHERE prev_close IS NOT NULL
                """, (symbol, start_date, end_date))
                rows = cur.fetchall()
                pairs = [(r['stock_return'], market_returns[r['timestamp']])
                         for r in rows if r['timestamp'] in market_returns]

                if pairs:
                    stock_mean = sum(x[0] for x in pairs) / len(pairs)
                    market_mean = sum(x[1] for x in pairs) / len(pairs)
                    cov = sum((x[0] - stock_mean) * (x[1] - market_mean) for x in pairs) / len(pairs)
                    var = sum((x[1] - market_mean) ** 2 for x in pairs) / len(pairs)
                    betas[symbol] = round(cov / var if var else 0, 4)
                else:
                    betas[symbol] = 0

            # 7. Correlation matrix
            correlation_matrix = []
            for symbol1 in symbols:
                correlations = {}
                for symbol2 in symbols:
                    if symbol1 == symbol2:
                        correlations[symbol2] = 1.0
                        continue
                    cur.execute("""
                        WITH s1 AS (
                            SELECT timestamp, close, 
                            LAG(close) OVER (ORDER BY timestamp) AS prev_close
                            FROM StockPrices WHERE symbol = %s AND timestamp BETWEEN %s AND %s
                        ),
                        r1 AS (
                            SELECT timestamp, ((close - prev_close) / prev_close) AS r
                            FROM s1 WHERE prev_close IS NOT NULL
                        ),
                        s2 AS (
                            SELECT timestamp, close, 
                            LAG(close) OVER (ORDER BY timestamp) AS prev_close
                            FROM StockPrices WHERE symbol = %s AND timestamp BETWEEN %s AND %s
                        ),
                        r2 AS (
                            SELECT timestamp, ((close - prev_close) / prev_close) AS r
                            FROM s2 WHERE prev_close IS NOT NULL
                        ),
                        joined AS (
                            SELECT r1.r AS r1, r2.r AS r2
                            FROM r1 JOIN r2 ON r1.timestamp = r2.timestamp
                        )
                        SELECT CORR(r1, r2) AS correlation FROM joined
                    """, (symbol1, start_date, end_date, symbol2, start_date, end_date))
                    result = cur.fetchone()
                    correlation = result['correlation'] if result and result['correlation'] is not None else 0
                    correlations[symbol2] = round(correlation, 4)
                correlation_matrix.append({'symbol': symbol1, 'correlations': correlations})

            # 8. Add beta to stats and compute list beta
            total_shares = sum(h['num_shares'] for h in holdings)
            enriched_stats = []
            for stat in stock_stats:
                sym = stat['symbol']
                enriched_stats.append({**stat, 'beta': betas.get(sym, 0)})

            list_beta = round(sum(
                h['num_shares'] / total_shares * betas.get(h['symbol'], 0)
                for h in holdings
            ), 4) if total_shares > 0 else 0

            return jsonify({
                "list_id": list_id,
                "date_range": {"start_date": start_date, "end_date": end_date},
                "stock_statistics": enriched_stats,
                "list_beta": list_beta,
                "correlation_matrix": correlation_matrix
            }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
