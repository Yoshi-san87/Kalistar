# Numeric personality revision - 2026-10-01

User request: role values are bounds/references, not mandatory identical faces.
Only numeric ATK/DEF entries may change. Every special, position, flag, identity,
element, illustration, narrative and native text style stays unchanged.

`plan.json` is the complete before/after table with an intentional reason per
card. Its hash and current production hashes are frozen in `before.json`.
`originals/<id>/` preserves all six creation files and current native evidence.
The original expansion sets and their historical inputs are not modified.

| Family | Cards | Numeric total before | After | Increased / decreased |
| --- | ---: | ---: | ---: | ---: |
| One Piece | 11 | 14560 | 14660 | 6 / 5 |
| Resident Evil | 25 | 35055 | 34908 | 10 / 15 |
| Metal Gear | 12 | 16210 | 16214 | 7 / 5 |

These totals are audit checks, not win-rate evidence. Each individual profile
has both stronger and weaker faces. Defense, support frequency and special
faces remain significant; no universal power increase is applied.

MGS selection: Meryl4, Raiden4, Otacon4, Liquid Ocelot, Naked Snake, The Pain,
The End, The Fury, Major Ocelot, Venom Snake, Kaz Miller and Quiet. Their recent
templates reuse numeric curves (Naked Snake/The End, Raiden4/The Fury,
Liquid Ocelot/Venom Snake and support defenses). Existing distinctive earlier
profiles, Skull Face, The Sorrow and other MGS characters are deliberately kept.

Native workflow: duplicate the current PSD, change only calibrated native
numeric text, preserve style/effect descriptors and all embedded smart objects,
save layered PSD/PNG, reopen and compare. Hiding only revised number layers
must reproduce the exact original frame. Actual pixel differences must remain
inside circular number masks, not merely their rectangular bounding boxes.
The radius-64/radius-44 masks allow the numbers AND their existing native
outline/shadow; they do not claim that every shadow pixel lies inside the
smaller radius-52/radius-35.5 physical fill. The separate exact hidden-number
comparison proves that no painted rim or frame pixel itself has changed.
Component rendering and the printed barcode are independently verified.

Parent reviews values and proofs before publication. Native rendering requires
`KALISTAR_STATS_PS_GRANTED=2026-10-01`; publication separately requires
`KALISTAR_STATS_PARENT_REVIEWED=2026-10-01`. Production uses `render.lock` and
the single Windows mutex `Local\KalistarV4AtelierRender`. A render may select
one card by ID, allowing serialized scheduling with Kaine and Rikka.

Publication builds from the fresh catalogue, retaining concurrent unrelated
additions. Each replacement is hash-checked and atomic; the catalogue is the
last replacement. A recorded rollback refuses to overwrite external changes.
Artwork files are never replaced. No approved reference hash is rewritten.

Portable policy tests (Node only):
`node --test --test-isolation=none V4/revisions/2026-10-01-stat-personality/revision.test.cjs`.
## Native completion - 2026-10-01

All 48 PSDs were saved and reopened in Photoshop 26.11.7 under the shared
mutex. All 48 native proofs pass, including 479 intentionally changed numeric
faces, exact hidden-number frame and reopened PNG comparisons, unchanged
editable text/style descriptors and embedded components, and real barcodes.
Maximum edited-number linear-transform rounding is 4.6629367034256575e-15,
below the 1e-12 machine-rounding tolerance. No substantive transform changes
are allowed. Four contact sheets were inspected at small size.

See `verified.json`, `qa/`, `QA.md` and `STATUS.md` for current progress.
`READY.md` remains the historical pre-render checkpoint, not current status.
The nine initial focused policies passed before rendering; two regression
cases expanded them to 11. These plus catalogue/OP/RE model tests pass all
31 tests after publication; the actual final TAP log is `portable-tests.tap`.

## Publication completed - 2026-10-01

The parent approved all 48 plans and native proofs, including visual review
of Luffy, Mr X and The End, and explicitly granted
`KALISTAR_STATS_PARENT_REVIEWED=2026-10-01`. All 48 profiles are now published.
The fresh catalogue still has 175 playable cards; unrelated Kaine and additive
Rikka entries are exact. Original Rikka and Skull Face remain protected.

`published.json` lists the 240 replaced creation files and catalogue.
`completion.json` records the successful post-publication audit and date.
`QA.md` describes the completed checks. `verified.json` remains the original
pre-publication review snapshot; its awaiting-review field records that earlier
checkpoint, not current status. No native proof or frozen hash was rewritten.

Only profile.json, card.png, card.psd, verification.json and creation.json of
the selected 48 creations were replaced, with atomic catalogue replacement
last. Illustrations were not replaced. Complete backups remain in `originals/`
and `catalogue-before-publication.json`. Shared engine, role bounds, protected
references, historical expansions and preexisting dirty work are unchanged.
No Git commit or push was performed by this worker; release/site audit belongs
to the parent.
