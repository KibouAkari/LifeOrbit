<div align="center">

<img src="assets/icon.svg" alt="LifeOrbital" width="88"/>

# LifeOrbital

**Less organising. More living.**

Your tasks, calendar, notes, subscriptions and everyday progress in one thoughtful workspace.

</div>

## Start locally

Requirements: Node.js 22, npm, Python 3.12.

```bash
npm install
npm run dev
```

The frontend runs at http://localhost:5173. To start the FastAPI backend
locally in a second terminal:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.api.index:app --reload --port 8000
```

Vite proxies `/api` to port 8000 in local development.

## Deploy

The **existing Vercel project** builds the Vite frontend and now includes a
root `api/index.py` Python Function that exports the FastAPI app from
`backend/api/index.py`. Both share one hostname, so `/api/*` routes no longer
need a separate project. This still requires deployment verification.

Configure the *same Vercel project* with:

| Environment variable | Where used |
| --- | --- |
| `MONGODB_URI` | Python only. Never expose to Vite |
| `MONGODB_DATABASE` | Python only |
| `JWT_SECRET_KEY` | Python only; random high-entropy secret |
| `GOOGLE_CLIENT_ID` | Python token verification |
| `VITE_GOOGLE_CLIENT_ID` | Public OAuth web client ID bundled at build time |
| `FRONTEND_ORIGINS` | Python CORS origins, exact HTTPS hostnames |

Do **not** set `VITE_API_BASE_URL` for the same-origin deployment, or set
it to the frontend origin without an `/api` suffix. A stale API URL will keep
sending requests to the wrong host. Rebuild and redeploy when changing Vite
variables.

Check `https://<your-host>/api/health` before testing login. A JSON health
response proves routing, but not MongoDB connectivity. Configure Atlas network
access and provision indexes using `backend.api.database.ensure_indexes()`
once during setup, after making sure indexes do not conflict with old data.

## What works

React and TypeScript pages, themes, tasks, week calendar, notebook-style notes,
recurring-subscription projections and challenges. Python implements Google
login, password login/registration and owner-scoped task and calendar endpoints.

**Limits:** Notes, subscriptions and challenges still use browser-local state,
while the leaderboard contains fictional demo scores. Password recovery,
email verification, account deletion and a production-grade session mechanism
remain to be implemented. Do not use for sensitive personal data yet.

## Quality gates

```bash
npm run typecheck
npm run build
npm audit --audit-level=high
python -m compileall -q backend api
pip-audit -r backend/requirements.txt
```

GitHub Actions runs security checks on pull requests and weekly. See
[security findings](docs/SECURITY_AUDIT.md),
[backend integration](docs/BACKEND_INTEGRATION.md),
[frontend guide](docs/FRONTEND_GUIDE.md),
[contributing](CONTRIBUTING.md), and [changelog](CHANGELOG.md).

## Collaboration

Developers work on separate page modules in `src/react/pages`; changes
to shared layout, API types and global CSS require review. Document
user-facing changes under **Unreleased** before merging.

Licensed under [MIT](LICENSE).
