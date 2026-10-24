# Zentral Hack requirements and evidence map

This matrix follows the **requirements supplied for the event**, without changing their priority or weighting. Status means **documented evidence**, not whether an underlying feature probably exists.

## MUST requirements

| Requirement | LifeOrbit response | Evidence to provide | Status |
| --- | --- | --- | --- |
| Own idea or independent development | LifeOrbit's own product concept and implementation | Product brief, repo history, team contribution log | Existing project; team authorship to confirm |
| Concrete problem or traceable value | Fragmented planning and small-group coordination | [Problem statement](PROBLEM_AND_SOLUTION.md), demo, feedback | Problem documented; validation pending |
| Substantial improvement during the 24 hours | Deliver a scoped, testable before/after increment | Baseline SHA, event commits, demo comparison | **Pending event evidence** |
| Working prototype or traceable demo | Authenticated tasks, calendar, notebook workflow | [Demo script](DEMO.md), recorded results | Prototype code exists; event demonstration pending |
| Document the work | Repository, README, changelog and this dossier | Repo links and evidence index | Prepared; event entries pending |
| Present solution and progress | 3-minute pitch with demo and learning | [Pitch](PITCH.md), rehearsal | Script prepared; presentation pending |
| Disclose OSS and AI tools | Dependency inventory, external services and assistance | [Technology/AI declaration](TECHNOLOGIES_AND_AI.md) | Initial disclosure prepared; team confirmation pending |

## SHOULD requirements

| Requirement | Proposed implementation / evidence | Status |
| --- | --- | --- |
| User feedback or usage analysis | Conduct short moderated tests and report counts, observations and changes | Planned; not performed |
| Digital prototype | React/TypeScript web app + Python API + MongoDB | Implemented foundation |
| AI, analytics or innovative technology | Document any actual AI-assisted development; do not claim AI is embedded in product | Development assistance disclosed, product AI not asserted |
| Business model / further development | Freemium hypothesis, operating costs, audience and privacy constraints | Hypotheses documented |
| Convincing pitch | Tight problem → solution → live demo → outcome → next step | Draft prepared |

## Out of scope

A complete commercial launch, fully production-ready solution and additional features without a tested outcome are **not required**. Showing only an unchanged existing prototype without a substantial hackathon increment **does not satisfy** the challenge.

## Technical constraints and resource compliance

- Tools, languages, public APIs, open-source packages and AI assistance are allowed when documented.
- Respect third-party rights, trademarks, licenses and use restrictions.
- Do not import real users' personal data or confidential employer material without authority.
- Handle security-sensitive functionality responsibly, including authentication, shared content and private calendar URLs.
- Preconfigure own equipment, accounts, local runtimes, Vercel/Atlas access and test credentials before the event.
- Keep a demo/backup path in case the deployed app or Wi-Fi becomes unavailable.

## Required deliverables

| Deliverable | Location |
| --- | --- |
| Working prototype/demo | App + [reproducible demo](DEMO.md) |
| 3-minute presentation, followed by jury questions | [Pitch](PITCH.md) |
| Code repository | https://github.com/KibouAkari/LifeOrbit |
| README and technical docs | [README](../../README.md) and [docs](../) |
| Original problem, audience, solution, actual hackathon change and learning | [Problem](PROBLEM_AND_SOLUTION.md), [Log](DEVELOPMENT_LOG.md), [Evidence](EVIDENCE.md) |

## Judging criteria and weighting

| Criterion | Weight | Recommended proof |
| --- | ---: | --- |
| Innovation & Kreativität | **20%** | Own concept, clean integration and distinct UX |
| Technische Umsetzung | **20%** | Working end-to-end demo, tests, security boundaries |
| Problemlösung & Relevanz | **20%** | User problem, observed usability outcomes, clear value |
| Präsentation & Pitch | **15%** | Rehearsed 3-minute presentation, accessible demo |
| Business-Potenzial | **25%** | Future concept **and especially** traceable 24-hour progress, own work and results |

The last criterion's label and description are preserved as provided. It explicitly mentions development progress and contribution as well as business potential; prepare evidence for all of those, rather than silently reinterpreting the category.

## Evidence quality scale

**Verified:** accompanied by actual working demo/test result and/or dated commit.  
**Documented:** explained but not independently demonstrated.  
**Planned:** a proposal or to-do, not an achievement.

Complete the checklist using the team's actual event artifacts.
