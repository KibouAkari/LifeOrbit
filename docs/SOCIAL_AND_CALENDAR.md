# LifeOrbit collaboration, calendar and sharing

Updated 11 November 2026. This describes source changes under review, not a verified production release. Historical decisions are retained in the [changelog](../CHANGELOG.md).

## Friends and private sharing

Friend requests require explicit acceptance. Search uses display names rather than email addresses. A current accepted friendship is required to see read-only notes, receive invitations or edit another person's shared notebooks. Unfriending revokes both directions of shares and notebook memberships; a separate hotfix deletes historical duplicate friendships too. Previously downloaded private content cannot be erased remotely.

Personal notes are stored in the owner's private MongoDB workspace. Owners may copy a note into a shared notebook, where explicitly invited friends can edit pages. Existing shared notebook saves transmit whole pages and poll about every three seconds, so simultaneous edits can conflict. A separate [Liveblocks/Yjs proposal](https://github.com/KibouAkari/LifeOrbit/pull/57) addresses this but is not enabled in this branch.

## Private friends leaderboard and public community leaderboard

The new leaderboard response includes `friends`, `participants` and `opted_in`. Accepted friends always see one another's challenge scores privately, without a public opt-in. Pending and former friendships never grant private visibility. Only affirmative participants appear in the community ranking for unrelated users. The viewer's own score is visible to the viewer regardless of the public setting. Public scores remain public after unfriending until their owner opts out.

Scores come from self-reported challenge progress; no anti-cheat verification is implemented. The community query is bounded and may not be an exact global ranking after substantial growth.

## Calendar and notifications

Event owners can invite accepted friends. Recipients may accept, decline or remove their invitation, but cannot edit the owner's event. Task reminders and incoming friend, event, note and notebook notifications are only delivered while the app is open by polling (typically 3–5 seconds), not as background push. Stale notebook membership does not grant access to notebook notification titles without a current friendship.

Manual `.ics` import creates owner-scoped event copies. Subscribed `webcal://` links are normalized to HTTPS; the server resolves public IP addresses, connects to a pinned IP using hostname-verified TLS, rejects redirects, limits responses to 1 MB and 500 events, and encrypts saved links. A maximum of ten feeds per user can be refreshed manually, at most once per five minutes per feed. Background refresh, complete time-zone handling and full recurrence support are not implemented.

Google Sign-In is identity only; Google Calendar, Microsoft Graph and Apple CalDAV permissions are not included.

## Release verification

With two isolated test accounts, check friend requests, note sharing, subsequent editing, unfriending and refusal of later access. Confirm notebook titles do not appear in unauthorized notifications and that private friend scores disappear after unfriending. Confirm public community opt-in is independent of friendship. Test calendar RSVPs, import and SSRF protection without using sensitive production data.

See [Backend integration](BACKEND_INTEGRATION.md), [Data model](DATA_MODEL.md), [Security review](SECURITY_AUDIT.md), and [Release checklist](RELEASING.md).
