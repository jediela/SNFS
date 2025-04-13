from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection
from .stock_lists_db import verify_user_owns_list


def can_access_list(user_id, list_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            # Check if list is public
            cur.execute(
                "SELECT visibility FROM StockLists WHERE list_id = %s", (list_id,)
            )
            list_info = cur.fetchone()

            if not list_info:
                return False

            visibility = list_info[0]

            # If public anyone can access
            if visibility == "public":
                return True

            # Check if user owns list
            cur.execute(
                "SELECT EXISTS(SELECT 1 FROM StockLists WHERE list_id = %s AND user_id = %s)",
                (list_id, user_id),
            )
            if cur.fetchone()[0]:
                return True

            # If shared check if shared with user
            if visibility == "shared":
                cur.execute(
                    "SELECT EXISTS(SELECT 1 FROM SharedLists WHERE list_id = %s AND shared_user = %s)",
                    (list_id, user_id),
                )
                return cur.fetchone()[0]

            return False
    except psycopg2.Error:
        return False
    finally:
        conn.close()


def add_review(user_id, list_id, content):
    conn = get_connection()
    try:
        # Check if list is accessible to user
        if not can_access_list(user_id, list_id):
            return jsonify(
                {"error": "You don't have permission to review this list"}
            ), 403

        with conn.cursor() as check_cur:
            # Check if user already has a review for list
            check_cur.execute(
                "SELECT EXISTS(SELECT 1 FROM Reviews WHERE user_id = %s AND list_id = %s)",
                (user_id, list_id),
            )
            has_review = check_cur.fetchone()[0]

        if has_review:
            return jsonify(
                {
                    "error": "You already have a review for this list. Edit your existing review instead."
                }
            ), 400

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Add review
            cur.execute(
                "INSERT INTO Reviews (user_id, list_id, content) VALUES (%s, %s, %s) RETURNING *;",
                (user_id, list_id, content),
            )
            review = cur.fetchone()

            # Get username
            cur.execute("SELECT username FROM Users WHERE user_id = %s", (user_id,))
            username = cur.fetchone()["username"]

            # Add username to review data
            review["username"] = username

            conn.commit()
            return jsonify(
                {"message": "Review added successfully", "review": review}
            ), 201
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def update_review(review_id, user_id, content):
    conn = get_connection()
    try:
        with conn.cursor() as check_cur:
            # Check if review exists and belongs to user
            check_cur.execute(
                "SELECT EXISTS(SELECT 1 FROM Reviews WHERE review_id = %s AND user_id = %s)",
                (review_id, user_id),
            )
            owns_review = check_cur.fetchone()[0]

        if not owns_review:
            return jsonify(
                {"error": "Review not found or you don't have permission to edit it"}
            ), 403

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Update review
            cur.execute(
                "UPDATE Reviews SET content = %s WHERE review_id = %s RETURNING *;",
                (content, review_id),
            )
            review = cur.fetchone()

            conn.commit()
            return jsonify(
                {"message": "Review updated successfully", "review": review}
            ), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def delete_review(review_id, user_id):
    conn = get_connection()
    try:
        with conn.cursor() as check_cur:
            # Check if review exists and belongs to the user
            check_cur.execute(
                "SELECT EXISTS(SELECT 1 FROM Reviews WHERE review_id = %s AND user_id = %s)",
                (review_id, user_id),
            )
            owns_review = check_cur.fetchone()[0]

        if not owns_review:
            return jsonify(
                {"error": "Review not found or you don't have permission to delete it"}
            ), 403

        with conn.cursor() as cur:
            # Delete the review
            cur.execute(
                "DELETE FROM Reviews WHERE review_id = %s AND user_id = %s",
                (review_id, user_id),
            )
            rows_affected = cur.rowcount

        conn.commit()

        if rows_affected > 0:
            return jsonify({"message": f"Review {review_id} deleted successfully"}), 200
        else:
            return jsonify({"error": "Failed to delete review"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_reviews_for_list(list_id, user_id=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get stock list to check visibility
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

            reviews = []

            # Public lists 
            if stock_list["visibility"] == "public":
                cur.execute(
                    """
                    SELECT r.*, u.username 
                    FROM Reviews r
                    JOIN Users u ON r.user_id = u.user_id
                    WHERE r.list_id = %s
                    ORDER BY r.timestamp DESC
                    """,
                    (list_id,),
                )
                reviews = cur.fetchall() or []
                return jsonify({"reviews": reviews, "stockList": stock_list}), 200

            # Not public lists so check if user has access
            if not user_id:
                return jsonify(
                    {"error": "User ID required to view reviews for non-public lists"}
                ), 400

            # Check if user is creator
            is_creator = stock_list["user_id"] == user_id

            if not is_creator and not can_access_list(user_id, list_id):
                return jsonify(
                    {"error": "You don't have permission to view reviews for this list"}
                ), 403

            # User has access so return reviews
            cur.execute(
                """
                SELECT r.*, u.username 
                FROM Reviews r
                JOIN Users u ON r.user_id = u.user_id
                WHERE r.list_id = %s
                ORDER BY r.timestamp DESC
                """,
                (list_id,),
            )
            reviews = cur.fetchall() or []
            return jsonify({"reviews": reviews, "stockList": stock_list}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e), "reviews": [], "stockList": None}), 500
    finally:
        conn.close()


def get_user_reviews(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Reviews with stock list info
            cur.execute(
                """
                SELECT r.*, sl.name as list_name, sl.visibility, u.username as creator_name
                FROM Reviews r
                JOIN StockLists sl ON r.list_id = sl.list_id
                JOIN Users u ON sl.user_id = u.user_id
                WHERE r.user_id = %s
                ORDER BY r.timestamp DESC
                """,
                (user_id,),
            )
            reviews = cur.fetchall() or []
            return jsonify({"reviews": reviews}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e), "reviews": []}), 500
    finally:
        conn.close()
