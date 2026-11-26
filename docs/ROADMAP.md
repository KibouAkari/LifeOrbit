# LifeOrbit roadmap

Updated 23 November 2026. This is a prioritized engineering plan, not a claim of released functionality. Current feature scope is in [Product](PRODUCT.md) and the [README](../README.md).

## Priority 0: release safety and data integrity

- [ ] Deploy and verify reviewed privacy retention work: production CRON_SECRET, scheduling, boundary-date tests, cleanups and monitoring. Implement external Liveblocks and backup erasure before advertising guaranteed 30-day complete deletion.
- [ ] Capture privacy-safe login, dashboard and notes screenshots for README and maintain them as UI changes.
- [ ] Choose and implement a calmer login and email design with keyboard accessibility and dark/light compatibility; retain all existing authentication flows.

- [ ] Verify email provider sender domain and the required `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL` per Vercel environment.
- [ ] Complete password recovery email delivery, expiry, one-use token, session invalidation and abuse-limit tests using controlled mailboxes.
- [ ] Verify new-user welcome delivery with a controlled mailbox, correct responsive logo/email-client rendering, first-Google-user trigger, no repeat messages on login and safe behavior when Resend is unavailable.
- [ ] Test native Yjs autosave between two browsers, including simultaneous same-page edits, reconnect, forced errors, deleted pages, restarts and recovery from backups.
- [ ] Confirm every shared-note, notebook, event, notification and friend-score access is denied after unfriending, including users with previously open sessions.
- [ ] Validate provider-side room revocation, backup/export and security before enabling Liveblocks.
- [ ] Prove production/preview authentication, MongoDB indexes, origin controls, rate limits, error handling and rollback on target infrastructure.
- [ ] Finalize account deletion, email verification, retention policies and a secure support channel for users with personal data.

## Priority 1: reliability and maintainability

- [ ] Replace aggregate workspace saves with revision-aware or resource-specific operations so multiple devices cannot silently overwrite personal state.
- [ ] Add automated authorized browser E2E tests with test MongoDB and synthetic email delivery.
- [ ] Add Yjs document backup/export, tested restore procedures, deletion retention and corruption handling.
- [ ] Improve monitoring for HTTP errors, delivery failures, latency, database quotas and unusual login/reset activity.
- [ ] Confirm calendar timezone, daylight-saving and recurrence semantics across browsers and external feeds.
- [ ] Verify accessibility and layout on narrow screens, touch devices, keyboard-only and reduced-motion configurations.

## Priority 2: product improvements

- [ ] Optional scheduled calendar refresh with consent, quotas and provider authorization.
- [ ] Background notifications only with user permission and a dependable delivery mechanism.
- [ ] More accessible rich-text collaboration, including cursor stability and conflict presentation.
- [ ] Privacy-safe screenshots and onboarding guidance verified against the deployed application.

No milestone is complete solely because a pull request builds successfully. Use [Release checklist](RELEASING.md) for verification requirements.
