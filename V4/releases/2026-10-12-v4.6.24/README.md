# Kalistar 4.6.24

Three once-per-match character relic ultimates, using real engine rules and
native support charges rather than display-only bonuses.

- Momo: while outnumbered at duel lock, an accepted hostile attack grants
  one Clover to each other active ally lacking one, before its resolution.
- Aeris: definitive defensive elimination while initially outnumbered opens
  a choice of one other active ally without Reraise. The dead donor receives
  the support credit, including a later consumption of that heart.
- 2B: surviving an advantaged numeric attack marks its exact attacker.
  Her next accepted numeric attack against that enemy gains +60 ATK once.

Prepared, marked, used and lost states have distinct accessible labels.
The actual gift/riposte is animated; inactive relics leave the native medallion
visible. The desktop recap grows for combined equipment bonuses so totals
cannot overlap the action button. The phone recipient cue stays readable.

Snapshots of old matches retain their original effects. No native card,
artwork, save schema, base weapon matchup or unrelated item was changed.
Import validation rejects forged recipients, rosters and tactical threats.

Rules and schema: `../../docs/RELIQUES_ULTIMES.md`.
Reproducible checks: `../../revisions/2026-10-12-relic-ultimates/README.md`.
Publication proof: that revision's `qa/publication.json` records the reviewed
index tree, parent commit, complete CI checks and isolated Pages build.
The browser report covers both camps at 1440x1000, 412x1007 and 320x740.

Validation completed: all 69 Pages workflow commands succeeded (852 tests
enumerated), followed by a 350-card isolated build and 18/18 real-browser
scenarios without source overlays. The final reports and selected desktop,
Razr 50 and reduced-motion compact screenshots are kept with the revision.

Only these rules, their presentation, regression tests, documentation and
version assertions are included. Parallel unpublished character work is excluded.
