# Memory Index

- [Clerk auth wiring on react-vite artifacts](clerk-artifact-wiring.md) — server proxy must precede body parsers; frontend needs `src/lib/queryClient.ts` created explicitly, design subagents forget it.
- [Drizzle jsonb default backfill](drizzle-jsonb-default-backfill.md) — jsonb column DB default doesn't apply your zod schema's defaults to existing rows; normalize with the zod schema at read time.
- [OpenAPI codegen location](openapi-codegen-location.md) — `pnpm --filter @workspace/api-spec run codegen` regenerates zod + react-query hooks from openapi.yaml; edit the yaml first.
- [Level-gated feature constants](level-gated-feature-duplication.md) — unlock-threshold maps needed on both client and server aren't in a shared package; must be hand-duplicated and kept in sync.
