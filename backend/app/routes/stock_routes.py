from flask import Blueprint, request, jsonify
from app.db.stock_db import create_stock_table, load_stock_csv, get_stock_data, get_stock_symbols, predict_stock_prices, add_custom_stock_data
from datetime import datetime, timedelta

stock_bp = Blueprint("stock_bp", __name__, url_prefix="/stocks")

@stock_bp.route("/load", methods=["POST"])
def load_stocks():
    """Load stock data from CSV into database"""
    result = load_stock_csv()
    return jsonify(result)

@stock_bp.route("/", methods=["GET"])
def get_stocks():
    """Get stock data with filtering and pagination"""
    symbol = request.args.get("symbol", "")
    start_date = request.args.get("start_date", "")
    end_date = request.args.get("end_date", "")
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    
    return get_stock_data(symbol, start_date, end_date, page, per_page)

@stock_bp.route("/symbols", methods=["GET"])
def list_symbols():
    """Get list of available stock symbols"""
    search = request.args.get("search", "")
    limit = int(request.args.get("limit", 100))
    
    return get_stock_symbols(search, limit)

@stock_bp.route("/predict/<symbol>", methods=["GET"])
def predict_stock_future(symbol):
    """Predict future prices for a given stock symbol"""
    days = request.args.get("days", 30, type=int)
    
    if not symbol:
        return jsonify({"error": "Stock symbol is required"}), 400
        
    if days <= 0 or days > 365:
        return jsonify({"error": "Days to predict must be between 1 and 365"}), 400
        
    return predict_stock_prices(symbol, days)

@stock_bp.route("/add", methods=["POST"])
def add_stock_data():
    """Add custom stock price data"""
    data = request.json
    
    user_id = data.get("user_id")
    symbol = data.get("symbol")
    timestamp = data.get("timestamp")
    close = data.get("close")
    volume = data.get("volume")
    
    open_price = data.get("open")
    high = data.get("high")
    low = data.get("low")
    
    if not all([user_id, symbol, timestamp, close is not None, volume is not None]):
        return jsonify({"error": "User ID, symbol, timestamp, close price, and volume are required"}), 400
    
    try:
        datetime.strptime(timestamp, '%Y-%m-%d')
    except ValueError:
        return jsonify({"error": "Invalid timestamp format. Use YYYY-MM-DD"}), 400
        
    return add_custom_stock_data(
        user_id=user_id,
        symbol=symbol.upper(),
        timestamp=timestamp,
        open_price=open_price,
        high=high,
        low=low,
        close=close,
        volume=volume
    )

@stock_bp.route("/current-price/<symbol>", methods=["GET"])
def get_current_price(symbol):
    """Get the most recent price for a stock symbol"""
    from psycopg2.extras import RealDictCursor
    from app.db.base import get_connection
    
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            # Get the most recent price
            cur.execute(
                "SELECT * FROM StockPrices WHERE symbol = %s ORDER BY timestamp DESC LIMIT 1",
                (symbol.upper(),)
            )
            price_data = cur.fetchone()
            
            if not price_data:
                return jsonify({"error": f"No price data available for {symbol}"}), 404
                
            return jsonify({"price_data": price_data}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
