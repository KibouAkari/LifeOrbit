# LifeOrbit interface guide

Updated 24 October 2026.

## Navigation

Shared left sidebar with Dashboard, Tasks, Calendar, Notes, Subscriptions, Challenges and Settings. Incoming activity is surfaced through the notification bell, including friend requests and shared notebook invitations. All subpages reuse the same layout and the same theme tokens.

## Main interactions

**Dashboard:** waits for the signed-in profile, tasks, calendar and workspace to load; avoids misleading zero-value placeholders.

**Calendar:** starts in a today-first rolling week. The weekly view uses hourly columns and draggable event cards with a lower resize handle. A separate month overview exists. Use the Event action or a free time slot to create entries; event modifications go to FastAPI. Invited events are read-only and have a distinct colour. Multiple .ics files and encrypted public HTTPS/webcal URL subscriptions appear as sources, with manual refresh and removal for linked calendars.

**Subscriptions:** list current plans and estimated monthly equivalents. Add or edit name, amount, currency, billing frequency and renewal date.

**Friends:** search by display name in Settings, send requests, accept or decline incoming requests and remove existing friends. The navbar shows pending requests.

**Notes:** notebook chapters and pages belong to the account. Private notes can be moved into shared notebooks, whose pages are editable by invited friends; updates use polling, not conflict-free concurrent editing.

**Challenges:** randomized daily and weekly suggestions, saved recurring custom templates, completion feedback and sounds, real leaderboard with an account setting for visibility and friend-sharing proposals.

## Motion and accessibility

Motion should indicate state changes, not decorate empty space. Use restrained hover elevation and button press feedback, avoid layout jumping and respect `prefers-reduced-motion`. Maintain keyboard focus rings, labelled inputs and status messages after actions.

## Screenshots

`docs/screenshots/dashboard.webp` and `docs/screenshots/login.webp` capture an earlier actual development version. They have **not** been replaced with fabricated captures of this PR. Capture the deployed final version through an authenticated browser session before claiming them as current in the README.

## Known limits

Full Google Calendar/Microsoft Graph/Apple CalDAV integration is not implemented. iCal subscriptions are read-only and currently refresh on demand. Shared note polling is not simultaneous collaborative editing. Event timezones and recurrence, touch-friendly drag operations, multiple-device write conflicts and a full accessibility audit need additional verification.
