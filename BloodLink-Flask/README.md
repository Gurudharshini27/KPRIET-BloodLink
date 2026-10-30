# BloodLink – Blood Donor and Blood Request Matching Platform (Python / Flask)

Donors register and verify their email with an OTP, then mark themselves **Available / Not Available**.
Requesters submit a blood request; the backend **automatically** finds available donors with a compatible
blood group (ABO/Rh rules), notifies them (in-app + email), and the first donor to accept is linked to the
request. The requester then sees the donor's details and can call them. There is no matching page.

**Stack:** Python 3.10+, Flask, SQLite (`sqlite3`), bcrypt, PyJWT, Resend email API, HTML/CSS/JS frontend.

## Project structure
```
BloodLink/
├── app.py                      # Flask entry point (serves API + frontend)
├── requirements.txt
├── .env.example                # copy to .env (never commit .env)
├── backend/
│   ├── config.py               # settings from .env
│   ├── database.py             # SQLite schema + connection
│   ├── auth_utils.py           # JWT creation + role-protected routes
│   ├── routes/
│   │   ├── auth.py             # register, verify-otp, resend-otp, login
│   │   ├── donors.py           # profile, availability, notifications, accept/decline
│   │   └── requests.py         # create request (auto-match), my requests, accepted donor
│   └── services/
│       ├── email_service.py    # real email via Resend (raises if not configured)
│       ├── otp_service.py      # secure OTP: hashed, 5 min, 5 attempts, 30 s cooldown
│       └── matching_service.py # blood compatibility + notifications
├── database/                   # bloodlink.db is created here on first run
└── frontend/                   # index.html, css/style.css, js/app.js
```

## Run locally
```bash
python -m venv venv
venv\Scripts\activate            # Windows      (Mac/Linux: source venv/bin/activate)
pip install -r requirements.txt
copy .env.example .env           # Mac/Linux: cp .env.example .env
python app.py
```
Open **http://localhost:5000**. One command serves both the website and the API.

## Email (Resend) setup
1. Create a free account at https://resend.com and make an API key.
2. In `.env` set `RESEND_API_KEY=...`, `EMAIL_FROM=onboarding@resend.dev` and a long random `JWT_SECRET`.
3. With `onboarding@resend.dev`, Resend only delivers to **your own Resend account email**; to email other
   people, verify a domain in Resend and use an address on it.

If no key is set the app still runs: accounts and OTPs are created, but the email is *not* sent, the UI shows an
"email not configured" banner, and the app never claims an email was sent. The OTP is never returned by the API.

## Test the whole flow
1. **Donor Register** (your Resend account email) → enter the 6-digit code from your inbox → **Login** → Dashboard → **Available**.
2. **Requester Login → Create Account** (use a second email you can read, or the same Resend-account email with a "+tag" if supported) → verify.
3. **Blood Request** → submit → you land on **My Requests** (status *Donor Notified*).
4. Log in as the donor → **Notifications** → **Accept**.
5. Back as the requester → status *Accepted* → **View Accepted Donor** → **Call Donor**.

## API
| Method & path | Purpose | Access |
|---|---|---|
| POST `/api/auth/register` | validate, create unverified user, send OTP | public |
| POST `/api/auth/verify-otp` | check OTP, activate account | public |
| POST `/api/auth/resend-otp` | new OTP (30 s cooldown) | public |
| POST `/api/auth/login` | password + verified check, returns JWT | public |
| GET `/api/donors/me` | donor profile | donor |
| PATCH `/api/donors/me/availability` | Available / Not Available | donor |
| GET `/api/donors/me/notifications` | matched requests | donor |
| POST `/api/donors/me/notifications/<id>/respond` | accept / decline | donor |
| POST `/api/requests` | create request, auto-match, notify | requester |
| GET `/api/requests/mine` | own requests + status | requester |
| GET `/api/requests/<id>/accepted-donor` | donor details after acceptance | requester |
| GET `/api/health` | status + email-configured flag | public |

## Push to GitHub
```bash
git init
git add .
git commit -m "BloodLink: Flask backend, OTP verification, auto-matching"
git branch -M main
git remote add origin https://github.com/<your-username>/BloodLink.git
git push -u origin main
```
`.gitignore` already excludes `.env`, `venv/` and the database file, so no secrets are pushed.

## Team
Gurudharshini S (25AD049), Ashwin V (25AD017), Dharshana J (25AD035), Divyabharathi Y (25AD040) –
B.Tech Artificial Intelligence and Data Science, KPR Institute of Engineering and Technology.
