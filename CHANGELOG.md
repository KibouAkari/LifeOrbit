# Changelog

All changes remain under Unreleased until a verified release.

## [Unreleased]

### 24 October 2026 · Interface refinements
- Reworked Settings around a profile summary, appearance and privacy without decorative or non-functional controls.
- Made Dashboard cards denser, added restrained staggered entrance transitions and improved challenge progress feedback.
- Corrected authenticated workspace hydration on page refresh.

### 24 October 2026 · Authentication and workspace integration
- Moved signed-in authentication from sessionStorage bearer tokens to Secure HttpOnly SameSite cookies.
- Updated React API and account restoration to use cookie-based authentication.
- Added debounced MongoDB workspace persistence for notes, subscriptions and challenge progress; chapter metadata migration still needs refinement.

### 24 October 2026 · MongoDB connection diagnosis
- Confirmed registration failures result from a non-resolving MongoDB Atlas hostname in Vercel, not the React form.
- Added an authenticated data workspace API for notes, notebook chapters, subscriptions and personal challenge progress.
- Added database health route and sanitized 503 responses for MongoDB failures.
- Added Atlas configuration and verification instructions without publishing secrets.
- Retained the public-release blockers for account security and session architecture.


### 24 October 2026 · Deployment and security repairs
- Located production 404 root cause: the Vercel project deployed only Vite and had no live Python API.
- Added an in-project FastAPI function entrypoint, explicit Python requirements and /api routing configuration.
- Fixed Vercel Python requirements parser rejecting the -r inclusion directive.
- Fixed runtime import failure caused by missing requests dependency for Google token validation.
- Normalized Python backend imports for the monorepo.
- Added scheduled npm and Python dependency vulnerability checks.
- Added a severity-based security audit and a release-blocker list.
- Confirmed existing auth, MongoDB indexes and JWT lifecycle still need public production hardening.

### Earlier changes (unreleased)
- Initial GitHub documentation, contribution guide, license, issue templates and release rules.
- React and TypeScript migration with Vite, page modules and shared design system.
- Dashboard, light/dark themes, navigation and animated logo entrance.
- Tasks with feedback and drag/drop; calendar week view; notebook chapters and local notes.
- Subscriptions with monthly/yearly renewals; challenges with sample leaderboard.
- Google identity integration and basic MongoDB-backed calendar and task endpoints.
- Email/password registration, login, settings, privacy and terms drafts.


### Added
- MongoDB email/password registration and login alongside Google OAuth, with bcrypt password hashing.
- Account form with login/register tabs, password visibility control and actionable OAuth environment guidance.
- Privacy/terms draft pages and discreet entry links; operator details still require legal review.
- Dashboard subscription overview and renewal summaries.

- Server-side verified Google ID-token login with short-lived signed JWT access tokens and /api/auth/me.
- MongoDB-backed, owner-scoped calendar and task create/read/update/delete endpoints.
- Google sign-in button, account recovery on refresh, explicit sign-out and guest access.
- Task drag and drop ordering, short completion animation, gentle sound and feedback messages.
- Empty calendar invitation, dashboard challenge podium preview and expanded account settings.
- Monthly and yearly subscription entry, monthly-equivalent totals and calculated next renewal dates.
- Challenge leaderboard with profile initials and a visual three-place podium (sample data only).

### Changed
- Dashboard progress donut now uses stable conic-gradient bounds and centered text.
- Session and API calls are centralized; guest mode remains local.
- API CORS origins are restricted through FRONTEND_ORIGINS.

### Fixed
- Put the winner in the centre of the challenge podium.
- Distinguish VITE_GOOGLE_CLIENT_ID for Vercel frontend builds from backend GOOGLE_CLIENT_ID.
- Align password and Google accounts with a common immutable MongoDB user ID.

- Undefined MongoDB collection in Google authentication, missing Pydantic calendar schema and missing Python auth dependencies.
- Calendar routes now validate ObjectIds and check document ownership.
- Token verification now checks audience, issuer and required claims.

### Security
- Google subject rather than mutable email identifies users.
- Authenticated tasks and events are queried per Google subject.
- Production readiness remains blocked until deployment, OAuth configuration, end-to-end tests and remaining data services are verified.
- Current short-lived bearer token uses sessionStorage and requires a reviewed session/cookie migration before public production use.

## Release history

No verified production release has been published.
