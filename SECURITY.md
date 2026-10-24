# Security policy

LifeOrbit is developed in public. The application uses real authentication and stores personal notes, tasks and calendar data, but **has not received an independent security audit**. Do not treat a successful build as security certification.

## Supported versions

No tagged stable release has been published. Security fixes target the active `main` branch, with review before production deployment.

## Responsible disclosure

**Do not publish vulnerabilities, credentials, exploit steps against real users or personal data in a public GitHub issue.**

Prefer GitHub's private vulnerability reporting feature under the repository **Security** tab if enabled. Otherwise, contact a maintainer privately through their GitHub profile to request a secure reporting channel. We do not promise a specific response time until a monitored security contact has been designated.

Include the affected endpoint/version, minimal reproduction, potential impact and suggested mitigation. Test only accounts and systems you own or have explicit authorization to assess.

## Security model

- Authenticate via server-verified Google identity or password-based login.
- Store signed sessions in Secure, HttpOnly cookies.
- Enforce authorization and ownership in FastAPI, not only React.
- Restrict shared notes, RSVPs and shared workspaces to authorized participants.
- Validate externally supplied iCalendar URLs; reject private network destinations and redirects.
- Keep secrets server-side, redact logs and avoid sensitive screenshots.

## Known limitations

Rate limits, new-email verification, session recovery/revocation, timezone-aware calendar recurrence, concurrent editing conflict prevention, account deletion and provider security configurations require further hardening and verification. The detailed, changing risk register is in [docs/SECURITY_AUDIT.md](docs/SECURITY_AUDIT.md).

Review that register before public launch with personal data.
