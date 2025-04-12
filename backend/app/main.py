from app import create_app
from app.db.stock_db import load_stock_csv, check_stock_data_exists
from flask import jsonify
import threading
import time
import os

app = create_app()


@app.route("/", methods=["GET"])
def home():
    return "APP IS RUNNING"


@app.route("/load-stock-data", methods=["POST"])
def load_stocks():
    result = load_stock_csv()
    return jsonify(result)


# Load stock data
def ensure_stock_data_loaded():
    if not check_stock_data_exists():
        print("Loading stock data from CSV file...")
        result = load_stock_csv()
        print(f"Stock data loading result: {result}")
        return "Stock data loaded"
    else:
        return "Stock data already exists"


# Route to trigger data loading
@app.route("/ensure-stock-data", methods=["GET"])
def trigger_data_load():
    message = ensure_stock_data_loaded()
    return message


# Environment variable to indicate first run
first_run = os.environ.get("FIRST_RUN", "true").lower() == "true"

if first_run:

    def delayed_data_load():
        time.sleep(5)
        ensure_stock_data_loaded()

    thread = threading.Thread(target=delayed_data_load)
    thread.daemon = True
    thread.start()

    os.environ["FIRST_RUN"] = "false"


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
