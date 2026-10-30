"""Automatic matching: runs inside the request-creation route, no UI page."""
import json
import uuid
from datetime import datetime, timezone
from .email_service import EmailError, send_match_email

COMPAT = {  # recipient group -> donor groups that can donate to it
    "O-": ["O-"], "O+": ["O-", "O+"],
    "A-": ["O-", "A-"], "A+": ["O-", "O+", "A-", "A+"],
    "B-": ["O-", "B-"], "B+": ["O-", "O+", "B-", "B+"],
    "AB-": ["O-", "A-", "B-", "AB-"],
    "AB+": ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"],
}


def find_compatible_donors(db, blood_group):
    groups = COMPAT.get(blood_group, [])
    if not groups:
        return []
    marks = ",".join("?" * len(groups))
    return db.execute(
        f"""SELECT u.id, u.name, u.email, d.blood_group, d.phone, d.location
            FROM donor_profiles d JOIN users u ON u.id = d.user_id
            WHERE d.available = 1 AND u.email_verified = 1 AND d.blood_group IN ({marks})""",
        groups,
    ).fetchall()


def run_match_and_notify(db, request_id):
    req = db.execute("SELECT * FROM blood_requests WHERE id=?", (request_id,)).fetchone()
    if not req:
        return 0
    donors = find_compatible_donors(db, req["blood_group"])
    db.execute(
        "UPDATE blood_requests SET matched_donor_ids=?, status=? WHERE id=?",
        (json.dumps([d["id"] for d in donors]), "donor_notified" if donors else "matching", request_id),
    )
    now = datetime.now(timezone.utc).isoformat()
    for d in donors:
        db.execute(
            "INSERT INTO notifications (id,donor_id,request_id,status,created_at) VALUES (?,?,?,'pending',?)",
            (str(uuid.uuid4()), d["id"], request_id, now),
        )
    db.commit()
    for d in donors:  # email failures must never break the request
        try:
            send_match_email(d["email"], req)
        except EmailError as e:
            print(f"[email] could not notify {d['email']}: {e}")
    return len(donors)
