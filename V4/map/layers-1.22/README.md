# Map 1.22 - Clean southern tropical revision

Version 1.21 was rejected by the author: local compositing interrupted navigation
lines. The attempted protected-line crop also produced coastline artifacts and
was rejected internally. Neither attempt is this final version.

The selected built-in imagegen result refines the COMPLETE map using 1.20 as
its reference, with tropical islands and continental tips, fine organic southern
forests, coral shoals, lagoons and one small sailing ship.
Exact selected prompt: `final.prompt.txt`.
Generation: `exec-93bbcb53-e56b-4a4e-8fc2-b5d2d3233111`.

IMPORTANT: this full-map refinement does not guarantee pixel identity outside
the south. The original 1.20 remains preserved. Navigation continuity was
inspected visually, not asserted as exact original line geometry.
Original city groups are unchanged and independently layered. The PSD retains
the old terrain in a hidden historical group and adds the selected complete
terrain above it. Reopened PSD composite and city layers are checked exactly.
Native Photoshop was not tested.

Rebuild: `node V4/map/layers-1.22/final-build.cjs`.
The site's runtime map remains 1.19 pending explicit approval.
