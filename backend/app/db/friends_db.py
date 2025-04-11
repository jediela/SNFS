import datetime
from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection

def get_users_friends(user_id):
    return None


def remove_friend(user_id, friend_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if they are friends
            cur.execute("""
                SELECT 1 FROM Friends
                WHERE (user1_id = %s AND user2_id = %s)
                    OR (user1_id = %s AND user2_id = %s);
            """, (user_id, friend_id, friend_id, user_id))
            if not cur.fetchone():
                return jsonify({"error": "Not friends"}), 400

            # Remove from Friends table
            cur.execute("""
                DELETE FROM Friends
                WHERE (user1_id = %s AND user2_id = %s)
                    OR (user1_id = %s AND user2_id = %s);
            """, (user_id, friend_id, friend_id, user_id))
            conn.commit()

        return jsonify({"message": "Friend removed successfully"}), 200
    except psycopg2.Error as e:
        raise e
    finally:
        conn.close()