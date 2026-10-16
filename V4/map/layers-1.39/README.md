# Map 1.39 - Ilots volcaniques de Vulkar

Local selected artwork, 16 October 2026, following map 1.38.
The author requested publication of 1.38, then added the volcanic-island edit
to the same ongoing lot. No web deployment is performed by this native builder.

## Change

Six existing offshore islands west of Vulkar become miniature volcanic terrain:
twin cones/caldera, a small cone, an elongated volcanic ridge, an open caldera,
a shield-volcano island and a tiny volcanic stack. Positions and open channels
remain recognizable. No city badge, additional eruption or large new island.

The mainland plateau, active volcano/lava, enlarged black lake, forest,
approved crater, Cryptown fog and other city layers remain unchanged.
Fine umber engraving and charcoal basalt preserve Kalistar's parchment style.

## Files

- `kalistar-map-1.39-preview.png`: complete map with separate city groups.
- `islands-detail.png`: integrated island detail.
- `vulkar-detail.png`: full plateau context with cities.
- `kalistar-map-1.39-base.png`: terrain without baked city emblems/names.
- `kalistar-map-1.39.psd`: parent layers plus six editable island masks.
- `zone-generated.png`, `zone.prompt.txt`: selected built-in image_gen output and exact prompt.
- `zone-before-large.png`: actual city-free edit target.
- `zone-before.png`, `zone-fitted.png`, `zone-after.png`, `*-mask.png`: native compositing proofs.
- `zone.json`: target polygons and mainland protection contour.
- `verification.json`, `provenance.json`: pixel/layer checks and SHA-256 hashes.

Rebuild with `node V4/map/layers-1.39/build-proposal.cjs`.
Artwork uses built-in image_gen; no API/CLI fallback. Local Sharp/ag-psd apply
controlled masks. Native Photoshop is not invoked. Previous source files and
proposal provenance are preserved; binaries are not force-added to Git.

## Visual and native validation

The integrated island detail, full Vulkar region and complete atlas were
inspected. Six recognizable volcanic islands retain open sea channels, varied
craters and engraved basalt shores. The nearby mainland and its active lava
remain unchanged. No rectangular patch edge is visible in the integrated atlas.
4,841 native terrain pixels changed inside the six masks, zero outside.
The eight original city groups and all parent PSD layers survive reopening
unchanged. See verification.json and visual-review.json.
