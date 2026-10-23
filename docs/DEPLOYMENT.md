# Vercel frontend and future Python / MongoDB deployment

## Frontend (ready for Vercel)

The repository root is the Vite project. Import the GitHub repository in
Vercel. Framework preset **Vite**, install command `npm install`, build command
`npm run build`, output directory `dist`.

Locally:

```bash
npm install
npm run typecheck
npm run build
npm run preview
```

Vercel preview deployments should be checked before promoting production.
The app currently uses hash URLs (e.g. `/#/notes`), so no custom SPA rewrite
is needed. SVG assets are served from `public/assets`.

## Backend (not implemented)

Planned: Python + FastAPI, with MongoDB accessed only from the Python service.
Choose backend hosting separately. It must expose HTTPS before connecting
Vercel production, and needs separate managed secrets:
`MONGODB_URI`, cookie signing keys and provider credentials.

The frontend has `src/react/data/api.ts` and Vite's dev-time proxy to
`http://127.0.0.1:8000` for `/api`. For separate backend origins,
set `VITE_API_BASE_URL` to a **public API base URL only** at build time.
`VITE_*` values are embedded in the browser bundle and must never contain
MongoDB URIs, private keys or bearer tokens.

If using credentialed cross-origin browser requests, configure the Python
API's allowed origins and cookie attributes intentionally; review CSRF.
Do not assume a simple CORS wildcard is safe or sufficient.

## Before production

1. Real backend and authenticated sessions.
2. Server-side per-user authorization and input validation.
3. MongoDB migrations/indexes, backups and data retention.
4. Secret management, HTTPS, observability and rate limiting.
5. Reliable scheduled reminders, tests and a deployed health check.

None of those production requirements are implemented yet.
