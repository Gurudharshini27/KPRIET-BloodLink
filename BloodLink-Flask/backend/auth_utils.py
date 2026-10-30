from datetime import datetime, timedelta, timezone
from functools import wraps
import jwt
from flask import g, jsonify, request
from .config import Config


def make_token(user):
    payload = {
        "sub": user["id"], "role": user["role"], "name": user["name"], "email": user["email"],
        "exp": datetime.now(timezone.utc) + timedelta(days=Config.JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm="HS256")


def require_auth(role=None):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            header = request.headers.get("Authorization", "")
            if not header.startswith("Bearer "):
                return jsonify(error="Missing token"), 401
            try:
                payload = jwt.decode(header[7:], Config.JWT_SECRET, algorithms=["HS256"])
            except jwt.PyJWTError:
                return jsonify(error="Invalid or expired token"), 401
            if role and payload.get("role") != role:
                return jsonify(error="Wrong role for this endpoint"), 403
            g.user = payload
            return fn(*args, **kwargs)
        return wrapper
    return decorator
