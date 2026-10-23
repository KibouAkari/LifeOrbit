# Frontend to Python API

## Implemented

The FastAPI backend now exposes:

- POST /api/auth/google: verify Google credential, upsert Google subject, return signed JWT
- GET /api/auth/me: retrieve current profile
- GET/POST/DELETE /api/calendar/events: owner-scoped calendar events
- GET/POST/PATCH/DELETE /api/tasks: owner-scoped task management and ordering
- GET /api/dashboard/stats: event and task counts
- GET /api/health: process health (not DB readiness)

React uses `src/react/data/api.ts` as the common HTTP boundary. Vite proxies
`/api` locally. Vercel should deploy the frontend and backend as separate
projects, setting `VITE_API_BASE_URL` to the Python origin.

Backend environment variables: `MONGODB_URI`, `MONGODB_DATABASE`,
`GOOGLE_CLIENT_ID`, a strong `JWT_SECRET_KEY`, and explicit
`FRONTEND_ORIGINS`. Frontend gets the PUBLIC Google client ID as
`VITE_GOOGLE_CLIENT_ID`. Never expose MongoDB or signing secrets to Vite.

## Still required for production

- Use an audited session strategy (the current 2-hour bearer token lives in
  sessionStorage, which is vulnerable to JavaScript injection).
- Add rate limiting, logging, MongoDB unique index on users.google_id and
  per-user index on tasks/events.
- Add secure account deletion/export and privacy policy.
- Implement owner-scoped notes, subscriptions, challenges and leaderboard APIs.
- Verify Vercel Python deploys and production OAuth credentials end-to-end.
- Replace demo ranking with real opt-in scoring and enforce points server-side.

Do not remove the sample ranking disclaimer until an authenticated leaderboard exists.
