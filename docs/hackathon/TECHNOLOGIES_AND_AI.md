# Open source, external services and AI disclosure

Transparency about tools and assistance is a **MUST requirement** under the supplied Zentral Hack challenge.

## Core technology inventory

The following are present in the repository's dependency or configuration files. See [package.json](../../package.json), [requirements.txt](../../requirements.txt) and [backend/requirements.txt](../../backend/requirements.txt) for the authoritative dependency declarations.

| Component | Role | Licensing verification |
| --- | --- | --- |
| React, React DOM | User interface | Verify installed package license before public submission |
| TypeScript, Vite, @vitejs/plugin-react | Build and frontend developer tooling | Verify actual installed dependency licenses |
| lucide-react | Interface icons | Verify package and icon attribution conditions |
| Python, FastAPI, Pydantic, Uvicorn | Backend API and validation | Verify package licenses |
| PyMongo | MongoDB database driver | Verify installed license terms |
| google-auth / Google Identity Services | Identity verification | Google API terms and dependency license to be reviewed |
| PyJWT, passlib, bcrypt, cryptography | Session, passwords and encryption | Verify dependency licenses and maintained versions |
| requests, urllib3, icalendar | External HTTPS/iCalendar handling | Verify licenses and security advisories |
| Vercel and MongoDB Atlas | Hosting and persistent storage | Proprietary services with provider terms, not open-source project dependencies |

**Important:** The MIT License on LifeOrbit does not automatically grant rights to all third-party assets, fonts, logos or external APIs. Perform and record a license audit using the actual resolved versions, including transitive dependencies.

## External data and privacy

- Google Sign-In is used for identity, not direct Calendar/Gmail access.
- Public HTTPS calendar feeds can be subscribed to using user-provided links; private feed tokens require careful handling.
- Vercel and MongoDB Atlas provide infrastructure. Production service regions and data-processing agreements must be confirmed by the operator.
- Demo and research data should be synthetic or expressly consented to.

## AI-tool use

LifeOrbit has received **ChatGPT assistance** in design and development discussion, code suggestions, documentation drafting, GitHub/Vercel changes and debugging workflows. This is material assistance and should be disclosed. Team members must verify and expand the declaration with other AI products actually used during the hackathon.

| Use | Disclosed status | Human responsibility |
| --- | --- | --- |
| Brainstorming and UX/product wording | ChatGPT-assisted across development conversations | Team selects, adapts and justifies |
| Source code generation and refactoring | ChatGPT-assisted contributions have occurred | Team reviews, tests and owns merged code |
| Documentation and pitch drafts | ChatGPT-assisted, including this dossier | Team verifies factual claims and replaces placeholders |
| Bug investigation, CI/deployment support | AI-assisted tool use in prior development | Team confirms results independently |
| Embedded AI end-user feature | **Not established in current repository** | Do not claim it exists |
| Additional AI tools, models, prompts and paid APIs | Pending team confirmation | Record actual names, purpose, license/data terms |

Using AI does not replace evidence of **the team's independent decisions, testing or substantial 24-hour contribution**. AI output must be reviewed for insecure code, false claims, licensing issues and data leaks.

## Rights and compliance checklist

- [ ] All original code, diagrams, screenshots and brand assets have confirmed authorship/permission
- [ ] Dependency licenses and notices are reviewed for actual versions
- [ ] No proprietary customer/employer code or confidential materials copied into repository
- [ ] No unconsented personal data included in commits, screenshots or prompts
- [ ] All AI tools used by the team are disclosed with purpose and meaningful boundaries
- [ ] Relevant third-party API/provider terms are reviewed
- [ ] Security-sensitive changes tested rather than trusted based on generated code alone

## Final team sign-off

**Reviewed by / date:** Pending  
**Other AI tools used:** Pending confirmation  
**License checks completed:** Pending evidence  
**Third-party attribution file needed:** Determine after inventory
