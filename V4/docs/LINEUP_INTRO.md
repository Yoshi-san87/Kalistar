# Starting lineups: presentation layer

## Scope

The introduction plays once after a new, ownership-bound Composition match is
created. Both teams already occupy their saved P1-P5 positions in engine phase
`choose`. No engine command, RNG call, deployment, recall, reserve or statistic
is changed by this feature. Legacy saves remain readable and never replay it.

Release V4.5.0 is independent of the unfinished Story and collectible-weapon
changes in the shared checkout. See `../releases/2026-10-03-v4.5.0/README.md`
for the exact release scope and its isolated verification.

## Files and lifecycle

- `site/lineup-intro.js`: read-only `describe()` plus cancellable DOM controller
  `play()`. There is no engine dependency. Native weapon, element and faction
  clues come from the catalogue and existing collaboration asset resolver.
- `site/lineup-intro.css`: paired reveal, native back/front, crown entrance,
  responsive spacing, subtle arena dimming and reduced-motion alternative.
- `site/app.js`: one-shot `pendingLineup` reference issued only by `createGame`;
  `presentationOpening` blocks game actions, drag and both AI scheduling paths.
- `site/boot.js` and `site/index.html`: register the module and stylesheet.
- `site/lineup-intro.test.cjs`, `site/lineup-intro.browser.test.cjs`: focused tests.
- `site/team-composition.browser.test.cjs`: use the real Skip button before the
  existing complete-match regression continues.

The controller clones the actual `.slot-card`, preserving current native card
images and existing equipment/captain markup. Identity clues belong to the back
face and rotate away with it. Special equipped weapons never replace the native
weapon clue. The crown is revealed only after the character; its short label is
decorative, with the captain identity also in the revealed accessible label.

Two visual piles are anchored to the real P5 card rectangles. The travelling
cards use real `getBoundingClientRect()` destinations and a FLIP transform. A
ResizeObserver and viewport listeners retarget motion from its current bounds
without restarting the current role or extending the travel deadline. Real
slots remain hidden until their clones arrive; the clones are then removed.
Portrait title clearance is measured against the upper P5 pile. Short landscape
keeps the role title between the paired cards to retain usable card height.

Skip, Escape, menu exit, render replacement and pagehide cancel finite waits,
animations, observers and listeners, remove all owned DOM, and restore inert,
scroll and focus state. Match data stays untouched. Navigation and reload do not
create another one-shot ticket. The existing ambient system keeps running at
lower opacity, then returns with a brief fade; there is no new canvas system.

## Rhythm

| Per role | Normal | Reduced motion |
| --- | ---: | ---: |
| Title | 60 ms | 0 ms |
| Departure | 330 ms | 0 ms |
| Native weapon | 500 ms | 180 ms |
| Crystal | 500 ms | 180 ms |
| Faction | 500 ms | 180 ms |
| Suspense | 80 ms | 0 ms |
| Reveal | 400 ms Y flip | 120 ms fade |
| Recognition / captain | 400 ms | 180 ms |
| Placement | 330 ms | 0 ms |

Total nominal duration: **15.5 seconds**, or **4.2 seconds** with reduced motion.
Image preparation is bounded at 300 ms. The 150 ms reveal accent overlaps the
flip and does not extend it. Reduced motion has no travel, rotation or flash.
No audio dependency or automatic placement phase is introduced.

## Verification

Use a disposable browser profile, never a personal IndexedDB backup:

```powershell
node V4/site/lineup-intro.test.cjs
node V4/site/team-composition.test.cjs
node V4/site/equipment.test.cjs
$env:KALISTAR_URL='http://127.0.0.1:4304/jeu/'
node V4/site/lineup-intro.browser.test.cjs
node V4/site/team-composition.browser.test.cjs
node V4/deploy/build.cjs
$env:KALISTAR_BUILT_SITE='1'
$env:KALISTAR_VERIFICATION_DIR='V4/revisions/2026-10-03-lineup-intro/qa-pages'
node V4/site/lineup-intro.browser.test.cjs --probe
```

The browser suite covers a real saved Composition launched through pre-match UI,
all five paired identities and image fronts, native weapon despite equipment,
NONE/collaboration clues, both captains, hidden-card counts, actual slot geometry,
the engine snapshot remaining byte-equivalent as data, blocked card clicks,
Skip at P1/Faction/flip/P5, menu exit, reload and no replay, responsive resizing
during arrival, a full phone sequence and reduced motion.

Viewport coverage: 320x800, 360x800, 390x844, Razr 412x1007, 430x932,
844x390, plus desktop 1440x1000. The existing Composition regression also covers
1920x1080 and the integrated Razr preview, then plays an actual duel and advances
through replacements to match completion with restoration checks.

Captures and machine-readable results are in
`revisions/2026-10-03-lineup-intro/qa/`, `qa-pages/` and `team-regression/`.
Primary captures: `desktop-p1.png`, `desktop-p3.png`, `desktop-p5.png`,
`mobile-412-reveal.png`, `mobile-412-p3.png`, `mobile-412-p5.png`,
`mobile-844-clues.png` and `reduced-motion.png`.

The built-site test serves the generated artifact under `/Kalistar/` and checks
all resource responses. It does not publish a release or modify reference locks.

Validation on 2026-10-03: 4 intro unit tests, 14 Composition unit tests and 15
equipment unit tests passed. The complete intro browser suite, Composition
browser regression through match completion, and built-site desktop intro all
passed. The local Pages build contains 193 approved/playable cards and 564 files;
its artifact also reflects other local changes and is not a published release.
