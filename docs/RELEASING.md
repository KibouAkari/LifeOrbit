# Release and public launch checklist

LifeOrbit is an open-source project under active development. **Publishing the GitHub repository** and **opening production to public users** are separate decisions. Complete relevant gates below before broadening access to accounts with personal data.

## Source publication

- [ ] Confirm repository visibility and Git history contain no secrets, private datasets or customer information; rotate any exposed keys.
- [ ] Verify [MIT License](../LICENSE), authorship and third-party asset/license permissions.
- [ ] Verify README links, images, current features and local setup on a clean machine.
- [ ] Review contribution, conduct, security and issue/PR templates.
- [ ] Review operator-specific legal notices for accuracy; do not claim legal approval without it.
- [ ] Keep screenshots current, genuine and scrubbed of private information.

## Application release gates

- [ ] All mandatory GitHub Actions checks pass: TypeScript/build, documentation, `npm audit`, `pip-audit`, Python compile.
- [ ] Check `/api/health` and `/api/health/database` on the target Vercel deployment.
- [ ] Test account registration, Google OAuth, login/logout, error messages and session lifecycle.
- [ ] Test two users' data isolation on tasks, workspaces, calendar feeds, invitations and shared notebooks.
- [ ] Test RSVP accept/decline/remove, friendship revocation and notebook page ownership.
- [ ] Confirm iCal SSRF controls, DNS rebinding protection, no redirects and response-size limits.
- [ ] Test calendar interaction on Windows Chromium and macOS Firefox/Zen, plus mobile.
- [ ] Test accessibility: keyboard actions, focus, touch targets and reduced motion.
- [ ] Confirm dark/light mode persistence and overdue task timezone handling.
- [ ] Check notification polling limits, duplicate handling, concurrency and degraded service behaviour.
- [ ] Resolve or explicitly risk-accept issues in [Security Audit](SECURITY_AUDIT.md); high-severity blockers require a real mitigation.
- [ ] Confirm accurate privacy/terms notices, legal operator identity, account/data removal procedure and retention commitments.
- [ ] Arrange monitoring, incident contacts, backups/restore tests and a rollback plan.

## Versioning and changelog

The project has no verified tagged stable release yet. Keep work under `## [Unreleased]` in [CHANGELOG.md](../CHANGELOG.md). When verified, create a SemVer tag, move relevant changes into a dated section and publish GitHub Release notes. Do not invent release versions or passing tests.

## Rollback

Use Vercel's previous verified deployment and revert the Git merge if appropriate. For database migrations or auth/crypto changes, prepare a data-compatible rollback separately. Reverting frontend code does **not** reverse MongoDB writes.
