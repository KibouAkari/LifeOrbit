# Realtime collaboration deployment and safety

Updated 11 November 2026. This is an **optional, unlaunched** integration. It is not automatically active just because its code is present.

## Why and how it works

LifeOrbit previously polled for updates every 3–5 seconds. Realtime mode uses [Liveblocks](https://liveblocks.io/docs) WebSockets to broadcast **invalidation signals**, not private calendar contents, to an account-specific room. Recipients immediately re-fetch the authorized data from FastAPI. A 60-second background poll and focus refresh remain as recovery if a message is missed.

Shared notebooks use [Yjs](https://docs.yjs.dev/) CRDT text in a private room per notebook with the [Liveblocks Yjs provider](https://liveblocks.io/docs/api-reference/liveblocks-yjs). Concurrent character-level edits merge deterministically, and Liveblocks persists synchronized Yjs updates. The editor has no Save button. This does **not** mean an offline browser can instantly store changes on the server; the UI pauses editing during loss of connectivity and a tab-close warning is enabled for pending writes.

A MongoDB copy remains as a **legacy preview and recovery snapshot**, while the provider's CRDT is authoritative after migration. Only the backend reads CRDT state to refresh MongoDB snapshots, preventing old full-page writes from overwriting a collaborator. Existing personal notes already autosave via the workspace endpoint; the new CRDT is for **shared notebooks**.

## Enable only on a preview first

1. Set up a dedicated Liveblocks project and read its privacy, data processing, regional hosting, quotas and pricing terms. Do not enable public room access.
2. Add `LIVEBLOCKS_SECRET_KEY` as a **server-only** Vercel secret for the preview deployment. Do not add it as a Vite environment variable or to GitHub.
3. Set `ENABLE_REALTIME=true` on the backend preview.
4. Set `VITE_REALTIME_ENABLED=true` on the frontend preview and redeploy so Vite includes the flag at build time.
5. Keep `FRONTEND_ORIGINS` and the application URL accurate. CSP in `vercel.json` allows Liveblocks HTTPS/WSS destinations and Google Identity Services.
6. Provision MongoDB indexes with `ensure_indexes()` and verify authorized access to `realtime_notebooks`.
7. Use **two test accounts** with a confirmed friendship. Create/invite to a notebook; verify the invite arrives immediately. Type concurrently in the same paragraph and in different parts of a page. Both users must converge on identical text.
8. Edit a calendar event and RSVP from separate browsers and confirm the other account refreshes without waiting for a timer.
9. Test manual migration of a notebook with important historical text, including a second simultaneous opener and a failed provider request. Confirm that original MongoDB content is intact.
10. Test deleting a page/notebook, unfriending, session invalidation, browser/tab closing during typing, provider downtime, reconnection, fallback and data export before considering production.

If Liveblocks credentials or configuration are absent, leave both realtime flags disabled. No data migration or provider activity will occur. Never use an unsecured public API key to bypass backend room authorization.

## Permission model

The FastAPI `/api/realtime/authorize` endpoint requires the existing HttpOnly session and checks requested room IDs against MongoDB ownership and accepted friendships. The server obtains Liveblocks **ID tokens** and provisions private rooms with `defaultAccesses=[]`; it reconciles user access when receiving authorization requests and after membership changes. Notification rooms belong to exactly one account. Notebook rooms are only available to the owner and accepted, invited members.

The provider's key is sent only to `api.liveblocks.io` over HTTPS on the server. Invalidation events include only a public type and a category, never the note, a user email or an event title.

**Revocation:** Liveblocks documents that changing a user permission to `null` disconnects the connected user immediately (see https://liveblocks.io/docs/use-cases/share-dialog). Unfriending removes all matching MongoDB relationship rows and notebook memberships, then reconciles room ACLs. A dedicated `access-revoked` account notification also causes Liveblocks clients to discard cached tokens and reauthorize joined rooms. The editor rechecks FastAPI on disconnection and unmounts revoked notebooks. Verify these behaviors with two real accounts in the provider preview. Previous plaintext already downloaded or exported by a former recipient cannot be erased remotely. If provider ACL updates fail, treat it as an urgent operational incident.

## Migration and data durability

The first editor to open a notebook requests migration. MongoDB reserves a temporary, unique initialization lease. The backend creates a private, initially inaccessible Liveblocks room and converts the notebook's existing title and page bodies to a binary Yjs update. It does not grant room access until initialization succeeds. Subsequent editors wait for the migration lock or rejoin an already prepared room.

The original MongoDB notebook is **not deleted or overwritten** by migration. Once the state is ready, the legacy full-page save endpoint returns HTTP 409 rather than overwriting a CRDT document. The hosted Yjs state is the source of truth. Editors periodically call a server-side snapshot endpoint, which reads the latest hosted document and refreshes MongoDB copies for previews.

Do **not** rotate keys, delete external rooms, reset migration markers, or bulk-replace MongoDB pages as a repair technique. If initialization fails, inspect logs and the provider room's Yjs state before retrying. Data recovery requires reviewing the existing Yjs document and its Liveblocks version history. No automatic backup/export of external Yjs rooms is included yet; arrange one before moving sensitive notes.

## Known limitations requiring review

- Room-level Yjs synchronization does not provide a rich-text editor or shared cursor rendering. Online editor names are shown; a specialized editor binding is needed for robust shared cursor positioning.
- Textarea selection can move on remote updates. A Yjs-aware editor (such as a supported Tiptap/CodeMirror binding) should be evaluated before claiming a Google Docs-equivalent writing experience.
- MongoDB page previews are eventually consistent and must not be treated as an authoritative edit log.
- Collaborative page text retained in Yjs room history needs a reviewed deletion/retention workflow before offering permanent data erasure.
- Invalidation broadcasts are best effort; the application refreshes after connection/focus and on its slow recovery timer.
- Connection errors and network outages are visible; the editor pauses new editing rather than silently dropping writes.
- Provider traffic, subscription pricing, GDPR/data processing, private-room limits, cross-origin headers and operational alerts still need approval.
- No full browser test with two real accounts or running provider secrets was executed as part of the source-only pull request.

## Verification

```bash
python -m unittest discover -s tests -v
python -m compileall -q backend api
npm run typecheck
npm run build
npm audit --audit-level=high
pip-audit -r backend/requirements.txt
```

Also validate the Vercel preview with actual Liveblocks and MongoDB test accounts. A green CI build is not a real-time integration test.
