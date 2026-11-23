# FastAPI contract

The frontend calls the same-origin `/api` prefix. `api/index.py` delegates to `backend/api/index.py`. All private resources require authenticated sessions; ownership and accepted-friend membership are enforced on the server, not only in React.

## Route groups

| Resource | Principal endpoints | Access |
| --- | --- | --- |
| Health | `GET /api/health`, `GET /api/health/database` | Public process and database checks |
| Auth | `POST /api/auth/register`, `/login`, `/google`, `/logout` | Registration or authenticated session |
| Account | `GET/PATCH /api/auth/me`, `GET /api/auth/export`, `PATCH /api/auth/password` | Account owner |
| Recovery (PR #73) | `POST /api/auth/password/forgot`, `POST /api/auth/password/reset` | Public, rate-limited, single-use token |
| Tasks | `GET/POST /api/tasks`, `PATCH/DELETE /api/tasks/{id}` | Owner |
| Workspace | `GET/PUT /api/workspace` | Owner; aggregate write |
| Events | `GET/POST /api/calendar/events`, `PUT/DELETE /api/calendar/events/{id}` | Owner |
| Calendar feeds | `/api/calendar/feeds` and `/{id}/refresh` | Owner; validated remote source |
| Friends | `/api/friends`, `/search`, `/requests`, `/requests/{id}/accept` | Authenticated, acceptance required |
| Shares | `/api/sharing/notes`, `/events`, `/challenges` and RSVP routes | Authorized current friends |
| Notebooks | `/api/shared-notebooks`, `/{id}/members`, `/{id}/pages`, `/{id}/pages/{page_id}` | Owner or authorized members |
| Native Yjs sync (PR #73) | `GET/POST /api/shared-notebooks/{book_id}/sync` | Owner or accepted invited member |
| Realtime (optional) | `POST /api/realtime/authorize`, `/notebooks/{id}/prepare`, `/notebooks/{id}/snapshot` | Authenticated and provider authorized |
| Activity | `GET /api/notifications`, `POST /api/notifications/read` | Account owner |
| Leaderboard | `GET /api/leaderboard` | Viewer; private friends vs public community visibility |
| Dashboard | `GET /api/dashboard/stats` | Account owner |

Consult the source route decorators for precise request and response models. There is no public, auto-generated production OpenAPI schema; development-mode `/api/openapi.json` may be enabled.

## Authentication and privacy

- A signed, short-lived JWT lives in an HttpOnly, Secure cookie scoped to `/api`.
- A MongoDB `session_version` invalidates prior cookies on logout, password change or successful reset; logout currently affects all devices.
- Google login verifies Google identity; it does **not** authorize calendar access.
- Password recovery requests respond generically for registered and unregistered emails, with abuse limits and 30-minute single-use tokens. Email delivery runs as background work, so HTTP 202 confirms request acceptance, not an email delivery receipt.
- Backend MongoDB filters use typed request bodies, validated ObjectIds and server-selected operations. User-supplied MongoDB operators must never be interpreted as query documents.
- The leaderboard's `friends` field is scoped to currently accepted friends; `participants` is opt-in community visibility. Scores are self-reported. The community query is no longer artificially truncated to a fixed 2,000 accounts; monitor performance as the number of consenting accounts grows.

## Error semantics and versioning

Follow normal HTTP semantics: 400 for malformed input, 401 for missing/invalid authentication, 403 for forbidden actions, 404 for resources not accessible, 409 for concurrent state or Yjs authority conflicts, 429 for throttling and 503 for unavailable infrastructure. Do not include personal data or internal topology in errors.

A failed `/sync` call must **not** be treated as saved. Retrying stale full-page PUTs is prohibited after Yjs migration. Clients must merge CRDT changes and stop editing on revoked access.

## Development and compatibility

Use `VITE_API_BASE_URL` only when separating the API origin; same-origin deployment is preferred. Keep `FRONTEND_ORIGINS` and cookie flags aligned with the actual browser origin. Changes to auth, synchronization or sharing require matching tests and updates to [Architecture](ARCHITECTURE.md), [Data model](DATA_MODEL.md) and [Security audit](SECURITY_AUDIT.md).

Run `python -m unittest discover -s tests -v` and `npm run typecheck` before merging.
