# Kalistar V4 Combat Immersion

Implemented and verified locally on 2 October 2026 in the active personal
checkout. This is a presentation-only change. Approved artwork, flattened card
pixels, combat rules, RNG, ownership and collection storage remain unchanged.
The implementation was first verified locally at version 4.3.4. It is included
in the user-authorized 4.3.5 release; deployment requires a successful Pages
workflow and public checks. Unrelated local Story work is excluded.

## Architecture

The existing arena artwork remains the background. A noninteractive canvas,
vignette and arrival tint sit above that image and below gameplay at z-index -1.
Existing formations, cards, console, projectiles and native modal layers retain
their responsibilities and hierarchy.

`arena-ambience.js` supplies a single throttled 30-fps scheduler shared with
`duel-focus.js`. Profiles use arena element metadata and a centralized place
override table. The 28 current arenas resolve to profiles with two or three
motions; they do not each receive an unrelated bespoke particle engine. Particle
and veil drawing excludes actual moving card, reserve and console bounds.

`duel-focus.js` retains the existing transforms and elemental aura vocabulary.
A successful lock alone triggers an 800-ms awakening. Native component bounds
establish the shared crystal centre (448,1195); the cropped media anchor is
(398/797,1145/1388). This matches every elemental component within one native
pixel, including Electro. A local halo and small elemental motifs lead into two
short border sweeps. NONE remains unlit. Restore and repaint do not replay this
event. A promptly clicked roll waits only for its remaining duration.

`combat-effects.js` remains the sole outcome detector. Its existing magic,
physical hit, shield, dodge, Reraise and death transitions are retained. Arrival
adds a low-opacity 220-ms elemental terrain light. A significant impact or death
can add a 140-ms shake, maximum 1.5 px, to the battlefield only. The numerical
ATK >=250 threshold affects that presentation, never damage or resolution.
No additional death explosion is introduced. Aura opacity and desaturation
follow the existing fading card, then disappear with it. Resolution restores
the calm terrain mood.

A lone active fighter receives a slightly stronger aura and vignette. Imminent
victory uses a disposable engine clone: the lone unit moves to the clone's dead
zone and the existing replacement/end resolver is called through `next()`.
Transient duel data is omitted from this terrain query. It is not a replay,
save, roll or new combat rule. Inventory remains complete, resulting projections
pass the engine validator, and frozen source states stay unchanged. No hardcoded
score of nine or duplicated win/replacement condition is used.

## Lifecycle And Accessibility

Desktop ambience has at most 14 particles; mobile has at most seven. Ambient DPR
is capped at 1.5 on desktop and 1.25 on mobile; mobile aura DPR is capped at 2.
Hidden documents stop the shared RAF. Reduced motion keeps static aura/vignette
states, with no particles, ignition delay, shake or arrival flashes.

Owned nodes, observers, finite activation waits and subscriptions are cleaned
on repaint, navigation, profile/view changes, new matches, match end and
pagehide. Resize cancels activation and terrain reactions. Existing card-effect
surfaces remain accurately fitted during rotation, preserving their prior
responsive behavior. All new visual surfaces are pointer-events none.

## Changed Files

- `V4/site/arena-ambience.js` (new): profiles, shared clock, terrain states and reactions.
- `V4/site/duel-focus.js`: printed-crystal awakening, shared scheduling and aura cleanup.
- `V4/site/combat-effects.js`: action/arrival hooks using existing outcome detection.
- `V4/site/arena.css`: isolated background layers and restrained mood states.
- `V4/site/app.js`: lifecycle, successful-lock hooks and presentation readiness.
- `V4/site/boot.js`: module loading before focus and combat presentation.
- `V4/site/arena-ambience.test.cjs` (new): immutable engine projection and profile checks.
- `V4/site/arena-immersion.browser.test.cjs` (new): existing Playwright runtime and disposable contexts.
- `V4/site/elemental-roll.browser.test.cjs`: open existing advanced options before editing the seed.
- `V4/site/README.md`: implementation and verification documentation.
- `V4/site/verification/arena-immersion/`: this report, hashes, results and generated screenshots.

## Verification Results

Passed commands:

```text
node V4/site/arena-ambience.test.cjs
node V4/site/arena-immersion.browser.test.cjs
node V4/atelier/game-catalog.test.cjs
node V4/site/kalistel.test.cjs
node V4/site/ai-presentation.browser.test.cjs
node V4/site/combat-effect-layout.browser.test.cjs
node V4/site/elemental-roll.browser.test.cjs
node V4/site/phone-preview.test.cjs
```

Syntax checks passed for the changed scripts. The static export plan includes
the new module automatically. These implementation checks precede the release
build and public checks described in the release documentation. The
catalogue suite's 12 checks include deterministic full-game V3/V4 parity; the
Kalistel suite covers eight complete matches and charge/RNG continuity.

The new browser suite covers 1440x1000 and 2041x1383 desktop, 412x1007, 390x844
and 320x568 portrait, and 844x390 landscape. It checks all 12 elemental
activations plus NONE, actual pixel movement, printed-stat clearance, modal
interaction, unchanged card transforms and no additional horizontal overflow.
It includes physical/magic/Rainbow resolution, death, last survivor, imminent
victory, cancellation, real Razr 50 iframe interaction and a mobile DPR-3 context.
That high-density context confirms ambient DPR 1.25 and aura DPR <=2.

Existing effect tests cover both teams, 14 outcomes and six sizes, including
live rotation. Magic remains over the central board and under the participants
(console 8, projectile 9, actor/target 10). The AI sequence, independent dice
awakening, Kalistel continuity and reduced-motion behavior also pass.

`protected-before.json` retains the initial SHA-256 values. `results.json`
records viewport budgets and confirms identical bytes for engine, ownership,
local database, catalogue, reference registry and component manifest. Test
contexts are disposable and do not access the user's personal browser database.

## Visual Evidence

Before captures precede implementation and show the existing selection stage;
after captures show the new lock event. Some effect/element images use
renderer-only synthetic outcomes or approved-card previews. Those fixtures
are not saved into a production catalogue or personal profile.

- Desktop: [before](before-1440.png), [after](after-1440x1000.png).
- Phone: [before](before-412.png), [after](after-412x1007.png).
- [Landscape](after-844x390.png), [small phone](after-320x568.png).
- [Razr 50 activation](razr50-activation.png), [high-DPR phone](high-dpr-phone.png).
- [Hydro flight early](magic-HYDRO-flight-1.png), [later](magic-HYDRO-flight-2.png).
- [Rainbow flight](magic-RAINBOW-flight-2.png), [physical impact](physical-NONE-arrival.png).
- [Elimination](defeat-CRYO-arrival.png), [last survivor](last-survivor.png), [match point](match-point.png).
- [Reduced motion](reduced-motion.png), [modal above effects](modal-412.png).
- Arena profiles: [Canyonero](ambience-minero.png), [Arborium](ambience-herbo.png),
  [Thalassea](ambience-hydro.png), [Chroma](ambience-electro.png), [Niveria](ambience-cryo.png).
- `element-*.png` covers each element. `combat-regression/` contains the existing
  shield, death, dodge, Reraise and rotated-surface checks.

The motion frames and screenshots were visually inspected. Energy is localized
to the printed crystal and rim; the projectile remains the primary action cue.
Ambient particles are intentionally sparse and secondary to card readability.

## Limits

Phone validation uses Chromium emulation and the project's Razr 50 preview,
not a physical Android device or measured device framerate. Arena movement uses
family profiles with a few place overrides, not camera animation or custom
landmark-by-landmark effects. The existing dice animation loop remains separate
from the shared ambience/aura clock. Release status must be checked against
the Pages workflow and public version, not inferred from local screenshots.
