# Character profiles and Chroma rooftops - 1 October 2026

User request: positional values are ceilings and references, not identical
mandatory statistics. Forty-eight profiles now have deliberately authored
strengths and weaknesses: 11 One Piece, 25 Resident Evil and 12 recent Metal
Gear cards. Positions, abilities, identities, elements and artwork stay fixed.
There is no new combat mechanic or claim of empirically proven win-rate balance.

Current production sources:

- `../../revisions/2026-10-01-stat-personality/plan.json`: exact before/after
  values and per-character rationale. Original expansion sets remain history.
- `../../revisions/2026-10-01-kaine-framing/`: reversible +12% framing with the
  complete source artwork embedded; no regeneration or gameplay change.
- `../../expansions/2026-10-01-rikka-rooftops/`: additive Rikka variant, sharing
  characterId `rikka` with the approved original. Profile pose and a restrained
  futuristic cyberpunk Chroma, not a medieval city. No new arena.
- Selected generated illustration:
  `../../Illustrations/Rikka_La_Ville_Sous_Ses_Pas_04.png`.

Rikka uses built-in image_gen, not the CLI/API fallback. The final prompt is
`../../expansions/2026-10-01-rikka-rooftops/prompt-final.json`; earlier prompts
record the user's pose, city and rooftop corrections, not approved alternatives.
The card frame is native Photoshop component assembly, never image generation.
Final layered production files are in `../../creations/<id>/`.

The release baseline predates publication. `audit.cjs verify` requires all
unrelated creations and approved references to stay exact. Native revisions
include backups, editable text, exact fixed pixels, unchanged styles/effects,
PSD reopening and actual printed barcode checks.

Parent QA: static build, isolated desktop/phone browser review and comparison
of deployed catalogue and every affected downloaded PNG. Browser QA never uses
the user's collection, saves or browser database.

The personal remote is https://github.com/Yoshi-san87/Kalistar.git.
Preexisting unfinished cache and story-reader changes are excluded from this
card release. `build-committed-runtime.cjs` reads their committed versions in
memory without modifying the working tree, and otherwise runs the normal
builder against the current card assets.

## Final Local Verification

All native publications are complete: 175 cards, 28 unchanged arenas. The 48
stat revisions modify 479 numeric values, with every special, position and
original illustration preserved. Kainé is framed 12% closer, reversibly, and
Rikka's selected image 04 is the only new production illustration.

The 71 combined tests pass, plus the Kalistel regression with eight full
matches. Each revised PSD reopens pixel-identically to its final PNG. Barcode
checks pass; no physical-paper printing test is claimed. The parent reviewed
twelve representative native cards in `qa/native-1.png` and `qa/native-2.png`.
That is Codex visual review, not a claim of subsequent human approval.

Browser QA passes at 1440x1000 and 390x844: 18 views, no browser/HTTP errors,
exact native PNG hashes, complete profile agreement and no horizontal overflow.
The playable build contains 461 assets, approximately 443.8 MiB.

During this lot, the user independently committed V4.2 (`a7108db`). That commit
is preserved as the release base, including its cache and story-reader work.
Remaining unrelated local verification images are excluded from this commit.
