"""OTP generation and verification. OTPs are random, bcrypt-hashed, expire in
5 minutes, allow 5 wrong attempts and have a 30-second resend cooldown.
The raw OTP only ever exists inside the email - never in the DB or API response."""
import secrets
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from ..config import Config
from .email_service import EmailError, send_otp_email


class CooldownError(Exception):
    def __init__(self, seconds):
        super().__init__(f"Resend available in {seconds} seconds")


def _now():
    return datetime.now(timezone.utc)


def _parse(ts):
    return datetime.fromisoformat(ts)


def generate_otp():
    return f"{secrets.randbelow(1_000_000):06d}"


def issue_otp(db, email):
    now = _now()
    last = db.execute("SELECT * FROM otps WHERE email=? ORDER BY created_at DESC LIMIT 1", (email,)).fetchone()
    if last and not last["verified"]:
        elapsed = (now - _parse(last["created_at"])).total_seconds()
        if elapsed < Config.OTP_RESEND_COOLDOWN_SECONDS:
            raise CooldownError(int(Config.OTP_RESEND_COOLDOWN_SECONDS - elapsed) + 1)

    db.execute("DELETE FROM otps WHERE email=? AND verified=0", (email,))  # invalidate old OTP
    otp = generate_otp()
    otp_hash = bcrypt.hashpw(otp.encode(), bcrypt.gensalt()).decode()
    db.execute(
        "INSERT INTO otps (id,email,otp_hash,expires_at,attempt_count,verified,created_at) VALUES (?,?,?,?,0,0,?)",
        (str(uuid.uuid4()), email, otp_hash,
         (now + timedelta(seconds=Config.OTP_TTL_SECONDS)).isoformat(), now.isoformat()),
    )
    db.commit()
    try:
        send_otp_email(email, otp)
        return {"emailSent": True}
    except EmailError as e:
        return {"emailSent": False, "emailError": str(e), "emailErrorCode": e.code}


def verify_otp(db, email, submitted):
    rec = db.execute(
        "SELECT * FROM otps WHERE email=? AND verified=0 ORDER BY created_at DESC LIMIT 1", (email,)
    ).fetchone()
    if not rec:
        return False, "NO_OTP", "No pending verification for this email. Please register again or resend OTP."
    if _parse(rec["expires_at"]) < _now():
        return False, "EXPIRED", "OTP expired. Please request a new OTP."
    if rec["attempt_count"] >= Config.OTP_MAX_ATTEMPTS:
        return False, "LOCKED", "Too many incorrect attempts. Please request a new OTP."
    if not bcrypt.checkpw(submitted.encode(), rec["otp_hash"].encode()):
        db.execute("UPDATE otps SET attempt_count=attempt_count+1 WHERE id=?", (rec["id"],))
        db.commit()
        return False, "INVALID", "Invalid OTP. Please try again."
    db.execute("UPDATE otps SET verified=1 WHERE id=?", (rec["id"],))
    db.commit()
    return True, None, None
