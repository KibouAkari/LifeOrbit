# LifeOrbital data model

Updated 24 October 2026. This describes the implementation, not a proposed future model.

## MongoDB collections

| Collection | Principal fields | Ownership |
| --- | --- | --- |
| `users` | `_id`, name, email, Google identity, password hash | Account owner |
| `tasks` | `_id`, user_id, title, done, order | Only matching user_id |
| `events` | `_id`, user_id, date, start_time, end_time, source, source_id | Event owner |
| `workspaces` | user_id, notes, chapters, subscriptions, challenges, templates, leaderboard_opt_in | One private workspace per user |
| `friendships` | pair, sender, recipient, status, created_at | Either participant for removal, recipient for acceptance |
| `shares` | owner, recipient, kind, resource_id, optional challenge snapshot | Explicit sharing between accepted friends |
| `calendar_feeds` | user_id, name, encrypted URL, last_synced, count | Feed owner |

`friends` searches by display name, not by email. Share reads check that the friendship remains accepted. No globally readable notes or invites are exposed.

## Data conventions

Notes reside inside the owner's workspace document. Shared notes are read on demand from the original owner, so modifications appear in the recipient's read-only view on its next refresh. Event invitations point to an existing event record and are displayed distinctly. Shared challenges contain a proposal snapshot; the recipient may choose whether to add it to personal progress.

Private iCal feed URLs are encrypted before being stored in MongoDB. Keep the JWT signing secret stable during key migration, as the current feed encryption key is derived from it. Later rotate to an independently versioned encryption key.

## Correctness limitations

Workspace writes replace the whole workspace document. Concurrent edits on two devices can overwrite one another. Add revision-based optimistic concurrency or per-document CRUD before enabling true simultaneous collaborative editing.

Events currently store local clock strings and a date, rather than canonical timezone-aware instants. Provider sync requires strict timezone normalization, recurrence rules, DST handling, conflict resolution, deletion handling, and idempotency tests.

Leaderboard points are computed from account-owned challenge data and are not yet fraud-resistant. Only consenting users should appear to other members.

Run index provisioning explicitly before production migration, after checking uniqueness constraints and duplicates.
