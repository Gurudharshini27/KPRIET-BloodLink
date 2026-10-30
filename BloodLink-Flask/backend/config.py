import os
import secrets
from dotenv import load_dotenv

load_dotenv()
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


class Config:
    PORT = int(os.getenv("PORT", "5000"))
    DATABASE_FILE = os.path.join(BASE_DIR, os.getenv("DATABASE_FILE", "database/bloodlink.db"))
    RESEND_API_KEY = os.getenv("RESEND_API_KEY", "").strip()
    EMAIL_FROM = os.getenv("EMAIL_FROM", "onboarding@resend.dev").strip()
    # If JWT_SECRET is missing we still start (random per run) so the demo never crashes,
    # but logins are lost on restart. Set a fixed value in .env.
    JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_hex(32)
    JWT_SECRET_FROM_ENV = bool(os.getenv("JWT_SECRET"))

    OTP_TTL_SECONDS = 5 * 60
    OTP_RESEND_COOLDOWN_SECONDS = 30
    OTP_MAX_ATTEMPTS = 5
    JWT_EXPIRY_DAYS = 2
