---
name: Scaling accessory GLBs by the wrong axis
description: Normalizing a wearable accessory's size by its single largest raw bounding-box dimension can pick depth (Z) instead of what's visually apparent, making it comically large or tiny.
---

When a "grounded" accessory mesh is scaled uniformly to hit a target on-screen
size, don't normalize by `max(size.x, size.y, size.z)`. Generated/AI-modeled
props (glasses, bows, stars, etc.) often have a front-to-back (Z) extent that
is incidentally the largest raw dimension for reasons unrelated to how big
the object looks when worn — e.g. a bow whose Z depth is ~4x its X width.
Scaling to make that Z depth match a target size shrinks or balloons the
visible width/height instead.

**Why:** Confirmed via `npx @gltf-transform/cli inspect <file>.glb` (reports
bboxMin/bboxMax without needing WebGL) that several accessory GLBs had
Z as their dominant raw axis while X/Y (what the camera facing -Z actually
sees) were much smaller — the previous max-of-all-three-axes normalization
made those accessories render at the wrong size.

**How to apply:** For any camera looking down Z, normalize wearable/prop
scale by `max(size.x, size.y)` only, and pick per-accessory target sizes
relative to the wearer's known proportions (e.g. character head width).
`gltf-transform inspect` is the fastest way to get a real bounding box for a
(possibly Draco-compressed) GLB from the shell — no need to fight
three.js's browser-only GLTFLoader/DRACOLoader in Node (it needs `self`,
`ProgressEvent`, and `Worker` shims and still breaks on the Draco worker).
