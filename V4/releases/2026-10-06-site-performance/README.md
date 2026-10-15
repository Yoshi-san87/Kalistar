# Site performance audit - 4.5.28

Scope: the active V4 HTML site, its boot sequence, Collection, Story,
Composition, Armes, Statistiques, account register, prematch and Arena.
No gameplay, equipment/ownership rules, save schema, native card PNG/PSD,
reference lock or component manifest was changed.

## Implemented

- Preload the 36 dependent scripts concurrently with the catalogue request.
  Execution remains sequential and occurs only after catalogue validation.
  Missing dependencies fail closed; the phone preview host stays lightweight.
- Convert only new Lucide placeholders. Existing SVG nodes, attributes and
  accessibility labels survive subsequent icon updates.
- Mount Composition once, pre-index static search fields and filter before
  expensive availability/synergy evaluation. Typing updates the recruitment
  results only: formation, input focus and saved draft remain intact.
  Rail layout measurements are coalesced into one animation frame and canceled
  on repaint/unmount. Ownership is still evaluated against the current register.
- Remove three unreachable old deck renderers (preview, affinity pagination,
  SVG links), their handlers/state and 85 obsolete standalone CSS rules.
  Keep current DNA pips, faction hover highlighting and combat edge-case CSS.
- Do not rewrite unchanged preferences or game snapshots. Reuse the serialized
  game fingerprint for IndexedDB; a full localStorage still permits DB writes.
  Cross-tab storage changes invalidate the write cache.
- Save Story progress only when mounted and changed, not on unrelated views.
- Lazy-load register card images and offscreen arena thumbnails, with stable
  register image dimensions. Hidden phone recruitment is lazy as well.
- Use two lossless WebP grimoire textures. Keep the original PNG files intact.
  The conversion compares every decoded RGBA pixel before writing the output.

## Measurements

Chrome, disposable profiles, 4x CPU slowdown, 80 ms latency on root modules,
10 MiB/s network limit, identical current 215-card catalogue, no coverage
instrumentation. Baseline root sources: b7205d4a (4.5.26); optimized sources:
working 4.5.28 after the additive 4.5.27 card publication. Both runs use the same
route mechanism, fonts-ready wait and 500 ms stabilization. Search measures five
inputs plus two animation frames. Each viewport has one recorded comparison,
not a statistically powered series or a measurement on a physical Razr.

| Metric | Before | After | Change |
| --- | ---: | ---: | ---: |
| Desktop startup, 1440 x 1000 | 5029 ms | 1724 ms | -65.7% |
| Phone startup, 412 x 1007 | 4953 ms | 1845 ms | -62.8% |
| Desktop Composition, five search inputs | 2054 ms | 775 ms | -62.3% |
| Phone Composition, five search inputs | 835 ms | 751 ms | -10.1% |

Collection desktop search was essentially unchanged (368 -> 375 ms).
Overall long-task counts did not improve (desktop 79 -> 79; phone 79 -> 83).
Do not infer an across-the-board CPU or battery improvement from startup gains.
After leaving Arena, tested profiles have zero running animations and zero
ambience subscribers. This verifies that lifecycle, not absence of every leak.

Deterministic asset savings, independent of benchmark timing:

| Texture | PNG bytes | WebP bytes | Saved |
| --- | ---: | ---: | ---: |
| Collection grimoire | 2964590 | 1823304 | 38.5% |
| Reader grimoire | 2735079 | 1893990 | 30.8% |

Total: 1982375 fewer bytes when both textures are loaded (1.98 MB decimal).
Decoded image memory is unchanged. The deploy artifact includes preserved PNGs,
so its on-disk size is not reduced by this conversion. Source/output/pixel hashes
and dimensions are recorded in `V4/deploy/lossless-grimoire.json`.

## Verification

The new unit suite checks dependency order, invalid catalogue/module failures,
preview-host isolation, asset hashes and confirmed obsolete code removal.
The new browser contracts check SVG identity, lazy loading, native image ratio,
search focus/formation preservation, reload persistence, cross-tab cache
invalidation and IndexedDB saves under localStorage quota failure.

Regression commands (disposable browser profiles only):

Completed checks: 39 root JavaScript modules pass `node --check`; all 175 pure
site tests and six build/PWA tests pass. Browser contracts pass desktop/Razr.
Composition passes eight viewport sizes, real recruitment/drag/undo, equipment,
JSON roundtrip, reload, replacements, captain death and a completed match.
Built-site UI checks pass all 35 checkpoints, including reduced motion and
landscape. Story passes 18 chapters, scene artwork, settings and position restore.
Combat effects pass both sides, 14 outcomes, six sizes, rotation, cancellation
and reduced motion without changing the match. That historical browser test now
starts a current composed match rather than looking for the old setup button;
its geometry, layering and cleanup assertions remain intact.
The full Pages browser suite passes with 215 cards: desktop/phone, Collection,
reader, native PNG download, prematch, Arena, manual fullscreen, saved-match
reload and additive publication, without missing assets or JavaScript errors.

Selected retained captures: `contracts/desktop-composition.png`,
`contracts/razr50-composition.png`, `story-final/desktop.png`,
`story-final/phone.png`, `combat-final/shield-phone.png` and
`combat-final/death-phone.png`, relative to the fresh evidence directory.

```powershell
$tests = Get-ChildItem V4/site -Filter '*.test.cjs' | Where-Object {
  $_.Name -notmatch 'browser' -and
  (Get-Content $_.FullName -Raw) -notmatch 'chromium\.launch'
} | ForEach-Object FullName
node --test --test-isolation=none $tests
node V4/site/performance-contracts.browser.test.cjs
node V4/site/team-composition.browser.test.cjs
node V4/site/ui-system.browser.test.cjs
node V4/site/story-reader.browser.test.cjs
node V4/site/combat-effect-layout.browser.test.cjs
node --test --test-isolation=none V4/deploy/build.test.cjs V4/deploy/pwa.test.cjs
node V4/deploy/build.cjs
node V4/deploy/browser.test.cjs
```

Fresh evidence: `V4/site/verification/performance-audit/`; existing historical
proofs are not overwritten. Set `KALISTAR_VERIFICATION_DIR` to a fresh directory
when using existing browser suites. Public verification after deployment:
`node V4/releases/2026-10-06-site-performance/public-check.cjs`.

## Reproduce The Comparison

```powershell
$env:KALISTAR_BASELINE_REF = 'b7205d4a'
$env:KALISTAR_VERIFICATION_DIR = 'V4/site/verification/performance-audit/new-before'
node V4/site/performance.browser.test.cjs
Remove-Item Env:KALISTAR_BASELINE_REF
$env:KALISTAR_ISOLATED_PERF = '1'
$env:KALISTAR_VERIFICATION_DIR = 'V4/site/verification/performance-audit/new-after'
node V4/site/performance.browser.test.cjs
```

The baseline test reads Git sources through browser routes; it never checks out
old files or modifies the running project. Do not run competing browsers during
the comparison. Optional `KALISTAR_COVERAGE=1` is diagnostic only: coverage
instrumentation noticeably alters timings. `deck-profile.browser.test.cjs`
records a Chrome CPU profile to investigate layout costs, not prove speedups.

## Deferred Deliberately

Unused-in-one-session CSS is not necessarily dead (rare combat, dialogs and
responsive states). No coverage-only purge was performed. CardMedia's decoded
blob cache is retained: safe eviction requires pinning visible URLs first.
No gameplay animations were removed, and there is no custom JS minifier or new
runtime dependency. Future work should measure physical-device frame times and
repeat trials before making broader battery/memory claims.
