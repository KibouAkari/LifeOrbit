# LifeOrbit security review

Updated 11 November 2026. Scope: static source and documentation review on the default branch, plus proposed changes on the security branch. This is not an independent penetration test, runtime scan or production certification.

## Mitigations proposed

| Severity | Finding | Proposed mitigation |
| --- | --- | --- |
| Critical, conditional | Vite <=6.4.5 is affected by GHSA-p4f5-76q4-ffq7 (10 November 2026). The reported RCE requires deliberate network exposure of the development server. | Require Vite >=6.4.6 on the 6.x line; keep the development server bound to loopback. This finding does not establish production exploitation. |
| High | Broad PyJWT requirement permitted security-affected old releases. | Raise minimum to PyJWT 2.15.1 and monitor resolved dependencies. |
| Medium | iCalendar 6.x permitted known alarm-expansion resource exhaustion issues in other use patterns (GHSA-qjcq-q7h7-r74v). | Require iCalendar >=7.3.0 and add parsing compatibility tests. The current routes do not directly call the affected alarm expansion functionality. |
| High | Authentication endpoints had no persistent throttling. | Use atomic MongoDB rate limits by trusted client IP and account identifier; store HMAC-based keys only, return 429 with Retry-After and provision TTL cleanup. |
| High | Password changes/logouts left older JWTs valid until expiry. | Verify session versions against the account on every authenticated request; increment on logout/password change and issue a fresh cookie after a password change. |
| High | Unfriending did not revoke shared-notebook memberships. | Remove memberships in both directions and revalidate friendship for notebook listing, reads and edits. |
| High | Accounts could change to unverified email addresses. | Disable changes until a verified email-delivery challenge is available. This intentionally restricts functionality. |
| High | The leaderboard previously enabled public participation for newly saved workspaces without affirmative consent. | Change defaults to off and require a new explicit consent flag. Existing implicitly enrolled accounts must reopt in manually. |
| Medium | Cookie-authenticated writes were not independently checked against cross-origin requests. | Require trusted Origin for cookie-backed POST, PATCH, PUT and DELETE. |
| Medium | Production OpenAPI schema remained publicly accessible. | Disable OpenAPI in production. |
| Medium | Missing explicit web response protections. | Add CSP tuned for Google Identity Services, HSTS, anti-framing and COOP. Browser compatibility must still be tested. |
| Low | Certain malformed calendar URLs could raise an unhandled parse error. | Return HTTP 400 for URL parsing failures. |
| Operational | Backend security regressions lacked CI execution and dependency update prompts. | Include backend unit tests in security CI, and configure Dependabot. |
| Medium | Some authenticated endpoints permitted unbounded growth or repeated remote calendar fetching. | Add notebook and notification-state bounds and persistent per-account/IP calendar-fetch limits. Further storage quotas remain necessary. |

## Sensitive information and documentation

Targeted pattern checks covered 32 current tracked Markdown files, hackathon documentation, environment examples and major backend files. Checks included private-key markers, recognizable credential/token prefixes, non-placeholder MongoDB URIs, hard-coded credential assignments, email addresses, IPv4 strings and phone-like numbers. No matches requiring removal were identified in this checked current source.

**Limitations:** Pattern matching cannot establish that every secret is absent. Past Git history, branch contents outside this reviewed tree, Vercel environment variables, MongoDB, private communications, build artifacts and binary screenshots were not fully audited. Public documentation references the project and its domain intentionally. Review screenshot content manually before releasing new images. Rotate and revoke any credential if it was previously committed, even if its current copy has been deleted.

## Remaining important risks

1. Build verified email enrollment, email-change confirmation, password recovery and secure account deletion before a public rollout handling sensitive personal data.
2. Add per-device session inventory and selective revocation. Present logout revokes *all* sessions for the account.
3. Verify hosting security configuration directly: Vercel access, preview protection, MongoDB TLS and least-privilege users, secret rotation, audit logging, network egress and backups.
4. Review iCalendar security further. Existing public-IP resolution, pinned TLS and redirect rejection remain application-level measures, not a network firewall. Test unusual DNS, slow streams, recurrence and timezones.
5. Set real operator/contact, retention, privacy, export and deletion procedures. Do not imply these legal and operational controls are complete.
6. Reconfirm user-facing leaderboard privacy and display names after existing accounts reopt in. Replace whole-workspace writes with revision-aware updates to prevent lost changes. Community ranking is based on user-controlled challenge values and is not fraud-resistant.
7. Tune abuse limits with observed legitimate usage and add alerts, resource quotas and privacy-preserving security monitoring.
8. Verify the Google Sign-In user journey in a browser with the new CSP. Do not relax the policy without examining reported violations.
9. Add a reviewed lockfile. Existing npm/pip audits with ranged dependencies do not prove the exact dependency versions used in a past deployment.
10. Run an authorized two-account authorization test matrix and a separate external security assessment before calling the app secure.

## Required validation

Run `python -m unittest discover -s tests -v`, `python -m compileall -q backend api`, `pip-audit -r backend/requirements.txt`, `npm audit --audit-level=high`, `npm run typecheck`, and `npm run build`. Confirm the installed version floors, provision the MongoDB indexes via `ensure_indexes()`, and verify CI results.

On a nonproduction preview with test accounts, verify login throttling without stressing live users, cross-origin rejection, password-change/logout invalidation of another session, friendship and notebook access revocation, Google Sign-In, SSRF protections, error responses, CSP headers and all normal user workflows. A green pipeline is not a substitute for these tests.
