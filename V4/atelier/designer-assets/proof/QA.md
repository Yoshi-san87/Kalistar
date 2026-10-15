# Asset Pack Visual QA

The final Ruby and Rikka recompositions/difference images and the thirteen-element
and sixty-effect contact sheets were visually inspected on 2026-09-18.
No beige outer margin, displaced sprite, clipped effect, or faction overflow
remains. Rikka's original dodge/retry optical placement is preserved. RAINBOW
uses its native prismatic branch adjustment. All sixty effect contours pass
their recorded fit checks.

## Source Comparison

This extraction is not claimed to be byte-identical to the flattened approved
PSDs. Native identity/numeric text and the barcode region are excluded from
these comparisons. Exact measurements are in `native-comparison.json`.

| Metric | Ruby | Rikka |
| --- | ---: | ---: |
| Mean absolute channel difference (0..255) | 0.047183 | 0.032327 |
| Pixels with a channel difference above 1 | 1674 | 1240 |
| Maximum channel difference | 6 | 8 |
| Changed fixed opaque pixels | 4 | 5 |
| Maximum fixed opaque difference | 1 | 1 |

The fixed opaque residual is one quantization level, not a geometric change.
Larger residuals are confined to translucent rasterization: recovered artwork
matte (maximum 3/4), position support shadows (4/3), and faction cloth/contact
shadows (6/8). The latter are consistent with flattening Photoshop's native
shadow/blending stack into reusable straight-alpha PNGs. ATK overlays differ
by at most 2; weapons, races, branches, crystals and Rikka's native effect
placements differ by at most 1. There is no channel difference above 8.

Publication enforces both global and region-specific limits, including at most
five changed fixed opaque pixels with a maximum difference of one. These source
comparison tolerances do not relax the parent's separate native reconstruction
test: importing the pack must still preserve its fixed opaque component pixels
exactly and satisfy the parent's two-channel-level composite tolerance.

## Handoff

All 26 protected input PSD SHA-256 values match the approved reference lock.
The last native extraction completed with zero Photoshop documents open and
released `Local\KalistarV4AtelierRender`. No further Photoshop calls are needed
to publish or consume this pack. No approved source was saved or altered.

The final pack has 418 manifest descriptors, 13 element families, 60 effect/slot
placements, and identity banks limited to the 26 approved references. Consumer
sprites use tight `packed/` crops with exact global integer coordinates; native
uncropped inputs and black/white frame diagnostics are retained separately.
