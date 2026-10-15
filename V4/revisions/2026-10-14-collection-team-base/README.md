# Collection - Team Identity Plinth

The user asks to remove the little circular faction holder and reuse its
flag as a team-style background mark: zoomed, partly cropped, slightly offset
and faint. Positions move to the left, the name gets the central space,
and favorite moves to the card's bottom-right corner.

## Rendering

The existing copper bitmap, nine-slicing, 64px caption height and 8px seated
glass joint are unchanged. The current version's actual faction asset appears
in a pointer-transparent clipped layer at 13% opacity (9% for unowned cards).
The flag is enlarged, offset and rotated slightly; no raster source is edited.
An accessible faction label and the plinth tooltip retain its identity.

On regular plinths, position emblems occupy the left column and the name
uses the full height of the center. Copy/version controls share the right.
At 150px content width or less, the name uses the full upper row, with positions
left, copies center and versions right below it. The smallest plinths retain
their compact type and controls. No separate name plaque is reintroduced.

Favorite is an independent button next to the card-reader button, never
nested inside it. It keeps the same action, current card ID, pressed state,
accessible label and save callback. The visible glyph stays in the bottom
corner; coarse pointers have a 44px target. Card focus, version-change focus,
Reduced Motion, forced colors and event cleanup keep their existing patterns.

No new timer, idle animation, canvas, game mechanic, save schema, card profile,
native PNG/PSD, reference lock or publication setting is introduced.
Other local work, including the Map 1.30 proposal, is not part of this lot.

## Verification

Source tests cover faction selection and one independent favorite per grouped
character. Browser checks cover seven formats, clipped watermark, worst-case
white-flag contrast, left-aligned positions, direct name lettering, corner
favorite hit testing, short-screen scrolling, touch, focus, filter and reload.
Version switching is checked against the current stable card ID and faction.
Real long names are exercised in compact rows on five screen formats.
