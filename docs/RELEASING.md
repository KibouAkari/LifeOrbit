# Release checklist

LifeOrbit uses a manual changelog-first release process until automation
is validated.

1. Confirm changes have been reviewed and tested.
2. Audit `CHANGELOG.md` > Unreleased for accurate Added, Changed, Fixed
   and Security items. Remove empty categories if appropriate.
3. Decide the next SemVer version. No version is implied by a planned badge.
4. Move released items under `## [X.Y.Z] - YYYY-MM-DD`.
5. Leave a fresh `## [Unreleased]` section above the release.
6. Open and merge a release PR.
7. Tag the merge commit `vX.Y.Z` and publish GitHub release notes based
   on the changelog.
8. Check documentation links and the release artifact/demo.
9. Record regressions as new issues and Unreleased changelog entries.

Never claim the app is deployed or production-ready without verification.
A feature is not released merely because it appears in a roadmap.
