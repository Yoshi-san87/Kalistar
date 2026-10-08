# Timeline player colors - 4.5.53

The current station retains the player's existing cyan or rose color instead
of switching to gold. Its subtle glow and resolved check use that same color.
The check remains inside the station after the duel is resolved.

No timeline geometry, turn order, round logic, accessible labels, game rules,
save schema or approved card assets change. The current rainbow crystal and
Reduced Motion behavior remain intact.

## Verification

- `node --test --test-isolation=none V4/site/turn-timeline.test.cjs V4/site/combat-timeline.test.cjs V4/site/turn-order.test.cjs`
- `node V4/releases/2026-10-08-timeline-player-color/verify-browser.cjs`
- Repeat the browser check on the isolated Pages build with
  `KALISTAR_BUILT_SITE=1`, then on production with `KALISTAR_URL` set to
  `https://yoshi-san87.github.io/Kalistar`.

The browser check uses disposable storage and real engine snapshots for both
players, before and after resolution. It checks desktop 1440 x 1000, Razr-size
412 x 1007 and compact phone 360 x 800, with normal and reduced motion.
Results: all 20 focused tests passed, including the existing 250 complete
ABBA-match regression. All 443 tests from the committed Pages workflow passed
in an isolated staged-source snapshot; the 928-file Pages build succeeded.
All 24 browser cases passed against local sources and again against that build,
without page errors. Runtime/source files match the validated snapshot byte
for byte. Unrelated pending local work is excluded from this release.

Built-site screenshots and computed-style results are under
`verification/built/`; workflow results are `verification/workflow-results.json`.
The two desktop and two phone rail captures show both resolved player colors
and their check. Full desktop and phone captures preserve their arena context.

The standing publication request targets only `Yoshi-san87/Kalistar`, on `main`
with annotated tag `v4.5.53`. Pages status, public version and stylesheet bytes
are verified after pushing before announcing the site live.
