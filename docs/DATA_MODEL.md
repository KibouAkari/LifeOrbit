# MongoDB data model

Updated 23 November 2026. PR #73 collections exist in proposed source but may not exist in production until deployment and first use.

## Collections and ownership

| Collection | Key fields | Trust rule |
| --- | --- | --- |
| `users` | `_id`, `email`, `password_hash`, `google_id`, `session_version`, `retention_days`, `deletion_due_at`, `deletion_retry_after` | Private to the account and authentication services |
| `tasks` | `_id`, `user_id`, `title`, `done`, `completed_at`, `order`, `due_at` | Owner only |
| `events` | `_id`, `user_id`, `date`, clock fields, source metadata | Event owner; invited read-only recipients are separate |
| `workspaces` | `user_id`, notes, chapters, subscriptions, challenges, opt-in flags | Owner only |
| `friendships` | `pair`, sender, recipient, status | Acceptance establishes private friend scope |
| `shares` | owner, recipient, kind, `resource_id`, optional RSVP | Requires valid owner resource and current accepted friendship |
| `shared_notebooks` | `_id`, owner, members, pages, timestamps | Owner and explicitly invited accepted friends |
| `notebook_crdts` (PR #73) | notebook ID, binary Yjs state, version, deleted-page markers, timestamp | Native collaborative source, server-only storage |
| `realtime_notebooks` (optional) | room/migration status, owner, deletion tombstone | Tracks provider-authoritative rooms, including deleted notebook metadata, until provider content is verified removed; never mix with native state |
| `calendar_feeds` | owner, encrypted URL, last refresh, count | Owner only; URL is secret |
| `notification_state` | `user_id`, read identifiers | Owner only |
| `privacy_jobs` | scheduled cleanup cursor only, no user contents | Server only |\n| `rate_limits` | HMAC bucket ID, hits, expiry | Private server-side abuse state |
| `password_reset_tokens` (PR #73) | HMAC token digest, user ID, email, expiry | Private single-use token records with TTL expiry |

All strings from clients are validated through Pydantic. ObjectId values must be validated before MongoDB conversion. Index creation lives in `backend/api/database.py:ensure_indexes()` and must be executed with a database role authorized to create indexes; the app should normally run with least privilege.

## Notes and collaboration data

Personal notes are embedded in the user's workspace. Moving a note to a shared notebook copies it before removing its personal source.

The native Yjs editor merges serialized CRDT updates under a distributed lock in `notebook_crdts`. Native deleted-page markers and cleared CRDT text protect against reappearance of deleted content after old updates arrive. Shared notebook page strings are **secondary previews** and should not overwrite CRDT state. Older browser versions trying to save whole pages after CRDT migration receive a conflict. Liveblocks-migrated notebooks remain provider-authoritative and are excluded from native updates.

User membership and accepted friendship must be rechecked for *every* read/write. Deleting friendship rows removes shares and membership; external Liveblocks room ACL revocation is separately required if that feature is enabled.

## Retention and backup

- TTL indexes remove expired rate-limit buckets and password reset token records, but MongoDB TTL expiration is asynchronous; validation must also check token expiry at use.
- Password reset links have 30-minute validity. Stored HMAC digests, not plaintext tokens, must be backed by server-only secrets.
- Encrypt private calendar URLs; currently their encryption key is derived from the JWT secret, making rotation a migration concern.
- Back up `notebook_crdts` binary state as well as metadata. Hosted Liveblocks requires its own export/restore plan; MongoDB backups alone cannot recover hosted CRDT state.
- Account deletion and retention cleanup are proposed in the privacy PR. They need production cron setup, boundary tests and independent handling of Liveblocks-hosted content, backups and provider logs before being described as fully verified. See [Privacy retention](PRIVACY_RETENTION.md).

## Known consistency constraints

`PUT /api/workspace` replaces an aggregate account workspace and may overwrite updates from another device. Calendar dates and local clock strings need careful timezone/recurrence handling. Leaderboard points come from user-saved challenge values and are not independently verified. Native Yjs convergence does not guarantee human-intent conflict freedom.

See [Architecture](ARCHITECTURE.md), [Operations](OPERATIONS.md) and [Realtime collaboration](REALTIME_COLLABORATION.md).
