from flask import Blueprint, request, jsonify
from app.db.portfolios_db import create_portfolio, transfer_funds, view_user_portfolios, get_portfolio_by_id
from app.db.stock_transactions_db import (
    handle_stock_transaction, 
    get_portfolio_stock_transactions, 
    get_stock_holdings,
    get_portfolio_statistics
)

portfolio_bp = Blueprint("portfolio_bp", __name__, url_prefix="/portfolios")


@portfolio_bp.route("/create", methods=["POST"])
def create_portfolio_route():
    data = request.json
    userId = data.get("userId")
    portfolio_name = data.get("portfolioName")

    if not userId or not portfolio_name:
        return jsonify({"error": "User ID and portfolio name are required"}), 400

    return create_portfolio(userId, portfolio_name)


@portfolio_bp.route("/view", methods=["GET"])
def view_user_portfolios_route():
    userId = request.args.get("userId")

    if not userId:
        return jsonify({"error": "User ID is required"}), 400

    return view_user_portfolios(userId)


@portfolio_bp.route("/<int:portfolio_id>", methods=["GET"])
def view_portfolio_by_id_route(portfolio_id):
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    return get_portfolio_by_id(portfolio_id, user_id)


@portfolio_bp.route("/stock-transaction", methods=["POST"])
def stock_transaction():
    data = request.json
    portfolio_id = data.get("portfolio_id")
    user_id = data.get("user_id")
    symbol = data.get("symbol")
    transaction_type = data.get("transaction_type")
    num_shares = data.get("num_shares")
    price_per_share = data.get("price_per_share")
    
    if not all([portfolio_id, user_id, symbol, transaction_type, num_shares, price_per_share]):
        return jsonify({
            "error": "Missing required fields: portfolio_id, user_id, symbol, transaction_type, num_shares, price_per_share"
        }), 400
        
    return handle_stock_transaction(
        portfolio_id, symbol.upper(), transaction_type,
        num_shares, price_per_share, user_id
    )


@portfolio_bp.route("/<int:portfolio_id>/stock-transactions", methods=["GET"])
def get_stock_transactions(portfolio_id):
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    return get_portfolio_stock_transactions(portfolio_id, user_id)


@portfolio_bp.route("/<int:portfolio_id>/holdings", methods=["GET"])
def get_portfolio_holdings(portfolio_id):
    user_id = request.args.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    return get_stock_holdings(portfolio_id, user_id)


@portfolio_bp.route("/<int:portfolio_id>/statistics", methods=["GET"])
def get_statistics(portfolio_id):
    user_id = request.args.get("user_id")
    start_date = request.args.get("start_date")
    end_date = request.args.get("end_date")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    return get_portfolio_statistics(portfolio_id, user_id, start_date, end_date)


@portfolio_bp.route("/transfer", methods=["POST"])
def transfer_between_portfolios():
    data = request.json
    from_id = data.get("fromPortfolioId")
    to_id = data.get("toPortfolioId")
    amount = data.get("amount")

    if not all([from_id, to_id, amount]):
        return jsonify({"error": "Missing required fields: fromPortfolioId, toPortfolioId, amount"}), 400

    return transfer_funds(from_id, to_id, amount)
