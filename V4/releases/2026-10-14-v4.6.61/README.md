# Kalistar 4.6.61 - Kaylis and Edris-7F

Coordinated after 4.6.58 (Map), 4.6.59 (Collection) and 4.6.60
(Kaylis equipment). This release adds only the two approved character cards,
their illustration gallery, native sources, verification and publication files.

## Cards

- Kaylis 49902701: black cape with red embroidery, horizontally mirrored
  illustration, straight white rapier and no hanging blue sash. RAINBOW,
  HUMAIN / Z13, P2-P3, short sword. Stable identity `kaylis` preserves deck
  uniqueness and the eligibility rules for Promesse and Eclipse.
- Edris-7F 49902702: android spy entering a Chroma home, previous short haircut.
  ELECTRO, ANDROID / Chroma, P2-P3, short sword.
- Catalogue: 377 to 379 playable cards. No old profile or native card changed.
- The five other new-direction illustrations remain proposals only.
- No mechanics, save schema, equipment slot or Story changes.

## Publication Budget

The four V3 intermediate subject/wand atlases are not runtime textures:
`factions/atlas_v2_subject.png`, `factions/atlas_v2_wand.png`,
`effets/icones_atlas_v2_subject.png`, `effets/icones_atlas_v2_wand.png`.
The deployment file list now excludes exactly these four authoring outputs.
Their source files remain intact. Individual faction/effect textures, cards,
the world map and other assets continue to be published unchanged.
The 900 MiB publication guard and all reference locks remain unchanged.

## Evidence

Local release checks passed: 161 targeted tests; 379 cards / 1379 deployed
files / 878.7629 MiB. Both card readers at 1440, 412 and 320 pixels, desktop
and Razr arena, old-backup migration (377 to 379), and restored match passed.
Native images and desktop/mobile browser captures were visually inspected.

- Native proofs in `V4/expansions/2026-10-14-kaylis-edris/`: exact fixed-frame
  pixels, reopened PSD rendering, decoded barcodes and typography.
- 24 printed faces, support, barriers, forty complete matches, restores,
  unique-character deck restriction and both rapier compatibilities tested.
- `qa/publication.json` records targeted integration, catalogue, build,
  equipment, persistence and formation tests on the exact staged snapshot,
  not a mixed working checkout. The full Pages CI also runs on publication.
- `qa/game/` retains desktop, Razr 50 and narrow-phone card readers, arena,
  reload and old-backup migration proofs from that build.
- `verify-stage.cjs` verifies staged assets against the tested snapshot before
  commit. `public-smoke.cjs` checks the public version, catalogue and PNGs.
- Desktop title, desktop/mobile badges and release assertions advance together.

Local card gallery:
`V4/expansions/2026-10-14-kaylis-edris/index.html`.

Post-push network checks are saved under ignored `V4/deploy/verification/`;
they do not require a second same-version commit.
