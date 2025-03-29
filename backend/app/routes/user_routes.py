from flask import Blueprint, request, jsonify
from app.db.users_db import register_user

user_bp = Blueprint("user_bp", __name__, url_prefix="/users")

@user_bp.route("/register", methods=["POST"])
def create_user():
    data = request.json
    username = data.get("username")
    password = data.get("password")

    if not username or not password:
        return jsonify({"error": "Username and password are required"}), 400
    
    return register_user(username, password)
