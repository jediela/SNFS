from flask import jsonify
import psycopg2
from psycopg2.extras import RealDictCursor
from .base import get_connection


def create_portfolio(user_id, portfolio_name):
    conn = get_connection()
