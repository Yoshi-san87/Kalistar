# Collection sleeves - 4.5.55

The pale caption band is replaced by an attached dark identification strip,
with ivory Cinzel names and copper controls. A thin clear sleeve surrounds
the original card and this strip: transparent edges, a sealed top highlight
and restrained material reflections. Hover and keyboard focus catch the edge
without moving or obscuring the artwork.

The sleeve matches the measured card size, not a fixed viewport. Short pockets
give the name its own line above the counters and favorite, preserving their
existing order on normal-sized cards. Mobile reserves four pixels on each side
so the sleeve and strip align and do not touch neighboring cards.

This is CSS-only: no new image, timer, listener, canvas or storage. Sleeve layers
are pointer-transparent; Reduced Motion disables transitions. Approved card
art, ownership, editions, favorites, filtering, paging and notebook rules stay
intact. Story and the arena are unchanged. Pending FF9 production is excluded.

## Verification

- `node --test --test-isolation=none V4/site/ui-system.test.cjs`
- `node V4/site/collection-map.browser.test.cjs`
- `node V4/site/collection-versions.test.cjs`

The expanded map test checks contrast, sleeve/strip geometry, non-overlapping
controls, seven desktop/phone viewports, paging, filters, edition cycling,
notebooks, Story navigation, reload, hover, keyboard focus and real touch taps.
It runs in disposable browser contexts and can exercise an isolated Pages
build with `KALISTAR_BUILT_SITE=1`, or production using `KALISTAR_URL`.

All 446 tests from the committed Pages workflow passed in the isolated source
snapshot, and the 928-file Pages build succeeded. The map/sleeve browser suite
passed against local sources and the built site. The edition suite also passed
on that build, including seven responsive sizes, keyboard controls, filtered
and owned cycling, rapid clicks, cancellation and the animated swap.

`verify-static.cjs <snapshot>` runs both suites against a short-lived read-only
server. Results are in `verification/built/results.json`, detailed geometry in
`verification/built/map/results.json`, and workflow results in
`verification/workflow-results.json`. Kept captures show desktop, Razr, compact
phone and the Maelor sleeve detail. All 12 changed source/test files match the
validated snapshot byte for byte. Other unfinished work is not staged.

The standing publication request targets only `Yoshi-san87/Kalistar`, `main`
with annotated tag `v4.5.55`. Pages workflow, public version and exact changed
stylesheet bytes are checked after pushing before announcing the site live.
