# Map 1.37 - Hauts plateaux de Vulkar

Local proposal, 16 October 2026. Parent: approved map 1.36.
The public atlas is not changed by this proposal.

## Author request

- Strongly elevated volcanic high plateaus extending to the southern forest.
- A chain of volcanoes, abundant charcoal/umber ash and cinders.
- Abrupt coastal cliffs rising directly from the sea, without a low shore apron.
- One enclosed black lake in the middle of the highland.
- A separate black-tinted sea basin to the right, with an open outlet.
- Preserve Kalistar's engraved parchment art direction.

## Files

- `kalistar-map-1.37-preview.png`: assembled complete atlas with cities.
- `vulkar-detail.png`: integrated local detail with the original city groups.
- `kalistar-map-1.37-base.png`: terrain only, no baked cities or names.
- `kalistar-map-1.37.psd`: original layers and a new editable masked patch.
- `zone-generated.png`: selected built-in image_gen result.
- `zone.prompt.txt`: exact image_gen prompt and reference roles.
- `zone-before.png`, `zone-fitted.png`, `zone-mask.png`, `zone-after.png`: native assembly inputs/proofs.
- `zone.json`: crop, local contour, forest and approved scar/crater protection.
- `verification.json`, `provenance.json`: pixel, layer and SHA-256 checks.

The three previous scar/crater masks are protected at the pixel level during
assembly. The eight city emblems, shadows and editable names are retained
unchanged. The new bay tone returns gradually to the original ocean eastward.
Source proposal files and runtime assets are never overwritten.

Rebuild: `node V4/map/layers-1.37/build-proposal.cjs`.
Local Sharp and ag-psd perform deterministic crop/mask compositing.
Generation uses built-in image_gen, not an API/CLI fallback.
Native Photoshop is not invoked. No global map registry, release version,
runtime media registry, Git stage, commit or deployment is changed here.

## Validation

The integrated Vulkar detail and complete atlas were visually inspected.
Tall stratified cliffs meet the sea; the chain continues toward the forest.
The enclosed highland lake and the eastern marine basin are distinct dark
water features. Ash remains textured rather than an opaque black fill.
The original Vulkar emblem and all names stay independent and legible.

36,007 terrain pixels changed inside the editable mask, zero outside.
All pixels covered by the approved scar/crater masks are unchanged. The
forest protection contour, northern dam, Cryptown fog and Thalassea are
unchanged. The PSD mask, composite and original city groups survive reopening.
Nine approved-map/runtime regression tests pass. See `visual-review.json`.
