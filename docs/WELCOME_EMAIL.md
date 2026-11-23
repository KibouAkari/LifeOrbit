# Welcome email: delivery, brand and operations

The welcome email is transactional onboarding, not marketing. It is sent after **new account creation** via password registration or first verified Google sign-in. Existing users do not receive it on ordinary sign-in.

## Email design and brand assets

- The actual website and GitHub README use the blue planet in `public/assets/icon.svg` and `assets/icon.svg`. The email now uses a PNG raster of that exact planet, stored at `public/assets/email-icon.png`, **not** the unrelated purple wordmark from the previous implementation.
- The email header places the PNG next to the live text **LifeOrbit**, so the brand name remains visible when email clients block remote images. The image is hosted at the same `PUBLIC_APP_URL` domain.
- Template: `backend/api/welcome_email.py`, built with nested tables, inline styles, accessible alt text, a dashboard CTA, three short starting tips and a plain-text fallback.
- Never embed SVG images, passwords, reset tokens, tracking pixels or user data in image URLs. User-provided names are HTML-escaped.
- The email is in English to match the current application. Preview it in narrow mobile widths and major light/dark email clients before claiming broad compatibility.

## When it is sent

`POST /api/auth/register` and first-time `POST /api/auth/google` attempt delivery **after** the new user record and session have been created. Ordinary sign-ins, failed registration and Google profile refreshes do not send it.

On Vercel, detached FastAPI background tasks can be difficult to observe or lose work if execution is suspended. To make the sending attempt observable, this implementation calls Resend **within** the registration request using bounded HTTP timeouts. This may add a few seconds to new registration when the mail provider is slow, but the account still succeeds on a mail failure. A provider HTTP 2xx is logged as **accepted**, not delivered.

Each send uses a hashed, stable Resend idempotency key to limit accidental duplicates within the provider's 24-hour window. It does not guarantee permanent exactly-once delivery and does not implement a durable retry queue.

### Existing account did not receive a welcome

Sign in and select **Settings → Account & privacy → Resend welcome email**. The authenticated API endpoint `POST /api/auth/welcome/resend` can send only to the account's stored email and is rate-limited to one request per account per day (also restricted by IP). A successful request means Resend **accepted** it, not that it reached the inbox. The message is never sent to an arbitrary submitted recipient.

If this action fails, check the app's server logs for a sanitized provider status, then check the Resend dashboard. Do not try to create duplicate accounts or repeatedly reset your password to test a welcome email.

## Resend and DNS configuration

These server-only Vercel production environment names were present at the last check: `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL`. The values were not read, so the actual configured From address, API permission and domain verification remain to be confirmed in Resend. Preview builds may not have these production-only values.

Vercel DNS is authoritative for `lifeorbit.dev`. During the 23 November 2026 review, these existing provider records were identified:

- `resend._domainkey.lifeorbit.dev` TXT (DKIM public key)
- `send.lifeorbit.dev` CNAME (sending return path)
- `rsend.lifeorbit.dev` CNAME (sending service)

A **new** DMARC TXT record was added without changing those existing entries:

| DNS name | Type | Value |
| --- | --- | --- |
| `_dmarc.lifeorbit.dev` | TXT | `v=DMARC1; p=none; adkim=r; aspf=r` |

The `p=none` policy establishes a non-enforcing DMARC record. It does **not** guarantee delivery. Inspect SPF/DKIM alignment and delivery evidence before tightening the DMARC policy to `quarantine` or `reject`. If the actual From domain differs from `lifeorbit.dev`, adjust the sender's DNS accordingly rather than creating unrelated records.

Using a dedicated sending subdomain or separate click/open tracking domains is optional and **not required to fix missing sends**. The email does not use tracking pixels. Do not change root SPF, MX, DNS delegation or provider CNAMEs blindly.

## Finding why a message never arrived

1. Confirm the account was created *after* the welcome feature deployed. Login to an existing account will never fire the new-registration trigger.
2. Use **Settings → Resend welcome email** after this fix is deployed, signed into an account whose mailbox you control.
3. Inspect Vercel runtime logs for the success line `Welcome email accepted by provider (HTTP 2xx)` or a sanitized `Welcome email provider returned HTTP NNN` warning. No email address, name, token or API key is logged.
4. Open [Resend Emails](https://resend.com/emails) and [API Logs](https://resend.com/logs) for the same time. If there is no outgoing API request, debug registration execution or server credentials. HTTP 401/403 often signals invalid credentials or sender-domain permission, HTTP 429 rate limits, and HTTP 5xx a provider/transient failure.
5. If Resend marks the message delivered, check spam/junk and recipient-side filters. If bounced, suppressed or rejected, follow the provider details rather than resending repeatedly.
6. Confirm the original source SVG and `https://www.lifeorbit.dev/assets/email-icon.png` render after deployment. Mail clients may block remote images without blocking the message itself.

## Validation and limitations

Automated tests cover HTML escaping, matching icon URL, plain text, idempotency, provider errors, new-account-only behavior and the authenticated, limited resend endpoint. CI checks build and dependencies, but **real email delivery has not been verified** with a controlled mailbox.

A synchronous best-effort attempt is easier to diagnose than the previous background-only behavior, but it is not a fully reliable delivery pipeline. For guaranteed retry after outages, implement a durable outbox and a scheduled worker with proper deduplication and monitoring. Resend API acceptance and inbox delivery are distinct events.

See [Password recovery](PASSWORD_RECOVERY.md), [Deployment](DEPLOYMENT.md), [Operations](OPERATIONS.md) and [Release checklist](RELEASING.md).
