# Python API integration

Frontend calls `/api/*` on the current hostname. The root Vercel Python
Function delegates to `backend.api.index.app`.

Implemented routes:
- GET /api/health (process health only)
- GET /api/health/database (MongoDB ping; 503 when unavailable)
- POST /api/auth/register
- POST /api/auth/login
- POST /api/auth/google
- PATCH /api/auth/password (throttled; revokes earlier sessions)
- GET /api/auth/me; PATCH /api/auth/me for profile edits; GET /api/auth/export
- GET /api/tasks, POST /api/tasks, PATCH/DELETE /api/tasks/{id}
- GET /api/calendar/events, POST /api/calendar/events, DELETE /api/calendar/events/{id}
- GET/PUT /api/workspace (notes, chapters, subscriptions and personal challenges)
- GET /api/dashboard/stats

User-owned tasks/events are filtered by JWT subject. New registrations use
MongoDB IDs, including Google registration. Older records from the original
Google-subject system may require migration before users can see them.

**Not yet fully implemented:** verified email changes (intentionally blocked), password recovery, account deletion and fully server-authoritative challenge scoring. A real account leaderboard is implemented, but competitive actions are not independently verified. Challenge points are not server-authoritative.

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

Short-lived signed tokens are held in Secure HttpOnly SameSite cookies. A per-account
session version revokes older tokens after logout and password changes; logging
out currently invalidates all devices. MongoDB-backed rate limits guard public
authentication endpoints, and cookie-authenticated writes require an allowed Origin.
Email changes remain disabled until address verification exists.
The current login policy allows 60 attempts per IP and 20 per email per 15 minutes. Password changes are separately limited to 30 per IP and 8 per account per 15 minutes. Counter failures must stop authorization instead of allowing uncounted requests. Pydantic rejects non-string credential/operator values; MongoDB queries do not interpolate untrusted operator objects. Password recovery, selective per-device revocation and independently verified
XSS/CSP protection still require further work. See security audit.

## Additional live routes

- `/api/friends`: discover, request, accept, decline and remove friends.
- `/api/sharing`: private note shares, event invitations/RSVPs, participants and shared challenge proposals.
- `/api/shared-notebooks`: create notebooks, invite friends, save/delete pages and move a private note to a shared notebook.
- `/api/calendar/feeds`: subscribe, refresh and remove validated public HTTPS iCalendar feeds.
- `/api/notifications`: authenticated unread invitations and task reminders with dismissal.
- `GET /api/leaderboard`: returns `friends` (accepted friends plus viewer, regardless of public opt-in), `participants` (community opt-ins plus viewer), and `opted_in`. Other users' account IDs and email addresses are not returned.

See [Social & Calendar](SOCIAL_AND_CALENDAR.md) for access and synchronization details and [API implementation](../backend/api/index.py) for mounted routes.
