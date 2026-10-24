# Changelog

LifeOrbit follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions. This file preserves the project's development history. No stable version has been tagged; dates below identify development work, not production release dates.

## [Unreleased]

### 2026-10-24 · Zentral Hack challenge documentation
- Added a dedicated hackathon dossier mapping all MUST/SHOULD criteria, technical restrictions, resources and judging weights to evidence.
- Documented the problem hypothesis, target audience, solution, business considerations and responsible project limitations.
- Prepared a time-boxed 24-hour change log, measurable before/after evidence table, user testing protocol and reproducible demo.
- Added a three-minute pitch script, likely jury questions and final deliverables checklist.
- Disclosed actual ChatGPT-assisted development and documented core open-source dependencies with pending team licensing verification.
- Explicitly kept unperformed tests, event contributions and interview results marked as pending instead of fabricating outcomes.


### 2026-10-24 · Public repository documentation review
- Rebuilt the README around the current product, architecture, verified setup, capabilities and limitations.
- Replaced outdated contribution instructions and refreshed security disclosure, deployment and release checklists.
- Reconciled architecture, backend API documentation and roadmap language with the current implementation.
- Added a public-source checklist distinguishing repository visibility from a security-reviewed public application launch.
- Preserved all prior dated development entries without fabricating a tagged release.


### 2026-10-24 · Challenge limits and calendar context menu
- Limited active challenges to three personal and two shared slots.
- Saved the stable shared-invitation identifier in MongoDB to prevent the same invitation being accepted repeatedly.
- Added Remove to active challenges. Recurring templates no longer silently re-add removed tasks.
- Updated calendar context-menu handling to capture real right-click events and render the menu at the mouse position outside transformed calendar containers.
- Keyboard and touch Actions buttons position the same menu beside the control.


### 2026-10-24 · RSVP, synced account preferences, overdue tasks
- Added recipient-controlled Accept, Decline and Remove for shared event invitations. Invited events remain read-only.
- Exposed event participant list with accepted, pending and declined responses; showed shared notebook members.
- Persisted light/dark/system theme per signed-in account in the MongoDB workspace and restored it on sign-in across devices.
- Added an Overdue task category and a red overdue warning on the Dashboard.
- Updated documentation for access controls, sync behaviour and responsive invitation dialogs.


### 2026-10-24 · Live activity and event actions
- Refresh incoming invitation notifications every four seconds while the app is visible, with an animated toast and gentle opt-in audio after user interaction.
- Refresh shared notebook content every three seconds without manually reloading the page, and refresh calendar invitations every five seconds.
- Add desktop right-click event actions: Edit, Share, Delete. Add a visible event action button for touch and keyboard users.
- Move calendar editing into a responsive dialog rather than an inline form.
- Document limits: live experience uses foreground polling, not background Web Push or server-sent events.


### 2026-10-24 · Notes, iCal, cross-browser calendar and mobile fixes
- Redesigned Notes with two clear modes, refined chapter rows, and removed legacy Received notes.
- Added owner-controlled individual shared page deletion; deleting a page no longer deletes its notebook.
- Added Move to Shared for personal notes, creating a shared notebook without losing the original content before confirmation.
- Fixed calendar refresh failures involving timezone-naive MongoDB timestamps; invalid feed encryption now produces a clear user-facing error.
- Rebuilt calendar move/resize gestures with window-level pointer listeners for Firefox/Zen and cross-day dragging.
- Consolidated notification counters into the bell; shared notebook invitations appear as unread notifications.
- Improved small-screen subscriptions, Notes, calendar toolbar and notification popover.
- Enable leaderboard participation by default for new users while retaining existing users' explicit opt-outs.


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
- Centre the left-side login message vertically and increase the LifeOrbit wordmark size.


### 2026-10-24 · Restore Google authentication and legal page cleanup
- Fixed production-wide API HTTP 500 errors caused by missing `icalendar` in root Vercel Python dependencies.
- Kept root requirements in sync with the backend requirements to prevent future imports from breaking the whole API.
- Simplified the login hero: removed the redundant small planet logo at top left and the bottom slogan; retained the LifeOrbit wordmark and the prominent login icon.
- Reworked privacy and terms content to describe the implemented Google, Vercel and MongoDB data flows and removed the visible draft label.
- Documented that operator identity and formal legal review are still needed for a fully public legal notice.


### 2026-10-24 · Real users, identity and calendar import
- Removed fictional Alex/Taylor leaderboard accounts and sample positions from Challenges and Dashboard.
- Dashboard challenge insights now show actual personal points and the stored display name.
- Prevented Google sign-in from overwriting a LifeOrbit display name saved in MongoDB.
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
- Built CI checks and the LifeOrbit planet logo.

## Releases

No tagged stable release has been published.
