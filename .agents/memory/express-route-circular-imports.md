---
name: Express route circular imports
description: Why importing helpers between Express route files causes circular dependencies and how to avoid them.
---

When two Express route files import from each other (e.g., `routes/student.ts` imports `logActivity` from `routes/activity-logs.ts`, while `routes/activity-logs.ts` imports `getOrCreateStudent` from `routes/student.ts`), the module loader can produce runtime errors or silently undefined exports depending on the load order.

**Why:** Route files are typically the top-level entry points for a feature. They both define routes and export helpers, so any cross-import creates a cycle. TypeScript may compile it, but the runtime CommonJS/ESM graph can still break.

**How to apply:** Move shared helpers to `src/lib/` (or any directory outside of `routes/`). For example, `logActivity` should live in `src/lib/activity-logs.ts` and be imported by both `routes/student.ts` and `routes/activity-logs.ts`. Keep route files as consumers, not producers, of shared utilities.
