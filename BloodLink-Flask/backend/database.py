"""SQLite persistence (standard-library sqlite3 - no separate DB server needed)."""
import os
import sqlite3
from flask import g
from .config import Config

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  role TEXT NOT NULL CHECK(role IN ('donor','requester')),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS donor_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  department TEXT, year TEXT,
  blood_group TEXT NOT NULL, phone TEXT NOT NULL,
  last_donation TEXT, location TEXT,
  available INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS requester_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT
);
CREATE TABLE IF NOT EXISTS otps (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  otp_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS blood_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL REFERENCES users(id),
  patient TEXT NOT NULL, blood_group TEXT NOT NULL, units INTEGER NOT NULL,
  hospital TEXT NOT NULL, required_date TEXT, required_time TEXT,
  urgency TEXT, contact TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  matched_donor_ids TEXT NOT NULL DEFAULT '[]',
  accepted_donor_id TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  donor_id TEXT NOT NULL REFERENCES users(id),
  request_id TEXT NOT NULL REFERENCES blood_requests(id),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL
);
"""


def init_db():
    os.makedirs(os.path.dirname(Config.DATABASE_FILE), exist_ok=True)
    conn = sqlite3.connect(Config.DATABASE_FILE)
    conn.executescript(SCHEMA)
    conn.commit()
    conn.close()


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(Config.DATABASE_FILE)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


def close_db(_=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()
