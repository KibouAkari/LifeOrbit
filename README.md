<div align="center">

<img src="assets/icon.svg" width="96" alt="LifeOrbit planet icon" />

# LifeOrbit

**Less organising. More living.**

Tasks, calendars, notebooks, subscriptions and progress in one calm personal workspace.

[Live App](https://www.lifeorbit.dev/) · [Roadmap](docs/ROADMAP.md) · [Changelog](CHANGELOG.md) · [Contributing](CONTRIBUTING.md)

</div>

## Product

| Page | Purpose |
| --- | --- |
| Dashboard | Daily overview, upcoming items, goals and spending |
| Tasks | To-do lists, drag and drop, completion feedback |
| Calendar | Weekly view, events and one-time .ics import |
| Notes | Book-style chapters and pages |
| Subscriptions | Monthly/yearly costs and next renewal |
| Challenges | Rotating daily and weekly goals, personal progress |
| Settings | Profile, account credentials, theme and export |

## Live notifications and event management

LifeOrbit checks for new invitations while open and displays a gentle animated alert. After the first user interaction, incoming alerts may play a short sound. Background push delivery is not implemented. Shared notebook pages update automatically while the section is visible; avoid simultaneous edits to the same page until versioned conflict handling is available.

Right-click a calendar appointment for Edit, Share or Delete. On touch devices or with keyboard controls use its Actions button. The editor opens as a responsive dialog with date and start/end times.

## Notifications and deadlines

Tasks can have a due date and time. The application polls for unread event invitations, shared notes and tasks due within the next hour, showing a badge in the top bar. Read state is persisted in MongoDB. **Notifications currently work inside the running app only.** Background push reminders while the browser is closed require a scheduled backend job and Web Push registration.

Each calendar source gets its own stable accent color, including imported calendars and invited events.\n\n## Notes and shared notebooks

The Notes workspace has **My notes** and **Shared notebooks** only. A personal note can be moved into a new shared notebook; its original content is transferred before the personal entry is removed. Confirmed friends can be invited. Shared notebook pages can be saved or deleted individually. Deleting an entire notebook is a separate, owner-only action.

## Friends and sharing

Friend requests refresh periodically and when the browser returns to focus. Private notes can be shared read-only with friends. Shared notebooks can also be created under Notes, with confirmed friends invited and pages saved into MongoDB.

Calendar events use pointer-captured drag/resize gestures. The browser preview must still be tested with touch and mouse before release. Public HTTPS or webcal calendar feeds can be subscribed from any provider, subject to strict public-network validation, verified TLS and response size limits. Private network URLs and redirects are rejected for security.


Search for members by display name, send and accept friend requests, and view pending invitations in Settings. Accepted friends can receive shared read-only notes and event invitations. Invitations appear in a distinct colour in the calendar. Shared note text is refreshed periodically, not edited collaboratively.

Subscriptions support editing after creation. The week calendar displays hours and timed event cards, with drag controls for schedule changes.

See [Social and calendar design](docs/SOCIAL_AND_CALENDAR.md) for the permission model, verification steps, and explicit limits of provider integrations. Google sign-in is **not** Google Calendar authorisation. Supported HTTPS iCal links from Google, Outlook and iCloud can be saved encrypted and refreshed on demand. This is a read-only subscribed calendar feed; provider OAuth for full Google/Microsoft calendar access, automatic background refresh and two-way updates are not yet implemented.

## Technology

React + TypeScript + Vite on the frontend. Python FastAPI + Pydantic on the backend. MongoDB Atlas for persistent account data. Google Identity Services and email/password for authentication. Both frontend and backend deploy together on Vercel.

## Screenshots

The existing screenshots are historical and have been removed from the landing README so they are not mistaken for the current interface. A new capture set requires a browser session against this PR preview, including authentication, and is tracked as a release requirement in `docs/UX_STRUCTURE.md`.

## Run locally

Requirements: Node.js 22 and Python 3.12.

Frontend:

```bash
npm install
npm run dev
```

Backend in a separate terminal:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn backend.api.index:app --reload --port 8000
```

The frontend runs at http://localhost:5173, with Vite proxying /api to FastAPI.

## Vercel configuration

| Setting | Scope |
| --- | --- |
| MONGODB_URI | Python only; Atlas driver connection string |
| MONGODB_DATABASE | Python database name |
| JWT_SECRET_KEY | Python only; strong signing key |
| GOOGLE_CLIENT_ID | Python verified Google client |
| VITE_GOOGLE_CLIENT_ID | Public Google OAuth web client identifier |
| FRONTEND_ORIGINS | Approved frontend origins |

Use same-origin /api deployment, without a stale VITE_API_BASE_URL. Never commit .env files.

## Data and security

Signed-in tasks, calendar events, notes, chapters, subscriptions and challenge progress are stored per account in MongoDB. Secure HttpOnly cookies are used for signed-in sessions. Google-only credentials remain managed by Google.

Calendar .ics import copies events into the user's MongoDB account. It does not continuously synchronize Google, Outlook or Apple calendars.

The shared leaderboard is not yet implemented. Until real consenting accounts and server-authoritative scores exist, only personal progress is displayed.

Email changes for local password accounts currently require the existing password, but new-email verification is not yet implemented. Do not open that feature for unrestricted public production use until verification, rate limiting, account recovery and session revocation have been reviewed.

## Verify

```bash
npm run typecheck
npm run build
npm audit --audit-level=high
python -m compileall -q backend api
pip-audit -r backend/requirements.txt
```

Check /api/health and /api/health/database after deployment.

See [Deployment](docs/DEPLOYMENT.md), [Security Audit](docs/SECURITY_AUDIT.md), [Architecture](docs/ARCHITECTURE.md), [Design System](docs/DESIGN_SYSTEM.md) and [Team Workflow](docs/TEAM_WORKFLOW.md).

## License

[MIT](LICENSE).

## Calendar and challenges roadmap

The calendar now defaults to a rolling seven-day view beginning today. The arrows move to conventional Monday-based weeks. Month view, timed events, editing and dragging between days use the MongoDB event API. Imports are currently one-time `.ics` uploads. Google Calendar, Microsoft Outlook and Apple CalDAV live synchronization still need separate consent, OAuth or app-specific authorization, encrypted credential storage, background refresh, source mapping and conflict resolution. No account is shown as connected until those services exist.

Challenge suggestions rotate, and users can save recurring personal templates. Public rankings show only accounts that explicitly opt in. Your own profile remains visible to you even if nobody else has joined.
