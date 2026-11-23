# Security assessment and risk register

Updated 23 November 2026. This is a source review and documented test plan. It does **not** constitute an independent penetration test or confirmation that proposed fixes run in production.

## Deployment boundary

- **Production:** current `main` commit, not necessarily the latest proposed functionality. The production shared notebook editor can still display a manual Save button.
- **PR #73:** native Yjs autosave, email password recovery and private friend rankings are implemented in code and CI-checked, but require controlled integration testing and production promotion. Additional review fixes persist CRDT tombstones for deleted pages, carry pending saves across navigation, and avoid truncating the consenting community leaderboard to an arbitrary first 2,000 records.
- **Vercel settings checked 23 November:** the latest production variable-name listing includes **all three**: `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL`. No provider key was decrypted or validated; no mail delivery was proven. No Liveblocks secret/flags were visible.
- A READY deployment or passing unit test is not evidence of correct delivery, private data isolation, multi-user convergence or fully secure operation.

## Threat model

Assets include user identities, password hashes, private notes, calendar subscription URLs, events, friend relationships, shared CRDT state, session cookies, reset tokens and provider credentials. Trust boundaries are the browser, FastAPI, MongoDB Atlas, Vercel's proxy/runtime, external calendar hosts, Resend and optional Liveblocks.

Core threats are credential stuffing, account enumeration, token replay, broken object authorization, stale shares after unfriending, stored/cross-site script injection, NoSQL operator abuse, SSRF through calendar links, data loss on simultaneous edits, provider outages and excessive data retention.

## Findings and controls

| Priority | Area | Present controls | Remaining work |
| --- | --- | --- | --- |
| High | Login and recovery abuse | MongoDB-backed request counters, generic invalid-login response, HMAC reset tokens (PR #73), 30-minute expiry, atomic consume | Validate actual proxy IP trust, thresholds, rate-limit index, email delivery and all lockout paths; consider MFA and monitoring |
| High | Sharing revocation | Remove accepted friendship grants and share memberships; recheck authorization in API | Test open browser/provider sessions and cached content with two accounts; copied data cannot be erased |
| High | Concurrent writing/data loss | Proposed native Yjs text merge; authoritative CRDT; old full-page PUT rejected after migration | Verify reconnect, failure retries, same-page concurrent edits, deletion/restore and provider migration; personal `/workspace` still uses aggregate writes |
| High | Resend secrets/tokens | All required environment variable names are present, server-only key, trusted app URL, digest-only token storage, session version invalidation; Vercel DNS has a non-enforcing DMARC record | Verify actual sender and SPF/DKIM alignment, test real delivery and bounce status, monitor logs, protect the authenticated welcome-resend endpoint and secure retention |
| High | Provider migration and backups | Provider-authoritative rooms tracked separately; native sync rejects dual-authority rooms | Export/restore hosted Yjs and MongoDB CRDT state, verify provider ACL disconnection, define deletion/retention policy |
| High | Privacy, account lifecycle | Community scores require explicit opt-in; private friends ranking uses accepted relationships | Verified email changes, account deletion, complete data export, legal/privacy policy review and deletion across providers |
| Medium | Injection/XSS | Pydantic types, validated ObjectIds, server-chosen MongoDB operators, escaped search regex, CSP | Continue authorized NoSQL, browser XSS, CSP and dependency testing with each change |
| Medium | Remote calendar SSRF | Public-IP DNS validation, pinned TLS, no redirects, response limits, stored URL encryption | Egress restrictions, unusual DNS/IPv6 cases, calendar parser resource limits and recurrence/timezone tests |
| Medium | Dependencies and hosting | CI builds, Python tests, npm/pip audits, security headers, secure cookies, CSRF origin validation | Keep dependencies current, assess package and hosting changes, review previews and leaked secrets |
| Operational | Incident readiness | Documentation, basic health endpoints and release checklist | Monitoring/alerting, secure incident contact, tested backups, migration rollback, quotas and recovery exercises |

### Details and historical mitigations

Earlier security work included minimum Vite/PyJWT/iCalendar version increases, CSRF Origin checks, production OpenAPI restrictions, session-version revocation, default-private community leaderboard settings and tightened note-sharing authorization. These controls are verifiable in source but require deployment checks. Date-sensitive vulnerability claims should be revalidated against current resolved dependency versions rather than assumed from this history.

A confirmed report involved former friends retaining access to shared notes and subsequent edits after unfriending. The code removes duplicate historical friendship rows and both directions of shares, protects notebook reads and writes through current-friend checks, and clears the browser editor after access revocation. Hosted Liveblocks has a separate provider ACL and connection lifecycle. Treat a failure to revoke a connected editor as a potential privacy incident.

LifeOrbit uses MongoDB, **not a SQL engine**. Source-level review did not find a confirmed exploitable NoSQL injection in the inspected typed API routes, and tests reject operator objects and escape friend-search regex. This does not prove freedom from NoSQL/XSS/SSRF/logic vulnerabilities. User-originating calendar data remains a parser and networking risk even with current mitigations.

## Secrets, logs and data handling

No provider secrets or database URI values belong in the repository or in documentation. Historical pattern scans were not a full secrets audit; old Git history, additional branches, hosting config and backups need separate review. Privacy-sensitive screenshots should use synthetic data and be rechecked before publication.

Maintain provider domain authentication (e.g. SPF/DKIM), monitor email delivery status without logging reset links, use least-privilege MongoDB credentials and verify database TTL indexes. Backup both notebook metadata and binary `notebook_crdts` state. Hosted Liveblocks data needs a separate independently tested restore method.

## Welcome email delivery controls

The welcome email is now attempted inline after a successful new account creation, with bounded HTTP timeouts, Resend idempotency keys and sanitized HTTP-status logs. Missing/invalid provider credentials cannot undo registration. Existing users can explicitly request a resend only to their own stored email address, rate-limited per account and IP. No guarantee of exact-once inbox delivery is claimed. The DMARC policy is currently `p=none`; verify alignment and provider outcomes before tightening enforcement. See [Welcome email](WELCOME_EMAIL.md).

## Required release verification

1. Run frontend typecheck/build, Python tests/compile, dependency audits and internal documentation link validation.
2. In a nonproduction preview, confirm `/api/health` and `/api/health/database`, correct server IP extraction and rate limiting, cookies, CSRF and CORS.
3. Use two synthetic accounts: create friendship; share notes, event invitations and challenge scores; unfriend; confirm API and UI denial. Test a stale live session and private/public leaderboard separation.
4. Concurrently edit the same page on two browsers; pause network, reconnect, close tabs during pending writes, delete pages, and restore documents from a backup without data loss.
5. Verify reset emails from the actual sender with a controlled mailbox, token expiration and replay, invalid account response, password hash update and old-session invalidation. Do not test against unrelated users.
6. Review Liveblocks provider access and retention before enabling it; test connected-client ACL revocation and authoritative document migration.
7. Get an independent review and documented sign-off on open high-risk issues before broadening public access.

See [Security policy](../SECURITY.md), [Deployment](DEPLOYMENT.md), [Operations](OPERATIONS.md), [Realtime collaboration](REALTIME_COLLABORATION.md), [Password recovery](PASSWORD_RECOVERY.md) and [Release checklist](RELEASING.md).
