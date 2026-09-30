# Resident Evil banners 01

Scope: nine faction banners and site collection integration only. The separate
expansion expects **25 cards**. No cards or catalogue entries are published here.

## Integration Contract

- Factions: exact IDs RE1 through RE9; retain episode factions on card profiles.
- Full banners: `flag-RE1.png` through `flag-RE9.png`.
- Card components: `flag-RE1-packed.png` through `flag-RE9-packed.png`.
- Packed geometry: left 672, top 829, width 98, height 223.
- Manifest: `factions.json`, including source/full/packed SHA-256 hashes.
- Adapter: `assets.cjs` exports `verify()`, `inputs()`, `banner(layers,spec)`
  and `FLAG`. Call verify before composing. banner mutates only the faction layer.
- Site copies: `V4/site/assets/factions/RE1.png` through `RE9.png`.
- Site routing: `V4/site/collaborations.js`.
- Shared collection scope: `resident-evil` in `V4/site/collection-binder.js`.
  Counts come from supplied cards; no production total is hard-coded.

## Sources And Review

Individual built-in imagegen calls, not a nine-asset collage. Exact prompts and
generated locations: requests.json and RE1.provenance.json through
RE9.provenance.json. Original generated sources are copied locally.
RE7-revision.json records a subtitle correction; source-RE7.png remains preserved,
source-RE7-v2.png is selected. preview.png was inspected at card-component scale.

Official references:
- https://game.capcom.com/residentevil/en/lineup.html
- https://game.capcom.com/residentevil/en/news-1834.html
- https://www.playstation.com/en-us/games/resident-evil-requiem/

Capcom search-index contents were accessible, but direct requests returned 403.
The PlayStation Requiem page was read successfully. These are generated textile
adaptations of game identities, not official logo files or licensed collaboration
assets. No official font files were extracted. RE1's 1 and Requiem's IX are
Kalistar chapter markers, not claims about original cover lettering. RE2/3/4
use modern cover identities; RE5/6 use their recognizable organic numerals,
RE7 uses VII/biohazard, RE8 uses VILLAGE/VIII, RE9 uses requiem.
Codex/parent visual QA reviewed the nine-banner preview on 2026-10-01 and found
recognizable per-game covers and numerals. Human approval is still pending.
The exact full and packed alpha
matches ensure no banner pixels extend beyond the validated right rim.

The existing MGS preparation procedure is retained: texture resized to Chroma
geometry, clipped with the approved FF8 full alpha, then extracted to the exact
FF8 packed alpha. No protected template, manifest or reference hash is rewritten.

## Verification

```powershell
node --test --test-isolation=none V4/site/resident-evil.test.cjs V4/site/metal-gear.test.cjs V4/collaborations/resident-evil-banners-01/assets.test.cjs
```

Eight tests passed on 2026-10-01; 941 protected reference hashes also verified.
Default process-isolated test execution hit
Windows spawn EPERM; the documented in-process runner succeeds. Tests cover
all nine alpha masks and hashes, site byte copies, adapter layer isolation,
one dynamic collection scope (25- and 3-card fixtures), faction routing and MGS
regression. No browser interaction or native Photoshop rendering was run by
this banner-only task; expansion integration must perform its normal browser
and native composition QA.
