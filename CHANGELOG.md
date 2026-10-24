# Changelog

LifeOrbital follows Keep a Changelog conventions. All entries remain Unreleased until a verified tagged release.

## [Unreleased]

### 2026-10-24 · Calendar colors, invitations and task deadlines
- Each calendar source has a stable distinct accent color across week and month views.
- Added task due date and time editing persisted in MongoDB.
- Added authenticated unread notifications for note shares, event invitations and tasks due within the next hour, with per-account read state.
- Added a topbar notification badge and polling inbox; existing friend-request counts are included.
- Removed duplicate My notes / Received notes navigation from the notebook sidebar.
- Documented that task reminders currently work while the application is open, not as background push notifications.


### 2026-10-24 · Open calendar feeds, notes collaboration and mobile refinements
- Accept arbitrary public HTTPS or webcal iCalendar feeds, with DNS validation and IP-pinned verified TLS to block internal-network requests.
- Add responsive calendar, notebook, Settings and leaderboard layout refinements for small screens.
- Allow deletion of user-created note chapters while retaining their pages in Personal.
- Introduce MongoDB-backed shared notebooks that owners can create and invite confirmed friends to, with shared pages and explicit save.
- Refresh leaderboard display names after account profile updates.
- Document current limits around real-time shared note editing, manual iCal refresh and calendar drag behavior.


### 2026-10-24 · Calendar interaction and sharing improvements
- Reworked calendar pointer capture to keep one reliable drag owner for move and resize interactions and increased resize grip size.
- Added an inline friend selector for sharing notes instead of a numeric browser prompt.
- Refreshed friend requests every five seconds and whenever the browser window regains focus.
- Made Settings Account & privacy a normal-width card rather than a full-width row.
- Accepted common additional Outlook and iCloud subscription hosts and normalized webcal links to HTTPS, while retaining a restricted hostname allowlist.
- Documented that arbitrary third-party iCal links remain deliberately unsupported until a safe generic fetch proxy is designed.


### 2026-10-24 · Brand, calendar gestures and friends usability
- Standardized visible branding to LifeOrbit while retaining existing authentication cookie and API identifiers for backward compatibility.
- Replaced browser native HTML drag operations with pointer-captured calendar move and resize gestures supporting mouse, pen and touch.
- Corrected cross-day drop targeting while pointer capture is active.
- Introduced Friends / Requests / Find people tabs and clearer request responses in account settings.
- Removed outdated images from the README showcase to avoid misrepresenting them as current screenshots. Fresh captures remain a release task.


### 2026-10-24 · Social planning and calendar usability
- Added editable subscriptions including billing interval, currency, amount, name and renewal date.
- Implemented MongoDB friend requests, profile search, acceptance, rejection and removal, plus incoming-request badge.
- Introduced private friend-scoped sharing for notes, event invitations and challenge snapshots.
- Added a Shared notes section with owner attribution and a 15-second read-only content refresh.
- Included accepted invitations as read-only, differently coloured events.
- Redesigned the calendar week as an hourly schedule with timed cards, easier click-to-create, drag-to-move and duration handles.
- Added subtle hover, click and transition feedback throughout the application with reduced-motion support.
- Added private encrypted HTTPS iCal feed subscriptions from allowlisted Google, Outlook and iCloud hosts, including user-triggered refresh and removal.
- Documented external iCal feed security, Google/Outlook/Apple OAuth boundaries and remaining release blockers.
- Existing README screenshots still depict an earlier validated build; do not misrepresent these as captures from the new preview.


### 2026-10-24 · Dashboard hydration and calendar experience
- Load tasks, events and account workspace in parallel before the authenticated dashboard renders. Removed per-page-only initial loading.
- Show today as the leftmost day in the default rolling seven-day calendar, while navigation uses Monday-based weeks.
- Add month calendar overview, event start/end times, time edits and drag-to-move across days.
- Retain one-time .ics import, support multiple separately named imported calendar collections, and add show/hide and remove controls.
- Allow event duration changes by dragging a resize grip; preserve times from imported .ics events. External Google, Outlook and Apple live synchronization remains future integration work.
- Add randomized daily and weekly challenges, recurring custom challenge templates automatically renewed each period, and animated completion with gentle sound.
- Hide completed challenges without deleting their points history or adding reset controls.
- Replace example leaderboards with a MongoDB ranking of real accounts; other accounts appear only by opt-in, while your own score is always visible.
- Remove the unnecessary security section for Google-only accounts from Settings and place Appearance alongside Profile.
- Centre the left-side login message vertically and increase the LifeOrbital wordmark size.


### 2026-10-24 · Restore Google authentication and legal page cleanup
- Fixed production-wide API HTTP 500 errors caused by missing `icalendar` in root Vercel Python dependencies.
- Kept root requirements in sync with the backend requirements to prevent future imports from breaking the whole API.
- Simplified the login hero: removed the redundant small planet logo at top left and the bottom slogan; retained the LifeOrbital wordmark and the prominent login icon.
- Reworked privacy and terms content to describe the implemented Google, Vercel and MongoDB data flows and removed the visible draft label.
- Documented that operator identity and formal legal review are still needed for a fully public legal notice.


### 2026-10-24 · Real users, identity and calendar import
- Removed fictional Alex/Taylor leaderboard accounts and sample positions from Challenges and Dashboard.
- Dashboard challenge insights now show actual personal points and the stored display name.
- Prevented Google sign-in from overwriting a LifeOrbital display name saved in MongoDB.
- Added password-confirmed email changes and authenticated password changes for local accounts.
- Added corresponding account forms in Settings. Google-only accounts use Google for their credentials.
- Removed guest entry from Login and styled the Google sign-in button with rounded corners.
- Connected an .ics upload control to the calendar, imported events into MongoDB and deduplicated by event UID/date.
- Removed arbitrary remote URL calendar fetching to prevent server-side request forgery.
- Documented the need to verify new email addresses before opening account email changes to the public.

### 2026-10-24 · Personal workspace and design
- Migrated notebook chapters, pages, subscriptions and personal challenge progress to authenticated MongoDB workspaces.
- Added account data export, server-side profile-name editing and cloud workspace rehydration.
- Added rotating daily and weekly challenge suggestions with progress meters and feedback.
- Improved dashboard density, greeting, challenge highlight, subscription totals, entrance transitions and responsiveness.
- Simplified sign-in around the brand icon, Google Identity Services and an optional email form.
- Prevented logout from exposing account data through guest workspace persistence.

### 2026-10-24 · Authentication and security
- Implemented MongoDB registration/login, bcrypt password hashing and server-verified Google identity tokens.
- Moved JWT authentication to short-lived Secure HttpOnly SameSite cookies.
- Added owner-scoped CRUD for tasks, calendar and workspace state.
- Added database connectivity diagnostics and sanitized MongoDB errors.
- Added strict CORS configuration, documentation for Atlas and npm/Python vulnerability checks.

### 2026-10-24 · FastAPI on Vercel
- Fixed API 404s by deploying FastAPI alongside React in one Vercel project.
- Added /api rewrites, root Python function, consistent imports and requirements.
- Fixed deployment dependencies for Google token verification.
- Diagnosed invalid Atlas placeholder connection that previously caused registration 500.

### 2026-10-23 to 2026-10-24 · React application
- Migrated the frontend to React, TypeScript and Vite with shared layout and reusable pages.
- Created dashboard, weekly calendar, task lists, notebook chapters, subscriptions and challenges.
- Added drag-and-drop tasks, completion animations, sounds, responsive navigation and dark/light modes.
- Added monthly/annual subscription plans, renewal projections, welcome animation and error/empty states.
- Added custom 404, privacy notice and terms draft pages.

### Initial repository foundation
- Created README, MIT License, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, issue and PR templates.
- Added roadmap, product plan, architecture, brand, design and team workflow documentation.
- Built CI checks and the LifeOrbital planet logo.

## Releases

No tagged stable release has been published.
