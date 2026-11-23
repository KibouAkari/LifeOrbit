# Password recovery by email

Updated 23 November 2026. The code is implemented in PR #73, but production deployment and email delivery still require verification.

## Setup

LifeOrbit uses the [Resend Email API](https://resend.com/docs/send-with-python) through server-side Python requests. Create or use an approved Resend project, verify your sending domain, and configure these **server-only** Vercel variables in the intended environment:

- `RESEND_API_KEY`: secret provider API key; never put it in Git, logs or any `VITE_` variable
- `PASSWORD_RESET_FROM_EMAIL`: verified sender, for example `LifeOrbit <security@lifeorbit.dev>` if that exact domain and sender are approved
- `PUBLIC_APP_URL`: canonical HTTPS origin without path, e.g. `https://www.lifeorbit.dev`

In the production Vercel variable-name listing checked on 23 November 2026, `RESEND_API_KEY` was present, but `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL` were not. We did not read or test the key's value. With either required value missing, the proposed API returns HTTP 503 for all reset requests. Set these variables for the correct environment, verify the sender domain in Resend, then redeploy and test only with controlled mailboxes.

## User experience

The sign-in form links to `#/forgot-password`. A registered email/password user can request a message containing a link to `#/reset-password?token=...`. The server generates a 256-bit random token, stores only a keyed SHA-256 HMAC digest, and expires it after **30 minutes**. A request replaces previous reset tokens for that account. The UI always shows the same generic response for existing and nonexistent accounts to avoid ordinary account enumeration.

Opening the link permits a new 12–72 character password. The backend atomically consumes the token, rotates the stored password hash and increments the account session version, signing out all previously issued sessions. The same token cannot be used twice. Google-only accounts that have no password must continue using Google Sign-In.

## Abuse and privacy safeguards

Both request and consumption endpoints apply IP limits. Requests also have an independent normalized-email limit. The frontend never receives a reset token except via the intended email link, and the backend never logs it. Links are generated from the trusted `PUBLIC_APP_URL` rather than an attacker-controlled HTTP Host header. Reset links are placed in the URL fragment so browsers do not transmit the token as a server-side URL path or query. The reset page now clears the fragment token from the address bar as soon as it loads, keeping the secret only in component memory until use or navigation away.

Reset email delivery failures are logged without the destination address or secret. The generic public response prevents enumeration but may require support follow-up if a provider is unavailable. Add delivery monitoring, provider quota alerts and account-level abuse detection before broader public use.

## Deployment tests

Confirm `PUBLIC_APP_URL` is the exact public HTTPS application origin, without a path, query, userinfo or trailing slash. Verify `PASSWORD_RESET_FROM_EMAIL` belongs to a sender domain approved by Resend. In Vercel, secret variables belong to the **server** target only and must never use a `VITE_` prefix.



Use only test accounts and verified controlled mailboxes. Verify delivery, invalid/no token, expired token, used token, mismatched passwords, account-level request limits, new password login, invalidation of old sessions, Google-only behavior, and that no token appears in Vercel logs or user-visible API responses. Confirm the database `password_reset_tokens.expires_at` TTL index has been created by `ensure_indexes()`. Do not send test resets to unrelated users or brute-force production.
