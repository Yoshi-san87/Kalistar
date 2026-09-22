# Kalistar V4 Game Integration

`/jeu/` is the playable V3 application migrated to the approved V4 catalogue. Existing mechanics are preserved except for explicitly documented V4 additions below. Do not serve a static V3 `data.js` fallback.

Read the [handoff guide](../../docs/GUIDE_REPRISE.md) and the
[current gameplay summary](../docs/REGLES_JEU.md), including the documented
difference between the ten-kill objective and the engine's empty-board ending.

## Parent Server Contract

```js
const { buildCatalog } = require('./game-catalog.cjs');
const data = await buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
// GET /api/game/catalogue -> JSON data, Cache-Control: no-store
```

`buildCatalog({ published = [] } = {})` is async, returns serializable `KALISTAR_DATA`, reads the approved profiles from the current `atelier/data/references.json` lock and the V3 rule tables, and writes nothing. Derive the approved count from the lock, not from an earlier migration report. Publication persistence remains exclusively owned by the parent (`V4/donnees/catalogue.json`). A publication has `{ id, profile, pngUrl, psdUrl }`; `id` is a new eight-digit `4xxxxxxx` barcode, `profile` is the full printable profile object, and the URLs are same-origin absolute paths. Optional `referenceKey` or `key` can identify its reference. Duplicate IDs, historical IDs for new publications and foreign URLs are rejected. Existing approved IDs stay unchanged.

Before persisting a publication, validate the candidate with `await buildCatalog({ published: [...existingCreated, candidate] })`. Required text fields include name, title, job, race, faction and weapon. V3 mechanics impose `guard` only for role 1 or 5, `revive` only for role 5, no magic/barriers for NONE and valid six-face ATK/DEF arrays. The role is the supplied role when it belongs to the selected positions, otherwise the first selected position. Support ability flags are derived from the actual printed faces; incompatible faces are explicitly rejected, never silently removed. Changing these restrictions would be a gameplay change, not a V4 migration.

Required read-only HTTP routes:

- `/jeu/` and `/jeu/*`: `V4/site/index.html` and `V4/site/*`.
- `/jeu/assets/*`: fall back to `V3/site/assets/*` (arenas, card back, logo, dice bundle, Lucide).
- `/jeu/shared/*`: `V3/assets/*` (crystals, factions, races, effect icons).
- `/jeu/assets/factions/FF7.png`: private V4 collaboration flag used by the
  published Cloud card; V3 shared assets remain unchanged.
- `/media/reference/<key>.png`: approved V4 PNG from the reference lock.
- Each published `pngUrl` / `psdUrl`: its validated export.
- `/`: designer, with `/?embedded=1` suppressing duplicate navigation.

The inherited UI sets dynamic inline styles. Its CSP needs `style-src 'self' 'unsafe-inline'`, `img-src 'self' blob: data:`, `script-src 'self'`, and same-origin frames. The designer response needs `frame-ancestors 'self'` rather than `'none'`. Do not relax unrelated write/authentication protections.

## Catalogue, Images, And Storage

`boot.js` fetches the endpoint with `cache: 'no-store'` before loading any game-dependent module. Failed or historical catalogues fail closed with a retry action. Card media is exclusively the approved/published V4 PNG, not a historical slug. `card-media.js` validates 897 x 1497 pixels, crops `{left:50, top:50, width:797, height:1388}` on image load, and caches WebP blob URLs in memory. The illustration view is a center crop of that same printed artwork. No original asset is written and no giant media directory is copied.

Storage is isolated: IndexedDB `kalistar-v4-cards`, preferences `kalistar.v4.*`, deck library `kalistar.v4.deckLibrary.<user>`, instance IDs `K4-<cardId>-00n`, edition `V4`. V3 imports are rejected. Game schema 6 retains the V3 mechanics and additionally requires edition V4. Initial approved and newly published originals go to Paris once each, Tokyo starts empty. Reload seeds only missing originals and never reclaims transferred cards, clears matches, or resets preferences.

Schema-3 registry backups validate against their own `versions` snapshot, which may predate newly approved references. The snapshot must be valid for the loaded V4 catalogue and pass ownership validation. Schema 2 has no ownership proofs and must still contain every currently approved reference. Import preserves current originals for models absent from a valid schema-3 snapshot, and supplementary collectibles absent from the backup, with their IDs, owners, activation state and transfer proofs. Their connected matches and collectible histories are retained together, including older cards in those matches. Ownership/event replay and archive validation run again over the composed state inside the import transaction; incompatible histories fail atomically. Match results are regenerated, never taken from imported counters. Default merge still rejects ownership/history conflicts. Explicitly confirmed full restore retains the native ability to roll back records present in the backup, except records protected by the newer-instance dependency set. Thus restoring an older backup cannot reclaim newer cards transferred to Tokyo or mint replacement originals for Paris. See the [Voloden revision](../revisions/2026-09-18-voloden/README.md) for the canonical-addition verification.

`db.catalogueChanges()` returns IDs present in the shared registry but absent from the loaded engine. `db.onCatalogueChange(listener)` subscribes to these changes (including the initial state) and returns an unsubscribe function. Old tabs keep the existing engine and active match, show the manual refresh action, and render all owned rows from the stored version profiles in the account dialog. Counts include pending versions. Import from a stale tab fails with `CATALOGUE_STALE` until it refreshes; this prevents a partial catalogue from overwriting newer records.

## Embedded Atelier

The top navigation includes `/jeu/#atelier`. Its full-width iframe `#atelier-frame` loads `/?embedded=1` once and remains mounted across tab switches. Active matches pause while outside the arena. The designer can send:

```js
window.parent.postMessage({ type: 'kalistar:card-published', id }, location.origin);
```

The game accepts messages only from this same-origin iframe. It displays the `Nouvelles cartes` refresh action instead of swapping the engine during a match. Clicking it saves the current state, waits for pending registry writes and reloads into Collection. The existing match is restored against the expanded catalogue; no reset occurs. Refresh is blocked during dice/trait resolution or when preference storage is unavailable.

## Smartphone Layout

`mobile.css` is loaded after the desktop styles. Below 700 CSS pixels (and for
short landscape windows up to 950 pixels), navigation moves to the bottom with
safe-area insets. Collection uses one existing parchment leaf, with two columns
and one or two rows calculated from the actual available height. Swipe and arrow
pagination, FF7 filtering and character grouping are preserved. The reader has
separate Card and Notebook views; its existing story, profile, career and copy
tabs remain available inside the manuscript margins.

The phone arena uses the full screen without the masthead, location heading or
bottom navigation; Collection and Decks remain accessible from the match menu.
The player uses a cross: P1 above, P2 left, P3 centre, P4 right, P5 below. The
opponent's cross is rotated 180 degrees. Score is in the upper-left free corner,
the explicit action in the lower-right corner, and compact dice between teams.
`duel-focus.js` fits an enlarged player challenger on the left with four allies
on the right; the opponent gets the inverse layout. It measures each formation
and reserves corner space before calculating the transforms. Card art retains
its aspect ratio, and element effects stay clipped to the formation area.
Since the 2026-09-21 visual adjustment, duel auras compensate for challenger
zoom on both desktop and mobile: fine outlines, smaller screen-sized particles,
reduced glow and slower movement. Enlarging a card no longer enlarges its magic.
Reserves offer legal deployment positions, inspection opens the full card, and
the menu includes opponent reserves, formation automation, journal, statistics,
imports and exports. Very short screens can scroll vertically; landscape does
not force a wide desktop battlefield. Rules, registry data and approved assets do not
change. The local server remains loopback-only; mobile layout does not expose the
atelier or its write endpoints to the network.

## Kalistel Shards

Added at the user's request on 2026-09-21. New matches have two shards per side,
shared by the team. `engine.js` pauses the first ATK die in phase `kalistel` when
charges remain. `acceptAttack()` commits the original die; `useKalistel()` spends
one charge, rerolls once and commits the second result, including special faces.
Discarded rolls have no effects and consume no attack buffs. Defense cannot
start while the decision is pending. The AI only evaluates public attack faces.
Legacy schema-6 states without the optional `kalistel` marker retain their rules;
`newGame(...,{kalistel:false})` is used solely by the legacy parity test.
Charges are derived from `kalistel.spent`, with at most two entries per side and
one per exchange. Decisions and charges persist through normal saves/imports.

The image-only button uses the diamond inside the existing RAINBOW artwork,
clipped in CSS without changing the source or tying the action to that element.
Two lights show remaining charges; title/ARIA provide the name and consequence.
Touch targets remain at least 44 pixels, glow respects reduced motion.
On activation, the actual crystal image breaks into eight textured facets and
fine luminous splinters for 900 ms before the die rerolls. The local canvas never
intercepts input and is removed on completion or cancellation. Reduced motion
skips flying fragments. This visual effect does not change RNG or charge rules.

```powershell
node V4/site/kalistel.test.cjs
node V4/site/kalistel-browser.test.cjs
node V4/site/kalistel-browser.test.cjs --motion
```

Tests cover effects, mandatory second result, charge limits, legacy saves,
invalid states, eight complete games, both local players, AI, reload, image-only
controls and five viewports. Browser tests use disposable profiles and the local
server, with screenshots in `site/verification/kalistel/`.

## Phone Preview

The header's smartphone toggle opens `?phone=razr50`: a same-origin preview host
with one game iframe, not a second running game. Initial entry persists the match
and waits for database writes. Subsequent toggles resize that same document.
The 412 x 1007 CSS-pixel viewport approximates the opened Razr 50's 1080 x 2640
screen ratio ([Motorola specifications](https://en-us.support.motorola.com/app/answers/detail/a_id/180539/p/7901%2C7906%2C)); the preview scales to fit its parent
window. This is a layout preview, not emulation of Android, DPR, touch hardware
or browser chrome. Existing loopback and same-origin restrictions remain intact.

On phones, the match report uses continuous vertical scrolling inside the active
tab. All award ties and all table rows remain available without pagination;
desktop keeps its paginated presentation. Updated at the user's request on
2026-09-21.

On phones, the primary combat action sits below the right-hand opponent die,
outside the dice console frame, in the free upper-right corner beside P1. The
reserve and grave counters occupy the matching upper-left corner. No extra row
is reserved: P1 stays at the top of the cross. During focused combat, enlarged
cards leave these upper corners clear.
Desktop placement is unchanged. Updated at the user's request on 2026-09-22.

## Verification

```powershell
node V4/atelier/game-catalog.test.cjs
node V4/site/browser.test.cjs
node V4/site/mobile-browser.test.cjs
node V4/site/phone-preview.test.cjs
node V4/site/career-statistics.test.cjs
node V4/site/catalogue-evolution.test.cjs
$env:KALISTAR_URL = 'http://127.0.0.1:4304'
node V4/site/browser.test.cjs
```

The Node tests cover approved-only filtering, printed metadata, crop dimensions, valid owned decks, publication validation, additive ownership, storage/import isolation, match restoration and five deterministic full-game comparisons against the unchanged V3 engine. The browser test uses a disposable browser profile, never writes the persisted server catalogue, and mocks one new publication response. Without `KALISTAR_URL` it serves read-only fixtures through Playwright routing; with it the existing parent server is exercised. Screenshots and the report are under `site/verification/`.

`catalogue-evolution.test.cjs` always uses an isolated browser context and routed local fixtures, never the parent server. It covers old backups restored after additions/transfers/activations, preservation of mixed-model final and released matches, counter replay, atomic rejection of forged histories, default-merge conflicts, pristine restores, stale import refusal and two simultaneous UI tabs with active-game preservation.

`mobile-browser.test.cjs` requires the running parent server (default port 4304).
It uses a disposable touch-enabled Chromium profile and never writes server card
data. It checks 320, 360, 390 and 430 pixel portrait widths, landscape, touch
swiping, reader tabs, legal reserve placement, mirrored cross positions, enlarged
challengers, absence of card/control overlap, nonblank
dice, an explicit next-turn action and modal navigation. Screenshots are under
`site/verification/mobile-cross/`. Set `KALISTAR_MOTION=full` to exercise animations too.

`phone-preview.test.cjs` also uses the running server and a disposable profile.
It checks the toggle, unchanged match state, a single game document, 412 x 1007
viewport dimensions, fit in a smaller host window, access to all mobile award
ties/table rows, and preserved desktop pagination. Synthetic report events stay
in the test DOM; screenshots are under `site/verification/razr50/`.

Career tables in the collection reader and card detail share
`KalistarCatalogue.careerStatistics()`. Each metric shows total / participated
completed matches alongside its exact total; partial records and unused reserves
stay excluded by the existing career aggregators. No stored counters change.
`career-statistics.test.cjs` checks rounding, zero matches, instance selection,
weighted aggregate means and responsive layouts using a read-only fixture adapter
in a disposable browser profile. Screenshots: `site/verification/career-statistics/`.

Elemental roll presentation (2026-09-22): choosing or changing a card immediately displays its existing elemental crystal in the roll well. Engaging the duel awakens both crystals with element-specific effects, strengthened and sped up by 25% on 2026-09-22. Each participant keeps its aura through its own wind-up, then releases a small colored burst together with the travelling jet. The spent crystal stays absent over a neutral pedestal, including after remount or reload; a new roll can summon it again. The other participant stays awake during the Kalistel decision. The painted gem stays fixed, without a flat rotation. One shared 30 fps waiting loop pauses in hidden tabs and is cancelled on navigation or remount. Reduced motion uses a static aura and skips the burst; NONE has no elemental effect. The main crystal is centered in its full well; the smaller Kalistel shard sits to the side with a preserved 44px touch target. The engine still chooses the face; light travels to the printed ATK/DEF value. Existing Kalistel charges and combat rules are preserved.

Focused verification: with the local server running, `node V4/site/elemental-roll.browser.test.cjs` checks all elements, persistent animation, cancellation, motion preferences, tab visibility, saved combat state and the smartphone layout in a disposable browser profile. Set `KALISTAR_URL` if the server is not on port 4304.

Phone reinforcements: tapping a vacant replaceable position opens the reserve filtered to compatible cards. The highlighted card image deploys directly into that position, without a separate position button; a distinct eye control preserves inspection. Opening the general reserve during replacement uses the current vacant position too. Position-based setup uses the same direct selection. This works for either human player and never exposes or controls the AI reserve. Desktop controls remain unchanged. `node V4/site/mobile-replacement.browser.test.cjs` checks both players, cancellation and deployment through real engine-generated replacement states.

Selected-card HUD (2026-09-22): phone match statistics reuse `match-metrics.js`
in icon/number docks beside the action and scoreboard, outside scaled cards.
They disappear when the selected unit leaves the board. NONE displays its
existing weapon silhouette instead of a crystal, without elemental effects;
the weapon also disappears after its roll. Duel text has no visible scrollbar,
but remains touch/keyboard-scrollable when needed. Run
`node V4/site/mobile-duel-stats.browser.test.cjs` for shared-stat accuracy,
large counters, five phone viewports, desktop preservation, weapon pixels and
keyboard access to long support results in a disposable profile.

Duel pacing (2026-09-22): an explicit engagement triggers a single 520ms
element-colored ignition around each crystal, then leaves its continuous aura
intact. A quick manual roll waits for ignition to finish before its wind-up.
Remounts do not replay ignition; reduced motion skips it and NONE stays neutral.
The AI previews its attacker after 450ms, the target 650ms later, and engages
after another 650ms. Automatic rolls wait 850ms; other AI decisions wait 650ms
(automatic clover defense keeps its 1000ms delay). Previews do not mutate the
engine or RNG. Existing modal, hidden-tab and navigation guards pause/resume
the sequence. The result still waits for the explicit next-turn action.
`node V4/site/ai-presentation.browser.test.cjs` checks the order, timing,
pauses, original engine choice/roll and desktop/phone presentation.
