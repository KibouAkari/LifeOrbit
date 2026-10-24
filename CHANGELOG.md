# Changelog

LifeOrbital follows Keep a Changelog conventions. All entries remain Unreleased until a verified tagged release.

## [Unreleased]

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
