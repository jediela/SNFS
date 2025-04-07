from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Import and register blueprints
    from app.routes.car_routes import car_bp
    from app.routes.user_routes import user_bp
    from app.routes.request_routes import request_bp
    from app.routes.stock_list_routes import stock_list_bp
    from app.routes.review_routes import review_bp

    # Register blueprints
    app.register_blueprint(car_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(request_bp)
    app.register_blueprint(stock_list_bp)
    app.register_blueprint(review_bp)

    return app
