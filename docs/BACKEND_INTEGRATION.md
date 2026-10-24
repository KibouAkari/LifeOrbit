# Python API integration

Frontend calls `/api/*` on the current hostname. The root Vercel Python
Function delegates to `backend.api.index.app`.

Implemented routes:
- GET /api/health (process health only)
- GET /api/health/database (MongoDB ping; 503 when unavailable)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- GET /api/auth/me; PATCH /api/auth/me for profile edits; GET /api/auth/export
- GET /api/tasks, POST /api/tasks, PATCH/DELETE /api/tasks/{id}
- GET /api/calendar/events, POST /api/calendar/events, DELETE /api/calendar/events/{id}
- GET/PUT /api/workspace (notes, chapters, subscriptions and personal challenges)
- GET /api/dashboard/stats

User-owned tasks/events are filtered by JWT subject. New registrations use
MongoDB IDs, including Google registration. Older records from the original
Google-subject system may require migration before users can see them.

**Not yet backend-backed:** verified email, password reset, account deletion,
and real public leaderboards. Challenge points are not server-authoritative.

## OAuth and credentials

VITE_GOOGLE_CLIENT_ID is public and exists only in the frontend build.
GOOGLE_CLIENT_ID, MONGODB_URI and JWT_SECRET_KEY must remain server-side.
With same-origin API, omit VITE_API_BASE_URL. The OAuth Web client must allow
the exact deployed HTTPS origin; Vercel environment changes require redeploy.
For a separate API origin, set VITE_API_BASE_URL in the frontend, add its exact
origin to FRONTEND_ORIGINS, and use credentials-enabled CORS. Keep
AUTH_COOKIE_SAMESITE=strict for same-site origins; use `none` for a cross-site
frontend/API pair (HTTPS is required).

## Production risks

Short-lived tokens are now held in Secure HttpOnly SameSite cookies. They still need
reviewed session invalidation, refresh/revocation, and XSS protections.
Password endpoints need durable per-account and per-IP throttling,
email verification and recovery flows. See security audit.
