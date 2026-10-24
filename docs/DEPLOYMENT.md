# LifeOrbital deployment

## Current approach

One Vercel project serves the Vite/React frontend and a Python Function
from `api/index.py`. The function reuses `backend/api/index.py`.
`requirements.txt` at the project root points at backend dependencies.
Requests under `/api/*` are rewritten to the Python entrypoint.

This replaces the previous proposed two-project configuration; it does
not require a second Vercel project.

## Configure and verify

1. Set server-only MONGODB_URI, MONGODB_DATABASE, JWT_SECRET_KEY,
   GOOGLE_CLIENT_ID, and FRONTEND_ORIGINS in Vercel.
2. Set public VITE_GOOGLE_CLIENT_ID to the same OAuth Web client ID.
3. Remove any stale VITE_API_BASE_URL that points to an absent backend.
4. Add the production HTTPS origin in Google Cloud Authorized JavaScript origins.
5. Trigger a fresh production deployment after merging.
6. Open /api/health and verify JSON, not HTML or 404.
7. Test invalid credentials, sign-in, registration and Google SSO.
8. Verify MongoDB user creation, notes about existing records, and
   per-user access isolation.
9. Provision and verify unique email/google_id indexes in Atlas.
10. Review the remaining blockers in docs/SECURITY_AUDIT.md.

Vercel READY alone is not proof that authentication or MongoDB works.
