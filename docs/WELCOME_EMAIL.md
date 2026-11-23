# Welcome email

The LifeOrbit welcome email is a one-time, transactional onboarding message. It uses the same restrained lavender, purple accent, typography, brand wordmark and friendly voice as the website.

## Trigger and behavior

- Sent only after a **new account is successfully created**, both via email/password registration and first-time verified Google sign-in.
- Not sent for ordinary logins, Google profile refreshes or failed/duplicate registrations.
- Scheduled as a FastAPI background task after the session is issued. Sending errors are logged without personal details and **do not block signup**.
- Not a verification email, marketing subscription or proof that the account email was verified for password registrations.
- Existing users are not bulk-emailed when this feature is deployed.

The HTML template and equivalent plain text live in `backend/api/welcome_email.py`. HTML content uses inline, table-based styling to render in common email clients. All user-visible names are escaped before insertion into HTML; outbound links are formed from the trusted `PUBLIC_APP_URL` configured on the server. The email contains no passwords, session cookies or authentication tokens.

## Branding and images

The welcome email references the first-party `/assets/email-logo.png` image, a PNG exported from the site's own SVG wordmark and committed at `public/assets/email-logo.png`. It displays the purple LifeOrbit logo, keeps an alt-text fallback, and uses no third-party tracking images or fonts.

Many clients block remote images by default. The welcome message, CTA and product tips remain readable without the image. The image host sees a normal request if the recipient chooses to load it; there is no tracking pixel.

## Configuration

No new secrets are needed. Welcome emails reuse the Resend settings required for password reset:

| Variable | Purpose |
| --- | --- |
| `RESEND_API_KEY` | Server-only sending credential |
| `PASSWORD_RESET_FROM_EMAIL` | Verified sender; reused for welcome messages |
| `PUBLIC_APP_URL` | Canonical HTTPS application origin for the CTA and logo |

**All three variable names were present in production when last inspected, but the sender domain and provider permissions have not been verified by a live email test.** These variables must be scoped to the deployment environment. If configuration is absent, registration still works and the welcome message is skipped, with a warning in logs.

## Testing and limitations

Run the backend unit suite and inspect the HTML and plain-text renders. Test registration with a dedicated mailbox using each authentication method and verify:

1. One welcome email for each new account, including first-time Google.
2. No second welcome email on subsequent sign-in.
3. No message after a failed or duplicate registration.
4. The actual sender identity, logo PNG, button, formatting, dark-mode client appearance, mobile widths and plain-text fallback.
5. Graceful behavior if Resend is unavailable or rejects the message.
6. The link opens the configured origin and routes to the dashboard.

FastAPI background tasks are **best effort** in a serverless environment. Email delivery is not durable across runtime termination or transient outages, and there is no retry queue yet. For guaranteed delivery, introduce a persistent outbox with a reliable worker and idempotency keys before promising exactly-once delivery. Provider `201` acceptance does not guarantee inbox placement.

See [Password recovery](PASSWORD_RECOVERY.md), [Deployment](DEPLOYMENT.md) and [Operations](OPERATIONS.md).
