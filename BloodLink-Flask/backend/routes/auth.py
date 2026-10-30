"""Register / verify OTP / resend OTP / login for donors and requesters."""
import re
import uuid
from datetime import datetime, timezone
import bcrypt
from flask import Blueprint, jsonify, request
from ..auth_utils import make_token
from ..database import get_db
from ..services.matching_service import COMPAT
from ..services.otp_service import CooldownError, issue_otp, verify_otp

bp = Blueprint("auth", __name__)
EMAIL_RE = re.compile(r"^[^\s@]+@[^\s@]+\.[^\s@]+$")


def _upsert_profile(db, user_id, role, b):
    if role == "donor":
        vals = (b.get("department"), b.get("year"), b["bloodGroup"], b["phone"],
                b.get("lastDonation") or None, b.get("location"))
        if db.execute("SELECT 1 FROM donor_profiles WHERE user_id=?", (user_id,)).fetchone():
            db.execute("UPDATE donor_profiles SET department=?,year=?,blood_group=?,phone=?,last_donation=?,location=? "
                       "WHERE user_id=?", vals + (user_id,))
        else:
            db.execute("INSERT INTO donor_profiles (user_id,department,year,blood_group,phone,last_donation,location,available) "
                       "VALUES (?,?,?,?,?,?,?,0)", (user_id,) + vals)
    else:
        if db.execute("SELECT 1 FROM requester_profiles WHERE user_id=?", (user_id,)).fetchone():
            db.execute("UPDATE requester_profiles SET phone=? WHERE user_id=?", (b.get("phone"), user_id))
        else:
            db.execute("INSERT INTO requester_profiles (user_id,phone) VALUES (?,?)", (user_id, b.get("phone")))


@bp.post("/register")
def register():
    b = request.get_json(silent=True) or {}
    role, name, email, password = b.get("role"), (b.get("name") or "").strip(), (b.get("email") or "").strip().lower(), b.get("password") or ""
    if role not in ("donor", "requester"):
        return jsonify(error="role must be donor or requester"), 400
    if not name or not email or not password:
        return jsonify(error="name, email and password are required"), 400
    if not EMAIL_RE.match(email):
        return jsonify(error="Invalid email format"), 400
    if len(password) < 6:
        return jsonify(error="Password must be at least 6 characters"), 400
    if role == "donor":
        if not b.get("bloodGroup") or not b.get("phone"):
            return jsonify(error="bloodGroup and phone are required for donors"), 400
        if b["bloodGroup"] not in COMPAT:
            return jsonify(error="Invalid blood group"), 400

    db = get_db()
    existing = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if existing and existing["email_verified"]:
        return jsonify(error="This email is already registered. Please log in."), 409

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    try:
        if existing:  # unverified registration: update it, never create a duplicate
            user_id = existing["id"]
            db.execute("UPDATE users SET name=?, password_hash=? WHERE id=?", (name, pw_hash, user_id))
            pending = True
        else:
            user_id, pending = str(uuid.uuid4()), False
            db.execute("INSERT INTO users (id,role,name,email,password_hash,email_verified,created_at) VALUES (?,?,?,?,?,0,?)",
                       (user_id, role, name, email, pw_hash, datetime.now(timezone.utc).isoformat()))
        _upsert_profile(db, user_id, existing["role"] if existing else role, b)
        db.commit()
        result = issue_otp(db, email)
    except CooldownError as e:
        return jsonify(error=str(e)), 429

    if result["emailSent"]:
        msg = "This email is pending verification. We\u2019ve sent a new OTP." if pending else "OTP sent to your email."
    else:
        msg = "Account created and OTP generated, but the email could not be delivered."
    return jsonify(message=msg, email=email, emailSent=result["emailSent"], emailError=result.get("emailError"))


@bp.post("/verify-otp")
def verify():
    b = request.get_json(silent=True) or {}
    email, otp = (b.get("email") or "").strip().lower(), str(b.get("otp") or "").strip()
    if not email or not otp:
        return jsonify(error="email and otp are required"), 400
    db = get_db()
    ok, reason, message = verify_otp(db, email, otp)
    if not ok:
        return jsonify(error=message, reason=reason), 400
    db.execute("UPDATE users SET email_verified=1 WHERE email=?", (email,))
    db.commit()
    return jsonify(message="Email verified successfully!")


@bp.post("/resend-otp")
def resend():
    email = ((request.get_json(silent=True) or {}).get("email") or "").strip().lower()
    if not email:
        return jsonify(error="email is required"), 400
    db = get_db()
    user = db.execute("SELECT * FROM users WHERE email=?", (email,)).fetchone()
    if not user:
        return jsonify(error="No registration found for this email"), 404
    if user["email_verified"]:
        return jsonify(error="Email already verified. Please log in."), 400
    try:
        result = issue_otp(db, email)
    except CooldownError as e:
        return jsonify(error=str(e)), 429
    msg = "A new OTP has been sent." if result["emailSent"] else "A new OTP was generated, but the email could not be delivered."
    return jsonify(message=msg, emailSent=result["emailSent"], emailError=result.get("emailError"))


@bp.post("/login")
def login():
    b = request.get_json(silent=True) or {}
    email, password, role = (b.get("email") or "").strip().lower(), b.get("password") or "", b.get("role")
    if not email or not password or not role:
        return jsonify(error="email, password and role are required"), 400
    user = get_db().execute("SELECT * FROM users WHERE email=? AND role=?", (email, role)).fetchone()
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return jsonify(error="Invalid email or password."), 401
    if not user["email_verified"]:
        return jsonify(error="Please verify your email before logging in.", needsVerification=True, email=user["email"]), 403
    return jsonify(token=make_token(user),
                   user={"id": user["id"], "name": user["name"], "email": user["email"], "role": user["role"]})
