# Kalistar V4.6.21

- 14 new collectibles: 8 Castlevania and 6 native Kalistar.
- Five weapons, five protections and four relics; distinct object, painted scene
  and rotating medallion for each.
- Current V4.6 rules only: retained numeric D6 bonuses of +20/+25, or one-charge
  next-defense relics using existing support, ally fall and reserve entry events.
- No changes to native character artwork, printed stats, base weapon matrix,
  engine, save format or the 93 historical equipment definitions.
- 119 equipment definitions in total; 350 character cards unchanged.
- Compact activation wording verified without shrinking existing type.

Design, exact definitions and references:
../../revisions/2026-10-11-castlevania-kalistar-equipment/README.md

## Validation

The source-tree browser run covers all 14 objects on desktop 1440px, Razr 412px
and compact 320px with reduced motion. It checks equipping, persistence,
active/inactive arena states, enlarged inspection, resize, consumed relics and
cleanup. Captures are in the revision's qa directory.

Six dedicated engine tests cover the native faces on both camps, formulas,
combat logs, restoration, compatibility and 56 complete native ABBA matches.
The existing catalogue, artwork hashes and alpha-contour assertions include the
new items while keeping all historical manifests unchanged.

stage.cjs stages only this release and its exact media list. The workflow index
is derived from HEAD plus one equipment-test command, preserving the concurrent
unpublished performance-test line in the working tree.
verify-index.cjs exports the exact index, hydrates LFS by hash and runs every
publication command before building Pages. Results are under qa/publication.json.
Post-push checks are saved outside Git to avoid a second same-version push.

## Final checks

- 730 tests passed across all 65 publication commands in the isolated index.
- Pages build passed: 350 cards, 1,239 files, 831.9 MB including existing media.
- All 42 equipment browser cases passed, with no application/HTTP errors.
  These captures preceded the version-label increment; runtime equipment and
  media are identical to the tested publication snapshot.
- The final 4.6.21 Pages browser journey passed on desktop and phone: collection,
  reader, PNG download, decks, arena, saved match and additive publication.
- Legacy manifests and native card sources are unchanged. An initial mobile
  activation-text overflow was fixed with shorter wording, not smaller type.
