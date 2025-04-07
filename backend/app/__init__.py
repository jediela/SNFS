from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Import and register the car routes Blueprint
    from app.routes.car_routes import car_bp
    from app.routes.user_routes import user_bp
    from app.routes.stock_list_routes import stock_list_bp

    app.register_blueprint(car_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(stock_list_bp)

    # Register other blueprints similarly, e.g., user_routes, portfolio_routes, etc.

    return app
