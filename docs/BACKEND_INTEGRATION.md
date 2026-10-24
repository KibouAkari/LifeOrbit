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

**Not yet fully implemented:** new-email verification, password recovery, account deletion and fully server-authoritative challenge scoring. A real account leaderboard is implemented, but competitive actions are not independently verified. Challenge points are not server-authoritative.

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

## Additional live routes

- `/api/friends`: discover, request, accept, decline and remove friends.
- `/api/sharing`: private note shares, event invitations/RSVPs, participants and shared challenge proposals.
- `/api/shared-notebooks`: create notebooks, invite friends, save/delete pages and move a private note to a shared notebook.
- `/api/calendar/feeds`: subscribe, refresh and remove validated public HTTPS iCalendar feeds.
- `/api/notifications`: authenticated unread invitations and task reminders with dismissal.
- `/api/leaderboard`: participant ranking based on stored user/challenge data.

See [Social & Calendar](SOCIAL_AND_CALENDAR.md) for access and synchronization details and [API implementation](../backend/api/index.py) for mounted routes.
