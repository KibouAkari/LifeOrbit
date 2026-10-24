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

## Google configuration troubleshooting

Frontend Vercel build variable: `VITE_GOOGLE_CLIENT_ID` (public OAuth Web client ID).
Backend Vercel variable: `GOOGLE_CLIENT_ID` (same client ID).
The frontend `VITE_API_BASE_URL` is the backend HTTPS origin without `/api`.
Configure `FRONTEND_ORIGINS` with the exact frontend origins separated by commas,
and list every relevant frontend origin as an authorized JavaScript origin in
Google Cloud. Vercel environment changes require a new deployment.

Registration uses `/api/auth/register`; passwords are bcrypt-hashed.
Google accounts with an email already registered via password are not automatically
linked. Before a public launch, configure rate limiting, email verification,
account recovery, indexes and robust session lifecycle handling.
