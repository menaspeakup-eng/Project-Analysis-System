---
name: Level-gated feature constant duplication
description: Unlock-level thresholds for gated features must be duplicated between frontend and backend in this monorepo
---

The `antuq` frontend (Vite/React) and `api-server` (Express) don't share a runtime package for
small app-specific constant maps like "which level unlocks which avatar accessory/pet". The
frontend needs them to render locked/unlocked UI; the backend needs the same thresholds to reject
tampered requests (e.g. a student selecting an accessory above their level via a raw API call).

**Why:** `lib/db` (used by api-server for schema/db types) isn't imported by the frontend, and
there's no existing shared "app constants" package, so introducing one just for a handful of
threshold numbers is disproportionate. The pragmatic 2026-07-11 decision was to duplicate the
maps in `artifacts/antuq/src/lib/avatarPresets.ts` and
`artifacts/api-server/src/lib/avatarUnlocks.ts`, with a comment in each pointing at the other.

**How to apply:** when adding a new gated option (new accessory, new pet, new tier of anything
similar), update both files together. If this pattern grows beyond 2-3 features, it's worth
promoting these constants into a shared package instead of continuing to duplicate.
