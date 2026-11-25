# Changelog

## Unreleased · 25 November 2026: welcome mail clarity and inline logo

- Replaced the promotional, multi-panel welcome email with a personal, minimalist welcome, one dashboard link, simpler subject and matching plain-text copy. User names remain escaped and registration still succeeds even if Resend is unavailable.
- Embedded the existing blue planet PNG as a CID attachment whenever bundled, with a canonical first-party PNG URL fallback and visible text wordmark for image-blocking clients. Added sender-payload regression coverage.
- Expanded onboarding, deployment and operational documentation with inbox placement checks (Resend, SPF, DKIM, DMARC, Gmail/Outlook headers) and a safe opt-in approach for existing members. No mass emails were sent; no unverified claims about junk-folder fixes.


LifeOrbit follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) conventions. This file preserves the project's development history. No stable version has been tagged; dates below identify development work, not production release dates.

## [Unreleased]

### 2026-11-23 · Welcome email delivery and brand corrections
- Added `_dmarc.lifeorbit.dev` TXT (`v=DMARC1; p=none; adkim=r; aspf=r`) in authoritative Vercel DNS without changing existing Resend DKIM or sending-domain records.
- Replaced the old purple email wordmark with a PNG raster of the exact blue LifeOrbit planet icon used by the site and GitHub; preserved the brand name as selectable text when images are blocked.
- Changed new-user welcome sending from a detached background task to a bounded, observable Resend attempt within registration. Mail-provider failure does not undo account creation; HTTP 2xx acceptance is logged without recipient personal data.
- Added account-specific Resend idempotency keys, and a secured, rate-limited self-service Settings action to resend the welcome email to the current account's own address.
- Added regression tests and a deliverability troubleshooting guide that separates DNS/SPF/DKIM/DMARC readiness, Resend API acceptance and actual inbox delivery. No real recipient was emailed during this code review.


### 2026-11-23 · Welcome email onboarding (PR #74)
- Added a one-time branded welcome email for newly created password accounts and first-time, email-verified Google accounts. Existing users signing in again do not receive another welcome.
- Reused the actual LifeOrbit wordmark as a publicly hosted email-compatible PNG, with a white and lavender HTML layout, app CTA, product tips and an equivalent plain-text version.
- Reused existing server-only Resend variables, escaped user-controlled display names and trusted the configured canonical HTTPS application origin for email links.
- Scheduled delivery as a best-effort FastAPI background task so provider failures cannot block registration; recorded the operational limitation that no durable mail retry queue exists yet.
- Added regression coverage for rendering, escaping, configuration errors, provider failures, new registration triggers and repeated Google login.
- Updated the README, documentation index, deployment, security and release guidance. This work is in PR #74 and is not production-verified.


### 2026-11-23 · Collaborative code review and regression hardening
- Fixed deleted-page handling for native Yjs notebooks: remove obsolete title/body content from the CRDT, persist deleted-page tombstones, and prevent later collaborative updates from restoring deleted page text.
- Harmonized the native sync update-size cap with the serialized document-size cap at 1.5 MB and added regression coverage.
- Improved saving across editor navigation, in-flight requests and authorization refreshes to avoid silent loss of pending changes or exposure of revoked notebook content.
- Made password-reset email processing run as a server-side background task while preserving a generic public response, separate per-account and IP limits, and secret-free error logging. Delivery remains unverified until a controlled mailbox test.
- Removed the arbitrary 2,000-workspace truncation of the opted-in community leaderboard; the backend now considers all consenting accounts, with query scalability still an operational concern.
- Added tests for deleted-page safety, Yjs size compatibility, account-specific abuse thresholds and other collaborative edge cases.

### 2026-11-23 · Documentation consolidation and current operations guidance
- Removed obsolete event-specific reports, progress diaries and duplicate early design, frontend and workflow documentation from the active repository tree, retaining the project history in Git.
- Reworked the README and documentation index to explain the current product, source versus production features, engineering ownership, API/data contracts and security expectations.
- Added an operational incident, backup and rollback runbook, refreshed the security risk register, and clarified the exact Vercel configuration requirements for password recovery.
- Added an automated local documentation link check to GitHub Actions so future file moves cannot silently break navigation.
- Aligned the root Vercel `requirements.txt` with `backend/requirements.txt` to avoid dependency-version drift between local development, CI and deployment; added a CI check for future divergence.
- Replaced a dated MongoDB incident narrative with reusable Atlas setup and disaster-recovery instructions, and removed unused historical preview screenshots.

### 2026-11-23 · Autosaving collaborative notes, password recovery and friends leaderboard
- Added a built-in MongoDB-backed Yjs editor when Liveblocks is not configured, replacing the visible manual Save page button. Text changes autosave after a short debounce and merge concurrent character-level edits; active viewers poll around every 1.3 seconds. Hosted WebSocket push still requires a configured Liveblocks provider.
- One-time migration seeds existing notebook pages into `notebook_crdts`, retains the legacy source, serializes changes through server-side locks, validates current friendship on reads/writes, and refuses to mix native changes with already-hosted Liveblocks rooms.
- Added password-reset pages, single-use 30-minute tokens stored as HMAC digests, atomic consumption, anti-enumeration responses, rate limits and revocation of all previous signed sessions. Resend handles delivery after a verified sending domain and server-only key are configured. At the latest production variable-name check, `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL` were all present. Secret values, verified sender status and delivery have not been independently checked.
- Added a private friends leaderboard that shows confirmed friends regardless of community opt-in. Public community visibility stays optional; non-friends do not receive private score details.
- Added automated regression checks and documented deployment requirements, recovery, concurrent editing, data retention and remaining security risks.
- Hardened native autosave retries with bounded exponential backoff, stopped retries and cleared in-memory editor views on revoked access, prevented page deletion while a save is pending, and removed reset tokens from the browser address bar when the reset page loads.
- Changes are proposed in PR #73, not yet verified in production. Provider setup and two-account end-to-end tests remain release gates.

### 2026-11-11 to 2026-11-20 · Dependency and maintenance updates
- Merged automated dependency updates across Python and frontend tooling. Current declared Python constraints include PyMongo >=4.20.0, FastAPI >=0.162.2, Pydantic >=2.14.3, PyJWT >=2.15.1, Google Auth >=2.62.2, cryptography >=50.0.2, email-validator >=2.4.0 and pycrdt >=0.14.13.
- Updated frontend declarations to React 19, Vite 8, TypeScript 7, current React/Vite plugin and icon dependencies; actual installed transitive versions remain determined by package resolution and the lockfile.
- Re-ran frontend, Python and dependency vulnerability checks in CI; these checks do not replace end-to-end verification or third-party security review.

### 2026-11-11 · Sharing revocation protection for realtime
- Remove all matching friendship rows during unfriending so duplicate accepted relationships cannot preserve access to private notes or notebooks.
- Reconcile Liveblocks room permissions after friendship cleanup; removing a member from the room ACL disconnects currently connected users. On revocation, force browser provider token reauthorization and recheck notebook access after disconnection.
- Broadcast invalidation for affected note shares and refetch authorized notebooks independently of friend-list loading.
- Remove revoked notebooks from the realtime editor and fail closed when access cannot be reverified.
- Add regression coverage for the revocation path before enabling provider-backed realtime.

### 2026-11-11 · Optional realtime notebook collaboration
- Implemented opt-in private Liveblocks account-room notifications for friendship, event, invitation, note and shared-notebook updates; periodic polling remains a slower recovery path.
- Added a Yjs collaborative shared notebook editor that merges simultaneous character-level edits, shows who is online and automatically synchronizes content without requiring a Save button.
- Introduced FastAPI room authorization with MongoDB friendship/member validation and provider-side private ACLs, plus server-seeded migration of existing MongoDB notebook contents into CRDT state.
- Preserved the original MongoDB content and legacy UI when the feature is disabled. Once a notebook is migrated, legacy full-document saves are rejected to protect concurrent edits.
- Added server-sourced Yjs snapshots to keep MongoDB previews current and backend-authored invalidation signals without exposing personal content in broadcasts.
- Realtime remains gated behind provider credentials and separate deployment flags; external provider configuration, permissions, retention and full two-user E2E tests are required before production enablement.

### 2026-11-11 · Immediate revocation of shared-note access
- On unfriending, remove all historical friendship records for the pair rather than only the clicked request, and verify that no accepted relationship remains.
- Continue deleting both directions of note/event/challenge shares and removing the former friend from owned shared notebooks.
- Fail closed in the shared notebook UI: discard cached pages, selected editor content, and stale request results whenever access cannot be verified. Refresh notebook authorization independently of the friend-list request.
- Refresh open notebook views immediately after friendship changes, while retaining the usual fallback polling.
- Added regression tests covering duplicate accepted friendships, former-friend read/write denial, and share cleanup.

### 2026-11-11 · Security hardening and vulnerability review
- Raised the minimum Vite 6 version to 6.4.6 for GHSA-p4f5-76q4-ffq7, a critical advisory relevant to network-exposed development servers, the minimum PyJWT version to 2.15.1, and iCalendar to 7.3.0 to avoid known old-version advisories.
- Added MongoDB-backed authentication, calendar-feed and friend-request throttling keyed by hashed client IP/account, with HTTP 429 responses and TTL cleanup.
- Added server-validated session versions that invalidate previous sessions after logout or password changes.
- Temporarily blocked unverified email changes and updated the account settings interface.
- Corrected leaderboard privacy defaults to opt-out and added explicit consent gating so previously saved implicit opt-ins do not disclose names or scores.
- Closed stale notebook access when friendships are removed, including member list reads and page writes.
- Added Origin validation for cookie-authenticated writes, disabled public production OpenAPI, improved malformed calendar URL handling and added Vercel CSP/HSTS/frame protections.
- Added limits on owned notebook creation and stored notification read markers to reduce unbounded growth.
- Added automated Python regression tests in CI and scheduled dependency update configuration.
- Reviewed tracked documentation and backend files for common credential and personal-data patterns; retained the scope and limitations in `docs/SECURITY_AUDIT.md`. Historical screenshots were subsequently retired from the active documentation tree.
- These source protections were merged to `main`; production configuration, two-account integration tests and independent review remain necessary.

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
