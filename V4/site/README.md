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

### Collaboration Metadata (23 September 2026)

`collaborations.js` supplies the existing FF7/FF8/NieR mappings plus Replicant
to the collection, statistics, detail-media paths and catalogue arena gating.
A recognized faction takes priority over optional `profile.collaboration`;
character-ID suffixes never classify UI versions. Devola and Popola keep
`devola-nier` / `popola-nier` across Automata and Replicant while their factions
and synergy groups differ. Statistics filter versions before aggregation.
The collection binder groups browsing scopes as Kalistar, Final Fantasy (FF7 +
FF8) and NieR (NieR:Automata + Replicant). The faction selector remains
independent and keeps each exact faction available. Compact headers use a
second row so every universe scope remains accessible without scrolling.

`game-catalog.cjs` preserves validated optional collaboration metadata.
Its arena validator accepts cards as an optional fifth argument for version-
aware availability; the four-argument API remains compatible with historical
native preflight callers. `buildCatalog` always supplies the card list.
Home bonuses remain character-based across versions, unchanged.
Deck filters already use catalogue values. Atelier choices remain restricted
to its validated component bank: this change does not add an unrenderable
faction to the native designer or modify that bank.

Isolated coverage: `collaborations.test.cjs` and
`../atelier/collaboration-arenas.test.cjs`. The optional
`collaborations.browser.test.cjs` uses only a static fixture in a temporary
browser, no server, IndexedDB or publication. Header screenshots and geometry
proofs are under `verification/replicant-ui/`.

`boot.js` fetches the endpoint with `cache: 'no-store'` before loading any game-dependent module. Failed or historical catalogues fail closed with a retry action. Card media is exclusively the approved/published V4 PNG, not a historical slug. `card-media.js` validates 897 x 1497 pixels, crops `{left:50, top:50, width:797, height:1388}` on image load, and caches WebP blob URLs in memory. The illustration view is a center crop of that same printed artwork. No original asset is written and no giant media directory is copied.

Storage is isolated: IndexedDB `kalistar-v4-cards`, preferences `kalistar.v4.*`, deck library `kalistar.v4.deckLibrary.<user>`, instance IDs `K4-<cardId>-00n`, edition `V4`. V3 imports are rejected. Game schema 6 retains the V3 mechanics and additionally requires edition V4. Initial approved and newly published originals go to Paris once each, Tokyo starts empty. Reload seeds only missing originals and never reclaims transferred cards, clears matches, or resets preferences.

Schema-3 registry backups validate against their own `versions` snapshot, which may predate newly approved references. The snapshot must be valid for the loaded V4 catalogue and pass ownership validation. Schema 2 has no ownership proofs and must still contain every currently approved reference. Import preserves current originals for models absent from a valid schema-3 snapshot, and supplementary collectibles absent from the backup, with their IDs, owners, activation state and transfer proofs. Their connected matches and collectible histories are retained together, including older cards in those matches. Ownership/event replay and archive validation run again over the composed state inside the import transaction; incompatible histories fail atomically. Match results are regenerated, never taken from imported counters. Default merge still rejects ownership/history conflicts. Explicitly confirmed full restore retains the native ability to roll back records present in the backup, except records protected by the newer-instance dependency set. Thus restoring an older backup cannot reclaim newer cards transferred to Tokyo or mint replacement originals for Paris. See the [Voloden revision](../revisions/2026-09-18-voloden/README.md) for the canonical-addition verification.

`db.catalogueChanges()` returns IDs present in the shared registry but absent from the loaded engine. `db.onCatalogueChange(listener)` subscribes to these changes (including the initial state) and returns an unsubscribe function. Old tabs keep the existing engine and active match, show the manual refresh action, and render all owned rows from the stored version profiles in the account dialog. Counts include pending versions. Import from a stale tab fails with `CATALOGUE_STALE` until it refreshes; this prevents a partial catalogue from overwriting newer records.

## White Weapon Pictograms (4 October 2026)

`base-weapons.js` adds crisp, optically centred white vector silhouettes to
screen cards through the existing `card-media.js` crop. These cached images
embed the raster card and a vector motif, keeping its outline sharp at zoom.
Illustration-only views and PNG print downloads remain original. Native PSDs,
reference locks, gameplay and equipped-weapon overlays are unchanged.
See [sources, geometry and checks](../revisions/2026-10-04-white-weapons/README.md).
The [4.5.5 refinement](../revisions/2026-10-04-white-weapons-refinement/README.md)
supplies the current four requested dagger/gun/scythe/axe silhouettes and the
latest geometry proof; the other sixteen vectors are byte-identical.

## Opening Lineup: Persistent Clues (4 October 2026)

`lineup-intro.js` presents each starting pair without changing combat statistics.
Each native weapon, crystal and faction is shown for an 850 ms beat, including
a 160 ms movement into its persistent top-left, top-centre or top-right dock.
The same image and label remain visible through subsequent clues and the card
flip. They fade when the card returns to its board slot. Clues are siblings of
the rotating card, never children of its back face. Total normal duration is
27.65 seconds: each pair includes a 380 ms pre-flip beat and a 1.2 second hold
after revealing the card. Reduced motion preserves the same reading times,
without travel or rotation (21.25 seconds). These durations exclude image loading and
the captain draw which follows the fifth pair.

The responsive dock reserves space above each card. Resize settles clue motion
at the CSS anchor, and skip/exit cancels all animations and pending waits.
Captain identity, equipment, native identity and formation order are unchanged.
The persistent-clue presentation is documented in the
[original validation and captures](../revisions/2026-10-04-persistent-lineup-clues/README.md).

## Captain Dice and ABBA (5 October 2026)

New UI matches opt into `turnOrder: 'ABBA'`. After all ten starters arrive,
a 1.8 second Tip Off popup announces the draw over the complete formation.
Then the real two captains move to the centre for an independent D6 draw. Highest
opens, ties reroll, then both return to their measured board slots. Skipping
the ceremony still resolves the engine draw. Reload or reentry while pending
resumes only the captain sequence; saved dice are never rerolled.
Saved compositions retain their selected captain. UI presets now explicitly
nominate their P1 starter through `Team.fromPreset`, with ordinary captain
links and no automatic equipment. Legacy list callers remain unchanged.

`turn-order.js` owns the pure declarative order and separate seeded random
stream. `engine.js` owns the `initiative` phase, validates persisted records
and advances only on `next()`. The compact `turn-timeline.css` rail displays
the current side and four forthcoming actions. On phones, only these five
equal-width steps are visible, filling the 34 px rail; the current-side phrase
is retained for screen readers only. Phone score/menu offsets reserve its space.
Legacy games without the marker remain ABAB. Combat RNG, captain
bonuses, equipment, deck legality and AI selection policies are unchanged.

See [save contract and rules](../docs/INITIATIVE_ABBA.md) and
[release verification](../releases/2026-10-05-captains-abba/README.md).
See also the [slower pacing and Tip Off validation](../releases/2026-10-05-tipoff-pace/README.md).

## Collection Editions (23 September 2026)

The notebook uses each card's printed title for edition buttons. The current
edition has a dark ink background, a check mark and `aria-pressed`. Story text
keeps its existing font sizes, with stronger ink and a small left inset.
The same dark ink and semibold lettering now cover the notebook header, profile,
career and copy details, without light text shadows or larger type. Magic ATK
and barrier DEF keep distinct brown and teal ink. `reader-legibility.test.cjs`
checks type sizes, contrast, overflow and access to all three tabs at seven sizes.

Book captions distinguish owned copies of the visible edition from the number
of editions in the filtered character group. Clicking the stacked-card counter
cycles that group's editions without opening the notebook or changing pages.
The rear card moves forward in 640 ms; reduced-motion preferences skip the
animation. Copy counts, favorite actions and the notebook target follow the
visible card. Selection is kept in memory, not written to ownership records.
An interrupted animation is cancelled on repaint, resize or navigation.

Short phone leaves keep the whole manuscript scrollable without a visible
scrollbar; landscape book pages retain a minimum readable card height.
`node V4/site/collection-versions.test.cjs` checks seven viewport sizes, named
selection, copy counts, keyboard focus, filtering, ownership, rapid clicks and
animation cancellation using a disposable browser profile and the local server.

## Collection Filters (2 October 2026)

Only `Mes cartes` and `Catalogue` remain as scope tabs. A native `Collection`
dropdown groups Kalistar, Final Fantasy, NieR, Metal Gear, Resident Evil,
One Piece and The Witcher; it is available in the header and filter dialog.
The two controls share one filter value. Choices come from collections present
in the loaded catalogue, with version counts for the selected ownership scope.
The collection filter intersects faction, crystal, race, position, weapon,
search and favorite filters. Switching ownership scopes preserves it; reset
clears it, and choosing a collection restarts pagination. No registry is edited.
Phone controls retain 44px targets and native select behavior. The isolated
`collaborations.browser.test.cjs` checks combined filters, scope changes, reset,
pagination, empty states and ten viewport sizes without personal browser data.

## Equipped Weapons (2 October 2026)

`/jeu/#weapons` adds a native Armes view: two real conditional weapons,
profile-local equipment, compatible carriers and atomic replacement/move
confirmation. The five phone navigation targets are Collection, Decks, Armes,
Arene and Plus; Story, Statistics and the local Atelier remain in Plus.

The same extracted copper medallion is used in the weapon detail and on active
arena cards. Position follows the native optical anchor, the card-media crop
and the actual image dimensions; inactive cards are untouched. Deck and notebook
indicators link to the weapon detail. Match equipment is snapshotted, not read
live from the profile. Numeric bonuses are engine modifiers, with named recap
rows and journal entries. Existing base-family matchups remain unchanged.

See [equipment rules, schemas and adding a third weapon](../docs/ARMES_EQUIPEES.md).
`equipment.test.cjs` covers pure rules, full matches and native/build assets;
`weapons.browser.test.cjs` covers desktop, Razr 50, reduced motion, persistence,
legacy upgrades, real duels and exact geometry in an isolated QA database.
Proofs and screenshots are under `verification/weapons/`.

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
pagination, exact faction filtering and character grouping are preserved. The
reader has separate Card and Notebook views; its existing story, profile,
career and copy tabs remain available inside the manuscript margins.

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

## Story Reader

The main navigation opens `Story`, a long-form reader for the revised
`Kalistar - Le Réveil` manuscript. `story-content.json` is the static, UTF-8
reading copy (prologue plus seventeen chapters), loaded independently of the game
catalogue and local Atelier API. The desktop reader fits the approved open-book
grimoire image to the available viewport, with the contents on the left page and
the manuscript on the right. Tablet and phone layouts use one readable leaf and
a chapter picker. Text size, paper/night mode, chapter and scroll position are
saved per local profile. Only this explicitly curated JSON file is added to the
static publication; other JSON files remain excluded. `story-reader.browser.test.cjs`
covers reading controls, saved progress, desktop book geometry, phone layouts
and horizontal overflow.

The completed novelization contains 80,144 words in 744 paragraphs, with a
prologue and seventeen chapters. Source priorities, chapter counts and final
verification are recorded in `../docs/HISTOIRE_80K_PLAN.md`. Chapter I illustrates
Baba at the tavern, chapter IV Kaylis during the escape, chapter V Balmhyr with
Belzebuth, and chapter VIII Lanio playing Astraball. `story-content.test.cjs`
checks the 80,000-word target, section order, duplicate paragraphs and these semantic anchors so edits
cannot silently move an illustration to a different scene.

The desktop spread uses the background's native 1672 x 941 ratio and fits the
stage's actual inner dimensions. Both pages keep text clear of the ornaments;
the background is decoded before first paint. The browser test checks these
safe areas at seven sizes, alongside reading progress, controls and scene links.

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
ties/table rows, and shared trophies without award pagination. Synthetic report events stay
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

Card-bound reactions (2026-09-24): `combat-effects.js` sizes each shield, impact,
emblem, Reraise wave and dodge afterimage from the actual `.slot-card` border box,
in local slot coordinates. The slot's focus transform applies once to both card
and effect. A per-effect-run ResizeObserver keeps those bounds current during
screen rotation/resizing and disconnects on completion or cancellation. Do not
restore the old fixed top/bottom offsets: mobile labels and hidden buff rows
have different dimensions from desktop. Combat rules and timings are unchanged.
`node V4/site/combat-effect-layout.browser.test.cjs` checks both teams, 14 outcome
presentations (including stops, death, Reraise and supports), six viewport sizes,
active rotation, cleanup and reduced motion with non-persisted visual fixtures.
Screenshots: `verification/combat-effect-layout/`.

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

Statistics and Golden trophies (2026-09-22): `#statistics` is the full-page
sortable ledger (`statistics.js`, `statistics.css`). It groups by character or
card version, filters search/element/collaboration/period/minimum appearances,
and switches totals / one-decimal weighted means. Owned-collection scope uses
the existing ownership-aware career; all-teams scope uses only this local
profile's archived matches, not another user's matches. Unused reserves,
unfinished and partial histories are excluded. Zero-appearance means are
unavailable, not zero. CSV exports all filtered rows in current order and column
group, with UTF-8 BOM, semicolon delimiters and formula-injection protection.
The phone table keeps identity and rank pinned while its columns scroll.

`trophies.js` is the shared rule source: Golden Crystal = existing rating,
Golden Killer = kills, Golden Blocker = holds, Golden Clover = newly granted
clovers, Golden Heart = newly granted Reraise hearts (not consumed hearts).
Every tied positive leader across both teams receives the full award except
MVP, which is unique. Rating ties break by kills, holds, support, reraises,
debuff, then lexical match uid. No RNG or team preference is involved. No
positive score means no winner. Provisional reports never grant awards.
Completed full-history result rows store derived `trophies` and `trophyVersion`;
old rows are backfilled additively on open. Imports rebuild them from validated
games instead of trusting imported counters. Repeated saves stay idempotent.
Career cabinets follow existing collectible ownership/instance selection.
The match report shows all tied identities under one shared trophy, including
on phones. Engine rules, RNG, schema 6 and approved artwork remain unchanged.
Portraits fill the image area with top-centered cropping. Desktop MVP overlays
its trophy at bottom center (25% of image height). Other trophies occupy a
fixed 25% column beside the names, including mobile MVP. Winner lists expand
without nested scrolling; smaller screens scroll the report without a visible
scrollbar. Trophy rule version 2 backfills the unique MVP in old result rows.

Generated artwork originals and exact built-in image-generation prompts:
`../donnees/trophees-2026-09-22/`. The five alpha-preserving 512px WebP assets
under `assets/trophies/` total approximately 280 KiB. No image generation runs
when a match completes. The build automatically includes these local assets.

Focused checks: `node V4/site/statistics.test.cjs`,
`node V4/site/statistics.browser.test.cjs`,
`node V4/site/career-statistics.test.cjs`, and
`node V4/site/phone-preview.test.cjs`. The browser checks use isolated databases,
six engine-completed matches, migration/forged-import/idempotence assertions,
filters/sorts/CSV, nine ledger sizes (up to 3440px wide) and eight report sizes (including
2041 x 1383). Screenshots: `verification/statistics/`.

Kill medals (2026-09-23): `trophies.js` defines numbered tiers 2 through 10
(Double, Triple, Quadra, Penta, Hexa, Hepta, Octo, Nona, Deca). Definitive kills
by one match instance accumulate throughout the match; there is no time window
or reset on another unit's turn. Reraise saves do not count. These honours have
no gameplay effect. `kill-medals.css` draws crisp geometric metal/enamel badges,
with a shimmering rainbow Deca and reduced-motion support.

`animatedRoll()` compares the verified summaries before/after the committed
defense. Only one new resolved kill crossing a tier triggers the nonblocking
1.8-second announcement; restoring or repainting never triggers it. Rendering
another view cancels the effect. The existing kill number is unchanged: a small
medal sits before the skull only in sufficiently wide PC/mobile stat strips.
Match awards and the lineup sheet prefix each qualifying identity with its
current medal; partial histories omit them.

Career aggregation awards only the highest tier per completed participating
result. No additional persistence field or trophy migration is required: medal
totals are derived by `T.add()` from validated result kills, including older
full-history games. Imports still rebuild results from the archived game, not
caller-supplied counters. The notebook uses the five full Golden trophy names
and shows only earned medal tiers with their occurrence counts below them.

Checks: `node V4/site/kill-medals.test.cjs` and
`node V4/site/kill-medals.browser.test.cjs` (local server and disposable Chrome).
Coverage includes all thresholds, no Reraise/repaint/partial-history awards,
best-tier career totals, live defense, reload, idempotent saves, forged imports,
instance ownership and PC/phone layouts with motion enabled and reduced.
Screenshots: `verification/kill-medals/`.

## Collection and deck comfort (2026-09-24)

The collection filter dialog becomes a bottom sheet on phones. Crystal buttons
and P1-P5 toggles use the existing filter pipeline and respect collection,
catalogue and collaboration scopes. The page number opens a thumbnail index
derived from the measured page capacity, current filters and version groups.
Both dialogs use native modal focus, Escape/backdrop dismissal, reduced-motion
support and hidden-scrollbar touch scrolling. Existing book and version-swap
animations remain unchanged.

The notebook's Fiche lists saved decks for the active local profile containing
the same character. Exact versions and other versions are distinguished. Links
open the deck builder without discarding its other in-memory working drafts;
the matching slot is selected when it is still present in that working draft.

Replacing an occupied slot, by button or drag, opens an outgoing/incoming
comparison before committing. It displays all six ATK/DEF faces, effect assets,
magical faces, positions, weapon, gained/lost coverage and faction/race potential
changes for both cards' groups. Confirmation rechecks availability and slot
identity. Empty-slot recruitment remains direct. No combat or deck rules change.

Undo/redo covers card recruitment, replacement, removal and slot exchanges.
Each draft/deck has its own bounded 40-edit session history. Names, imports and
library deletion are not undoable; imports and external draft replacement reset
history. Restoring cards rechecks ownership and character/Rainbow limits. Failed
onDraft writes roll back the edit. Saved decks still require explicit saving.

Phone recruitment presents larger card portraits beside a persistent target
slot and previous/next slot controls. The Recruter tab can expand recruitment to
the whole stage. Screens at most 900px wide and 700px high use separate
composition/recruitment views to keep controls from overlapping.

On 2026-09-25, the candidate list became a continuous horizontal rail across
desktop and phone. The full filtered catalogue stays available without page
changes; touch swipes, horizontal trackpads, vertical mouse wheels, keyboard
arrows and visible step buttons all move the rail. The first ten illustrations
load eagerly for a complete initial view; later cards load as needed.
Demo selection, load, single-deck import and export moved into the Escouade
header. Removing the separate toolbar gives 32px back to the recruitment tray,
which uses taller portrait previews. Deck validation, saved library imports and
exports, and ownership rules are unchanged.

Checks: `node V4/site/collection-deck-ux.browser.test.cjs`,
`node V4/site/collection-versions.test.cjs`,
`node V4/site/collaborations.test.cjs` and `node V4/site/browser.test.cjs`.
The new browser suite uses disposable desktop/touch contexts and an in-memory
failure fixture, checks six viewport sizes, profile isolation, saved/working
draft navigation, undo branches, drag confirmation and ownership revalidation.
Screenshots: `verification/collection-deck-ux/`. No personal browser is modified.

## Installable App and Version 4.2 (2026-10-01)

Story pages now place approved card illustrations at explicit narrative anchors.
Each image is captioned in the grimoire layout and opens its matching full card;
the layout remains responsive on desktop and phone.

`manifest.webmanifest` is scoped relative to `/jeu/`, so the installed app opens
correctly both on the local server and under the `/Kalistar/` GitHub Pages path.
It uses standalone display mode; there is deliberately no service worker, so a
deployment cannot leave stale game files in an app cache. Chromium browsers show
an install action when their install prompt is available. From the browser menu,
the user can also install the page as an app.

The site masthead displays the application version `4.2`; the V4 edition and
saved-data schema remain unchanged. The release commit is tagged `v4.2`.

Opening Arena or confirming a new match does not request browser fullscreen.
The installed app already opens without browser chrome. The explicit in-game
fullscreen control remains available when playing in a regular browser; leaving
Arena through another view exits that manually requested mode. The deploy
browser test checks the visible version, both non-immersive entry paths, manual
fullscreen entry and exit, app scope and the regular phone layout.

## Combat immersion (2026-10-02)

`arena-ambience.js` owns the terrain-only presentation layer and the shared
30-fps clock used by both ambience and `duel-focus.js` auras. The existing dice
renderer retains its own lifecycle. Background art is unchanged. Two or three
motions are selected from arena element metadata, with a small centralized
override table for named non-elemental/crossover places. Ambient particles are
masked out of the actual card, reserve and console bounds. The canvas, vignette
and arrival tint are noninteractive and sit behind gameplay at z-index -1.

The printed-crystal anchor is shared by every V4 card: native centre (448,1195)
in the 897x1497 template, minus the (50,50) media crop, normalized to 797x1388.
`KalistarFocus.engage()` starts a single 800-ms local halo and elemental motifs,
followed by two short border sweeps. NONE has no elemental activation. This is
only triggered by a successful user/AI lock, never by restore or repaint. An
immediately clicked roll waits for the remaining activation time; dice values
and engine transitions are still computed by the original commands.

`combat-effects.js` reuses its existing outcome detection. Magic arrival adds a
220-ms low-opacity terrain tint; significant numeric impacts (ATK >=250) and
eliminations add a 140-ms, maximum 1.5-px terrain shake. These thresholds control
presentation only. Existing projectile, card hit, shield, dodge, Reraise and
death fade remain intact. Resolution returns the terrain to its calm mood.

One active fighter gets a slightly stronger aura and vignette. Imminent victory
is checked by removing that lone fighter on a disposable engine clone and
asking the existing `next()` replacement/end resolver. No elimination objective
or end condition is duplicated, and neither live state nor RNG is modified.

Mobile ambient counts are halved (maximum seven); DPR is capped at 1.25 for
mobile ambience, 1.5 for desktop ambience, and 2 for mobile auras. Hidden pages
stop the shared RAF. Reduced motion renders static auras/vignette with no
ambient particles, shake or ignition delay. Resize cancels terrain reactions
and activation, while the existing card-effect surfaces continue to fit after
rotation. Capture/unmount, view/profile changes, new matches, match end and
pagehide clean up subscriptions, observers, finite waits and owned nodes.

Checks: `node V4/site/arena-ambience.test.cjs`,
`node V4/site/arena-immersion.browser.test.cjs` plus the existing
`ai-presentation.browser.test.cjs`, `combat-effect-layout.browser.test.cjs`,
`elemental-roll.browser.test.cjs`, `phone-preview.test.cjs`, catalogue parity
and Kalistel suites. The elemental-roll UI test now opens the existing advanced
options before editing its deterministic seed. All browser contexts are
disposable; no personal browser storage is touched. Evidence and protected-file
hashes: `verification/arena-immersion/`.
