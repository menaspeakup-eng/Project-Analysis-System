---
name: Drizzle jsonb column default doesn't backfill schema defaults
description: When adding a jsonb column with a literal default (e.g. `{}`) via drizzle-kit push, existing rows get that literal, not your zod schema's per-key defaults.
---

Adding a `jsonb("col").default({})` column via `drizzle-kit push` backfills existing rows with the literal `{}`, not the defaults declared in a separate zod schema (e.g. `z.object({ bgColor: z.string().default("orange") })`). Reading `{}` back and expecting `bgColor`/`accessory` to be present will fail validation (zod `invalid_type`/`required` errors) for any row created before the column existed.

**Why:** the DB-level default and the app-level zod default are two independent sources of truth; drizzle-kit only applies the DB-level one on backfill.

**How to apply:** always normalize jsonb config columns through the zod schema at read time (e.g. `avatarConfigSchema.parse(row.avatarConfig)`) before returning them in API responses, rather than trusting the raw DB value — this fills in missing keys for legacy rows without a data migration.
