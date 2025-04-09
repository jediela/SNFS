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


# Check if stock data exists and load it if needed
def ensure_stock_data_loaded():
    # Only load if no data exists
    if not check_stock_data_exists():
        print("Loading stock data from CSV file...")
        result = load_stock_csv()
        print(f"Stock data loading result: {result}")
        return "Stock data loaded"
    else:
        print("Stock data already exists, skipping import")
        return "Stock data already exists"


# Create a route to trigger data loading
@app.route("/ensure-stock-data", methods=["GET"])
def trigger_data_load():
    message = ensure_stock_data_loaded()
    return message


# Set an environment variable to indicate this is the first run
first_run = os.environ.get('FIRST_RUN', 'true').lower() == 'true'

if first_run:
    # Create a background thread to load data after a delay
    def delayed_data_load():
        time.sleep(5)  # Wait for database to be ready
        ensure_stock_data_loaded()
    
    thread = threading.Thread(target=delayed_data_load)
    thread.daemon = True
    thread.start()
    
    # Set the environment variable so we don't load again on restart
    os.environ['FIRST_RUN'] = 'false'


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=8000)
