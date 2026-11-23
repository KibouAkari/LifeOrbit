# Deployment and environment

LifeOrbit deploys the Vite/React frontend and the Python FastAPI backend in **one Vercel project**. The Vercel function at `api/index.py` delegates to `backend/api/index.py`; `vercel.json` routes `/api/*` to it.

## Configuration

| Variable | Visibility | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Server only | Atlas connection string; contains credentials |
| `MONGODB_DATABASE` | Server only | Database name, usually `lifeorbit` |
| `JWT_SECRET_KEY` | Server only | Session signing key and current iCal URL encryption derivation |
| `GOOGLE_CLIENT_ID` | Server only | Verify Google identity tokens |
| `VITE_GOOGLE_CLIENT_ID` | Public | Browser Google sign-in client identifier |
| `FRONTEND_ORIGINS` | Server only | Exact allowed frontend origin(s) |
| `AUTH_COOKIE_SAMESITE` | Server only | Use strict for the normal same-origin deployment |
| `VITE_API_BASE_URL` | Public | Leave empty for same-origin API |
| `RESEND_API_KEY` | Server-only secret | Resend transactional email API credential for recovery |
| `PASSWORD_RESET_FROM_EMAIL` | Server only | Verified Resend sending address for password reset |
| `PUBLIC_APP_URL` | Server only | Canonical HTTPS site origin used in email links, e.g. `https://www.lifeorbit.dev` |
| `ENABLE_REALTIME` | Server only | Enable Liveblocks authorization and events only after configuration and tests |
| `LIVEBLOCKS_SECRET_KEY` | Server only, private | Liveblocks server key for room access and broadcast |
| `VITE_REALTIME_ENABLED` | Public flag | Enables realtime client/editor. Keep false until the backend is ready |

Do not expose `MONGODB_URI`, `JWT_SECRET_KEY`, `LIVEBLOCKS_SECRET_KEY` or provider secrets with a `VITE_` prefix.

Realtime collaboration is optional and must be **separately provisioned**. Follow [Realtime collaboration](REALTIME_COLLABORATION.md) before enabling it. Both server and client flags default to false. Existing deployments continue using the legacy editor and polling when the flags are disabled.

## Deployment procedure

1. Provision MongoDB Atlas with a least-privilege application user and appropriate network access.
2. Set environment variables in Vercel for each intended environment, without committing them.
3. Configure Google's Authorized JavaScript origins for the **exact** application origin.
4. Use the existing same-origin `/api` routing; avoid an unnecessary second backend deployment.
5. Deploy a **preview** from the PR and confirm `GET /api/health` responds with JSON.
6. Check `GET /api/health/database` with valid credentials.
7. Run `ensure_indexes()` with an index-management identity. Verify `rate_limits.expires_at` and `password_reset_tokens.expires_at` TTL indexes and application read/write access to `notebook_crdts` and `password_reset_tokens`. Resolve duplicates before creating unique indexes.
8. Test sign-in, registration, Google Sign-In, logout and cookie behaviour, including Origin checks and throttling. Test a real reset email to a dedicated preview account, expiry, single-use consumption and invalidation of older sessions. Email changes remain unavailable until verification is implemented.
9. Test with **two real test accounts**: the shared notebook's automatic saving, concurrent Yjs edits, merge after reconnect, unfriend revocation, private friends scores and public opt-in, RSVPs, notifications and permissions.
10. Test calendar import/subscription refresh, including public-address validation and denied private endpoints.
11. Complete the [release checklist](RELEASING.md) before promoting or merging.

**Vercel READY is a build result, not an authentication or database test.** Vercel's production environment inspected on 23 November 2026 has no Liveblocks or Resend recovery variables configured. Native autosave needs no external key once PR #73 is deployed; actual password-reset emails require a verified Resend sender, `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL`, and `PUBLIC_APP_URL` followed by a redeployment. Never put the Resend key under a `VITE_` variable.

## Operations

Keep signing and iCalendar encryption secrets stable across deployments until a reviewed rotation plan exists. Confirm the resolved Vite version is at least 6.4.6 on the 6.x line (GHSA-p4f5-76q4-ffq7) and PyJWT is at least 2.15.1. Check transitive dependencies as well. Since private calendar URLs are encrypted using material derived from `JWT_SECRET_KEY`, rotating it without migration may require affected feeds to be reconnected.

Do not expose database secrets, private calendar subscription links or personal content in issue reports or telemetry. For problems, consult [MongoDB setup](MONGODB_SETUP.md), [backend integration](BACKEND_INTEGRATION.md) and the [security review](SECURITY_AUDIT.md).
