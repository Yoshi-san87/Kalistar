# Map 1.31 - Mur et porte du Nord

Local proposal, 15 October 2026. The approved/runtime map remains 1.30.
No publication, version badge, runtime media registry or live atlas was changed.
The former rejected world-wide concept was deleted; this is a new LOCAL edit.

The author's 85 x 36 location crop matches the northern western mountain wall
at x264/y108, covering approximately 131 x 55 native map pixels. The edit uses
a larger context crop x199/y63, 261 x 165, while blending only two local masks.

The author approved the monumental wall and gate, then requested refinement
of the land-facing terrain. The new foreground has irregular lower ridges,
an approach valley, scree and more natural riverbanks. Its final appearance
is still awaiting review. No location name or new story revelation was added.

## Outputs

- `kalistar-map-1.31-preview.png`: complete map with the seven original cities.
- `wall-detail.png`: local detail from the integrated map, enlarged for review.
- `kalistar-map-1.31-base.png`: terrain without baked-in cities.
- `kalistar-map-1.31.psd`: all original layers plus two editable masked layers,
  wall/gate and land-facing terrain. Existing city emblems and native names
  retain their original positions, sizes and image data.
- `wall-generated.png`, `land-generated.png`: original built-in image_gen outputs.
- `wall.prompt.txt`, `land.prompt.txt`: exact prompts and reference roles.
- `zone.json`, masks and fitted crops: reproducible local composition inputs.
- `verification.json`, `provenance.json`: pixel checks and SHA-256 records.

Rebuild locally: `node V4/map/layers-1.31/build-proposal.cjs`.
The script uses the same installed Sharp/ag-psd tools as prior map versions.
It does not need the original temporary clipboard or generated-images folder.
The two source PNGs and prior 1.30 PSD/terrain must remain available locally.

## Verification

The build asserts zero changed pixels outside the union of the two masks,
zero changes to the approved gate from the foreground revision, unchanged
seven city groups and all original PSD layers, exact composite pixels after
PSD reopening, and both editable masks after reopening. Color calibration
is shared across the two generated edits; the lower river is registered to
the preserved context. Native Photoshop rendering was not run.

Source PNG/PSD files stay at these local paths and must not be force-added to
the code-only Git repository. The global version registry remains unchanged
until the proposal is selected for the next step.
