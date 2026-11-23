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
| `RESEND_API_KEY` | Server-only secret | Resend transactional email credential for recovery and one-time welcome messages |
| `PASSWORD_RESET_FROM_EMAIL` | Server only | Verified Resend sender used by password reset and welcome mail |
| `PUBLIC_APP_URL` | Server only | Canonical HTTPS site origin used in email links, e.g. `https://www.lifeorbit.dev` |
| `ENABLE_REALTIME` | Server only | Enable Liveblocks authorization and events only after configuration and tests |
| `LIVEBLOCKS_SECRET_KEY` | Server only, private | Liveblocks server key for room access and broadcast |
| `VITE_REALTIME_ENABLED` | Public flag | Enables realtime client/editor. Keep false until the backend is ready |

Do not expose `MONGODB_URI`, `JWT_SECRET_KEY`, `LIVEBLOCKS_SECRET_KEY` or provider secrets with a `VITE_` prefix.

Hosted realtime collaboration is optional and must be **separately provisioned**. Follow [Realtime collaboration](REALTIME_COLLABORATION.md) before enabling it. Both server and client flags default to false. With merged PR #73, the disabled flag selects the built-in Yjs autosave editor, without requiring a Liveblocks key. The previous manual-save fallback is historical.

## Deployment procedure

1. Provision MongoDB Atlas with a least-privilege application user and appropriate network access.
2. Set environment variables in Vercel for each intended environment, without committing them.
3. Configure Google's Authorized JavaScript origins for the **exact** application origin.
4. Use the existing same-origin `/api` routing; avoid an unnecessary second backend deployment.
5. Deploy a **preview** from the PR and confirm `GET /api/health` responds with JSON.
6. Check `GET /api/health/database` with valid credentials.
7. Run `ensure_indexes()` with an index-management identity. Verify `rate_limits.expires_at` and `password_reset_tokens.expires_at` TTL indexes and application read/write access to `notebook_crdts` and `password_reset_tokens`. Resolve duplicates before creating unique indexes.
8. Test sign-in, registration, Google Sign-In, logout and cookie behaviour, including Origin checks and throttling. Test a real reset email to a dedicated preview account, expiry, single-use consumption and invalidation of older sessions. Verify the welcome email after new password and first-time Google registrations, with no resend on ordinary logins and no signup interruption when email delivery fails. Email changes remain unavailable until verification is implemented.
9. Test with **two real test accounts**: the shared notebook's automatic saving, concurrent Yjs edits, merge after reconnect, unfriend revocation, private friends scores and public opt-in, RSVPs, notifications and permissions.
10. Test calendar import/subscription refresh, including public-address validation and denied private endpoints.
11. Complete the [release checklist](RELEASING.md) before promoting or merging.

**Vercel READY is a build result, not an authentication or database test.** The latest production variable-name listing on 23 November 2026 showed all three recovery variables: `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL`. No Liveblocks variables were found. We did not decrypt the secret values, confirm the configured sender domain or prove email delivery. Native autosave is now part of main. Working password-reset and welcome emails need all three values, a verified Resend sender and a fresh deployment of the relevant feature. The welcome email is under review in PR #74. Do not put private keys under a `VITE_` variable.

## Environment scopes and validation

Vercel distinguishes production, preview and development targets. A PR #74 preview may be READY while its environment lacks production-only `JWT_SECRET_KEY`, Google or Resend settings. Never assume production secrets are copied into preview or vice versa.

Choose `PUBLIC_APP_URL` for the exact deployment that will receive emailed links. A production link must point to the canonical site `https://www.lifeorbit.dev`, provided that domain is still configured. Preview email tests should use a controlled preview URL and synthetic accounts; do not send production reset links from a preview with missing secrets.

Run the complete [release checklist](RELEASING.md) and [operations runbook](OPERATIONS.md), including approved sender verification, no account-enumeration leaks, and document restore tests, before enabling new capabilities for real users.

## Transactional email

Welcome mail uses the same verified sender and canonical application origin as password recovery, so there are no additional required environment variables. The HTML template is in `backend/api/welcome_email.py` and the first-party PNG logo is at `public/assets/email-logo.png`. Before enabling in production, test actual Resend delivery, image loading, plain-text fallback and the dashboard link, using dedicated mailboxes.

See [Welcome email](WELCOME_EMAIL.md) and [Password recovery](PASSWORD_RECOVERY.md). Registration succeeds even when delivery is unavailable; monitor failed background tasks in function logs. FastAPI background delivery is best effort and not a persistent queue.

## Operations

Keep signing and iCalendar encryption secrets stable across deployments until a reviewed rotation plan exists. Confirm the resolved Vite version is at least 6.4.6 on the 6.x line (GHSA-p4f5-76q4-ffq7) and PyJWT is at least 2.15.1. Check transitive dependencies as well. Since private calendar URLs are encrypted using material derived from `JWT_SECRET_KEY`, rotating it without migration may require affected feeds to be reconnected.

Do not expose database secrets, private calendar subscription links or personal content in issue reports or telemetry. For problems, consult [MongoDB setup](MONGODB_SETUP.md), [backend integration](BACKEND_INTEGRATION.md) and the [security review](SECURITY_AUDIT.md).
