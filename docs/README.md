# Documentation

This is the current engineering and operations reference for LifeOrbit. Start at the top and follow only the guides relevant to your task. Source behavior and deployed behavior are not assumed to be identical; PR #73 contains features that still need a production release.

| Question | Document |
| --- | --- |
| What does the product do and why? | [Product](PRODUCT.md) |
| Where does each component live? | [Architecture](ARCHITECTURE.md), [frontend and design](DESIGN_SYSTEM.md) |
| How do I develop or contribute? | [README](../README.md), [Contributing](../CONTRIBUTING.md) |
| What endpoints exist? | [API integration](BACKEND_INTEGRATION.md) |
| How is account data stored and protected? | [Data model](DATA_MODEL.md), [security audit](SECURITY_AUDIT.md) |
| How do friends, notes, calendar sharing and rankings work? | [Collaboration and calendar](SOCIAL_AND_CALENDAR.md) |
| How does autosave work, including CRDT migration? | [Realtime collaboration](REALTIME_COLLABORATION.md) |
| How does password recovery work? | [Password recovery](PASSWORD_RECOVERY.md) |
| How do I deploy it? | [Deployment](DEPLOYMENT.md), [MongoDB setup](MONGODB_SETUP.md) |
| How do I operate, monitor, back up or recover it? | [Operations](OPERATIONS.md) |
| What is required before release? | [Release checklist](RELEASING.md) |
| What needs improvement? | [Roadmap](ROADMAP.md), [security audit](SECURITY_AUDIT.md) |
| What has changed? | [Changelog](../CHANGELOG.md) |
| How do I report vulnerabilities? | [Security policy](../SECURITY.md) |

## Documentation expectations

1. Update the source-of-truth guide and `CHANGELOG.md` whenever application behavior or configuration changes.
2. Label unfinished work **proposed**, **preview only**, or **not configured**. A green CI run is not evidence of production end-to-end behavior.
3. Keep actual secret values out of documentation and examples. Never paste reset tokens, MongoDB URIs, or private calendar URLs.
4. Prefer current functional descriptions over dated progress diaries. Keep historical work in Git history and the changelog.
5. Verify internal links and API paths as part of review.

The root [README](../README.md) provides a concise quick start; individual files here give operational detail.
