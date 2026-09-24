# Independent Native PNG Review

Reviewed 2026-09-25 JST, final snapshot 2026-09-24T15:51:46.742Z.
Read-only source review. No Photoshop, production code, profile or art changes.
Only these disposable QA visualizations and review records were written.

## Findings

No remaining observed visual defect on the nine current native PNGs.

Confirmed the reported Ornelle defect on the first native export: crystal tip
overlapped the first description line near "la berge" in the five-line layout.
The native owner replaced that PNG during review. Opened the new full-size PNG:
four lines now fit, with visible clearance below the crystal and above the
lower frame. No further correction requested. The earlier snapshot and lower
panel proof are retained as `snapshot-before-ornelle-fix.json` and
`lower-panels-before-ornelle-fix.png`.

## Observed Coverage

All nine PNGs were opened individually at native resolution (897 x 1497).
The 224 px-wide sheet was inspected for game-size numbers, effects, names,
positions and action silhouettes. Lower panels were inspected for typography,
description bounds and overlap. Source hashes are recorded in `snapshot.json`.

| Card | Observed result |
| --- | --- |
| Kaylis | No additional defect; weapon line/tip and positions visible; consistent with parent's existing approval. |
| Baptiste | Violin/bow action legible; face, identity text and four-line description unobstructed. |
| Sapphire | Blue muscular Sirena, aggressive smile and claws clearly visible; title and description fit. |
| Aelis | Approved prayer scene retained; positions 3/5 and support heart visible; text fits. |
| Keryn | Rope/docking action and face legible; partial utility staff occlusion already explicitly accepted by parent. |
| Brindor | Central hammer head/shaft visible, jar and protective action readable; four-line description fits. |
| Asteran | Continuous sword and point fully visible inward of flag; title and description fit. |
| Ornelle | Sceptre head/hand and roots visible; corrected four-line description no longer overlaps crystal. |
| Tazrik | Three copper projectiles, catching gesture and balance readable; title and description fit. |

Names, numeric stats, icons and positions remain distinguishable at 224 px.
Narrative descriptions are naturally very small there; reviewed for actual
reading at native size, not treated as a new layout defect or a DA revision.

## Presence And Limits

Initial inventory had five available PNGs. The first complete snapshot then
contained all nine; none are absent in the final snapshot. Ornelle was briefly
absent during native replacement, then present and re-opened before conclusion.
The eight other source hashes did not change during the correction check.

This is visual PNG QA only, not a Photoshop layer, barcode decoding, gameplay
simulation or publication certification. No unobserved future render is covered.
No cosmetic redesign or additional generative iteration is requested.
