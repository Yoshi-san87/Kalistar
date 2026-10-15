# Kalistar 4.5.6

Personal publication: Yoshi-san87/Kalistar, main, annotated tag v4.5.6.

The opening lineup now retains native weapon, crystal and faction clues in a
row above each card. Images and names accumulate from left to right and stay
visible throughout the reveal. Each clue beat gains 100 ms, including its
short docking movement, for a 17-second complete presentation.

Responsive anchors reserve room on desktop, phone and landscape. Reduced
motion, skip, menu exit and reload preserve the existing lifecycle. No changes
to card images, protected references, gameplay, equipment, AI or saved matches.

Implementation and visual evidence:
`../../revisions/2026-10-04-persistent-lineup-clues/`.

Publication validation: isolated workflow tests and Pages build, opening
presentation browser suite, and general Pages desktop/mobile browser suite.
Recorded workflow results: `workflow-results.json`.
All 131 workflow tests and the static build passed in an isolated snapshot
(tree `679df2206fa953f81881a00ce82b032d801af140`). The opening browser suite
passed all listed sizes and lifecycle checks. The general Pages browser suite
passed with 193 cards and no HTTP or script errors.
After deployment, `public-check.cjs` verifies the live commit, version labels
and exact presentation asset hashes against the public release manifest.
