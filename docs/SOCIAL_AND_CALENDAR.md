# Friends, notebooks, events and calendars

This document describes behavior in the LifeOrbit codebase. The native autosave, password recovery and friends-ranking changes are being reviewed in [PR #73](https://github.com/KibouAkari/LifeOrbit/pull/73), not yet independently validated in production.

## Friendship and sharing

The Friends panel supports display-name search and pending, accepted or removed relationships. The backend stores pairs in `friendships`. Only an **accepted current friendship** allows new invitations or private friend data access.

On unfriending, server logic revokes both directions of saved shares and notebook memberships. A stale member list does not authorize notebook reads or writes, and the editor must clear private data when access verification fails. For optional hosted collaboration, provider room ACLs also have to be revoked and the connected-client behavior tested. Downloaded copies cannot be remotely erased.

`/api/sharing/notes` provides read-only personal-note shares tied to the owner's current source note. Shared notebooks are separate resources: an owner invites accepted friends, who can edit specifically shared pages. Personal notes can be moved to a shared notebook by copying first, then deleting their private source.

## Collaborative note editing

Production `main` still has a manual shared-page Save action. PR #73 replaces the normal editor with Yjs synchronization backed by `notebook_crdts` and authenticated HTTP polling, with debounced autosave and server acknowledgment. Two editors' character-level changes can converge without last-writer-wins page replacement, but polling is **near-live**, not WebSocket push.

Native CRDT changes do not automatically overwrite notebooks previously migrated to Liveblocks. The server returns a conflict instead of mixing two authoritative document stores. Hosted Liveblocks remains opt-in behind separate server/client flags. See [Realtime collaboration](REALTIME_COLLABORATION.md) for migrations, access controls, backups and operational limitations.

## Events and notifications

Event organizers create and edit their own appointments. Invited friends can accept or decline RSVP, see their permitted event details and remove their invitation. Invitees do not gain ownership of the source event. Participants and event access must be checked against current relationships.

The UI polls for friend requests, calendar changes, shared-notebook updates and in-app reminders while open. It does not promise background push notification delivery when the browser is closed. Source calendar events use distinct visual styles; task reminders depend on configured deadlines and active sessions.

## Friend and community leaderboard

The proposed leaderboard contains two separate sets:

| Visibility | Who sees it |
| --- | --- |
| `friends` | The authenticated viewer and current accepted friends, even when their public opt-in is off |
| `participants` | Explicit community opt-ins, plus the viewer's own row |

Pending or removed friends lose access to *private* scores, but users who have opted into the public community may still appear publicly after unfriending. The API does not return other users' emails or internal account IDs. Scores come from self-reported challenge state rather than a verified competitive system.

## Calendar imports and subscriptions

Uploading an `.ics` file copies events into the owner's account. Subscribing to a `webcal://` or HTTPS source stores an encrypted URL and fetches public content over HTTPS using IP validation, TLS host verification, no redirects and response limits. Provider feed refresh is currently manual and throttled; source credentials in calendar links are secrets.

Google login authenticates an identity; it does not authorize Google Calendar or Microsoft/Apple calendar account access. Scheduling, recurrence and timezone reconciliation remain open work.

## Verification scenarios

Use two synthetic test accounts in a preview environment, not real user notes. Cover invitation acceptance, concurrent editing, one browser offline, reconnect, new/deleted pages, unfriending during an open editor, stale notifications, expired sessions, pending friendship visibility and community opt-in changes. Check both UI behavior and authenticated API responses.

See [Data model](DATA_MODEL.md), [API integration](BACKEND_INTEGRATION.md), [Security audit](SECURITY_AUDIT.md) and [Release checklist](RELEASING.md).
