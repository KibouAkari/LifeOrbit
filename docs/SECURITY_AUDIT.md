# Security review · 24 October 2026

## Findings

| Severity | Finding | Status |
| --- | --- | --- |
| Critical to functionality | Vite-only deployment returned 404 for /api routes | Added root Python function and route rewrite; deployment verification outstanding |
| High | API source used inconsistent absolute imports under a monorepo | Converted to one backend package namespace |
| High | Login endpoints have no effective brute-force protection | Open: configure Vercel WAF / durable per-account and per-IP throttling before launch |
| High | Access tokens stored in sessionStorage, exposed to XSS | Open: migrate to secure, HttpOnly server-managed sessions |
| High | Public email/password registration lacks verified email and recovery | Open: block public signup until verified flows exist |
| High | Other account data features remain browser-local while signed in | Open: database-backed notes, subscriptions, challenges and privacy controls |
| Medium | No vulnerability scanning in CI | Added Python audit and npm audit jobs; examine actual reports |
| Medium | MongoDB indexes were only defined, not provisioned | Documented one-time index step |
| Medium | Legal documents contain placeholders | Open: fill operator identity, contact, region, rights and retention |
| Medium | No authenticated account deletion/export | Open |
| Medium | No automated integration tests against MongoDB Atlas | Open |
| Medium | Google OAuth origin/client ID must be verified in Vercel + Google Cloud | Open |

## Release decision

**Not approved for public production.** CI or Vercel build completion
is not proof of secure authentication. A safe release requires verifying
API health on the deployed hostname, testing signup/login and Google SSO,
securing sessions and abuse prevention, checking user isolation, and completing
legal privacy notices.

Never commit live secrets or put MONGODB_URI / JWT_SECRET_KEY in VITE_ variables.
