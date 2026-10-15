# FF8 Set 01 - Production

Private, unofficial fan collaboration. Twelve HUMAIN profiles, twelve reserved
random V4 IDs, two ten-card presets; no deck-cap or engine-rule changes.
`set.json` is the gameplay and short French text specification. The parent's
`art-direction.json` owns the visual scenes; this pipeline never writes it,
the illustration sources, generation logs, provenance or faction artwork.

The [official Square Enix biographies](https://na.finalfantasy.com/titles/finalfantasy8)
inform identities and broad traits. The short stories are original fan
reinterpretations, not screenshot descriptions or new canonical claims.
The latest user scene revision supersedes the older scene notes: Squall rests his
sword on his shoulder; Zell smiles in a fighting stance; Linoa is among flowers
with Angelo; Irvine actively aims the Deling shot; Selphie laughs at school in
yellow with nunchakus at her hip and no spear. Edea retains her character with
the dress structure behind her against sky alone; Seifer takes a bad-boy stance.
Ward remains at Centra. Descriptions keep at least 190 French characters,
using the user's story anchors and original emotional narration. Set tests now
require at most four preview lines at the existing font size: Edea's native
five-line text overflowed after balancing, despite passing the shared preview.
Edea, Seifer, Kiros, Laguna and Ultimecia now target 190-205 characters; the first
six successfully rendered narratives stay unchanged. The font, template and
shared renderer's hard limit are not modified. Native verification remains required.
Values are an initial balance proposal, not a win-rate claim.

Selphie's requested nunchakus use the existing Fleau category from the game
matrix, including its own matchups and weapon index. Only component assembly
uses a `Fouet` donor. The set-local nunchaku replaces that complete weapon layer
at 89,1116 (96 x 95); no global bank or rules are changed. Its white silhouette
stays inside radius 39 around the painted enamel center (47.5,47), with an
alpha-weighted centroid within two pixels. Pixels outside the icon stay identical.
Rebuild only this local PNG with `node weapon-fleau.cjs`: it rasterizes the SVG
and reuses FF7's already-exported native enamel read-only, without Photoshop.

## Inputs

- `illustrations/<key>.png`: the twelve keys in `set.json`.
- `flag-FF8-packed.png`: exactly 98 x 223 pixels.
- `faction.json`: `packedGeometry` must be
  `{ "left": 672, "top": 829, "width": 98, "height": 223 }`.
- `../ff7-set-01/weapon-projectile.png`: reused read-only, never regenerated.
- `weapon-fleau.svg`, `weapon-fleau.png`, `weapon-fleau.cjs`: local override,
  all included in preparation hashes.
- `../../site/assets/arenes/ff8-balamb-garden.png` and
  `ff8-deling-parade.png`: landscape PNGs, required at publication preflight.

## Commands

From this directory, with the configured Node runtime:

```powershell
node build.cjs check
node build.cjs prepare
node build.cjs render
node build.cjs verify
node publish.cjs
```

`check` and the default `publish.cjs` invocation are read-only. `prepare`,
`render` and `verify` accept an optional character key, e.g.
`node build.cjs prepare squall`. All preparation inputs for that selection
must exist before writing. The same twelve IDs are reused, never redrawn.
`render` is the only build action that opens Photoshop; it runs sequentially
under the existing exclusive `render.lock`. No command publishes automatically.

Actual publication requires the separate explicit `--publish` flag. It validates
all twelve prepared cards and both presets, checks FF8/FF7/Chroma isolation,
then stages verified copies and atomically commits the additive catalogue.
Existing IDs, profiles, media and creation UUIDs must match on reruns. There is
no legacy conversion path. Failures never restore an old index or delete existing
cards. A partially installed unindexed directory can be recovered on a rerun.
Backups of the catalogue and staging are under `publication/<transaction>/`.

## Native Gates

Preparation freezes hashes of profiles, source illustrations, the flag,
projectile, composer, local component files, and reference/manifest snapshots.
Changing an input invalidates preparation; old per-card verification files are
renamed aside before rebuilding. Never copy an old proof onto a new render.

Verification requires editable native text, embedded smart-object components,
897 x 1497 pixels at 300 ppi, intact fixed-frame pixels, no severe component
differences, identical reopened PSD rendering, and the actual barcode checks.
Ward and Kiros additionally require pixel-identical approved NONE crystal and
branch components, with no magical halo or barrier. Their proof records the
approved component hashes, checked again by the publisher.

Tests use memory-backed filesystems. They do not render or publish real cards:

```powershell
node --test --test-isolation=none pipeline.test.cjs
node browser.test.cjs
```

The focused browser test intercepts all requests locally, builds a catalogue in
memory, and uses a fresh headless browser context. It never starts the Atelier
server or writes the real catalogue, browser profile, or card files. It checks
all twelve collection entries, Selphie's weapon, both ten-card presets, both
arenas on desktop/mobile, and reload restoration. Reports/screenshots are scoped
to `verification/browser/`. Missing FF8 card/arena/faction media use conspicuous
placeholder images listed in the report; this is functional QA, not art approval.
After media integration, `node browser.test.cjs --require-media` rejects any
remaining placeholders. No publication is necessary for either test mode.

## Integration Boundary

The shared catalogue now adds the two presets only when all twelve FF8
characters are available, and gates the two arenas on FF8 publication. FF7
preset/arena output bytes are regression-tested against their prior digest.
The existing 37 cards and their art are not rewritten, including Barret.

The FF8 banner is embedded in the cards and copied to
`V4/site/assets/factions/FF8.png` for collection/deck details. The collection
has a dedicated FF8 scope beside FF7; both scopes are browser-tested on desktop
and mobile. Existing player storage is never reset.

## Artwork Revisions

`art-direction.json` records the first prompts, not the final scene priority.
Apply `art-revisions-02.json`, then `art-revisions-03.json` for Squall and Zell.
Both use full-body poses. Irvine's active full-body aiming scene is described
by `art-irvine-final-angle.json`; its downward aim keeps the complete rifle
clear of the DEF column. All active images are `illustrations/<key>.png`.
`generation-provenance.json` identifies the selected built-in image_gen outputs.
`environment-art.json` records the banner and the two arena prompts.

`node make-preview.cjs` produces the twelve-card contact sheet from native PNGs.
After publication and server restart, `node live-check.cjs` checks the actual
HTTP catalogue and PNG hashes, a fresh isolated browser, and 24 complete games.

## Verification And Publication

Published on 2026-09-20 after native and visual checks. The playable catalogue
contains 49 cards: 27 protected references, 10 FF7 creations and 12 FF8 creations.
All twelve editable PSDs and PNGs are saved in `cards/<key>/` and published to
`V4/creations/<model-id>/`. No former card was replaced.

- `verification.json`: twelve native passes, fixed-frame differences zero,
  reopened PSD differences zero, rendered barcodes valid, NONE components intact.
- `verification/browser/report.json`: real media, no placeholders, desktop/mobile
  collection scopes, card readers, both presets and both arenas; no errors.
- `verification/live/report.json`: actual HTTP catalogue and twelve PNG hashes,
  fresh Paris 49 / Tokyo 0 accounts, 24 completed simulated matches; no errors.
- 47 focused tests pass across FF8, FF7 publication, catalogue and arena modules.
- `set-preview.jpg`: contact sheet of the final native cards.

These checks establish integration and consistency, not a measured competitive
win-rate balance. Final artistic preference remains with the user.
