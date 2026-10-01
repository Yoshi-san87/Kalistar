# Native QA - 2026-10-01

All 48 approved profiles are natively verified: 11 One Piece, 25 Resident Evil,
12 deliberately selected duplicated MGS templates. Skull Face, original Rikka,
Kaine and all other cards are outside the revision. Only 479 existing numeric
ATK/DEF faces change. Specials, roles, positions, flags, identities, effects,
elements, illustrations and game/role-bound sources remain unchanged.

## Proofs

- `plan.json`: exact before/after profiles and a reason for every card.
- `before.json` and `originals/`: early frozen production and native inputs.
- `render-batches/`: actual per-batch renderer code, request and hash manifest.
- `work/<id>/verified.json`: immutable evidence hashes for each finished card.
- `work/<id>/verification.json`: native values, component checks and barcode.
- `verified.json`: all 48 proofs and four contact sheets in `qa/`.

Every PSD was reopened in the installed Photoshop 26.11.7. Reopened PNGs
match exactly. Original and revised native exports with only the changed
number layers hidden match exactly, proving the painted rim/frame is unchanged.
Zero changed pixels lie outside the radius-64/radius-44 circular masks, which
cover numbers AND their original outline/shadow, not just the smaller painted
inner fill. All native text-style runs, effects and embedded smart-object
descriptors are exact. Text remains editable. Calibrated numeric translation
introduces at most 4.6629367034256575e-15 linear-transform rounding; the explicit
1e-12 tolerance applies only to edited numeric transforms. Unedited transforms
remain exact. All 48 real printed barcodes pass their independent reads.

The four small contact sheets were visually inspected; numbers remain clear
and centered without frame/identity overlap. The parent separately approved
the Luffy pilot's full card and proof before the remaining batches.

## Tests And Preservation

`node --test --test-isolation=none` with `revision.test.cjs`,
`../../atelier/game-catalog.test.cjs`, the One Piece model test and the Resident
Evil model test passes all 31 tests, including 11 focused revision policies.
Frozen historical model inputs remain immutable; no reference hashes were
rewritten. Fresh publication preflight passes with 175 playable cards and only
the 48 authorized ATK/DEF differences. Family numeric totals move by +0.69%,
-0.42% and +0.02%, respectively; this is not evidence of equal win rates.

Pilot descriptor/pixel-helper/mask repairs are preserved in `attempts/` and
`verifier-repairs.json`. The publication-only optional-metadata comparator
repair is recorded in `publication-repair.json`, with its actual rendered source
already preserved in `render-batches/`. No native evidence hashes were falsified.
No post-pilot native/render verification failures occurred. The parent reviewed
the 48-proof aggregate and explicitly granted publication on 2026-10-01.

No Git operation, illustration generation, shared renderer modification or
user dirty-file overwrite was performed. Publication replaced only five
files per selected creation and atomically replaced the fresh catalogue last.
`REGLES_JEU.md` and `GUIDE_REPRISE.md` clarify role bounds and current source
priority; other parent/agent documentation and dirty site work are untouched.

## Publication Completion - 2026-10-01

All 48 selected creations are published: 240 replaced files plus the catalogue.
The fresh playable catalogue still contains 175 cards, including the unrelated
Kaine and additive Rikka publications. `report.cjs published` checks every
active replacement hash, every frozen source/backup/protected hash, all native
evidence hashes, and the complete playable catalogue against the immediately
pre-publication catalogue. It passes: only the 48 ATK/DEF arrays differ.
All original illustrations, unrelated entries, role bounds and game sources
remain unchanged. `completion.json` stores this dated result; the immediately
pre-publication catalogue is `catalogue-before-publication.json`.

The parent's nine initial portable policies passed before native rendering.
Two additional regression cases cover machine-rounding limits and missing
optional publication metadata, giving 11 final focused tests. Together with
catalogue and historical OP/RE model tests, all 31 tests pass after publication.
Their actual output is `portable-tests.tap`; no skipped or failed test remains.
Parent release-wide baseline/browser/build/commit/push checks are separate and
are not counted as worker tests or claimed here.
