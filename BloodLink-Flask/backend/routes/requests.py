"""Blood requests: create (auto-matching runs here), list own, accepted donor."""
import json
import uuid
from datetime import datetime, timezone
from flask import Blueprint, g, jsonify, request
from ..auth_utils import require_auth
from ..database import get_db
from ..services.matching_service import COMPAT, run_match_and_notify

bp = Blueprint("requests", __name__)


@bp.post("")
@require_auth("requester")
def create():
    b = request.get_json(silent=True) or {}
    patient, blood_group, hospital = (b.get("patient") or "").strip(), b.get("bloodGroup"), (b.get("hospital") or "").strip()
    try:
        units = int(b.get("units"))
        assert units >= 1
    except (TypeError, ValueError, AssertionError):
        return jsonify(error="units must be a number of at least 1"), 400
    if not patient or not hospital or blood_group not in COMPAT:
        return jsonify(error="patient, a valid bloodGroup, units and hospital are required"), 400

    db = get_db()
    rid = str(uuid.uuid4())
    db.execute(
        """INSERT INTO blood_requests (id,requester_id,patient,blood_group,units,hospital,required_date,
           required_time,urgency,contact,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,'pending',?)""",
        (rid, g.user["sub"], patient, blood_group, units, hospital, b.get("requiredDate"), b.get("requiredTime"),
         b.get("urgency"), b.get("contact"), datetime.now(timezone.utc).isoformat()))
    db.commit()
    matched = run_match_and_notify(db, rid)  # automatic, no matching page
    row = db.execute("SELECT * FROM blood_requests WHERE id=?", (rid,)).fetchone()
    return jsonify(request=dict(row), matchedDonors=matched)


@bp.get("/mine")
@require_auth("requester")
def mine():
    rows = get_db().execute("SELECT * FROM blood_requests WHERE requester_id=? ORDER BY created_at DESC",
                            (g.user["sub"],)).fetchall()
    out = []
    for r in rows:
        d = dict(r)
        d["matched_donor_ids"] = json.loads(d["matched_donor_ids"])
        out.append(d)
    return jsonify(out)


@bp.get("/<rid>/accepted-donor")
@require_auth("requester")
def accepted_donor(rid):
    db = get_db()
    r = db.execute("SELECT * FROM blood_requests WHERE id=? AND requester_id=?", (rid, g.user["sub"])).fetchone()
    if not r:
        return jsonify(error="Request not found"), 404
    if not r["accepted_donor_id"]:
        return jsonify(accepted=False, message="Waiting for a matching donor to accept your request.")
    d = db.execute(
        """SELECT u.name, u.email, d.blood_group, d.phone, d.location, d.available
           FROM users u JOIN donor_profiles d ON d.user_id = u.id WHERE u.id=?""", (r["accepted_donor_id"],)).fetchone()
    return jsonify(accepted=True, donor=dict(d))
