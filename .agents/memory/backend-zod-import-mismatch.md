---
name: Backend zod import mismatch
description: Which zod version backend route code should use for validation.
---

The workspace catalog pins `zod` to v3, but `lib/db` uses `zod/v4` for its schema definitions. Backend artifacts (e.g., `artifacts/api-server`) that validate request payloads should import the catalog `zod` package (v3), not assume `zod/v4` is available as a transitive dependency.

**Why:** Transitive dependencies are not guaranteed to be resolvable from a different package, and importing `zod/v4` from a backend route can cause a module-resolution failure even when the DB package is installed.

**How to apply:**
- Validate request bodies in backend routes with `import { z } from "zod"` (the catalog v3 version).
- Reserve `zod/v4` imports for files inside `@workspace/db` that define or extend the database schema itself.
