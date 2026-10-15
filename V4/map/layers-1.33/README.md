# Map 1.33 - Anneau et Thalassea

Local proposal, 15 October 2026, built on local 1.32. The live map remains 1.30.
The author requests rounder islands around a deep sea basin, with a small
underwater bubble-city emblem at its center named **Thalassea**.

## Composition

- Natural near-circular island and reef barrier, rounded coastlines, two sea passes.
- Deep grey-brown central water, sparse palms, unchanged Kalistar sepia engraving.
- Thalassea at native map coordinates (897, 717), emblem height 50px.
- Terrain, editable local mask, city shadow, tight parchment outline, emblem
  and native editable name are separate PSD layers.
- All seven existing cities, northern wall and prior PSD layers are unchanged.
- The lower meridian join is registered over a 16px-high water ribbon, resampling
  the generated ink rather than painting a new line. Exact anchors are in zone.json.

## Outputs

- `kalistar-map-1.33-preview.png`: complete composed map.
- `thalassea-detail.png`: integrated region enlarged for inspection.
- `kalistar-map-1.33-base.png`: terrain without cities.
- `kalistar-map-1.33.psd`: complete layered native source.
- `thalassea-icon.png`: trimmed transparent emblem.
- `thalassea-v1.webp`, `thalassea-v2.webp`: local-only icon exports.
- `zone-generated.png`, `thalassea-source.png`: selected built-in image_gen outputs.
- `zone.prompt.txt`, `thalassea.prompt.txt`: exact generation prompts.
- `zone.json`, fitted crop, before/after and mask: composition inputs.
- `user-zone-reference.png`: original phone location reference.
- `verification.json`, `provenance.json`: pixel and SHA-256 checks.

Rebuild: `node V4/map/layers-1.33/build-proposal.cjs`.
Existing local Sharp/ag-psd tooling is used for composition, not for drawing
the generated terrain or emblem. Native Photoshop is not invoked.

This proposal does not change the approved global map registry, runtime media,
site city catalogue, shared version files or published site. Sources remain
physically local; never force-add binaries to the code-only repository.
