# Security Policy

LifeOrbit is an early hackathon project. It is **not yet production-ready** or audited for storing sensitive personal data.

## Supported versions

No production version is supported at this stage. Security fixes are handled on a best-effort basis during development.

## Reporting a vulnerability

**Please do not open a public issue containing exploit details, access tokens or personal data.** If GitHub's private vulnerability reporting feature is enabled, use the repository's **Security** tab. Otherwise, contact a maintainer privately through GitHub and request a secure reporting channel.

When reporting, include affected areas, reproduction steps, expected impact and a safe proof of concept if possible. Do not test against other people's accounts or data.

## Baseline expectations

Authentication and session handling, access control, private notes, calendar records, reminder delivery and subscription data require careful review before production deployment. Never commit secrets; validate authorization server-side; and avoid including private content in logs or notifications.
