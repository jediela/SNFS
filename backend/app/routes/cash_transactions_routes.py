from flask import Blueprint, request, jsonify
from app.db.cash_transactions_db import handle_cash_transaction, get_cash_transactions

cash_transactions_bp = Blueprint("cash_transactions_bp", __name__, url_prefix="/transactions")

@cash_transactions_bp.route("/", methods=["POST"])
def create_transaction():
    data = request.json
    portfolio_id = data.get("portfolio_id")
    transaction_type = data.get("type")
    amount = data.get("amount")

    if not all([portfolio_id, transaction_type, amount]):
        return jsonify({"error": "Missing required fields"}), 400

    return handle_cash_transaction(portfolio_id, transaction_type, amount)

@cash_transactions_bp.route("/<int:portfolio_id>", methods=["GET"])
def get_transactions(portfolio_id):
    user_id = request.args.get("userId")

    if not user_id:
        return {"error": "Missing userId"}, 400

    return get_cash_transactions(portfolio_id, user_id)