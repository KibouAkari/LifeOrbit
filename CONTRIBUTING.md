# Contributing to LifeOrbit

Thanks for helping LifeOrbit feel useful, calm and welcoming.

## Before you start

1. Read [the product brief](docs/PRODUCT.md) and [roadmap](docs/ROADMAP.md).
2. Check existing issues to avoid duplicate work.
3. Open an issue before large scope or architecture changes.
4. Keep changes focused and reviewable.

## Development workflow

1. Create a short-lived branch from `main`, e.g. `feat/calendar-month-view`.
2. Make the smallest useful change.
3. Test functionality and keyboard/mobile behaviour where relevant.
4. Update `CHANGELOG.md` under **Unreleased** when behaviour or documentation meaningfully changes.
5. Open a pull request using the template. Link the issue if there is one.
6. Seek a teammate review before merging.

Use descriptive commits such as `feat: add task completion toggle`,
`fix: correct timezone conversion` or `docs: clarify setup`.

## Quality expectations

- Simple, accessible UI beats unnecessary complexity.
- Empty, loading, error and success states matter.
- Validate data and access on the server, not only in the browser.
- Keep credentials and personal information out of commits, screenshots and logs.
- Do not commit `.env` secrets or production datasets.
- Do not mark incomplete functionality as released.
- Add tests for business logic when implementation begins.

## Setup

The app framework and executable setup commands are **not yet chosen**.
When code is introduced, this guide will specify exact tested commands.
For now, documentation and planning changes can be contributed directly.

## PR checklist

Use the pull request template, describe the impact, include screenshots for
visual changes, note how you tested it, and explicitly say whether a
changelog entry is required.

## Community

Read [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) and report security concerns
privately following [SECURITY.md](SECURITY.md).

All contributions are subject to the [MIT License](LICENSE).
