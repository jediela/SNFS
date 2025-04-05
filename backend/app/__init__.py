from flask import Flask
from flask_cors import CORS


def create_app():
    app = Flask(__name__)
    CORS(app)

    # Import and register routes blueprint
    from app.routes.car_routes import car_bp
    from app.routes.user_routes import user_bp
    from app.routes.request_routes import request_bp

    # Register blueprints
    app.register_blueprint(car_bp)
    app.register_blueprint(user_bp)
    app.register_blueprint(request_bp)
    
    return app
