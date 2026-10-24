# LifeOrbital security review

Updated 24 October 2026.

## Automated checks

GitHub Actions runs TypeScript/build validation, npm audit and pip-audit on pull requests. These checks are necessary but cannot prove that account authorization or the running app is secure.

## Mitigations introduced

- Email/password logins use password hashes; Google ID tokens are verified server-side.
- Sessions are signed, short-lived, Secure, HttpOnly and SameSite.
- MongoDB documents for tasks, events and workspaces are owner-scoped.
- Friend requests are restricted to real accounts, and only their recipients can accept.
- Shared notes, events and challenges can only be read by confirmed friends; removing a friendship disables access to an existing share.
- Private iCal URL feeds are limited to recognized provider hosts, HTTPS, no redirects, 1 MB response and 500 events. Stored private URLs are encrypted.
- HTML and CSS motion respects reduced-motion accessibility settings.

## Open risks and release blockers

| Severity | Finding | Required action |
| --- | --- | --- |
| High | No durable rate limiting on public auth and friend-request endpoints | Apply per-IP/account limits and abuse controls |
| High | Public email changes are not yet verified at the new email address | Confirm possession of new address before switching |
| High | No comprehensive password recovery and session revocation | Build verification, recovery and session lifecycle |
| High | Calendar feed SSRF defense is primarily hostname allowlisting | Add network-level egress filtering, DNS/IP pinning and redirect/port regression tests |
| High | Shared workspace writes replace the full document | Use revision checks and conflict management before real-time multi-author editing |
| High | Shared calendars lack precise timezone/recurrence semantics | Normalize UTC instants, DST and RFC 5545 recurrence semantics |
| Medium | Private feed encryption key is derived from JWT signing key | Introduce independent versioned encryption key and rotation |
| Medium | Friend search can be enumerated | Rate limit, consider privacy settings and explicit discoverability |
| Medium | Challenges are not server-authoritative | Add verified actions, anti-abuse controls before competitive rankings |
| Medium | Shared note refresh is polling rather than true real-time sync | Build authenticated subscriptions with versioned writes if multi-editor collaboration is needed |
| Medium | Cookies are restricted by SameSite but there is no comprehensive CSRF integration suite | Exercise cross-origin and forged-request tests |
| Medium | Operator identity, data retention and legal notices still need completion | Verify actual entity/contact, processors and retention policies |

## Verification before merge or public use

Use two real test accounts. Verify friendship request, rejection and revocation; attempt forbidden shared-note and event access; validate calendar import and delete access; rotate/revoke accounts; test malformed feed URLs, redirects, slow/oversized downloads and timezone changes. Verify no secrets are in responses or logs. Run vulnerability scans and a complete end-to-end browser test against the new production domain.

Do not treat a successful Vercel build or empty dependency scan as a security certification.
