from flask import Blueprint, request, jsonify
from app.db.portfolios_db import create_portfolio

portfolio_bp = Blueprint("portfolio_bp", __name__, url_prefix="/portfolios")


@portfolio_bp.route("/create", methods=["POST"])
def create_portfolio_route():
    data = request.json
    userId = data.get("userId")
    portfolio_name = data.get("portfolioName")

    if not userId or not portfolio_name:
        return jsonify({"error": "User ID and portfolio name are required"}), 400

    return create_portfolio(userId, portfolio_name)
