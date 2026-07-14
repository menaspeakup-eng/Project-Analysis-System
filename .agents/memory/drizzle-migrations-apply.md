---
name: Apply Drizzle migrations after schema changes
description: Generated Drizzle migrations are not auto-applied in the Replit environment; stale schema causes runtime 500s.
---

After generating a Drizzle migration with `drizzle-kit generate`, run `pnpm --filter @workspace/db push` against the current database before the code that queries the new column goes live.

**Why:** The Replit environment does not auto-apply migrations. If a new column is added to the schema and code selects it, but the database is still on the previous version, queries fail with a 500 and the first sign-in/onboarding flow hangs silently.

**How to apply:**
1. Make schema changes.
2. `pnpm --filter @workspace/db generate` (or `pnpm --filter @workspace/db push` if you want to push immediately).
3. Verify the migration file in `lib/db/migrations/`.
4. `pnpm --filter @workspace/db push` to apply it to the connected database.
5. Restart `api-server` if needed to clear cached state.
