<div align="center">

<img src="assets/icon.svg" alt="LifeOrbit icon" width="88" />

# LifeOrbit

**Less organising. More living.**

A personal planner for notes, tasks, calendars, friends and everyday progress.

[Application](https://www.lifeorbit.dev/) · [Documentation](docs/README.md) · [Contributing](CONTRIBUTING.md) · [Security](SECURITY.md)

</div>

## What and why

LifeOrbit brings the small pieces of everyday planning into one approachable workspace. It combines personal organization with explicitly authorized collaboration. User-owned data stays private unless sharing is intentionally enabled.

This is an actively maintained open-source application, **not a finished or independently security-certified service**. Documentation distinguishes deployed behavior from features currently in review.

## Features

| Area | Functionality |
| --- | --- |
| Dashboard | Upcoming events, tasks, subscription totals and challenge progress |
| Tasks | Add, complete and order tasks; optional deadlines and in-app reminders |
| Calendar | Week/month planning, appointment edits, read-only event invitations and RSVP |
| Calendar sources | Import .ics files; manually refresh validated HTTPS/webcal subscriptions |
| Notes | Private notebook chapters; invite accepted friends into shared notebooks |
| Challenges | Personal/shared goals and points; private friends ranking and optional community ranking |
| Friends | Friend discovery, requests and accepted-friend invitations |
| Subscriptions | Track billing amount, currency, schedule and renewal |
| Account | Password/Google sign-in, profile, workspace export and account settings |

### Collaboration and account recovery status

| Capability | Deployed production `main` | Proposed in [PR #73](https://github.com/KibouAkari/LifeOrbit/pull/73) |
| --- | --- | --- |
| Shared-notebook editing | Manual save; periodic updates | Built-in Yjs autosave, concurrent-merge HTTP synchronization |
| Hosted realtime push | Not configured | Optional Liveblocks WebSockets with independent configuration |
| Password reset via email | Not deployed | Single-use email reset links; Resend sender verification and real delivery test outstanding |
| Friends leaderboard | Public opt-in ranking | Separate private friends ranking, public community still opt-in |

Native autosave is **near-live**, not push realtime: active clients poll for changes roughly every 1.3 seconds. Neither it nor the password recovery flow should be considered production-verified until a controlled preview test succeeds.

**Email recovery configuration:** Vercel now lists all three production environment variable names: `RESEND_API_KEY`, `PASSWORD_RESET_FROM_EMAIL` and `PUBLIC_APP_URL`. Their values were not retrieved or validated, and a real reset email has not been sent in this review. These settings do not activate the feature until the code is merged and deployed. Follow the [password recovery guide](docs/PASSWORD_RECOVERY.md) for sender-domain verification and safe testing.

## Technology

| Component | Stack |
| --- | --- |
| Frontend | React 19, TypeScript, Vite, CSS |
| API | Python 3.12, FastAPI, Pydantic |
| Data | MongoDB Atlas |
| Authentication | Signed Secure HttpOnly cookies; password and Google ID token verification |
| Collaboration | Yjs with MongoDB persistence; optional Liveblocks provider |
| Hosting | Single Vercel project with same-origin `/api` routing |

## Local development

Requires Node.js 22, Python 3.12, npm and access to a development MongoDB database.

```bash
git clone https://github.com/KibouAkari/LifeOrbit.git
cd LifeOrbit
npm install
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

On Windows, activate the environment with `.venv\Scripts\Activate.ps1`.

The root `requirements.txt` mirrors `backend/requirements.txt` so local installation and Vercel deploy the same declared Python dependencies. Keep both synchronized when updating packages.

Set the backend environment values described in [Deployment](docs/DEPLOYMENT.md). Use a local secret manager or exported environment variables. Copying `backend/.env.example` alone **does not load** it into the process. Never reuse production credentials for development.

Start the API and frontend in separate terminals:

```bash
uvicorn backend.api.index:app --reload --port 8000
```

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Vite proxies `/api` to the local backend. The API health routes are `/api/health` and `/api/health/database`; the latter needs a configured database.

Validate your changes before opening a pull request:

```bash
npm run typecheck
npm run build
python -m compileall -q backend api
python -m unittest discover -s tests -v
```

Dependency auditing and documentation checks also run in GitHub Actions. Use [Contributing](CONTRIBUTING.md) for review conventions.

## Documentation

Start with the [documentation index](docs/README.md) to find the guides for architecture, API, data model, feature behavior, UI, deployment, operations, security, collaboration and account recovery. Use the [changelog](CHANGELOG.md) for development history and the [release checklist](docs/RELEASING.md) for production gates.

## Security and privacy

Every API operation must validate authenticated ownership and, where applicable, an **accepted current friendship**. Client-side UI visibility is never authorization. Community leaderboard participation is explicitly optional, whereas accepted friends may compare scores privately in the implementation under review.

Never publish API keys, account tokens, calendar subscription URLs, users' personal content or production database credentials. Report security vulnerabilities privately following [SECURITY.md](SECURITY.md).

**Known release blockers:** email provider domain verification and delivery testing, two-account collaborative editing and revocation tests, reliable backup/restore of Yjs content, account recovery and deletion workflows, and independent hosting/security review. See [Security audit](docs/SECURITY_AUDIT.md).

## License

Licensed under the [MIT License](LICENSE). See the [Code of Conduct](CODE_OF_CONDUCT.md) for community standards.
