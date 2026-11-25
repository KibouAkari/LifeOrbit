# Privacy retention and account deletion

This feature is being introduced in a reviewed pull request. It must not be described as fully operational until the production schedule, database cleanup, external collaboration and backup policies have been verified.

## Data retention

Users choose **Off**, **30**, **15** or **5 days** in **Settings → Data retention**.

* New accounts default to 30 days.
* Existing accounts without an explicit setting default to Off, preventing destructive cleanup of old history on first deployment.
* Only completed tasks with a recorded `completed_at` timestamp are eligible. Reopening a task removes that timestamp. Tasks completed before this migration have no reliable completion timestamp and are retained until manually reopened and completed again.
* Calendar events owned by the user become eligible when their ISO date is strictly older than the cutoff date. Imported calendar events also qualify. An event cannot yet be individually excluded from retention.
* Deleting an event also removes outgoing invitations (`shares`) to that event. Notifications and cached imported data should be reviewed for residual references during production testing.
* Open tasks, future events, personal notes, shared notebooks, challenges, subscriptions and calendar feeds are not subject to activity-retention cleanup.

A Vercel Cron runs once daily at **03:00 UTC** and requires `CRON_SECRET`. The scheduler removes eligible records in bounded batches. This means deletion is **not exact to the second** at the selected boundary; missed invocations or database outages can delay it. The cron response provides counts but never logs private record contents. For large deployments add a persistent pagination cursor, monitoring and a retrying queue before promising a hard deadline.

## Account deletion request

In **Settings → Delete account**, the signed-in user must enter `DELETE`. Password-based accounts must also provide their current password. Google-only accounts use the existing authenticated session. For stronger protection a fresh Google reauthentication should be implemented before a wider rollout.

The request stores `deletion_requested_at` and `deletion_due_at` (30 days later), increments `session_version`, clears the browser cookie, and blocks future password or Google logins while deletion is pending. No customer record is deleted immediately. The request cannot currently be cancelled using the UI.

After the grace period, the scheduled cleaner attempts to delete the user's MongoDB account, tasks, events, personal workspace, feed sources, password reset tokens, notification state, friendships, shares and owned shared notebooks/CRDT state. Memberships in friends' notebooks are removed. It deletes the user record **last** and can retry partial failures.

**Hosted Liveblocks caveat:** Where a notebook is hosted externally, provider-side access and content must be removed independently; the cleanup deliberately refuses to mark the affected account deleted while it detects a live hosted-room reference. Manual remediation and tested provider-side deletion are required. The workflow is therefore not yet an unqualified guarantee of complete deletion.

**Backups and third-party retention:** Database backups, application logs, mail-provider records, security logs, analytics, external collaboration providers and already exported data may follow separate legal and technical retention. Permanent deletion from all copies cannot be guaranteed by deleting the primary MongoDB documents. Publish accurate privacy terms and test restore/backup expiration policies before advertising a 30-day complete erasure guarantee.

## Deployment

1. Run Python regression tests and frontend build, confirm MongoDB service account can perform deletes and collection index setup has completed.
2. Create an encrypted production `CRON_SECRET` in Vercel, using a strong randomly generated value. Never expose it to the browser or commit it.
3. Confirm the daily cron is registered for `GET /api/privacy/cron/retention` and unauthorized requests receive HTTP 401 (or 503 if not configured).
4. Test with synthetic accounts and synthetic calendar/task documents at the 5, 15 and 30 day boundaries.
5. Test a password-authenticated account deletion, immediate session revocation and actual purge when due. Test provider-side hosted notebook cases and record that blocked accounts are not falsely counted as deleted.
6. Inspect Vercel Cron job history and implement an alert for failed or missed runs before relying on deadlines.
7. Define backup/restore expiry, deletion audit monitoring without storing personal contents, and a procedure for addressing deletion requests in inaccessible accounts.

Use a staging database or disposable account only. Do **not** accelerate the production clock, trigger a live purge or perform a bulk backfill on real users to validate this feature.

## Safety and design limitations

This implementation is a conservative starting point, not a legal guarantee of erasure under Swiss FADP or GDPR. Retention rules must distinguish shared data belonging to other users from the deleting user's own content. A later iteration should add a cancellation/recovery process, email confirmation for destructive requests, durable queue with alerting, per-resource retention exceptions, archived items, and a privacy dashboard showing pending deletion status.
