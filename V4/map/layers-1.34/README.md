# Map 1.34 - Trainee du cratere

Local proposal, not approved or published. Parent: map 1.33.

The author requests a more realistic impact trail. The generated patch replaces
repeated thick slabs and smooth ball-like blocks with a continuous eroded rocky
trough, varied fractures, small angular ejecta and finer etched relief.
The existing crater interior, eight city groups, Thalassea archipelago and
northern wall are preserved. Only a local terrain mask changes.

- `kalistar-map-1.34-preview.png`: full local proposal.
- `crater-detail.png`: enlarged integrated detail.
- `kalistar-map-1.34-base.png`: terrain without city emblems.
- `kalistar-map-1.34.psd`: original layers and independent masked impact trail.
- `zone-generated.png`: built-in image_gen output.
- `zone.prompt.txt`: exact prompt; no CLI/API fallback.
- `zone.json`: crop, contour and protected regions.
- `verification.json`, `provenance.json`: pixel identity and source hashes.

Rebuild: `node V4/map/layers-1.34/build-proposal.cjs`.
No native Photoshop process is invoked. These local PNG/PSD sources are not
runtime assets and must not be force-added to the code-only repository.

The site publication requested on 15 October concerns map 1.33 (wall and
Thalassea). This crater proposal is intentionally excluded.
