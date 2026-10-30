"""BloodLink - Flask application entry point.

Run:  python app.py        ->  http://localhost:5000
Flask serves both the REST API (/api/...) and the frontend (frontend/).
"""
import os
from flask import Flask, jsonify, send_from_directory
from flask_cors import CORS

from backend.config import Config
from backend.database import close_db, init_db
from backend.routes import auth, donors, requests as requests_routes
from backend.services.email_service import is_configured

BASE = os.path.dirname(os.path.abspath(__file__))


def create_app():
    app = Flask(__name__, static_folder=os.path.join(BASE, "frontend"), static_url_path="")
    CORS(app, resources={r"/api/*": {"origins": "*"}})  # lets a separately hosted frontend call the API
    init_db()
    app.teardown_appcontext(close_db)

    app.register_blueprint(auth.bp, url_prefix="/api/auth")
    app.register_blueprint(donors.bp, url_prefix="/api/donors")
    app.register_blueprint(requests_routes.bp, url_prefix="/api/requests")

    @app.get("/api/health")
    def health():
        return jsonify(ok=True, emailConfigured=is_configured())

    @app.get("/")
    def index():
        return send_from_directory(app.static_folder, "index.html")

    @app.errorhandler(404)
    def not_found(_):
        return jsonify(error="Not found"), 404

    @app.errorhandler(Exception)
    def server_error(e):
        app.logger.exception(e)
        return jsonify(error="Internal server error"), 500

    return app


app = create_app()

if __name__ == "__main__":
    if not Config.JWT_SECRET_FROM_ENV:
        print("WARNING: JWT_SECRET not set in .env - using a random one; logins reset on restart.")
    if not is_configured():
        print("WARNING: RESEND_API_KEY not set - OTP and match emails cannot be delivered until you add it to .env.")
    print(f"BloodLink running on http://localhost:{Config.PORT}")
    app.run(host="0.0.0.0", port=Config.PORT, debug=False)
