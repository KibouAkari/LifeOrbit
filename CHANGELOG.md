# Changelog

All changes remain under Unreleased until a verified release.

## [Unreleased]

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
