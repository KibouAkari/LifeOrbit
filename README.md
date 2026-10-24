# LifeOrbital

A thoughtful place for your schedule, tasks, notes, subscriptions and daily challenges.

<img src="assets/icon.svg" width="86" alt="LifeOrbital icon"/>

## Run the frontend

Node.js 22 recommended.

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

## Run the Python API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

Copy `backend/.env.example` to `backend/.env` and supply `MONGODB_URI`, `MONGODB_DATABASE`, `GOOGLE_CLIENT_ID`, `JWT_SECRET_KEY` (at least 32 characters), and `FRONTEND_ORIGINS`. Do **not** commit .env files.

For the frontend set `VITE_GOOGLE_CLIENT_ID` to the Google OAuth web client ID; optionally set `VITE_API_BASE_URL` to the Python API origin (without /api). During local development, Vite proxies /api to localhost:8000.

## Account setup and OAuth

The frontend uses **VITE_GOOGLE_CLIENT_ID**, not GOOGLE_CLIENT_ID. Set that public client ID in the **frontend Vercel project** for Production and Preview as needed, then redeploy. The backend separately requires GOOGLE_CLIENT_ID, JWT_SECRET_KEY, MONGODB_URI and FRONTEND_ORIGINS. Google Cloud must list the exact HTTPS frontend origin under Authorized JavaScript origins.

Email/password accounts use bcrypt-hashed passwords and MongoDB. Register and sign-in endpoints: POST /api/auth/register and POST /api/auth/login. Run the index creation helper before accepting public registration. Session tokens still require security review and operational testing.

## Current integration status

| Feature | State |
| --- | --- |
| Google login | API + frontend integration implemented; requires configured Google client ID, MongoDB and tested deployment |
| Tasks | Authenticated MongoDB CRUD and ordering; drag/drop, completion feedback |
| Calendar | Authenticated MongoDB create/list/delete with weekly view |
| Notes | Local browser storage only |
| Subscriptions | Local browser storage; monthly/yearly renewal projections, no payment integration |
| Challenges and ranking | Local progress and graphic **sample** podium, not a live multiplayer service |
| Reminders and account controls | Not production ready |

Guest data is stored on the current device. Signed-in data must be isolated from guest records; backend-backed features are enabled only with Google authentication.

## Before public launch

Validate the full frontend build, Python import/tests, Google OAuth origins,
MongoDB indexes, actual deployed CORS, rate limiting, refresh/session storage
strategy, privacy controls, and all user-data endpoints. Bearer tokens currently
use sessionStorage as a temporary integration; migrate to a reviewed session
design before storing sensitive production data.

See [Backend integration](docs/BACKEND_INTEGRATION.md), [Design system](docs/DESIGN_SYSTEM.md),
[Contributing](CONTRIBUTING.md) and [Changelog](CHANGELOG.md).
