# Arena finale - 9 October 2026

User request: replace the misleading final Tour suivant label and give the
arena a living closing moment, explicitly without confetti.

- Existing engine `next()` is probed on a clone; normal turns, pending relic
  attribution and replacements retain their behavior.
- Earned characters return as presentation-only card images on the same arena
  background. Unique MVP first, actual Golden trophies underneath, all tied
  recipients preserved. Dead characters can be honored without resurrection.
- Staggered entrance, soft arena light and quiet MVP glow. No particle shower,
  new assets, permanent canvas, JS animation loop or timer. The skip button,
  Reduced Motion and repeated mounting settle the entrance.
- Native touch scrolling and arrows cover all winners. PC/Razr/320px/landscape
  layouts keep title, scoreboard and actions accessible.
- Existing detailed Palmares, last-duel board/calculation, card popup and new
  match remain explicit commands. Reload resumes a completed match here.
- Listeners, media-query subscription and ResizeObserver are detached on
  render, navigation and pagehide. Dialogs pause the MVP glow.

Tests: `V4/site/arena-finale.test.cjs`, `arena-finale.browser.test.cjs`.
The unit suite follows 60 real seeded matches, validates every result probe
without state mutation, and tests replacements, pending relic gifts, the
200-exchange draw and partial histories. Existing end-of-match browser checks
now expect the ceremony instead of an automatically forced report dialog.

Final static-build captures and results are under `qa/built/`.
Gameplay rules, victory resolver, native cards, save schema and reference locks
are untouched. See `V4/releases/2026-10-09-v4.6.10/` for publication evidence.
