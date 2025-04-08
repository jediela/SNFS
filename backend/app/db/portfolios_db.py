from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


def create_portfolio(user_id, portfolio_name):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(
                "INSERT INTO portfolios (user_id, name) VALUES (%s, %s) RETURNING *;",
                (user_id, portfolio_name),
            )
            portfolio = cur.fetchone()
        conn.commit()
        if portfolio:
            return jsonify(
                {"message": "Portfolio created", "portfolio": portfolio}
            ), 201
        else:
            return jsonify({"error": "Portfolio creation failed"}), 500
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()


def view_user_portfolios(user_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM portfolios WHERE user_id = %s;", (user_id,))
            portfolios = cur.fetchall()
        if portfolios:
            return jsonify({"portfolios": portfolios}), 200
        else:
            return jsonify({"message": "No portfolios found"}), 404
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
