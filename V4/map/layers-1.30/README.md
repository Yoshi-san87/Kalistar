# Map 1.30 - WoodLand

Author request, 13 October 2026: remove the small black spot, extend the coastal
forest, add a heart-shaped lake on the left and WoodLand immediately to its right.
WoodLand is the land of the Cerelf. The provided tree-city image defines the
architectural inspiration, not a change to the map's engraved sepia style.

The author approved this rendering and explicitly requested site publication on
14 October 2026. The runtime now uses the separate terrain and seven city
emblems. WoodLand has its own accordion details, selection and responsive zoom.
Existing cities, card profiles, gameplay, save schema and hosting policy stay
unchanged. Previous map versions remain preserved.

## Files

- `kalistar-map-1.30-preview.png`: complete map with seven separate city emblems.
- `woodland-detail.png`: close view of the lake and city.
- `kalistar-map-1.30.psd`: original layers preserved, a new editable terrain mask,
  and independent WoodLand shadow, parchment outline, emblem and editable name.
- `../kalistar-map-1.30-base.png`: terrain only, no city or name baked in.
- `woodland-source.png`: original generated transparent city emblem.
- `woodland-icon.png`, `woodland-v1.webp`, `woodland-v2.webp`: ready city exports.
- `kalistar-atlas-1.30.webp`: lossless terrain export installed on the site.
- `published-media.json`: hashes of the nine runtime files checked at publication.

Exact user references, generation prompts and generation IDs are preserved.
The first terrain attempt was rejected for portrait framing, never composited.
The successful generation retains the original near-square crop. A restrained
tone match uses the unchanged adjoining forest; the original generation stays
unaltered in `zone-generated.png`.

## Verification

The controlled polygon preserves every terrain pixel outside its mask, including
the neighboring ocean and navigation lines. The complete preview also preserves
every pixel outside that terrain mask and the new WoodLand layers' bounds.
All six original city groups and every original PSD layer are unchanged.
The PSD composite and mask were reopened with `ag-psd` and compared exactly.
Native Photoshop has not been tested. Technical checks are not art approval.

Rebuild: `node V4/map/layers-1.30/build-map.cjs`.
Install checked exports: `node V4/map/layers-1.30/publish.cjs`.
Test: `node --test V4/map/layers-1.30/map.test.cjs V4/site/map-view.test.cjs`.
Browser: `node V4/site/map-view.browser.test.cjs`. It runs a read-only temporary
static preview, closes its server/browser and never uses personal saves.
`KALISTAR_MAP_URL` selects a real deployed `/jeu/` URL; `KALISTAR_DIST` can select
a verified isolated Pages build. Seven formats, all cities, selection/zoom,
labels, desktop/phone resizing, touch landscape, remount and hashes are checked.

The current builder follows the existing map tooling and bundled Sharp runtime.
It needs only preserved workspace sources, not the user's Downloads or clipboard.
