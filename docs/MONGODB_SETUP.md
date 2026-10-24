# MongoDB Atlas setup and verification

The registration 500 reported on 24 October 2026 was caused by a
**DNS NXDOMAIN** for `_mongodb._tcp.cluster.mongodb.net`. Vercel was
configured with a placeholder connection hostname instead of a working Atlas
cluster address. Frontend fixes cannot repair this configuration.

1. In MongoDB Atlas open your actual cluster, choose **Connect → Drivers** and
   copy its **full** `mongodb+srv://` connection string.
2. Enter your Atlas database username and URL-encoded password securely in
   Vercel → lifeorbit → Settings → Environment Variables → `MONGODB_URI`.
3. Confirm the Atlas database user has only the application permissions it needs.
4. Configure Atlas Network Access deliberately. Avoid unnecessarily broad
   allowlists; review Vercel egress requirements.
5. Set `MONGODB_DATABASE` to the chosen database name.
6. Redeploy Vercel after changing the variable.
7. Check `/api/health/database`; it must return `{\"status\":\"connected\"}`.
8. Create and check unique indexes using the documented `ensure_indexes()`
   setup utility. Inspect old duplicate emails before creating a unique index.
9. Test registration and sign-in with dedicated test accounts; verify data
   isolation between two users.

Never paste the full connection string in GitHub issues, chats, or logs.
If credentials were previously exposed, rotate them immediately.
