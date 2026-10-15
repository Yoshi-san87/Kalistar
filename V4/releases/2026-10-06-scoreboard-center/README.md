# Kalistar 4.5.29 - Centered score and decision light

## Scope

- Desktop scoreboard centred on the whole toolbar, including fullscreen.
- Arena title remains left; zoom, commands and board navigation remain right.
- Phone scoreboard retains its existing compact position and dimensions.
- The central panel softly lights the decision owner's side: cyan left for
  player 1, rose right for player 2. Defense and reinforcement use their actual
  decision owner, not merely the attacker. Consecutive ABBA turns retain the
  correct side. Result/setup/initiative/finished states have no light.
- Decorative, pointer-transparent DOM only; no persistent animation or timer.
  Reduced Motion suppresses the fade. Existing accessible action labels remain.
- No gameplay, card image, equipment, save schema or reference-lock changes.

## Verification

```powershell
node --test --test-isolation=none V4/site/console-turn.test.cjs V4/site/scoreboard.test.cjs V4/deploy/build.test.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/scoreboard-center-20261006/pages'
node V4/site/scoreboard.browser.test.cjs
$env:KALISTAR_VERIFICATION_DIR='V4/site/verification/console-turn-20261006/pages'
node V4/site/console-turn.browser.test.cjs
node V4/deploy/browser.test.cjs
```

Scoreboard checks cover real 0/kill/10 scores, reload, AI naming, fullscreen,
Reduced Motion and Razr 50 preview. Thirteen viewport checks:
2048x1169, 1920x1080, 1440x1000, 1250x900, 1100x800, 1024x768, 700x900,
951x480, 412x1007, 390x844, 320x568, 699x900 and 844x390. They verify actual
toolbar centring on desktop, separate title/control lanes and no mobile overlaps.

Decision-light checks replay 21 distinct states from an engine-driven match at
1440x1000 and 412x1007: 42 checks, no browser errors. They verify side, material
edge alignment, neutral states, a single inert decoration and Reduced Motion.
The unit test also proves that cue calculation does not mutate game state.

Results: 11 focused unit/build tests pass. The full Pages browser regression
also passes: 215 cards, desktop/phone, reader, PNG download, decks, arena,
saved match and additive publication, without HTTP or JavaScript errors.
The static build contains 713 assets (540.5 MiB reported by the builder).
Independent equipment work in the shared checkout was excluded from the
verification build and release commit; its source files remain untouched.

Fresh built-site screenshots and JSON results:

- [Desktop scoreboard](../../site/verification/scoreboard-center-20261006/pages/arena-2048.png)
- [Desktop player 1](../../site/verification/console-turn-20261006/pages/1440-choose-0.png)
- [Desktop player 2](../../site/verification/console-turn-20261006/pages/1440-choose-1.png)
- [Phone player 2](../../site/verification/console-turn-20261006/pages/412-choose-1.png)
- [Scoreboard results](../../site/verification/scoreboard-center-20261006/pages/results.json)
- [Decision-light results](../../site/verification/console-turn-20261006/pages/results.json)

Publication verification: `node V4/releases/2026-10-06-scoreboard-center/public-check.cjs`
compares public JavaScript/CSS hashes with the tagged commit and Pages manifest,
and verifies desktop/phone version 4.5.29.
