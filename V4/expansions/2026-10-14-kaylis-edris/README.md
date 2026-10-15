# Kaylis and Edris-7F

Two user-approved native V4 cards, 14 October 2026. Other illustrations in the
six-new-directions gallery remain proposals and are not playable cards.

## Artwork

- Kaylis: black cape with red embroidery, white rapier straight, horizontal
  mirror, hanging blue sash removed. Final source: `07-kaylis-04.png`.
- Edris-7F: previous short black haircut with silver forelock, android spy
  entering a private home in Chroma. Final source: `06-edris-7f-02.png`.
- Prompts and generated-image provenance are preserved in
  `../../propositions/2026-10-14-six-new-directions/`.
- Kaylis draws on chapter XIII, paragraph index 64, leaving Madania's house.
  The cape, hairstyle and second rapier are user-requested visual additions,
  not retroactive changes to the Story text.

## Gameplay

| ID | Character | Race / faction | Crystal | Positions | Identity |
| --- | --- | --- | --- | --- | --- |
| 49902701 | Kaylis | HUMAIN / Z13 | RAINBOW | P2, P3 | kaylis |
| 49902702 | Edris-7F | ANDROID / Chroma | ELECTRO | P2, P3 | edris-7f-kalistar |

Both use the current white Epée courte glyph and existing game mechanics.
Arrays in `set.json` run D6 to D1. Kaylis favors attack (268 maximum), with
physical support on ATK D2 and dodge on DEF D4. Edris favors controlled
infiltration: 228 ATK / 216 DEF maxima, retry support on ATK D2, dodge DEF D3.
Each has two magical attack faces and one defensive barrier. No new skills,
automatic equipment or guaranteed kills are introduced.

Kaylis retains her stable character identity: old and new versions cannot
share a deck. The one-Rainbow-per-deck rule is unchanged. Promesse and Eclipse
remain eligible on her short-sword versions only; two illustrated swords do
not grant two equipment slots or implicit bonuses.

## Production and Verification

`before.json` freezes production inputs and the existing catalogue before
rendering. Never refresh it to accept a discrepancy. `weapon-components.json`
records the current vector/enamel hashes. Native PSDs preserve editable text
and smart objects, 897 x 1497 at 300 dpi.

Stages: `node build.cjs prepare`, guarded `render`, `verify`, guarded `publish`.
Prepare/render must not overwrite their existing frozen outputs. Publication
uses the established transactional publisher and immutable verification proofs.

Validation commands from the repository root:

```sh
node V4/expansions/2026-10-14-kaylis-edris/build.cjs verify
node --test V4/expansions/2026-10-14-kaylis-edris/integration.test.cjs
node V4/deploy/build.cjs
node V4/expansions/2026-10-14-kaylis-edris/browser.test.cjs
```

Native checks: zero fixed-frame pixel differences, zero reopened PSD rendering
differences, barcode readings, text bounds, face values and optical positioning.
Engine tests cover all 24 printed faces, temporary support, barriers, event
logs, state restoration, forty complete matches and rapier restrictions.
Browser checks cover 1440px desktop, 412px Razr 50 and 320px narrow screens,
Collection readers, arena and saved-match reload, plus old-backup migration.
Screenshots and results are retained under `qa/`.

Open `index.html` for both native cards and links to illustrations and PSDs.
