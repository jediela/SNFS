from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


def register_user(username, password):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO Users (username, password) VALUES (%s, %s) RETURNING *;",
                (username, password),
            )
            user = cur.fetchone()
        conn.commit()
        if user:
            return jsonify({"message": "User Registered", "user": user}), 201
        else:
            return jsonify({"error": "User registration failed"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def user_login(username, password):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM Users WHERE username = %s AND password = %s;",
                (username, password),
            )
            user = cur.fetchone()
        if user:
            return jsonify({"message": "Login successful", "user": user}), 200
        else:
            return jsonify({"error": "Invalid username or password"}), 401
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
