from flask import Blueprint, request, jsonify
from app.db.reviews_db import add_review, get_reviews_for_list, get_user_reviews, update_review, delete_review

review_bp = Blueprint("review_bp", __name__, url_prefix="/reviews")

@review_bp.route("/add", methods=["POST"])
def create_review():
    """Create a new review for a stock list"""
    data = request.json
    user_id = data.get("user_id")
    list_id = data.get("list_id")
    content = data.get("content")
    
    if not user_id or not list_id or not content:
        return jsonify({"error": "User ID, list ID, and content are required"}), 400
        
    if len(content) > 4000:
        return jsonify({"error": "Review content cannot exceed 4000 characters"}), 400
        
    return add_review(user_id, list_id, content)

@review_bp.route("/update/<int:review_id>", methods=["PUT"])
def edit_review(review_id):
    """Update an existing review"""
    data = request.json
    user_id = data.get("user_id")
    content = data.get("content")
    
    if not user_id or not content:
        return jsonify({"error": "User ID and content are required"}), 400
        
    if len(content) > 4000:
        return jsonify({"error": "Review content cannot exceed 4000 characters"}), 400
        
    return update_review(review_id, user_id, content)
    
@review_bp.route("/list/<int:list_id>", methods=["GET"])
def get_reviews(list_id):
    """Get reviews for a stock list"""
    user_id = request.args.get("user_id")
    
    if user_id:
        try:
            user_id = int(user_id)
        except ValueError:
            return jsonify({"error": "Invalid user ID format"}), 400
    
    return get_reviews_for_list(list_id, user_id)

@review_bp.route("/user/<int:user_id>", methods=["GET"])
def get_user_review_list(user_id):
    """Get all reviews created by a specific user"""
    return get_user_reviews(user_id)

@review_bp.route("/<int:review_id>", methods=["DELETE"])
def remove_review(review_id):
    """Delete a review if it belongs to the user"""
    data = request.json
    user_id = data.get("user_id")
    
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400
        
    return delete_review(review_id, user_id)
