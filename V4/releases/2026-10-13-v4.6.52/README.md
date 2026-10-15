# Kalistar 4.6.52 - Sculpted pedestals and mechanical flip

Collection captions now use a generated sculpted copper pedestal, with genuine
transparent corners and fixed end caps. The nameplate, current faction crest,
copy count, favorite and position emblems remain independent live elements.
Native character cards, equipment, combat rules and saves are unchanged.

Multi-version characters have a distinct copper mechanical flip control:
rotating Lucide glyph, engraved version count, press feedback and keyboard
focus. Its rotation follows the existing finite version transition. No idle
loop, canvas or timer is added; one-version cards remain noninteractive.
Reduced Motion removes rotation; forced colors restore a native outline.

The existing 64px caption height and sleeve seal are retained. Container
queries handle compact cards and a full-width name below 100px. The bitmap
is shared across three CSS slices, preserving sculpted end caps as the center
expands. No asset is regenerated per card or faction.

Original PNG, exact built-in image_gen prompt and lossless WebP provenance:
[artwork revision](../../revisions/2026-10-13-collection-sculpted/README.md).
All nontransparent RGB pixels and alpha are unchanged by WebP encoding.
The runtime asset is 865612 bytes, shared and cached across all pedestals.

## Verification

The staged sources are exported to a private disposable snapshot, isolated
from concurrent work. Existing publication tests and build run there, with
local LFS objects checked by SHA-256. Its private Git metadata allows the
existing LFS clone-policy test to run without reconfiguring the user checkout.

Proof reports and retained browser screenshots are under `qa/`.
Staging is compared to the verified snapshot, including LFS size/hash checks.
Deployment policy, reference locks and player data are not modified.

Validated: 1163 tests in 80 publication commands; Pages build with 363 cards,
1360 files / 874 MiB. Collection: seven viewports, genuine bitmap alpha,
contrast, long names, versions, focus restoration, Razr taps, Reduced Motion
and forced colors. Filters: ten sizes. Navigation: 46 checks / ten sizes.
Pages: desktop/phone, reader, PNG download, decks, arena and saved-match flow.
The browser-only alpha assertion follows the preserved painted center (253,
over 98% opacity), rather than assuming solid alpha255; nameplate contrast is
tested independently. Runtime sources and build were unchanged by that check.

Visual proofs: [desktop](qa/collection/collection-1440x1000.png),
[Razr](qa/collection/collection-412x1007.png),
[flip detail](qa/collection/flip-razr-card.png).
