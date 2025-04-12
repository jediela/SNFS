from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection

def get_users_friends(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    u.user_id AS friend_id,
                    u.username,
                    f.since
                FROM Friends f
                JOIN Users u
                  ON u.user_id = CASE
                    WHEN f.user1_id = %s THEN f.user2_id
                    ELSE f.user1_id
                  END
                WHERE f.user1_id = %s OR f.user2_id = %s;
            """, (user_id, user_id, user_id))
            friends = cur.fetchall()

        return jsonify({"friends": friends}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def remove_friend(user_id, friend_id):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            user1_id, user2_id = (user_id, friend_id) if user_id < friend_id else (friend_id, user_id)
            cur.execute(
                """
                DELETE FROM Friends
                WHERE user1_id = %s AND user2_id = %s;
                """,
                (user1_id, user2_id)
            )
        conn.commit()
        return jsonify({"message": "Friendship removed successfully"}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
