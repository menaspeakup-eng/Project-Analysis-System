---
name: Orval zod export conflicts
description: Deciding where the public API-zod package entry should point when orval generates conflicting exports.
---

When orval generates a zod client from an OpenAPI spec that includes query parameters, it can produce a generated index that re-exports conflicting symbols from both the schema file and the type file. A public package entrypoint that re-exports both will fail type-checking with duplicate export errors.

**Why:** Query parameters create a name collision between a zod-schema export and a TypeScript-type export in the generated output. This is a property of how orval structures its output, not a temporary quirk.

**How to apply:**
- Point the public package entrypoint (`exports["."]`) directly at the single generated file that contains the zod schemas and their inferred types (e.g., `generated/api.ts`).
- Treat any generated `index.ts` that re-exports multiple generated files as disposable; remove or overwrite it in the codegen pipeline so it is never published as the public API surface.
