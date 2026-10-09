# Batman, X-Men and Geralt V2

User-approved crossover card production, 9 October 2026. Fan collaborations,
not official collaborations. No character illustration was regenerated.

## Sources

- Robin, Wolverine, Cyclope, Tornade and Geralt V2: supplied PNGs, retained
  byte-for-byte in `art/` and in each card's `illustration.png`.
- Professeur X, Jean Grey, Iceberg and Gambit: approved illustrations from
  `V4/propositions/2026-10-07-xmen/`. Jean retains the approved green/gold outfit.
- X-Men banner: the previously approved blue pennant with a golden X on a red
  circle, recovered from generated image
  `exec-72f3b866-b2ff-4980-83cb-8a1502541c7a.png`. Its exact recovered source is
  `art/xmen-banner-approved.png`; only the established native pennant mask and
  dimensions are applied. The later `art/xmen-banner-source.png` proposal is
  discarded and never referenced by the renderer or site.
- Batman retains the existing black/gold native pennant. This release changes
  the collection label, not that banner's artwork.

## Characters And Roles

| Card | Kalistel | Role | Existing effects |
| --- | --- | --- | --- |
| Robin | AERO | P2 | Physical support and dodge |
| Professeur X | LUXO | P5 | Mana, guard, Retry |
| Jean Grey | PYRO | P4 | Mana and magical attacks |
| Iceberg | CRYO | P1 | Guard, barriers, magical ice |
| Gambit | ELECTRO | P3 | Retry, dodge, charged attacks |
| Wolverine | HEMATO | P2 | One death face, physical attacks |
| Cyclope | LUXO | P4 | Physical support and magical attacks |
| Tornade | ELECTRO | P4 | Mana, dodge, magical attacks |
| Geralt V2 | AERO | P3 | Retry, dodge, one magical face |

The seven X-Men use HUMAIN. No new race, status, skill or combat rule is added.
Geralt V2 shares `geralt-witcher` with V1; duplicate-character deck exclusion
continues to apply. All native numeric faces stay within their role bounds.

## Existing Batman Cards

Six NONE profiles receive an elemental revision:
Double-Face HEMATO, Sphinx LUXO, Catwoman AERO, Pingouin CRYO, Batman NECRO,
Joker PYRO. Poison Ivy, Epouvantail, Mr Freeze and Ra's al Ghul already have a
Kalistel. With Robin, all eleven collaboration cards now have one.

Only `element`, `color`, `hue` and `sentry` change on those six profiles.
Artwork, numbers, effects, magical faces, barriers, identity and position lists
remain identical. Native pixel differences must stay inside the element pieces
and the job/race color regions. Prior production files are preserved in
`originals/`; reference locks and historical proof reports are not rewritten.

`Gotham` remains the stable key in printed profiles and historical archives.
`factions.canonical` exposes `Batman` in the current site; asset routing still
uses `Gotham.png`. The old and new labels resolve to the same collection.

## Reproducible Production

`assets.cjs prepare` freezes the recovered banner. `build.cjs prepare` freezes
inputs and backups before Photoshop composition. `build.cjs render` uses the
existing native renderer, editable text and smart objects. `build.cjs verify`
checks frame pixels, PSD reopen identity, barcode, text and revision scope.
`build.cjs publish` installs all files before updating the catalogue, with a
hash-checked rollback journal. Frozen preparation must never be rerun in place.

Validation entry points:

```text
node --test V4/expansions/2026-10-09-crossover-crystals/integration.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-09-crossover-crystals/browser.test.cjs
```

Integration covers 90 ATK and 90 DEF faces, real elemental calculations,
60 complete seeded matches, recurring restores, shared Geralt identity and
legacy archives. Browser QA covers all fifteen cards at 1440, 412 and 320 px,
two arena duels, actual IndexedDB backup scenarios and the nine-card upgrade.
`browser-proof/` holds local captures; release documentation records completed
validation and publication separately.
