# Personalized weapon rings, captain crown and combat medals

Local revision, 2026-10-03. No gameplay or native character-card changes.

## Generated visuals

Two transparent rings were generated with the built-in ImageGen tool:

- Balmhyr: carved stone, engraved copper and restrained amber light.
- Momo: engraved copper and pale blue electrical filaments.

The original PNGs are preserved in `sources/`. Exact prompts and tool provenance
are in `prompts.json`; export hashes and geometry are in `media-provenance.json`.
The existing axe and flute illustrations are reused, not generated again.

Production files under `V4/site/assets/equipment/`:

| Visual | Ring | Weapon body |
| --- | --- | --- |
| Balmhyr | `stone-copper-ring-v1.webp` | `fallen-king-axe-v3.webp` |
| Momo | `electro-copper-ring-v1.webp` | `little-joys-flute-v3.webp` |

Each export is 488 x 488, four times the native 122 px medallion. The optical
center is (244, 242), matching the existing native center (61, 60.5) within
the overlay tile. The transparent opening determines the generated ring's
center. The complete visible contour is fitted inside a 240 px radius.
The body stays inside the minimum opening radius, with breathing room.
Only almost invisible source alpha values of 1-4 are cleared during export;
original source alpha is preserved in the PNGs.

`build-media.cjs` reproduces the four lossless WebPs. `media.test.cjs` checks
source/export hashes, opening transparency, corners, rotational containment,
optical alignment and the shared presentation mapping.

## Integration

`equipment-presentation.js` selects a presentation skin using the validated
`visual` key. Arsenal, team composition and Arena use the same markup/assets.
The weapon body stays still while the independent ring and radar rotate.
The rotation origin follows the native half-pixel optical offset. Existing
activation, deactivation, bonus-use and reduced-motion behavior is retained.

Weapon definitions, equipment restrictions, bonuses, save migrations and match
snapshots are unchanged. Old snapshots keep their stored definitions and gain
the current visual skin without rewriting storage. Old art exports and the
native printed medallion remain untouched. A future additional visual needs
an explicit skin entry alongside its existing validated weapon definition.

The Arena captain crown now uses its actual image aspect ratio and is inset
inside the bottom-left corner. It has no badge background or border and follows
the card's existing focus/zoom transformation.

Combat kills below the first medal threshold remain numeric. From two kills,
the highest earned medal replaces the number to the right of the skull. The
exact count remains available in the tooltip and accessible label, including
counts above ten. Partial match history does not invent medals. Existing
career, report and milestone calculations are unchanged. Narrow desktop card
strips use their real container width to fit the medal; phone strips keep their
separate compact layout.

## Verification

Passed on this revision:

- 33 Node tests: generated media, match metrics, kill medals, equipment and team
  composition, including legacy saves and completed/reloaded matches.
- `weapons.browser.test.cjs`: built Pages Arsenal, equip/transfer/remove/reload,
  both active weapons in real combat, native/cropped card alignment, continuous
  rotation, desktop, Razr 50, compact phone, reduced motion and cleanup.
- `team-composition.browser.test.cjs`: built Pages composition and completed
  match; full crown containment on normal/focused cards at 1920, 412 and 320 px.
- `kill-medals.browser.test.cjs`: real Double-Kill, all nine medal tiers in the
  live combat strip at 1440, 412 and 320 px; no duplicated counter, no overflow,
  accessible count, reload, archived results, reports and career cabinets.
- Pages build: 193 cards, 499 assets. The committed-runtime build helper keeps
  unrelated unfinished Story edits outside the deployment verification.

Captures are in `qa/weapons/`, `qa/team/` and `qa/medals/`. Representative files:

- `qa/weapons/desktop-arsenal.png`
- `qa/weapons/razr50-arsenal.png`
- `qa/weapons/desktop-axe-challenger.png`
- `qa/team/arena-captain-desktop.png`
- `qa/team/arena-captain-phone.png`
- `qa/medals/combat-medal-2-1440.png`
- `qa/medals/combat-medal-10-412.png`

The browser tests use isolated QA contexts. They do not access the user's browser
profile or personal IndexedDB. This revision has not been committed or pushed.
