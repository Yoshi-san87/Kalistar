# Collection Museum Plinth - 4.6.53

The user requests a museum-style separation: the character remains in its
transparent sleeve, resting above an independent pedestal. The old sleeve
extended around both objects, and the nameplate covered part of the copper rim.

## Geometry

The sleeve now uses its original 4px inset on all four card edges. Its bottom
is card.bottom+4, equal to the pedestal's top, not the pedestal's bottom.
The existing gap, card width calculation and 64px caption height are unchanged.

The exact generated `collection-pedestal-v2.webp` from 4.6.52 is reused.
No generation, raster edit, masking or native card change. CSS nine-slicing
keeps the copper borders thin while stretching only the interior. Native cuts:
x0/350/1822/2172, y147/235/435/517. Three columns and three rows reuse one
cached bitmap; each cell has explicit proportional background coordinates.
Default top/bottom rims are 10px, leaving 44px for the name and controls.
The ultra-compact layout uses 6px rims and three short rows within the same64px.

The name is centered in a dedicated row, between the side crests/controls,
with no shadowed plaque overlapping the upper beam. Long names wrap inside
the row. Existing favorites, copy counts, positions and mechanical version
control retain their actions and stable IDs. No new timer, listener or canvas.
Reduced Motion and forced colors keep their existing explicit behavior.

## Verification

Tests now measure name bounds against the interior painted face and verify
that no glass edge encloses the pedestal. Browser coverage includes real
Iliane, Momo and the longest catalogue names in compact multi-card rows,
all pages at five desktop/phone/landscape sizes, plus the seven-format
functional Collection suite. Fixtures are disposable browser contexts with
no player storage callbacks. The production wrapper is retained so short
desktop layouts use the same minimum-height behavior as the real site.

Release reports and retained captures:
[4.6.53](../../releases/2026-10-13-v4.6.53/README.md).
Exploratory captures in this folder are local only and not publication proofs.
