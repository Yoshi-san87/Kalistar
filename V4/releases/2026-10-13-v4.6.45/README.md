# Kalistar 4.6.45
Five approved Froz soldiers with differentiated backgrounds, native cards and
existing Cryo/Okami mechanics. IDs 49902401-49902405; catalogue additions only.
Kaervan and Nyrska: P2/P3; Vrold: P4; Saevra: P3/P5; Drogan: P1/P5.
No engine, equipment, historical card, save schema or protected reference changes.
Vaerok remains Mercenaire. Froz banner reused; no Grivka faction alias.

## Publication
Coordinated after Map 1.29 / 4.6.44. The next scoped commit and annotated tag
publish to the personal Yoshi-san87/Kalistar origin only.
stage.cjs validates remote parent, additive catalogue and exact version changes.
verify-index.cjs exports the staged tree to an isolated directory, hydrates exact
LFS objects and runs every Node command of the current Pages workflow, then builds.
final-index.cjs ensures staged runtime/native sources still match tested sources.
Public checks compare deployed commit, complete catalogue and five card assets.

## Verification
See qa/publication.json for full suite count and build. Native per-card verification
is in the expansion cards folder. Browser captures cover 1440, 412 and 320 px,
all five readers, arena duel, reload and old-save migration.
Only scoped paths staged; unrelated local work preserved.

Final result: all 77 Pages commands passed (1132 Node tests), build 362 cards,
1316 assets, 863.6 MiB. Five native cards: zero fixed-frame differences and
zero reopened-PSD differences, five valid barcodes.

The new COMMANDANTE/Epee longue profile makes Saevra eligible for the existing
commanders-sabre (display: Le Fil du Ralliement). Current compatibility test
lists updated, archived definitions and effects untouched. Dedicated tests
verify her real faces and D6 modifier; no automatic equipment allocation.
The two preliminary suite attempts correctly found stale no-bearer assertions;
their reports remain in qa/. No historical proof or protected hash altered.

Browser QA passed at 1440x1000, 412x915 and 320x740: all five readers, equip /
reload / unequip, migration from 357 to 362 cards, duel and restored match.
The browser driver needed explicit modal close / fresh collection navigation.
It was rerun against the identical built site; results.json records its hash
and that build's release.json hash. final-index.cjs checks this independent
browser proof, plus every other staged source against the full-suite snapshot.
