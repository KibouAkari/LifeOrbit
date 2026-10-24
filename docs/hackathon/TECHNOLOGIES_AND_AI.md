# Technologies, Open Source and AI Assistance

## Technologies used

| Technology | Role |
| --- | --- |
| Miro | Idea collection, feature organisation and project planning |
| React | User interface |
| TypeScript | Frontend programming and static types |
| Vite | Frontend development and builds |
| CSS | Layout, styling and responsive design |
| Lucide | Interface icon library |
| Python | Backend programming |
| FastAPI | HTTP API |
| Pydantic | Request and data validation |
| MongoDB Atlas | Persistent storage |
| Vercel | Deployment and hosting |
| Google Identity Services | Google account sign-in |

The actual dependency declarations are in [package.json](../../package.json), [requirements.txt](../../requirements.txt) and [backend/requirements.txt](../../backend/requirements.txt).

## Open-source components and licensing

LifeOrbit's own source is released under the [MIT License](../../LICENSE). Third-party libraries and services retain their respective licensing and usage terms. The project's MIT license does not override restrictions on third-party assets or hosted services.

Important dependencies include React, TypeScript, Vite, FastAPI, Pydantic, PyMongo, cryptography and Lucide. The complete set of direct and transitive dependencies depends on the installed versions.

## AI assistance

ChatGPT was used as a development aid during the project, including assistance with UI ideas, code suggestions, debugging and documentation.

The project concept originated with the two-person team, which made the planning decisions and remained responsible for reviewing and integrating the resulting work. AI-generated code or text should not be interpreted as independently tested or verified simply because it was generated.

The repository does not establish a deployed, user-facing AI assistant feature. No other AI products are attributed without confirmed use.

## Responsible development

Credentials, private calendar URLs and personal account data should not appear in source code or public documentation. Authentication, access control and shared data require server-side enforcement and ongoing security review.

See [Security Policy](../../SECURITY.md) and [Security Audit](../SECURITY_AUDIT.md).
