# Changelog & release workflow

The changelog is a product history, **not** a raw Git commit log.

## During development

For each meaningful pull request, add one line under `## [Unreleased]` in `CHANGELOG.md`:

- **Added:** New user-visible capabilities.
- **Changed:** Improvements to existing behaviour.
- **Deprecated:** Features scheduled for removal.
- **Removed:** Removed features.
- **Fixed:** Bug fixes.
- **Security:** Security-relevant changes without exposing exploit details.

Use short, understandable descriptions. Group related commits into one entry. Put the user benefit before technical jargon. Do not announce unbuilt features as released.

## Cutting a release

1. Check that the release contents are complete, tested and demo-ready.
2. Choose a version using the team's versioning policy (recommended: SemVer).
3. Move the relevant lines from `Unreleased` to a new heading, for example `## [0.1.0] - 2026-10-23`. Use the **actual** release date.
4. Leave the `Unreleased` heading in place and reset its empty categories.
5. Update compare links and any version mentions in the README.
6. Merge the release PR and create a matching Git tag (`v0.1.0`).
7. Create GitHub release notes based on the verified changelog and check links.

## Release checklist

- [ ] Product changes described clearly in `CHANGELOG.md`.
- [ ] No planned or incomplete feature is presented as shipped.
- [ ] Core flows verified and no secrets committed.
- [ ] New version and date are correct.
- [ ] README and roadmap reflect the actual state.
- [ ] Release tag and published notes agree with the changelog.

## Changelog convention for pull requests

Include **Changelog: updated** or **Changelog: not needed** with a short explanation in the pull request template. This is enforced by the documentation workflow only for PRs that affect application code after such checks are introduced; the initial workflow validates the documentation files themselves.
