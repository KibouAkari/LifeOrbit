# Releases

LifeOrbital uses Keep a Changelog style and separates planned changes from
verified releases.

## Merge checklist

1. Review code and check TypeScript/build CI.
2. Check `npm audit` and `pip-audit` results, and resolve blocking findings.
3. Verify the deployed `/api/health` endpoint.
4. Verify Google OAuth and email/password login against real backend.
5. Test MongoDB ownership isolation and actual account persistence.
6. Review mobile views, keyboard accessibility and reduced-motion behaviour.
7. Update CHANGELOG.md under Unreleased for user-visible changes.
8. Review privacy/terms content with the real operator information.

Only move items into a dated SemVer release after every required gate passes.
Do not claim production readiness from a frontend-only Vercel build.
