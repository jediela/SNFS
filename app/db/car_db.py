from psycopg2.extras import RealDictCursor
from .base import get_connection


def add_car(make, model, year, price):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO cars (make, model, year, price) VALUES (%s, %s, %s, %s) RETURNING id",
                (make, model, year, price),
            )
            car_id = cur.fetchone()[0]
            conn.commit()
            return car_id
    finally:
        conn.close()


def update_car(car_id, make, model, year, price):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE cars SET make = %s, model = %s, year = %s, price = %s WHERE id = %s",
                (make, model, year, price, car_id),
            )
            conn.commit()
    finally:
        conn.close()


def get_all_cars():
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM cars")
            cars = cur.fetchall()
            return cars
    finally:
        conn.close()


def get_car(car_id):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT * FROM cars WHERE id = %s", (car_id,))
            car = cur.fetchone()
            return car
    finally:
        conn.close()
