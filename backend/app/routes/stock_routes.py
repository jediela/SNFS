from flask import Blueprint, request, jsonify
from app.db.stock_db import create_stock_table, load_stock_csv, get_stock_data, get_stock_symbols

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
