# Changelog

All notable changes to LifeOrbit are documented here. Follow [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Versions will follow Semantic Versioning once released.

## [Unreleased]

### Added
- Functional browser demo with a shared responsive sidebar, consistent navigation and account link.
- Light and dark themes with persistent browser preference.
- Dedicated dashboard, notes, planner, calendar, subscriptions, challenges, account and login placeholder modules.
- Local demo persistence for tasks, notes, events, subscription entries, challenge progress and profile preferences.
- Shared design tokens, accessible focus styles, reduced-motion support and a team frontend guide.
- Initial repository documentation, contribution and security guidance.
- Hackathon product scope and seven core features plus seven stretch goals.
- GitHub issue and pull-request templates and documentation checks.

### Changed
- Replaced the original Hello World placeholder with a navigable demo application.
- Clarified MVP priorities and separated optional features from required scope.

### Security
- Escape browser-provided text before rendering it as HTML.
- Documented that demo data and account are browser-local and **not authenticated**.

## Release policy

No version has been shipped yet. Keep new entries under Unreleased.
Before tagging a release, move them under `## [X.Y.Z] - YYYY-MM-DD`
and leave an empty Unreleased section. See [release guide](docs/RELEASING.md).
