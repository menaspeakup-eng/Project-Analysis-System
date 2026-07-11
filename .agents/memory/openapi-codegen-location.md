---
name: OpenAPI codegen location
description: How to regenerate zod types and React Query hooks after editing lib/api-spec/openapi.yaml
---

`lib/api-spec/openapi.yaml` is the source of truth for API types. After editing it, run:

```
pnpm --filter @workspace/api-spec run codegen
```

This runs `orval` to regenerate `lib/api-zod` (zod schemas/types) and `lib/api-client-react`
(React Query hooks), then runs `pnpm -w run typecheck:libs` to confirm the libs still build.

**Why:** the codegen script isn't discoverable from the root `package.json` scripts — it lives
in `lib/api-spec/package.json`. Editing the generated files directly is wrong; they're overwritten.

**How to apply:** any time a backend request/response shape changes, edit the openapi.yaml schema
first, then run this command before touching consuming code in the frontend or api-server.
