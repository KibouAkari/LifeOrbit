# Operations and incident runbook

This document is for operators of the Vercel + MongoDB deployment. Do not run destructive database migrations, drop collections or delete provider rooms without a verified backup, a rollback plan and explicit approval.

## Environments and configuration

- **Production:** live `main` deployment. Validate which commit Vercel has actually promoted.
- **Preview:** pull-request deployment for controlled testing. Preview does **not** inherit every production-only secret.
- **Local:** development database and exported server environment variables. Never reuse production secrets.

Required infrastructure configuration is defined in [Deployment](DEPLOYMENT.md); Resend details in [Password recovery](PASSWORD_RECOVERY.md); collaboration flags in [Realtime collaboration](REALTIME_COLLABORATION.md).

A subsequent 23 November 2026 Vercel check confirmed all three production variable names: `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL`. No secret values were decrypted. The sending domain, provider permissions and actual delivery still require confirmation with a controlled mailbox; the production build now includes PR #73's reset flow. PR #74's new welcome email is not yet in production.

## Daily monitoring

1. Check `/api/health` and `/api/health/database`; the first only confirms application process health.
2. Review Vercel function failures and latency, MongoDB connection errors, storage/connection quotas and index health.
3. Track password-reset and welcome-email delivery failures, account and IP rate-limit response counts and repeated authentication failures without logging addresses, tokens or passwords.
4. Track notebook sync failures, 409 migration conflicts, 503 lock/database errors, unusually large CRDT updates and authorization failures.
5. Maintain a private incident channel; do not expose personal notebook text in alerts or support tickets.

## Backups and recovery

MongoDB Atlas backups must cover users, friendships, shares, events, workspaces, `notebook_crdts`, `realtime_notebooks`, and their related metadata. Check your Atlas plan's retention and actually restore a disposable test environment before relying on it.

Hosted Liveblocks Yjs data is stored separately from MongoDB snapshots. A MongoDB backup **alone is not a full backup** of externally hosted collaborative documents. Establish a versioned provider export, retention and restore process before enabling hosted production editing. Do not reset migration markers or reinitialize a corrupt room to hide errors.

During recovery, suspend new collaborative writes until the authoritative CRDT is identified; preserve existing bytes and migration metadata, restore to a test environment, validate with two accounts and only then cut over.

## Response to incidents

| Symptom | Investigate | Safe initial action |
| --- | --- | --- |
| Password reset returns 503 | Resend environment names, verified sender domain, Vercel target | Do not reveal account existence; repair provider config, test privately |
| Emails accepted but not received | Provider delivery logs, SPF/DKIM, suppression and recipient mailbox | Check provider status; do not paste message tokens into tickets |
| Welcome message missing | New-account registration path, preview vs production secrets and Resend logs | Check function logs and [welcome email guide](WELCOME_EMAIL.md); background delivery is best effort, not queued |
| Notebook cannot sync | Auth, friendship, MongoDB locks, network errors, CRDT document size/version | Preserve document, stop unsafe retry loops, avoid manual full-page writes |
| Former friend sees current content | API friendship checks, cached pages, provider room ACLs | Treat as a privacy incident; revoke server and provider permissions, document scope |
| MongoDB unavailable | Atlas connection and network configuration | Do not change credentials blindly; use verified rollback or planned recovery |
| Realtime migration returns 409 | Liveblocks marker vs native CRDT | Keep both authoritative sources untouched; investigate before migration |

## Changes, rollback and secrets

For releases, use the [release checklist](RELEASING.md): test in preview, review the PR, record schema/feature-flag changes, monitor the rollout and retain a verified rollback deployment.

Rolling back frontend code does not undo MongoDB CRDT state, tokens or provider-side room mutations. Test backward compatibility before changing feature flags. Rotate exposed keys immediately using provider guidance, but plan JWT-secret changes carefully because they affect active sessions, reset tokens and encrypted iCalendar links.

Never log a reset token, API key, private calendar URL, cookie, bearer token or note body. Avoid screenshots that expose actual user content. Account deletion, long-term retention, full exports and an incident contact are unresolved operational requirements rather than features to assume.
