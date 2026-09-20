# Kalistar V4 Game Integration

`/jeu/` is the playable V3 application migrated to the approved V4 catalogue, with unchanged game mechanics. Do not serve a static V3 `data.js` fallback.

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

## Verification

```powershell
node V4/atelier/game-catalog.test.cjs
node V4/site/browser.test.cjs
node V4/site/catalogue-evolution.test.cjs
$env:KALISTAR_URL = 'http://127.0.0.1:4304'
node V4/site/browser.test.cjs
```

The Node tests cover approved-only filtering, printed metadata, crop dimensions, valid owned decks, publication validation, additive ownership, storage/import isolation, match restoration and five deterministic full-game comparisons against the unchanged V3 engine. The browser test uses a disposable browser profile, never writes the persisted server catalogue, and mocks one new publication response. Without `KALISTAR_URL` it serves read-only fixtures through Playwright routing; with it the existing parent server is exercised. Screenshots and the report are under `site/verification/`.

`catalogue-evolution.test.cjs` always uses an isolated browser context and routed local fixtures, never the parent server. It covers old backups restored after additions/transfers/activations, preservation of mixed-model final and released matches, counter replay, atomic rejection of forged histories, default-merge conflicts, pristine restores, stale import refusal and two simultaneous UI tabs with active-game preservation.
