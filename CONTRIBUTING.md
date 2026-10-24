# Contributing to LifeOrbit

Thanks for helping build a calmer everyday planner. We welcome bug reports, small focused improvements, documentation and accessibility work.

## Before contributing

Read the [README](README.md), [product brief](docs/PRODUCT.md), [design system](docs/DESIGN_SYSTEM.md) and [architecture](docs/ARCHITECTURE.md). Search existing [issues](https://github.com/KibouAkari/LifeOrbit/issues) and open one before major API or architectural changes.

## Development setup

Use **Node.js 22** and **Python 3.12**. Follow the exact [local installation steps](README.md#get-started). Do not copy credentials into source files. Run `npm run typecheck`, `npm run build` and `python -m compileall -q backend api` before requesting review.

## Branches and changes

1. Branch from the latest `main` as `feat/<topic>`, `fix/<topic>` or `docs/<topic>`.
2. Make focused commits with descriptive messages, for example `fix: handle cancelled calendar move`.
3. Keep shared React components and design tokens consistent; test desktop, mobile, keyboard and reduced-motion behaviour.
4. Enforce authorization and validation in FastAPI; do not assume frontend checks secure data.
5. Add tests for changing behaviour, especially ownership, calendar URLs, sessions and shared access.
6. Update [CHANGELOG.md](CHANGELOG.md) under Unreleased and update affected docs.
7. Open a PR using the template and describe testing, risks, screenshots and migrations.

Never claim a feature is implemented because it is merely planned or shown in a mockup. Do not use real user data in screenshots or tests.

## Review checklist

- TypeScript build and Python compile pass.
- Backend changes are owner-scoped and reject unauthorized users.
- Empty, loading, error and success states are accessible.
- Calendar operations behave in Chromium and Firefox-based browsers where relevant.
- Sensitive data, API keys, tokens and private calendar URLs stay out of commits/logs.
- README and detailed docs match actual implementation.
- At least one teammate reviews before merging to `main`.

## Community and security

Treat contributors respectfully according to [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md). Report vulnerabilities privately using [SECURITY.md](SECURITY.md), never in public issues.

By contributing, you agree your contributions are distributed under this project's [MIT License](LICENSE).
