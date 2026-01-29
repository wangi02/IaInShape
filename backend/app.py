# -*- coding: utf-8 -*-
"""
Flask Application Entry Point for IA InShape Boxing Coach API.
"""

from flask import Flask
from flask_cors import CORS
from backend.config import APP_NAME, API_VERSION, DEBUG_MODE
from backend.api import api


def create_app() -> Flask:
    """Application factory pattern for scalability and testing."""
    app = Flask(__name__)
    
    # Enable CORS for all routes (allows React frontend to call the API)
    CORS(app, resources={r"/api/*": {"origins": "*"}})
    
    # Register API blueprint
    app.register_blueprint(api)
    
    # Root endpoint
    @app.route("/")
    def index():
        return {
            "app": APP_NAME,
            "version": API_VERSION,
            "endpoints": {
                "health": "/api/health",
                "users": "/api/users",
                "adapt": "/api/adapt (POST)"
            }
        }
    
    return app


# Create the app instance
app = create_app()


if __name__ == "__main__":
    print(f"[START] Starting {APP_NAME} {API_VERSION}")
    print("[API] API running at http://localhost:5001")
    print("[INFO] Frontend should call POST /api/adapt with context data")
    app.run(host="0.0.0.0", port=5001, debug=DEBUG_MODE)
