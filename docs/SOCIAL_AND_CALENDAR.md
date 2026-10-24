# LifeOrbital collaboration, calendar and sharing

## Implemented in this change

The authenticated Friends panel lets a person search by display name, send a request, accept, decline, or remove a friendship. Account discovery never includes email addresses. The shared navbar shows a pending request badge.

The existing subscriptions panel now supports editing the name, amount, currency, renewal date and monthly/yearly period. These fields are included in the existing authenticated MongoDB workspace persistence.

The calendar week is rendered as a time grid with one column per day, hourly guidelines, time-positioned appointments and drag-to-resize/move interactions. Events save through FastAPI. Invited events from friends are read-only and use a distinct colour.

Notes can be shared with confirmed friends. The recipient sees a read-only Shared section and the author's display name. The view polls for updated text every 15 seconds while the section is open. This is *not* real-time simultaneous editing; it is read-only near-live refresh.

The sharing API supports sending challenges to friends. Challenge-sharing frontend discovery and accepting shared challenges into one's own workspace still require a follow-up interface.

## Data model

New MongoDB collections:
- `friendships`: sorted unique pair, sender, recipient, pending/accepted status
- `shares`: owner, recipient, kind, resource_id and optional challenge snapshot

The underlying resource remains owned by the creator. Every sharing API request checks the authenticated user and friendship. Friend acceptance is restricted to the original recipient. A declined request or removed friendship prevents new shares; existing shares should be revoked automatically when a friendship ends in a future hardening task.

Run the index provisioning utility after checking existing data.

## Integration boundaries

**iCalendar HTTPS URL subscriptions:** Implemented as a restricted preview: the backend only accepts HTTPS links from an explicit set of Google, Outlook and iCloud iCal provider hosts, blocks redirects, limits downloads to 1 MB and 500 events, encrypts saved URLs using a key derived from JWT_SECRET_KEY, and supports manual refresh (at most once per five minutes) and removal. Never accept arbitrary user-supplied URLs without stronger network egress restrictions. Background scheduling, ETag caching, DNS/IP pinning, local timezone reconciliation and deployment-level network isolation remain open. Treat private iCal URLs like passwords.

**Google Calendar:** Signing in with Google is identity-only. Calendar API consent requires a separate, explicit OAuth scope and a refresh-token lifecycle. It cannot safely be inferred from a Google login ID token. Outlook needs Microsoft Graph authorisation; Apple commonly uses CalDAV or private subscription URLs.

**Realtime collaboration:** Periodic polling displays shared note updates, but multi-author co-editing with version conflicts requires a dedicated concurrency model (revision checks or CRDTs) and access-control audit.

**Notification:** The badge reads incoming friend requests from MongoDB. It refreshes when the Friends panel mounts or a local operation completes; server push notifications are not implemented.

## Validation checklist

1. Build React and the Python API. Run the dependency audits.
2. Register two test accounts and verify search, request, accept and removal.
3. Confirm unaccepted or unrelated users cannot access another account's notes, invites or challenges.
4. Create, resize and move events using mouse and touch; verify MongoDB and timezone behaviour.
5. Share a note; verify author attribution, read-only rendering and the polling refresh.
6. Test editing recurring subscriptions and reloading the app.
7. Review narrow and mobile screens, reduced-motion preferences and keyboard operation.
8. Do not promote to production until these tests pass.

## Deployment

The FastAPI routes are mounted in the existing Vercel deployment. No new environment secrets are needed for the friends and private sharing database collections.

## October 24 usability fixes

The note editor now provides a friend selection control to share directly. Friend requests update every five seconds and on browser focus. The hourly calendar uses a single captured pointer per gesture, a larger duration handle and more reliable day-column hit testing. iCal subscriptions normalize `webcal://` to HTTPS and accept additional recognized Outlook and iCloud hosts. Arbitrary providers are not accepted because fetching arbitrary user-provided URLs would introduce SSRF risk. Verify each provider link using a non-sensitive test feed before enabling it in production.
