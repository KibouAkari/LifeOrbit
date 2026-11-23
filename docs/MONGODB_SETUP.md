# MongoDB Atlas setup and maintenance

MongoDB Atlas stores account records, calendars, private workspaces, sharing metadata and native collaborative Yjs state. Use a dedicated development or preview database for testing. Never experiment with live user data.

## Initial setup

1. Create or choose a MongoDB Atlas project and a cluster appropriate for the expected workload.
2. Add a least-privilege application database user with only the data access required by LifeOrbit. Use a separate, limited-duration administrator identity to provision indexes.
3. Review Atlas Network Access and Vercel egress requirements. Prefer narrow rules where feasible and enforce TLS. Do not broadly expose the database for convenience.
4. In Atlas, open **Connect → Drivers**, obtain the connection URI, and store it in Vercel as the server-only `MONGODB_URI` environment variable. Never commit it or paste it into chat, screenshots or logs.
5. Set `MONGODB_DATABASE` if using a database name other than the default `lifeorbit`. For development, use a dedicated database name and account.
6. Redeploy the intended Vercel target after changes. Verify `/api/health` and `/api/health/database` independently; a healthy process does not guarantee a database connection.
7. Provision indexes from `backend/api/database.py:ensure_indexes()` using an identity authorized to manage indexes, after checking for duplicate email/friendship data.

## Index and collection verification

Confirm the unique account email, Google identity and friendship pair indexes, owner indexes and the TTL index on `rate_limits.expires_at`. The PR #73 password recovery flow also needs `password_reset_tokens.expires_at` as a TTL index. MongoDB automatically indexes collection `_id` values.

The app needs read/write access to `workspaces`, `shared_notebooks`, `notebook_crdts` and (when enabled) `realtime_notebooks`, along with other account and sharing collections. Collections may be lazily created after first use; do not assume absence always means a deployment failure.

## Security, migration and recovery

Use separate credentials and data for preview and production. Confirm authenticated API calls cannot read another account's private records, note metadata or CRDT updates. Enforce ownership and current friendship in the application, not by relying solely on collections being private.

The native Yjs store includes binary state, version and timestamp. Back it up **alongside** notebook metadata. Restoring a metadata-only backup can lose concurrent edits or result in mismatched state. Hosted Liveblocks contains authoritative content outside MongoDB and needs a separate provider export/restore procedure.

For backup restoration, copy data into an isolated test database, validate expected record counts, verify document decoding, run two-account read/write tests and test the full release rollback before any production recovery.

### Troubleshooting

| Symptom | Check |
| --- | --- |
| Missing or invalid connection | `MONGODB_URI`, correct cluster host, credentials and allowed egress |
| Database health returns 503 | TLS, DNS, Atlas status, network rules and Vercel logs without leaking secrets |
| Duplicate key on index creation | Existing duplicate emails, `pair` values or migrated documents; investigate before changing data |
| Password reset token records persist | Verify TTL index and expected asynchronous deletion; token use still checks expiry itself |
| Collaborative notebook returns 409 | Native vs hosted Yjs migration marker, active lock or stale edit; never reset markers blindly |
| Preview works but production fails | Environment target, deployed commit, database/user permissions and indexes |

For broader incident response, retention and backup procedures, see [Operations](OPERATIONS.md), [Deployment](DEPLOYMENT.md), [Data model](DATA_MODEL.md) and [Release checklist](RELEASING.md).
