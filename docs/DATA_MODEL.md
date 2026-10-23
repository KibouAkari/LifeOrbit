# Draft domain model

This is a conceptual proposal, **not a committed database schema**.

| Entity | Suggested fields | Important rule |
| --- | --- | --- |
| User | id, displayName, email, createdAt | All private entities have a user owner. |
| Note | id, ownerId, title, content, createdAt, updatedAt | Images require storage and access checks. |
| Task | id, ownerId, title, status, dueAt, completedAt | Task status can be undone. |
| Event | id, ownerId, title, startsAt, endsAt, timezone | Store instants unambiguously. |
| Subscription | id, ownerId, name, amountMinor, currency, interval, renewsAt, active | Never silently add different currencies. |
| Challenge | id, title, period, target, unit, points | Define fair point calculations. |
| ChallengeProgress | id, ownerId, challengeId, date, amount | Limit duplicate awards. |
| Reminder | id, ownerId, targetId, remindAt, state | Avoid duplicate dispatch. |

## Privacy and integrity

Apply server-side ownership checks to every private entity. Handle
optional sharing explicitly, not as a global bypass. Treat user notes and
images as potentially sensitive. Avoid writing personal data in logs.
Leaderboard participation requires an explicit opt-in and a clear way
to leave. Use unique identifiers and database constraints to enforce
invariants, not only frontend validation.

The final storage technology and migration strategy are still open.
