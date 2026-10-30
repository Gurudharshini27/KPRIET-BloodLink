"""Donor profile, availability and notifications (accept / decline)."""
from flask import Blueprint, g, jsonify, request
from ..auth_utils import require_auth
from ..database import get_db

bp = Blueprint("donors", __name__)


@bp.get("/me")
@require_auth("donor")
def me():
    row = get_db().execute(
        """SELECT u.id, u.name, u.email, d.department, d.year, d.blood_group, d.phone,
                  d.last_donation, d.location, d.available
           FROM users u JOIN donor_profiles d ON d.user_id = u.id WHERE u.id = ?""", (g.user["sub"],)).fetchone()
    if not row:
        return jsonify(error="Donor profile not found"), 404
    return jsonify(dict(row))


@bp.patch("/me/availability")
@require_auth("donor")
def availability():
    available = bool((request.get_json(silent=True) or {}).get("available"))
    db = get_db()
    db.execute("UPDATE donor_profiles SET available=? WHERE user_id=?", (1 if available else 0, g.user["sub"]))
    db.commit()
    return jsonify(available=available)


@bp.get("/me/notifications")
@require_auth("donor")
def notifications():
    rows = get_db().execute(
        """SELECT n.id AS notification_id, n.status AS notification_status, r.*
           FROM notifications n JOIN blood_requests r ON r.id = n.request_id
           WHERE n.donor_id = ? ORDER BY n.created_at DESC""", (g.user["sub"],)).fetchall()
    return jsonify([dict(r) for r in rows])


@bp.post("/me/notifications/<nid>/respond")
@require_auth("donor")
def respond(nid):
    action = (request.get_json(silent=True) or {}).get("action")
    db = get_db()
    n = db.execute("SELECT * FROM notifications WHERE id=? AND donor_id=?", (nid, g.user["sub"])).fetchone()
    if not n:
        return jsonify(error="Notification not found"), 404
    if action == "accept":
        # Single UPDATE with a guard makes "first donor wins" safe even with simultaneous clicks.
        cur = db.execute(
            "UPDATE blood_requests SET status='accepted', accepted_donor_id=? WHERE id=? AND accepted_donor_id IS NULL",
            (g.user["sub"], n["request_id"]))
        if cur.rowcount == 0:
            db.rollback()
            return jsonify(error="This request has already been accepted by another donor."), 409
        db.execute("UPDATE notifications SET status='accepted' WHERE id=?", (nid,))
        db.execute("UPDATE notifications SET status='closed' WHERE request_id=? AND id!=? AND status='pending'",
                   (n["request_id"], nid))
        db.commit()
        return jsonify(message="Request accepted.")
    if action == "decline":
        db.execute("UPDATE notifications SET status='declined' WHERE id=?", (nid,))
        db.commit()
        return jsonify(message="Request declined.")
    return jsonify(error="action must be accept or decline"), 400
