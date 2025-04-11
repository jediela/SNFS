from flask import Blueprint, request, jsonify
from app.db.friends_db import get_users_friends, remove_friend

friends_bp = Blueprint("friends_bp", __name__, url_prefix="/friends")


@friends_bp.route("/view", methods=["GET"])
def get_friends():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    return get_users_friends(user_id)
@friends_bp.route("/remove", methods=["DELETE"])


def delete_friend():
    data = request.json
    user_id = data.get("userId")
    friend_id = data.get("friendId")

    if not user_id or not friend_id:
        return jsonify({"error": "User ID and Friend ID are required"}), 400

    return remove_friend(user_id, friend_id)