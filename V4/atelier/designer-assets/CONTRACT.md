# Designer asset contract, version 1

`manifest.json` is the consumer entry point. Paths are relative to this directory.
Canvas: 897 x 1497 pixels, sRGB, native Photoshop resolution 300 ppi.
Every image descriptor has `{file,left,top,width,height}`. Composite at integer
`left,top` with normal source-over, without resizing. Transparent pixels are real
alpha, not a checkerboard. Additional provenance fields may be ignored.

IMPORTANT: after the frame, compose ATK slots D1 through D6, then DEF slots
D6 through D1. The native PSD uses opposite stacking orders for the two tracks.
Do not interleave both tracks in a shared descending loop.

- `frame`: default non-Electro foreground. `frame.electro` is the Electro version.
  `black` and `white` are native renders with only the artwork replaced. The
  foreground alpha is recovered from their difference. Rails, fixed ATK/DEF
  lettering, decorations and physical circle rims remain in this frame.
- `elements[ELEMENT]`: `branch`, `crystal`, `sourceCard`.
- `stats.atk[ELEMENT][die]`: `physical` (coloured native gold), `magic` (gold plus
  halo), `halo`. These are overlays on the circle rims already in the frame.
- `stats.def[die]`: `plain` (documented native circle, already in frame),
  `barrier` (overlay), `effectBackground` where needed. Do not draw `plain`
  twice. Select `barrier` for barrier-number slots.
- `effects.atk[id][die]` and `effects.def[id][die]`: optical-fitted motifs.
  ATK ids: retry,mana,guard,revive,buff_atk,death.
  DEF ids: retry,dodge,shield_physical,shield_magic.
- `position.supports[slot]`, `position.numerals[slot][value]`: separate support
  and native numeral raster (1..5); clone native text for editable PSD output.
- `weapons[value]`, `races[value]`, `factions[value]`: validated reference-bank
  choices only. Factions include their cloth and cast/contact shadows.
- `textStyles`: native source PSD, layer name/id, text geometry and font data.
- `zOrder`: explicit bottom-to-top assembly. `sources` documents native inputs.

The pack never changes approved PSDs or reference locks. New effect placements
not already present in an approved card are marked calibrated derivatives.
`status: ready` is only written after extraction and verification.
