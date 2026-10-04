# White Base Weapon Redraw

User-approved scope: sharper **white base weapon pictograms**, optical centering,
and the existing card format. Not the illustrated, equippable arsenal.

## Presentation-Only Revision

The site draws the current published card and replaces only its small inner
weapon enamel with the new white vector motif. The native 897 x 1497 template,
the site crop (50, 50, 797, 1388), and the centre (137, 1163.5) are unchanged.
The original copper rim, stats, typography and illustration remain in place.
The old Instrument edge includes white pixels at radius 48.7; the site clears
the enamel through radius 49 before rendering the new motif.

**Printed PNGs, editable PSDs, designer banks, layouts, reference locks and
gameplay data are not revised.** Downloads still provide the original print
exports. This is a screen-quality improvement, not a native card publication.

## Sources And Reproduction

- `sources.cjs`: 19 original white vector redraws retaining the established
  family silhouettes. Instrument remains a guitar; Projectile remains chakrams.
- Fleau reuses the established Delapouite flail vector, with new optical
  placement. [Source](https://game-icons.net/1x1/delapouite/flail.html),
  [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
  Original: `../2026-10-03-flail-glyph/assets/flail-delapouite.svg`.
- `build.cjs`: renders vectors for alpha/visible-mass measurements, calibrates
  each separately, and exports 20 transparent SVGs to
  `../../site/assets/base-weapons/`. No raster upscaling of historical JPEGs.
- The empty enamel uses the audited native extraction, with exact source hash
  recorded in `geometry.json`.

Run `node V4/revisions/2026-10-04-white-weapons/build.cjs`.
Every full-alpha contour fits inside radius 44, at least 3.5 native pixels
inside the printed inner circle. Every optical error is below 0.8 native pixel.
`comparison.png`: old at left, redraw at right, at different demonstration sizes.
`qa/all-families-medallions.png` shows actual game cards.

## Runtime

`base-weapons.js` is DOM presentation only. The existing card-media cache uses
a self-contained SVG image with the normal raster card and the small vector
motif; no wrapper or absolutely positioned HTML badge is added to the card.
This follows existing image scaling, focus, letterboxing and board zoom.
Illustration-only views bypass the change. A glyph fetch failure retains a
normal raster card. Artwork and silhouette fetches are shared and cached;
no timer, animation loop or persistent canvas is added.

The same vectors serve the weapon advantage Codex and crystal-less fighters.
Animated equipped weapons still overlay the base medallion with their existing
artwork and effects.

## Checks

- `base-weapons.test.cjs`: 20 matrix IDs, geometry, exact SVG hashes and isolation.
- `base-weapons.browser.test.cjs`: 20 real catalogue families, image decoding,
  desktop/Razr 50 collection and real detail dialogs, no page errors or horizontal
  overflow, and graceful missing-vector fallback.
- `weapons.browser.test.cjs`: existing equipment and combat coverage, normal
  and challenger cards, inspection, resize, board zoom and reduced motion.
- Native reference and designer-bank integrity verified without changing locks.
