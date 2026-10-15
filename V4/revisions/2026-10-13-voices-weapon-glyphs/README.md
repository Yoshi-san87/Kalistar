# Native White Weapons - Fourteen New Voices

User request, 13 October 2026: use the redesigned white weapon icons, especially
Projectile, on the new cards. The screen had the current vectors, but the native
PNG downloads and editable PSDs still used the historical designer bank.

This additive revision updates only the weapon enamel in models 49902601 through
49902614. Kessaro and Ithrek now have the upright, hollow throwing star with two
trails from `site/assets/base-weapons/09.svg` (revision 3). All other selected
cards use their existing family vector from that same validated bank.

No illustration, gameplay profile, family, name, frame, text, effect or stat
changes. Existing source cards, proofs and reference locks remain untouched.
Original outputs are preserved in `originals/`; new outputs are in `cards/` and
are published to `creations/` with a `nativeRevision` pointing to this proof.

## Production

`scripts/stable/white-weapon-component.cjs` is a reusable native adapter. It
uses `base-weapons.js` for family IDs and native anchor, reads the actual SVG
and approved enamel, and keeps the old enamel alpha contour exactly. The
Instrument layer is 96 x 97 at y1115; its glyph is still 96 x 95 at y1116.
This handles the known one-pixel Instrument fringe without resizing the symbol.

For future native production, call `component(family, oldInput, layerLayout)`
on the ARME layer returned by the designer, before writing the composition.
Keep returned SVG/enamel hashes in the batch's frozen inputs. Do not regenerate
or alter the protected designer bank to hide the historical asset difference.
Rasterization is at native size; Photoshop embeds the result as a smart object.
The site retains its vector rendering for screen zoom. No new icon is invented.

The Fleau vector retains the existing Delapouite/CC BY 3.0 attribution documented
in `../2026-10-04-white-weapons/README.md`.

## Verification

Pixel comparison allows changes only inside the 96 x 97 weapon region. Text
layer states, whole profiles and illustrations must remain identical. Native
component identity, Photoshop re-open, barcode decoding and typography use the
existing validators. The comparison sheet shows before left / after right in
the selected card order. No old report or hash is rewritten.

The integration test also checks all 20 current vector contours and optical
centres, alpha conservation at both native heights and active publication hashes.

```powershell
node V4/revisions/2026-10-13-voices-weapon-glyphs/revise.cjs prepare
node V4/revisions/2026-10-13-voices-weapon-glyphs/render-local.cjs
node V4/revisions/2026-10-13-voices-weapon-glyphs/revise.cjs verify
node V4/revisions/2026-10-13-voices-weapon-glyphs/revise.cjs publish
node --test V4/revisions/2026-10-13-voices-weapon-glyphs/integration.test.cjs
```

Prepare/render/publish are guarded production operations, not rerunnable test
fixtures. Use a new revision for subsequent changes; preserve this provenance.

The first driver used the reserved Photoshop global `batch` name. Its frozen
source and failure log are retained. `replace-local.jsx` uses a distinct name;
`render-driver.json` records the corrected driver's exact source hashes.
