# Changelog

Changes are grouped under [Unreleased] until a tested release is published.

## [Unreleased]

### Added
- Premium interface refresh with a calmer dashboard, quick task entry, redesigned navigation and motion states.
- Purpose-built 404 screen and login preview with an explicit demo bypass.
- Python FastAPI scaffolding matching the team's backend layout and separate Vercel configuration.
- MongoDB connection helper, Pydantic input model, API health route and safe unimplemented route placeholders.
- Shared design-system and backend-integration guides.

### Changed
- Adopted a unified lavender/graphite palette that also appears in the refined planet branding.
- Removed redundant small headings above page titles.
- Reworked dashboard hierarchy around today's tasks, upcoming events and quick actions.
- Clarified frontend/backend responsibility and two-project Vercel deployment.

### Fixed
- Removed an unused dashboard icon import that could fail strict TypeScript validation.
- Aligned the repository README logo with the updated app branding.
- Added navigation from account settings to the login preview.
- Unknown routes now show a dedicated 404 page instead of silently returning to dashboard.
- Mobile navigation has a dismissible backdrop and clearer controls.

### Security
- Demo login remains deliberately unauthenticated.
- Protected backend endpoints return 501 rather than pretending to accept logins or store private data.
- MongoDB credentials are server-only and must never be exposed as Vite variables.

## Release history

No production release has been published.
