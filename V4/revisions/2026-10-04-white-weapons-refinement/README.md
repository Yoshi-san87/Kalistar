# Four White Weapon Refinements

Explicit user-requested follow-up to 4.5.4:

- Dague: short leaf-shaped blade, cut-out fuller, swept guard and ring pommel.
- Gun: angular semi-automatic profile, machined slide, sights, hammer, trigger
  and grip notches, keeping an immediately readable white silhouette.
- Faucille: much broader curved scythe blade and slightly larger overall fit.
- Hache: broad semicircular cutting edge, shaped socket, rear poll and grip.

The other sixteen SVGs remain byte-identical to the previous revision.
No change to native print exports, copper rims, character profiles, equipment
artwork, gameplay or saves. These are screen-only white base pictograms.

Run `node V4/revisions/2026-10-04-white-weapons-refinement/build.cjs`.
It reuses the original calibration/export procedure with explicit replacement
sources and a separate proof directory. Previous geometry and captures remain
historical and unchanged. The source uses a slightly larger 42.8 target radius
for the scythe; the measured full-alpha radius still stays below 44 native px.
All optical errors remain below 0.8 native pixel.

`geometry.json` is the current 20-icon source/geometry proof;
`../2026-10-04-white-weapons/geometry.json` is the previous baseline.
The tests assert exactly four changed hashes, sixteen unchanged hashes and
increased scythe visible mass. The four changed runtime asset URLs use revision
2 to refresh browser caches. Stable family names, numeric IDs and PNG paths
in saved games are unchanged.

Real-card desktop and Razr 50 checks and screenshots are in `qa/`.
The contact sheet covers every family, including the four retouched icons.
