# Collection - Seated Glass Display

The user wants the plastic/glass edge to sit inside the pedestal corners,
like a museum display held by its base, not a sleeve aligned with its outer edge.

## Geometry

All Collection card width formulas now reserve the same 24px horizontal gutter.
The plinth is card.width+24px, within its existing pocket. The glass remains
card.width+8px: it sits 8px inside each copper side support. The height limit
and native card aspect ratio still participate in card sizing.

The caption keeps its reserved 64px height and card.bottom+4px position.
Only the painted plinth rises 8px, overlapping the glass joint by 8px and
the very bottom of the printed card by 4px. Its bottom is unchanged. This
does not cover the card lore or increase the space consumed by the caption.
The copper layer is in front of the stack, even while a version is cycling.
Its artwork remains non-interactive, so it cannot capture card taps.

The exact approved `collection-pedestal-v2.webp` is reused, with the same
nine-slice coordinates. No generated image, raster edit, native PNG/PSD,
profile, engine, storage migration or gameplay change is needed.
The title, favorite, counts, positions and version control stay in their
existing rows. The user's follow-up removes the separate rectangular title
plaque: the name is directly on the painted material with its existing small
letter shadow, no DOM border, background or box shadow. Reduced Motion and
forced colors keep their existing behavior.

## Checks

The Collection browser suite measures the horizontal inset and vertical
overlap across seven formats, then repeats the seam checks for every page
of the real-name compact fixtures on desktop, Razr, narrow phones and landscape.
It also checks layer order during a real animated version change and verifies
touch actions, focus, paging, reading, Story navigation and reload.

Publication and retained browser proofs are recorded in the owning release.
