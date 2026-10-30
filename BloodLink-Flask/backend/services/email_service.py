"""Real email delivery through the Resend REST API.

The API key is read only from the backend environment (.env). If it is missing
or still a placeholder, we raise EmailError instead of pretending to send.
"""
import requests
from ..config import Config

RESEND_URL = "https://api.resend.com/emails"


class EmailError(Exception):
    def __init__(self, message, code="EMAIL_SEND_FAILED"):
        super().__init__(message)
        self.code = code


def is_configured():
    key = Config.RESEND_API_KEY
    return bool(key) and not key.startswith("your_")


def send_email(to, subject, text):
    if not is_configured():
        raise EmailError(
            "Email service not configured: set a real RESEND_API_KEY and EMAIL_FROM in .env to send this email.",
            "EMAIL_NOT_CONFIGURED",
        )
    try:
        resp = requests.post(
            RESEND_URL,
            headers={"Authorization": f"Bearer {Config.RESEND_API_KEY}", "Content-Type": "application/json"},
            json={"from": Config.EMAIL_FROM, "to": [to], "subject": subject, "text": text},
            timeout=15,
        )
    except requests.RequestException as e:
        raise EmailError(f"Resend API error: {e}")
    if resp.status_code >= 300:
        try:
            msg = resp.json().get("message", resp.text)
        except ValueError:
            msg = resp.text
        raise EmailError(f"Resend API error: {msg}")
    return resp.json()


def send_otp_email(email, otp):
    return send_email(
        email, "Verify Your BloodLink Account",
        "Hello,\n\nThank you for registering with BloodLink.\n\n"
        f"Your verification code is:\n\n{otp}\n\n"
        "This code expires in 5 minutes.\n\n"
        "If you did not request this account, please ignore this email.\n\nBloodLink Team",
    )


def send_match_email(donor_email, req):
    return send_email(
        donor_email, "BloodLink \u2013 Blood Request Matching Your Blood Group",
        "Hello,\n\nA blood request matching your registered blood group has been received.\n\n"
        f"Blood Group: {req['blood_group']}\nUnits Required: {req['units']}\n"
        f"Hospital: {req['hospital']}\n"
        f"Required: {req['required_date'] or '-'} {req['required_time'] or '-'}\n"
        f"Urgency: {req['urgency'] or '-'}\n\n"
        "Please log in to BloodLink and open your Notifications to Accept or Decline.\n\nBloodLink Team",
    )
