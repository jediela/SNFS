from flask import Flask


def create_app():
    app = Flask(__name__)

    # # Import routes inside this function to avoid circular imports
    # from .routes import main as main_blueprint
    # app.register_blueprint(main_blueprint)

    return app
