---
name: Frontend performance on antuq
description: Performance optimization rules for the antuq web app based on the 2026-07-19 speed pass.
---

# Frontend performance on antuq

## Rule 1: Lazy-load all routes

`App.tsx` previously imported every page synchronously, producing a ~3.3 MB main JS bundle. Convert every route to `React.lazy()` and wrap the `<Switch>` in a single `<Suspense>` fallback. The main bundle dropped to ~458 kB and route chunks are loaded on demand.

**Why:** Vite/Rollup only code-splits dynamic imports. Eager page imports force the entire app into the entry chunk, so first paint and route transitions wait for unused code.

**How to apply:** Any new page added to `App.tsx` must be a `lazy(() => import("@/pages/..."))` and added inside the existing `Suspense` boundary.

## Rule 2: Never preload heavy 3D models on startup

`Avatar3D.tsx` had `useGLTF.preload()` for the base boy/girl GLBs (~24 MB combined). This downloaded the full character models before any page needed them. Remove preload calls and let the models load on demand when the portal/character/friends routes are visited.

**Why:** Preloading shifts the cost of the heaviest assets to the initial app load, even for users who never visit the avatar pages.

**How to apply:** Do not add `useGLTF.preload()` for new assets. If preloading is needed for a specific UX moment, limit it to one small asset and use `rel="preload"` on the `<link>` tag instead of JS preloading.

## Rule 3: Compress 3D models with gltf-transform quantize

The base character/pet models shipped at 11–15 MB. Running `gltf-transform optimize ... --compress quantize --texture-size 1024 --simplify-ratio 0.5` reduced them to 3.5–5 MB while remaining compatible with three.js `GLTFLoader` without extra decoders.

**Why:** `meshopt` compression gives smaller files but requires a `MeshoptDecoder` that the current `useGLTF` setup does not provide. `quantize` (KHR_mesh_quantization) is supported natively by three.js and is the safest default for this stack.

**How to apply:** After regenerating or replacing any `.glb`, run gltf-transform with `--compress quantize`. If you later wire up a custom `GLTFLoader` with `MeshoptDecoder`, you can switch to `--compress meshopt` for an extra ~20–30% reduction.

## Rule 4: Serve images as WebP

`hero-kids.png` (1.5 MB), `avatar-mascot.png` (1.3 MB), and `game-preview.jpg` (149 KB) were converted to WebP at 72 KB, 33 KB, and 16 KB respectively.

**Why:** PNG/JPEG are much larger than lossy WebP for the same visual quality, and these are above-the-fold images.

**How to apply:** Keep source assets in `attached_assets/generated_images/` as WebP. Update the corresponding `import` in `home.tsx` and any other consumer to `.webp`.

## Rule 5: Enable Tailwind CSS optimization

The Vite Tailwind plugin was configured with `optimize: false`. Set it to `optimize: true` in `vite.config.ts` to remove unused utility classes from the production CSS.

## Rule 6: Backend queries matter too

As the app scales, in-memory aggregation and unbounded `findMany` calls become slow. Add indexes for frequently filtered columns (`status`, `student_id`, `class_id`) and replace JS loops with SQL `GROUP BY` / `COUNT` / `AVG` where possible. Add `limit` to analytics and review endpoints to bound worst-case response size.

**Why:** The frontend can only be as fast as the data it waits for. Large analytics selects block the UI while the server is still streaming JSON.

**How to apply:** When adding a new table or query, check for `WHERE`/`IN` columns and add `index()` in the Drizzle schema; for aggregation routes, use `db.select().groupBy()` instead of fetching all rows.
