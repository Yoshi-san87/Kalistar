# Arena equipment presentation, 4.6.0

This slice changes only dynamic presentation. Native character cards, their
printed statistics, illustrations, frame and base weapon glyph remain untouched.

## Native Anchors

`equipment-presentation.js` exports `layouts` in the 897 x 1497 native space:

| Slot | Native box (left, top, width, height) | Optical centre |
| --- | --- | --- |
| Weapon | 117, 221.5, 86, 86 | 160, 264.5 |
| Protection | 692, 227.5, 86, 86 | 735, 270.5 |
| Relic / historical match | 76, 1103, 122, 122 | 137, 1163.5 |

The protection centre comes from the actual approved native layer
`Calque 46 copie 3`, bounds [696, 231, 774, 310], recorded in
`template-stable/elements-01/balmhyr/render.json`. The attack target belongs to
the painted `Calque 43` area. Its visible cyan motif was optically measured on
the approved Balmhyr PNG: centroid (159.904, 264.602) in a 100 x 100 native ROI
starting at (110, 220), using cyan contrast over the red channel. Rounded native
coordinates, not a screenshot's screen pixels, define its anchor.

The two upper circles are deliberately not mirrored: their printed glyphs are
not at identical vertical coordinates. Their compact bonus tabs leave the D5
numbers unobstructed. Every overlay applies the shared card-media crop
(50, 50, 797, 1388), the actual contained image rectangle and local coordinates.
The challenger's scale is inherited once. ResizeObserver and image load events
recompute the geometry for focus, letterboxing and screen rotation.

## Contract

- `art(definition)` returns the same item cutout used inside its medallion.
- `mount` consumes `engine.equipmentViews(state, unit)`; historical engines and
  version-1 snapshots stay at the original lower medallion.
- `mountDetail` accepts an array of `{weapon, slot, active}`. False entries are
  omitted. Deck previews use `bonus:false` and keep the revolving rings.
- A single definition still means the legacy lower-medallion detail API.
- Weapon and protection activation follows actual captured `duel.equipment`
  entries, never an unaccepted Kalistel result or a DOM-computed bonus.
- `play` animates `formula.equipmentWeapon` / `equipmentProtection` only when
  their actual numerical contribution is positive. Failed numeric defense is
  included: this happens on the old visible DOM before the defeat animation.
- Block replaces the usual shield artwork only when a protection contributed.
  A Block without that contribution, and a Ward animation, remain unchanged.
- Conditional relic activation and support transfers keep their existing
  source/recipient rules. Instrument transfers add a few restrained notes.

The D6 marker and its equipment radar share a 3.6-second phase and direction.
The landing animation scales rather than rotating their common reference,
avoiding a visible phase reset between landing and the retained marker.

Activation is a 640 ms mechanical turn and unfolding tab, deactivation 420 ms.
An actual use adds a 520 ms item silhouette impulse and a 340 ms medallion pulse.
Reduced motion replaces movement with short fades/pulses and stops CSS rotation.
There is no equipment Canvas or perpetual JavaScript animation loop. Navigation,
pagehide, dialog close, capture and abort clean observers, listeners, animations
and transient nodes.

## Verification

Commands, run from the active checkout:

```text
node --test --test-isolation=none V4/site/equipment-presentation.test.cjs V4/site/equipment-slots-presentation.test.cjs
node V4/site/equipment-slots-presentation.browser.test.cjs
node V4/site/combat-effect-layout.browser.test.cjs
```

The new browser proof uses isolated IndexedDB profiles and genuine engine
fixtures with numeric ATK6 / DEF6. Its animation checks call the presentation
API on the before/after engine states; they are renderer integration proofs,
not statistical balance evidence. PC, Razr 412 x 1007 and reduced-motion
320 x 568 cover both teams, ordinary/focused cards, three-slot detail, resize,
active rotation, actual Block, failed protection, original shield and cleanup.
Pixel differences verify the used protection is really visible, not merely an
attached DOM node. Captures and results live in `qa/presentation/`.

The pre-existing combat layout regression separately exercises 14 outcomes,
both teams and six desktop/phone sizes, including magic's layering, death,
dodge, Reraise, Ward, supports, cancellation and rotation. Its new captures are
under `qa/combat-layout-regression/`; previous QA reports are not rewritten.
