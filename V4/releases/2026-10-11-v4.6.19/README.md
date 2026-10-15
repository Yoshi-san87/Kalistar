# Kalistar V4.6.19

- Razr home: Astralia map, native collection/equipment portals, bounded animated
  catalogue carousel, unique K entry and prominent central Arena action.
- Five-entry phone menu, including direct Stats and Story inside Plus; coherent
  page/deck transitions and real boot animation with reduced-motion support.
- Mobile career accordion and readable character popup with real equipment cards
  directly below the visual; profile / deck / match snapshot isolation retained.
- Weapon-clue visual failures no longer silently end the presentation. UI-only
  pending-match preference protects full-lineup resume after Android reload.
- No gameplay, equipment balance, save schema, native card or player data changes.
- Arena decision cues: subtle player-colored card breathing for the missing
  attacker/target or eligible recipient, then a copper reflection on enabled actions.

See `../../revisions/2026-10-11-razr-experience/README.md` and its screenshots.
`verify-release.cjs` exports only the staged tree to an owned temporary directory,
hydrates verified LFS assets, runs the publication suite and builds GitHub Pages.
`qa/` records validation; `public-smoke.cjs` checks the deployed commit and exact
runtime asset hashes. Browser checks use isolated databases and never reset users.

The exact physical Razr bug remains unverified; tests reproduce rendering failures
and verify that they cannot implicitly start the match.

## Validation

- The full publication suite passes 718 tests; the staged runtime builds 343 cards
  and 1,175 files for GitHub Pages. Native references and gameplay stay unchanged.
- The eleven touch/standalone introduction scenarios pass, including rejected
  layout/icons/animations, cancelled flight, rotation, reduced motion, 6x CPU
  slowdown, an unexpected failure held in initiative, and reload at P1 weapon.
- Home/navigation, career accordions and card details cover desktop, Razr,
  compact phones and landscape. Statistics retain exact totals from eight real
  completed fixture games and two historical variants without mutating storage.
- The existing Pages interaction suite checks Collection, Decks, Story, Arena,
  saved matches, downloads, manual fullscreen and both combat-reference popups.
- QA found a real footer overlap with the combat-reference dock. The dock now
  sits above the phone menu, and retains its original inset in manual fullscreen.
- The desktop introduction regression also covers full pending-lineup reentry
  and reload, plus captain-only resume for legacy saves without the new preference.
- Arena prompt checks cover actual card selection, attack/result actions, AI waits,
  support recipients, unchanged geometry, overlays and reduced-motion fallback.

The earlier `failed.txt` logs remain as iteration evidence: the Pages dock
overlap and the old captain-only test expectation were addressed, not suppressed.
Final `passed.json` reports identify the same verified runtime build. `stage.json`
checks the final staged runtime and test-driver bytes against that snapshot.
Post-publication workflow and public-hash proofs are kept outside the repository,
so they do not require a second push at the same game version.
