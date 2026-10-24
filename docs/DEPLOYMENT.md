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
| `AUTH_COOKIE_SAMESITE` | Server only | Cookie SameSite policy for your architecture |
| `VITE_API_BASE_URL` | Public | Leave empty for same-origin API |

Do not expose `MONGODB_URI`, `JWT_SECRET_KEY` or provider secrets with a `VITE_` prefix.

## Deployment procedure

1. Provision MongoDB Atlas with a least-privilege application user and appropriate network access.
2. Set environment variables in Vercel for each intended environment, without committing them.
3. Configure Google's Authorized JavaScript origins for the **exact** application origin.
4. Use the existing same-origin `/api` routing; avoid an unnecessary second backend deployment.
5. Deploy a **preview** from the PR and confirm `GET /api/health` responds with JSON.
6. Check `GET /api/health/database` with valid credentials.
7. Confirm schema/index provisioning and resolve any duplicate records before creating unique indexes.
8. Test registration, email/password sign-in, Google sign-in, logout and cookie behaviour.
9. Test with **two real test accounts**: data isolation, friends, notes, RSVPs, notifications and permissions.
10. Test calendar import/subscription refresh, including public-address validation and denied private endpoints.
11. Complete the [release checklist](RELEASING.md) before promoting or merging.

**Vercel READY is a build result, not an authentication or database test.**

## Operations

Keep signing and iCalendar encryption secrets stable across deployments until a reviewed rotation plan exists. Since private calendar URLs are encrypted using material derived from `JWT_SECRET_KEY`, rotating it without migration may require affected feeds to be reconnected.

Do not expose database secrets, private calendar subscription links or personal content in issue reports or telemetry. For problems, consult [MongoDB setup](MONGODB_SETUP.md), [backend integration](BACKEND_INTEGRATION.md) and the [security review](SECURITY_AUDIT.md).
