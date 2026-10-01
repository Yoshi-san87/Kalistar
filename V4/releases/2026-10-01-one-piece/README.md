# One Piece and Skull Face - 1 October 2026

Scope: eleven One Piece fan-crossover cards, one faction banner, the SHARKAN
race component and one Skull Face likeness/race revision. The two Chopper
versions share their character identity. No new arenas or combat mechanics.

Production sources and exact prompts:

- `../../expansions/2026-10-01-one-piece/`: profiles, art prompts and native PSD proofs.
- `../../collaborations/one-piece-assets-01/`: faction/race art and calibration.
- `../../revisions/2026-10-01-skull-face/`: official Konami references, edit prompt,
  original backup, restricted native changes and verification.
- Selected illustrations: `../../Illustrations/OP_*_01.png` and
  `../../Illustrations/Skull_Face_MGS5_Fidelity_20261001.png`.

Illustrations use the built-in imagegen tool. Native card borders are composed
from existing Photoshop components, not generated. Codex visual checks are
recorded separately from user approval. Existing protected hashes stay intact.

Parent baseline is captured before publication. Native publication is followed
by audit.cjs verify, static building, local-browser.cjs and public-check.cjs.
Browser review uses isolated storage on desktop and phone for all twelve
affected cards. Public checks compare downloaded PNGs, banner and catalogue.

The personal remote is https://github.com/Yoshi-san87/Kalistar.git.

## Release Checks

Local publication is complete: 174 cards, 28 unchanged arenas. Audit passed for
all previous cards and protected references. Skull Face changes only its art
and race; all eleven One Piece cards retain editable native PSD sources.
Final production files are `../../creations/49800101/` through
`../../creations/49800111/`, plus revised `../../creations/49600118/`.

The parent visually reviewed all twelve final cards (qa/native-1.png and
qa/native-2.png), including the natural-face revisions of Luffy, Zoro and Robin.
This is Codex visual review, not a claim of subsequent human approval.
The 46 combined portable tests pass, as do the Kalistel regression with eight
full matches and the separate native proofs. Each PSD reopens to the same PNG;
fixed-component differences are zero and every barcode reads correctly.

Browser checks pass for all twelve affected cards at 1440x1000 and 390x844:
24 views, no browser/HTTP errors, exact downloaded native PNG hashes and no
horizontal overflow. The One Piece scope groups ten characters and eleven
versions. These checks used isolated browser storage, not the user's saves.
The playable build contains 460 assets and is approximately 442 MiB.

The checkout already contained unfinished deployment cache changes in
`V4/deploy/build.cjs` and `V4/site/boot.js` before this lot. They are not part of
the card release. After committing this lot, `build-committed-runtime.cjs`
loads those two runtime files from that commit in memory, then uses the normal
builder and current card assets. This produces the same deploy output as CI
without reverting, staging or overwriting the user's unfinished sources.
