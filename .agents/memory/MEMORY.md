# Memory Index

- [Frontend performance on antuq](antuq-performance.md) — keep routes lazy-loaded; never preload heavy 3D models on startup; use gltf-transform quantize (not meshopt) for GLTFLoader compatibility; optimize images to WebP.
- [Clerk auth wiring on react-vite artifacts](clerk-artifact-wiring.md) — server proxy must precede body parsers; frontend needs `src/lib/queryClient.ts` created explicitly, design subagents forget it.
- [Apply Drizzle migrations after schema changes](drizzle-migrations-apply.md) — generated migrations aren't auto-applied; stale schema causes 500s on first sign-in.
- [Drizzle jsonb default backfill](drizzle-jsonb-default-backfill.md) — jsonb column DB default doesn't apply your zod schema's defaults to existing rows; normalize with the zod schema at read time.
- [OpenAPI codegen location](openapi-codegen-location.md) — `pnpm --filter @workspace/api-spec run codegen` regenerates zod + react-query hooks from openapi.yaml; edit the yaml first.
- [Level-gated feature constants](level-gated-feature-duplication.md) — unlock-threshold maps needed on both client and server aren't in a shared package; must be hand-duplicated and kept in sync.
- [GLB accessory scaling](glb-accessory-scaling.md) — normalize wearable-prop scale by max(X,Y) not all 3 axes; Z depth can dominate for unrelated reasons. Use `gltf-transform inspect` for bboxes, not three.js in Node.
- [Pre-baked character+accessory models](prebaked-accessory-models.md) — antuq switched from runtime accessory compositing to one fully pre-modeled GLB per gender+accessory; compress new ones with gltf-transform before shipping.
- [Orval zod export conflicts](orval-zod-export-conflicts.md) — adding OpenAPI query params makes orval emit conflicting param exports from generated/api and generated/types; point package exports at generated/api.ts and delete the generated index.ts.
- [Backend zod import mismatch](backend-zod-import-mismatch.md) — catalog zod is v3 while lib/db uses zod/v4; backend routes should import zod (v3) and not zod/v4.
- [Express route circular imports](express-route-circular-imports.md) — importing helpers between sibling route files creates circular deps; move shared helpers under `src/lib/`.
- [StudentProfile id omission](student-profile-id-omission.md) — generated StudentProfile has no `id`; for lists of other users define a separate Friend schema or add `id` to StudentProfile and enrich every endpoint.
- [AvatarConfig parse on raw rows](avatar-config-parse-on-raw-rows.md) — when returning raw student rows without `enrichStudentProfile`, parse `avatarConfig` with the zod schema or the frontend receives invalid defaults.
