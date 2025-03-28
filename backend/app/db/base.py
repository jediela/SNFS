import psycopg2


def get_connection():
    return psycopg2.connect(
        dbname="snfs", user="c43", password="c43", host="db", port="5432"
    )
