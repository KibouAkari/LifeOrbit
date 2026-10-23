# Changelog

All notable LifeOrbit changes appear here. Follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- React 19, TypeScript and Vite frontend prototype with distinct React feature pages.
- Shared navigation, themes, UI components and browser-local interactive demo state.
- Vercel frontend configuration and documented build requirements.
- Static brand assets under `public/assets` for correct Vite production serving.
- Typed frontend API boundary for a future Python service.
- CI build and TypeScript validation on pull requests.
- Deployment and architecture guidance for a separate Python backend and MongoDB.
- Existing repo standards, team guide and feature roadmap.

### Changed
- Switched from native JavaScript entry point to React.
- Updated README and frontend documentation to use `npm ci` and Vite instead of Python's static HTTP server.
- Clarified that MongoDB is accessed exclusively by the future Python backend.

### Fixed
- Corrected missing Vite public asset placement that prevented logo and favicon from being served reliably.
- Fixed TypeScript Vite environment declaration for `import.meta.env`.
- Removed unused native JavaScript demo pages to prevent developers editing the wrong implementation.
- Fixed README formatting that contained literal backslash-n sequences.

### Security
- Confirmed demo display names do not authenticate users.
- Documented backend-only secrets, server authorization, cookie/CORS/CSRF decisions and the limits of localStorage.

## Release policy

No version has shipped yet. Keep changes under Unreleased until a verified
release is published and dated, then start a new Unreleased section.
