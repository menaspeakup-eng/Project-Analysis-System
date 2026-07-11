---
name: Pre-baked character+accessory 3D models vs runtime compositing
description: Why the antuq avatar system switched from generic-body + separately-composited accessory meshes to one fully pre-modeled GLB per gender+accessory combo.
---

Runtime-compositing a generated accessory GLB onto a generic character body
(scaling/positioning it to fit the head/face at render time) is fragile:
even after fixing the scaling-axis bug (see glb-accessory-scaling.md), each
new accessory still needs its placement/scale hand-tuned against the
character's geometry, and it can still look subtly off since the two meshes
were never designed together.

**Decision:** for this project, each gender+accessory combination is now its
own separate, fully pre-modeled GLB (accessory sculpted onto the body by the
3D generator itself, not attached at runtime). This guarantees correct fit
but means a student can only wear one accessory at a time — no more
mixing pieces into a multi-accessory outfit.

**Why:** the user explicitly compared this tradeoff against continuing to
tune runtime compositing and chose fit-correctness over combinability,
after seeing a real screenshot of a misplaced accessory in production.

**How to apply:** if asked to add a new accessory, generate a new combined
GLB per gender (`generate3DModel`) rather than a standalone accessory mesh
placed via `ACCESSORY_PLACEMENT`-style coordinates. Newly generated
character GLBs are large (~12-15MB); always run them through
`npx @gltf-transform/cli optimize <in> <out> --compress draco --texture-compress webp --texture-size 1024`
before shipping (cuts them to <1MB), matching the compression already
applied to the other avatar assets in this project.
