# Kalistar V4.6.20

- Seven native Chrono Trigger cards (49902001-49902007), all with a Kalistel.
- Crono hair revised into natural copper-red locks; six approved illustrations preserved.
- New CHRONOTRIGGER faction, clock pennant and collection filter.
- Distinct roles and existing effects only; no engine, save schema or equipment change.
- Original editable PSDs, reopened native PNG proofs, barcodes and exact generation prompts included.

Production and gameplay rationale: ../../expansions/2026-10-11-chrono-trigger/README.md.
Native checks pass on all seven cards; 84 printed faces, 36 ABBA games, legacy matches
and save restoration are covered. The local browser checks pass all 21 readers
on PC, 412px Razr and 320px, plus an isolated old-backup migration and a saved duel.

The staged tree is exported and tested independently from concurrent local work.
Only this release scope is staged. Final publication suite, Pages build and browser
captures are recorded under qa. Post-push public checks are stored outside the
repository to avoid a second same-version push.

## Final checks

- Exact staged publication: 724 tests passed across all 64 workflow commands.
- Pages build: 350 cards, 1,183 files. No old card replaced.
- All 21 Chrono Trigger readers and the saved Crono/Magus duel pass on desktop,
  412px and 320px; screenshots in qa/browser.
- Existing Pages journey passes: collection, PNG download, decks, reader,
  arena, saved match and additive publication, without HTTP or application errors.
- The weapons-browser title assertion was still expecting 4.6.18 in HEAD;
  it is synchronized with the 4.6.20 release assertions, without changing gameplay.
- That older browser test also expected an inactive arena-detail medallion to be
  visible. The existing 4.6.19 card-detail.css deliberately hides it. The test now
  explicitly requires zero visible area, no rotation, no active class and the
  inactive equipment card below the character. Active overlays retain all their
  exact alignment checks. No runtime CSS or equipment rule was changed.
- The complete weapons browser regression now passes desktop, Razr and reduced
  motion: profile/backups/reload, real engine bonuses, native geometry and cleanup.
  Final results and captures are in qa/weapons-browser-final; earlier attempts
  remain separately labelled as diagnostic evidence.
