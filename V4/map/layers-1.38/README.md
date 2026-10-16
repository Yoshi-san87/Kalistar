# Map 1.38 - Lave et lac agrandi

Local proposal, 16 October 2026, following local map 1.37.
The public map remains approved 1.36 until a separate publication.

## Author request

Add lava and one active volcano; enlarge the inland black lake.
Preserve the elevated ash plateau, sheer cliffs, separate dark marine basin,
Kalistar engraving/parchment, existing cities and previously approved geography.

## Selected generation areas

- `eruption-generated.png`: only the active cone, compact plume and branching
  iron-red/ochre lava flows are integrated. Its generated lake is NOT selected.
- `lake-generated.png`: the dedicated tight-crop lake enlargement, retaining
  a solid-rock divide from the sea and the dormant cone below it.
- `eruption.prompt.txt` and `lake.prompt.txt`: exact built-in image_gen prompts.
- `eruption-before-large.png` and `lake-before-large.png`: actual edit targets.

## Outputs

- `kalistar-map-1.38-preview.png`: complete assembled atlas with cities.
- `vulkar-detail.png`: integrated local terrain and original city layers.
- `kalistar-map-1.38-base.png`: terrain only, no baked emblems or names.
- `kalistar-map-1.38.psd`: all parent layers plus two independent masked edits.
- `*-before.png`, `*-fitted.png`, `*-mask.png`, `*-after.png`: native assembly proofs.
- `zone.json`: editable local polygons, crops and protected landmarks.
- `verification.json`, `provenance.json`: pixel/layer checks and SHA-256 hashes.

Rebuild with `node V4/map/layers-1.38/build-proposal.cjs`.
Local Sharp/ag-psd perform deterministic masked compositing. Artwork is
created with built-in image_gen, not an API/CLI fallback. Native Photoshop
is not invoked. No global version, web asset, media registry, stage, commit
or deployment is changed by this proposal. Parent 1.37 remains intact.

## Validation

The integrated detail and complete atlas were visually inspected: one active
northern cone, a compact engraved plume, localized red/ochre lava channels,
and a clearly larger enclosed black lake. The rocky lake/sea divide and the
dormant cone below the lake remain readable; city icons and names are unchanged.

8,569 terrain pixels changed inside the two editable masks, zero outside.
Original PSD layers, city groups, mask data and composite survive reopening.
Approved scar/crater pixels, protected forest, western cliffs, eastern bay,
Cryptown fog, northern dam and Thalassea are unchanged. See visual-review.json.
