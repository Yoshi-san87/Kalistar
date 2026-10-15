# Map 1.32 - Barriere d'iles

Local proposal, 15 October 2026, built on local 1.31. The live map remains 1.30.
The northern wall, its land-facing terrain and seven original cities are retained.
Only the selected southern central archipelago changes.

The author requested a barrier of islands with a deeper middle. This proposal
interprets the middle as a deeper marine basin, enclosed by irregular islands,
small coral/rock islets, shallow shelves and navigable passes. Darker grey-brown
engraved hatching represents depth, without a black hole, blue water or new lore.

## Outputs

- `kalistar-map-1.32-preview.png`: entire map with original city layers.
- `island-barrier-detail.png`: enlarged detail of the integrated region.
- `kalistar-map-1.32-base.png`: terrain, no baked-in city emblems.
- `kalistar-map-1.32.psd`: prior layers and new editable local archipelago mask.
- `zone-generated.png`: original built-in image_gen output.
- `zone.prompt.txt`: exact prompt and the role of its supplied image.
- `user-zone-reference.png`: preserved phone attachment.
- `zone.json`, fitted crop and mask: reproducible composition inputs.
- `verification.json`, `provenance.json`: pixel and SHA-256 checks.

Rebuild: `node V4/map/layers-1.32/build-proposal.cjs`.
Uses existing local Sharp/ag-psd tooling, no Photoshop process or remote API.
Generation uses the built-in image_gen tool, not the API/CLI fallback.

The build asserts zero changed pixels outside the edit mask and in the northern
wall region, unchanged seven city groups and all prior PSD layers, and exact
composite/mask pixels after reopening the new PSD. Native Photoshop was not run.

This proposal does not alter the global approved map registry, runtime assets,
runtime media registry, version badges or the published site. PNG/PSD sources
stay local and must not be force-added to the code-only Git repository.
