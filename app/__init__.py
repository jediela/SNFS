from flask import Flask


def create_app():
    app = Flask(__name__)

    # Import and register the car routes Blueprint
    from app.routes.car_routes import car_bp

    app.register_blueprint(car_bp)

    # Register other blueprints similarly, e.g., user_routes, portfolio_routes, etc.

    return app
