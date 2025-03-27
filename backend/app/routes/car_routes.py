from flask import Blueprint, request, jsonify
from app.db.car_db import add_car, update_car, get_all_cars, get_car

car_bp = Blueprint("car_bp", __name__, url_prefix="/api/cars")


@car_bp.route("", methods=["GET"])
def list_cars():
    """Retrieve all cars."""
    cars = get_all_cars()
    return jsonify(cars)


@car_bp.route("", methods=["POST"])
def create_car():
    """Create a new car record.
    Expects JSON: { "make": "...", "model": "...", "year": ..., "price": ... }
    """
    data = request.json
    make = data.get("make")
    model = data.get("model")
    year = data.get("year")
    price = data.get("price")

    car_id = add_car(make, model, year, price)
    return jsonify({"message": "Car added successfully", "id": car_id}), 201


@car_bp.route("/<int:car_id>", methods=["PUT"])
def edit_car(car_id):
    """Update an existing car.
    Expects JSON: { "make": "...", "model": "...", "year": ..., "price": ... }
    """
    data = request.json
    make = data.get("make")
    model = data.get("model")
    year = data.get("year")
    price = data.get("price")

    if not get_car(car_id):
        return jsonify({"error": "Car not found"}), 404

    update_car(car_id, make, model, year, price)
    return jsonify({"message": "Car updated successfully"}), 200
