from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection

def get_request_by_id(request_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT * FROM FriendRequests
                WHERE request_id = %s
                AND status = 'pending'
            """, (request_id,))
        request = cur.fetchone()
        return request
    except psycopg2.Error as e:
        raise e
    finally:
        conn.close()


def send_request(senderId, recieverId):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO FriendRequests (from_user_id, to_user_id, status) VALUES (%s, %s, %s) RETURNING *;",
                (senderId, recieverId, "pending"),
            )
            request = cur.fetchone()
        conn.commit()
        if request:
            return jsonify({"message": "Request Sent", "request": request}), 201
        else:
            return jsonify({"error": "Friend request failed"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def accept_request(request_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE FriendRequests 
                SET status = 'accepted' 
                WHERE request_id = %s 
                RETURNING *
            """, (request_id,))
            updated_request = cur.fetchone()
        conn.commit()
        return jsonify({"message": "Request accepted", "request": updated_request}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def reject_request(request_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                UPDATE FriendRequests 
                SET status = 'rejected' 
                WHERE request_id = %s 
                RETURNING *
            """, (request_id,))
            updated_request = cur.fetchone()
        conn.commit()
        return jsonify({"message": "Request rejected", "request": updated_request}), 200
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def get_received_requests(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("""
                SELECT 
                    fr.request_id,
                    fr.status,
                    fr.timestamp,
                    u.user_id as sender_id,
                    u.username as sender_username
                FROM FriendRequests fr
                JOIN Users u ON fr.from_user_id = u.user_id
                WHERE fr.to_user_id = %s
                AND fr.status = 'pending'
                ORDER BY fr.timestamp DESC;
            """, (user_id,))
            requests = cur.fetchall()
            
            # Format datetime and simplify response
            formatted_requests = [
                {
                    **req,
                    "timestamp": req["timestamp"].isoformat(),
                    "sender": {
                        "id": req["sender_id"],
                        "username": req["sender_username"]
                    }
                }
                for req in requests
            ]
            
            # Remove temporary fields
            for req in formatted_requests:
                del req["sender_id"]
                del req["sender_username"]
            
            return jsonify({"received_requests": formatted_requests}), 200
            
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()