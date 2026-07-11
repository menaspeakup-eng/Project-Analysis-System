# Memory Index

- [Clerk auth wiring on react-vite artifacts](clerk-artifact-wiring.md) — server proxy must precede body parsers; frontend needs `src/lib/queryClient.ts` created explicitly, design subagents forget it.
- [Drizzle jsonb default backfill](drizzle-jsonb-default-backfill.md) — jsonb column DB default doesn't apply your zod schema's defaults to existing rows; normalize with the zod schema at read time.
