# Map 1.36 - Barrage, brume et rebord de Durane

Local proposal, 15 October 2026, built on the local 1.35 proposal.
The live map remains the approved 1.33 until a separate publication.

## Author request

- Reduce the northern wall and its gate substantially, leaving more mountains.
- Make the remaining wall a short dam-like barrier lodged in a rocky pass.
- Enclose Cryptown's island in thick ominous sea fog, extending offshore.
- Preserve the fine engraved sepia Kalistar atlas art direction.
- Redraw the crater bowl so its southeastern rim meets Durane's unchanged tower foot.

The deep impact scar from 1.35 is approved by the author. Its upstream section
is retained and the crater junction remains open. The bowl is redrawn locally
so the southeastern rim reaches the existing obelisk base at (449,393).
Thalassea and all eight independent city emblems and names remain unchanged.
Cryptown keeps its existing spelling and cross emblem.

## Outputs

- `kalistar-map-1.36-preview.png`: complete assembled proposal with cities.
- `wall-detail.png`, `cryptown-detail.png`, `durane-detail.png`: integrated details.
- `kalistar-map-1.36-base.png`: flat terrain and atmosphere, without cities.
- `kalistar-map-1.36-geometry.png`: terrain without the new fog.
- `kalistar-map-1.36.psd`: all original layers plus three editable local masks.
- `wall-generated.png`, `fog-generated.png`, `crater-generated.png`: image_gen outputs.
- `wall.prompt.txt`, `fog.prompt.txt`, `crater.prompt.txt`: exact generation prompts.
- `zone.json`: crops, mask contours, protected areas and visual annotations.
- `verification.json`, `provenance.json`: pixel checks and SHA-256 provenance.

The fog is an independent atmosphere patch below the city emblems; hiding it
restores Cryptown's exact underlying geography. The abyss center, neighboring
islands, navigation hub centers and the atlas frame are protected during assembly.
The wall, crater and fog are separate editable local layers, not a whole-map generation.

Rebuild: `node V4/map/layers-1.36/build-proposal.cjs`.
Existing local Sharp/ag-psd tools perform deterministic masked compositing.
Image generation uses the built-in image_gen tool, not an API/CLI fallback.
Native Photoshop is not invoked. No runtime, version badge, global map registry,
media registry, stage or publication is changed by this proposal.
Do not force-add the local PNG/PSD binaries to the code-only Git repository.

## Validation

All three integrated details and the complete map were visually inspected.
Durane's original tower foot meets the new southeastern rock lip. The impact
scar enters the basin without a closing cross-ridge. The northern barrier is
shorter, with a tiny gate and continuous mountain abutments. Cryptown's dense
fog keeps the abyss open and the city legible, without a rectangular edge.

Pixel checks: 55,813 changed terrain pixels inside the three masks, zero
outside. All eight original city groups and all prior PSD layers are identical
after reopening. Thalassea, the frame and the upstream scar are unchanged.
The 10 approved-map/runtime regression tests pass. See `visual-review.json`.
