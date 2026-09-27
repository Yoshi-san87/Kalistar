# Ready for parent native GO

Status: illustration sources, native replacement route and tests ready.
No Photoshop call, active creation, catalogue or reference lock was changed.
Final before-snapshot has deliberately NOT been taken, pending shared icon freeze.

## Confirmed identities

- Auron: `41124231`, Le serment tient encore, current FF10 creation.
- Kaylis: `49055457`, L'elan des couleurs, not her original Rainbow card.
- Lanio: `47414613`, Le vertige pour rire, not Astraball `30000021`.

Current catalogue at inspection: 100 cards. No count is hard-coded in the route.
All three declared native evidence directories match their active PNGs now.

## Selected art

- Auron: `art/auron-v1.png`, built-in generated, 1122 x 1402.
  SHA256 `1d1ec34a26156ad4d04bd9e51ecb785f435f4d28544cdebe7a22ae2eccea479b`.
  Long coherent katana on shoulder, compared with original Nomura weapon/pose;
  Luca setting, face, glasses, scar, costume and painterly DA retained.
  Official Square Enix web sources checked; URLs and interpretation recorded in
  `art/REFERENCES.md`. No invented metric weapon length is claimed.
- Kaylis: `art/kaylis-user.png`, exact supplied file, no regeneration.
  SHA256 `4b167fda27dd05eddb4baa48db73502fad07a89a9a3eba1fb804df3ba1edaefb`.
- Lanio: `art/lanio-user.png`, exact supplied file, no regeneration.
  SHA256 `ac03339c9abc551deaa2276833a1583b8587654a0e83ea550b0a87400633748e`.

Exact request, references, original generated output path and source hashes are
preserved in `art/auron-request.json` and `art/provenance.json`.

## Checks performed

- `record-art.cjs`: copied sources, verified user copies byte-identical.
- `revise.cjs check`: correct IDs/titles/profiles, native evidence matches all 3.
- `revision.test.cjs`: 11/11 pass, including rollback and concurrent-edit tests.
- `revise.cjs preview`: all three frame previews generated and visually inspected.
  These are explicitly approximate QA, never publishable Photoshop cards.
- Auron: face, shoulder contact and gripping hand read clearly. Sword extends
  under the right rail naturally, as expressly accepted by the user.
- Kaylis: face and sword hand remain readable; the existing faction flag covers
  a portion of the right boot. No pose/source alterations made.
- Lanio: smile, climbing silhouette and raised boot read clearly. The exact
  supplied right hand is behind the established right stat rail. This is a
  framing limitation of the supplied composition, not a native-frame change.
  No artificial patch, stretching or image regeneration was introduced to hide it.

## Next sequence

Parent should review the three `qa/<key>/frame-preview.png` files, finalize icons,
then send native GO. If icons changed one of these cards, provide the updated
evidence directories in `evidence-overrides.json`; preparation rejects old PNGs.
Commands are in README. Prepare once, render cards serially, verify all, inspect
native full/small exports, then obtain separate publication GO.

The publication route is ready but has not run. It stages 16 exact targets and
preserves every original, profile byte identity, native text/style/geometry,
outside-art pixels, hidden-art composite, reopen equality and barcode proofs.

## Files authored in this scope

- `set.json`, `record-art.cjs`, `revise.cjs`, `replace.jsx`, `render.ps1`
- `revision.test.cjs`, `README.md`, `READY.md`
- `art/auron-request.json`, `art/REFERENCES.md`, `art/provenance.json`
- `art/auron-v1.png`, `art/kaylis-user.png`, `art/lanio-user.png`
- QA outputs under `qa/auron/`, `qa/kaylis/`, `qa/lanio/`
- Test-only transaction fixtures under `tests/`

No changes outside `V4/revisions/2026-09-27-artwork-refresh/`.
