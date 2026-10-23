# Changelog

All notable changes to LifeOrbit are documented here.
Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Vite + React + TypeScript frontend foundation with per-feature React pages.
- Reusable React sidebar/layout, shared UI primitives and typed context state.
- Prepared `/api` proxy and central typed HTTP client for a future Python backend.
- Node development, typecheck and build scripts; React/Python architecture guide.
- Responsive prototype for dashboard, notes, planner, calendar, subscriptions, challenges, settings and demo login.
- Light/dark/system themes and browser-local interactive demo features.
- Team contribution and design rules, GitHub templates and project documentation.

### Changed
- Replaced the native JavaScript demo entry point with a React application.
- Marked old native-JavaScript page modules as migration reference only.

### Security
- Demo login is only a local display name and provides no authentication.
- No Python backend or protected storage exists yet; do not store sensitive data.

## Release policy

No version has been released. Move verified Unreleased entries to a dated
version only when an actual release is published.
