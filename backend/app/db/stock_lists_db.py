from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


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
            return jsonify({"message": "Stock list created", "stockList": stock_list}), 201
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
                params.append(f'%{search_term}%')
                
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
                (list_id, user_id)
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
                (list_id, user_id)
            )
            exists = cur.fetchone()[0]
            
            if not exists:
                return jsonify({"error": "You don't have permission to delete this list or it doesn't exist"}), 403
                
            # Delete the list (cascade delete will handle related items due to DB constraints)
            cur.execute("DELETE FROM StockLists WHERE list_id = %s AND user_id = %s", (list_id, user_id))
            conn.commit()
            
            return jsonify({"message": f"Stock list {list_id} deleted successfully"}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
