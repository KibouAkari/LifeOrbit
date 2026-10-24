# Python API integration

Frontend calls `/api/*` on the current hostname. The root Vercel Python
Function delegates to `backend.api.index.app`.

Implemented routes:
- GET /api/health (process health only)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- GET /api/auth/me
- GET /api/tasks, POST /api/tasks, PATCH/DELETE /api/tasks/{id}
- GET /api/calendar/events, POST /api/calendar/events, DELETE /api/calendar/events/{id}
- GET /api/dashboard/stats

User-owned tasks/events are filtered by JWT subject. New registrations use
MongoDB IDs, including Google registration. Older records from the original
Google-subject system may require migration before users can see them.

**Not yet backend-backed:** notes, subscriptions, challenge score, leaderboard,
profile editing, password reset, account deletion and export.

## OAuth and credentials

VITE_GOOGLE_CLIENT_ID is public and exists only in the frontend build.
GOOGLE_CLIENT_ID, MONGODB_URI and JWT_SECRET_KEY must remain server-side.
With same-origin API, omit VITE_API_BASE_URL. The OAuth Web client must allow
the exact deployed HTTPS origin; Vercel environment changes require redeploy.

## Production risks

Short-lived bearer tokens currently remain in sessionStorage. They need
reviewed session invalidation, refresh/revocation, and XSS protections.
Password endpoints need durable per-account and per-IP throttling,
email verification and recovery flows. See security audit.
