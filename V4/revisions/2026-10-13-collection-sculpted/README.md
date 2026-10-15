# Sculpted Collection Pedestal - 4.6.52

User-requested replacement of the flat Collection caption, plus a distinct
version-flip control. No character PNG, PSD, template, registry, game rule or
player storage is changed.

## Artwork

Generated with the built-in image_gen tool (not CLI), transparent background.
Exact submitted prompt: [prompt-v2.txt](art/prompt-v2.txt).
Original generated PNG: [pedestal-source-v2.png](art/pedestal-source-v2.png).
Runtime asset: [collection-pedestal-v2.webp](../../site/assets/ui/collection-pedestal-v2.webp).
The PNG is preserved byte-for-byte. WebP uses lossless encoding, no resizing,
cropping or masking. Decoded alpha and every nontransparent RGB pixel match
the PNG exactly; WebP discards unused RGB in fully transparent pixels.
Hashes, size and crop measurements: [provenance.json](art/provenance.json).

## Integration

The decorative layer is aria-hidden and pointer-events:none. Three background
slices use the same bitmap: native 350px end caps, flexible 1472px center.
Visible vertical range is y147..516 inclusive (370px); full file is 2172x724.
CSS background-size Y=724/370 and position Y=147/(724-370). End caps retain
fixed screen widths (26/22/18px); only the empty center expands. This is a
rendering crop, not a change to the source artwork.

The existing 64px caption and sleeve seal are retained. Container queries are
relative to the caption, not the viewport. Below 100px the name uses the full
width above compact controls, rather than breaking into one letter per row.
Actual faction flags stay separate, as do the familiar favorite star, copy
count, position emblems and new copper version-flip mechanism.

Flip keeps the existing action/IDs, 640ms transition, keyboard focus restoration
and animation cleanup. aria-busy drives a finite 180-degree mechanical turn.
No new timer, idle loop or permanent canvas. Reduced Motion skips rotation;
forced colors suppress the artwork and restore native borders.

## Verification

Release tests, build and retained screenshots are in
[4.6.52](../../releases/2026-10-13-v4.6.52/README.md).
Local exploratory images are not publication proofs and are not staged.
