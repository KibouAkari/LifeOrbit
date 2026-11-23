# Security policy

LifeOrbit stores personal planning data. It has source-level security protections but **has not completed an independent penetration test or a full production security certification**. A successful CI run or Vercel READY deployment is not a security guarantee.

## Supported versions

The project has not announced a verified tagged stable release. Security fixes are developed in reviewed pull requests and only protect production after the corresponding commit is promoted. Verify the deployment commit before assuming a fix is live.

## Reporting vulnerabilities

**Do not publish user data, credentials, exploit details or vulnerabilities affecting production in public GitHub issues.** Use the repository's private vulnerability reporting feature in the GitHub Security tab if available, or contact the repository maintainer privately through their GitHub profile to establish a secure reporting channel.

Provide the affected endpoint, commit or deployment, expected and observed behavior, impact, minimal safe reproduction, and suggested mitigation. Use only systems and accounts you own or are expressly authorized to test. Do not brute-force production.

## Security model

- Backend authentication through verified password/Google identity and short-lived Secure HttpOnly cookies.
- Server-side ownership and accepted-friend authorization for private records, not merely frontend route visibility.
- MongoDB-backed public-endpoint throttling; the deployment IP trust chain must be verified.
- CSRF Origin validation for cookie-backed mutation requests and explicit input validation with Pydantic.
- No raw MongoDB operators supplied by user objects; encrypted iCalendar URLs and restricted outbound fetches.
- Shared-notebook and provider permissions are removed after friendship revocation; current sessions must be rechecked before reads and writes.
- Community leaderboard requires consent, with separate friend-only scoring available to accepted friends.
- Secrets belong in server-only variables; never expose API keys, note content, passwords, reset links or private calendar URLs in logs.

## Security changes under review

[PR #73](https://github.com/KibouAkari/LifeOrbit/pull/73) adds native Yjs autosave, single-use email password recovery and private friends rankings. Password recovery is not operational until Resend delivery variables and the sending domain are verified. Liveblocks collaboration remains separately feature-flagged and requires provider ACL and backup testing.

## Known limitations

Email verification and account deletion, selective per-device sessions, personal workspace concurrency, native/hosted CRDT export and retention, complete accessibility and browser regressions, and provider/infrastructure verification are outstanding. See [Security audit](docs/SECURITY_AUDIT.md), [Operations](docs/OPERATIONS.md) and the [Release checklist](docs/RELEASING.md). Do not claim that all vulnerabilities have been eliminated.
