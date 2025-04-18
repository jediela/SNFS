from flask import Blueprint, request, jsonify
import psycopg2
from app.db.requests_db import (
    get_user_id_by_username,
    send_request,
    get_received_requests,
    accept_request,
    reject_request,
)

request_bp = Blueprint("request_bp", __name__, url_prefix="/requests")


@request_bp.route("/send", methods=["POST"])
def send_friend_request():
    data = request.json
    senderId = data.get("senderId")
    receiverUsername = data.get("receiverUsername")

    if not senderId or not receiverUsername:
        return jsonify({"error": "Sender ID and Receiver Username are required"}), 400

    try:
        receiverId = get_user_id_by_username(receiverUsername)
        if receiverId is None:
            return jsonify({"error": f"User '{receiverUsername}' not found"}), 404
    except psycopg2.Error as e:
        return jsonify({"error": str(e)}), 500

    return send_request(senderId, receiverId)


@request_bp.route("/view", methods=["GET"])
def get_friend_requests():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    return get_received_requests(user_id)


@request_bp.route("/accept", methods=["PATCH"])
def accept_friend_request():
    requestId = request.args.get("requestId")

    if not requestId:
        return jsonify({"error": "Request ID is required"}), 400

    return accept_request(requestId)


@request_bp.route("/reject", methods=["PATCH"])
def reject_friend_request():
    requestId = request.args.get("requestId")

    if not requestId:
        return jsonify({"error": "Request ID is required"}), 400

    return reject_request(requestId)
