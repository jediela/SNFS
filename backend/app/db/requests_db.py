from datetime import datetime
from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


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


def get_request_by_id(request_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                """
                SELECT * FROM FriendRequests
                WHERE request_id = %s
                AND status = 'pending'
            """,
                (request_id,),
            )
            request = cur.fetchone()
            return request
    except psycopg2.Error as e:
        raise e
    finally:
        conn.close()


def send_request(senderId, receiverId):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Check if already friends
            senderId = int(senderId)
            receiverId = int(receiverId)
            user1, user2 = sorted([senderId, receiverId])
            cur.execute(
                """
                SELECT 1 FROM Friends
                WHERE user1_id = %s AND user2_id = %s;
            """,
                (user1, user2),
            )
            if cur.fetchone():
                return jsonify({"error": "You are already friends"}), 400

            # Check for existing pending request
            cur.execute(
                """
                SELECT 1 FROM FriendRequests
                WHERE ((from_user_id = %s AND to_user_id = %s)
                    OR (from_user_id = %s AND to_user_id = %s))
                AND status = 'pending';
            """,
                (senderId, receiverId, receiverId, senderId),
            )
            if cur.fetchone():
                return jsonify({"error": "A friend request is already pending"}), 400

            # Check for recently rejected/deleted request
            cur.execute(
                """
                SELECT status, timestamp FROM FriendRequests
                WHERE ((from_user_id = %s AND to_user_id = %s)
                    OR (from_user_id = %s AND to_user_id = %s))
                ORDER BY timestamp DESC
                LIMIT 1;
            """,
                (senderId, receiverId, receiverId, senderId),
            )
            recent = cur.fetchone()
            if recent and recent["status"] in ["rejected", "deleted"]:
                time_diff = datetime.utcnow() - recent["timestamp"]
                if time_diff.total_seconds() < 300:
                    return jsonify(
                        {"error": "Please wait 5 minutes before re-sending the request"}
                    ), 400

            # Create request
            cur.execute(
                """
                INSERT INTO FriendRequests (from_user_id, to_user_id, status)
                VALUES (%s, %s, 'pending') RETURNING *;
            """,
                (senderId, receiverId),
            )
            request = cur.fetchone()

        conn.commit()
        return jsonify({"message": "Request sent", "request": request}), 201
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def accept_request(request_id):
    conn = get_connection()
    try:
        request = get_request_by_id(request_id)
        if not request:
            return jsonify(
                {"error": "Friend request not found or already processed"}
            ), 404

        from_id = request["from_user_id"]
        to_id = request["to_user_id"]
        user1, user2 = sorted([from_id, to_id])

        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Update request status
            cur.execute(
                """
                UPDATE FriendRequests
                SET status = 'accepted'
                WHERE request_id = %s
                RETURNING *;
            """,
                (request_id,),
            )
            updated_request = cur.fetchone()

            # Insert into Friends
            cur.execute(
                """
                INSERT INTO Friends (user1_id, user2_id)
                VALUES (%s, %s)
                ON CONFLICT (user1_id, user2_id) DO NOTHING;
            """,
                (user1, user2),
            )

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
            cur.execute(
                """
                UPDATE FriendRequests 
                SET status = 'rejected' 
                WHERE request_id = %s 
                RETURNING *
            """,
                (request_id,),
            )
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
            cur.execute(
                """
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
            """,
                (user_id,),
            )
            requests = cur.fetchall()

            # Format datetime and simplify response
            formatted_requests = [
                {
                    **req,
                    "timestamp": req["timestamp"].isoformat(),
                    "sender": {
                        "id": req["sender_id"],
                        "username": req["sender_username"],
                    },
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
