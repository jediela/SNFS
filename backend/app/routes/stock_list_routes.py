from flask import Blueprint, request, jsonify
from app.db.stock_lists_db import (
    create_stock_list,
    add_item_to_stock_list,
    get_accessible_stock_lists,
    get_user_stock_lists,
    share_stock_list,
    verify_user_owns_list,
    delete_stock_list,
    get_stock_list_by_id,
    update_stock_list,
    remove_item_from_stock_list,
    get_user_id_by_username
)

stock_list_bp = Blueprint("stock_list_bp", __name__, url_prefix="/stocklists")


@stock_list_bp.route("/create", methods=["POST"])
def create_list():
    data = request.json
    user_id = data.get("user_id")
    name = data.get("name")
    visibility = data.get("visibility")

    if not user_id or not name or not visibility:
        return jsonify({"error": "User ID, name, and visibility are required"}), 400

    if visibility not in ["private", "shared", "public"]:
        return jsonify({"error": "Visibility must be private, shared, or public"}), 400

    return create_stock_list(user_id, name, visibility)


@stock_list_bp.route("/add_item", methods=["POST"])
def add_item():
    data = request.json
    list_id = data.get("list_id")
    user_id = data.get("user_id")  # Added to verify ownership
    symbol = data.get("symbol")
    num_shares = data.get("num_shares")

    if not list_id or not symbol or num_shares is None:
        return jsonify(
            {"error": "List ID, symbol, and number of shares are required"}
        ), 400

    # Verify the user owns this list if user_id is provided
    if user_id and not verify_user_owns_list(user_id, list_id):
        return jsonify({"error": "You don't have permission to modify this list"}), 403

    return add_item_to_stock_list(list_id, symbol, num_shares)


@stock_list_bp.route("/lists", methods=["GET"])
def get_lists():
    # Get optional parameters
    user_id = request.args.get("user_id")
    search = request.args.get("search")

    # Convert user_id to int if it exists
    if user_id:
        try:
            user_id = int(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400

    return get_accessible_stock_lists(user_id, search)


# Keep the old endpoint for backward compatibility
@stock_list_bp.route("/user/<int:user_id>", methods=["GET"])
def get_lists_for_user(user_id):
    search = request.args.get("search")
    return get_accessible_stock_lists(user_id, search)


@stock_list_bp.route("/<int:list_id>", methods=["DELETE"])
def delete_list(list_id):
    data = request.json
    user_id = data.get("user_id")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    return delete_stock_list(list_id, user_id)


@stock_list_bp.route("/list/<int:list_id>", methods=["GET"])
def get_list_by_id(list_id):
    user_id = request.args.get("user_id")
    
    # Convert user_id to int if it exists
    if user_id:
        try:
            user_id = int(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
    
    return get_stock_list_by_id(list_id, user_id)


@stock_list_bp.route("/update/<int:list_id>", methods=["PUT"])
def update_list(list_id):
    data = request.json
    user_id = data.get("user_id")
    name = data.get("name")
    visibility = data.get("visibility")

    if not user_id or not name or not visibility:
        return jsonify({"error": "User ID, name, and visibility are required"}), 400

    if visibility not in ["private", "shared", "public"]:
        return jsonify({"error": "Visibility must be private, shared, or public"}), 400

    # Verify the user owns this list
    if not verify_user_owns_list(user_id, list_id):
        return jsonify({"error": "You don't have permission to modify this list"}), 403

    return update_stock_list(list_id, user_id, name, visibility)


@stock_list_bp.route("/remove_item", methods=["DELETE"])
def remove_item():
    data = request.json
    list_id = data.get("list_id")
    user_id = data.get("user_id")
    symbol = data.get("symbol")

    if not list_id or not user_id or not symbol:
        return jsonify({"error": "List ID, user ID, and symbol are required"}), 400

    # Verify the user owns this list
    if not verify_user_owns_list(user_id, list_id):
        return jsonify({"error": "You don't have permission to modify this list"}), 403

    return remove_item_from_stock_list(list_id, symbol)


@stock_list_bp.route("/mine", methods=["GET"])
def get_user_lists():
    user_id = request.args.get("userId")

    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    return get_user_stock_lists(user_id)

@stock_list_bp.route("/share", methods=["POST"])
def share_list():
    data = request.json
    username = data.get("username")
    list_id = data.get("listId")
    owner_id = data.get("ownerId")

    if not username or not list_id or not owner_id:
        return jsonify({"error": "Username, List Id, and Owner Id are required"}), 400
    share_to_id = get_user_id_by_username(username)

    if not share_to_id:
        return jsonify({"error": f"User '{username}' not found"}), 404
    
    return share_stock_list(owner_id, list_id, share_to_id)