# Python backend integration

The frontend and Python API are separate Vercel projects. In Vercel, set the backend project's **root directory to `backend`** and leave the frontend's root at the repository root. Test the Vercel Python runtime configuration before enabling deployment.

The API entrypoint is `backend/api/index.py`, exporting `app`. The backend currently implements `GET /api/health`; other routes deliberately return HTTP 501 until authentication and database access are secure.

Local backend development:

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn api.index:app --reload --port 8000
```

Frontend uses Vite's `/api` proxy locally. For deployments set `VITE_API_BASE_URL` to a **public** backend URL, never MongoDB credentials. MongoDB URI belongs only in backend environment settings. Configure allowed origins and cookie/CSRF settings before authentication is introduced.

Suggested order: account/session design, MongoDB collections and indexes, Pydantic schemas, authorization, CRUD routes, shared typed API methods, removal of browser-local persistence. For reminders, use a dedicated scheduled job and idempotency rules.
