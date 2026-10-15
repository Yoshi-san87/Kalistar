# Street Fighter: native production in progress

## Completion on 9 October 2026

All 18 cards are now composed, verified and integrated locally (333 cards).
The original frozen inputs and the partial report below remain intact.
`complete.cjs` resumes with the narrowly checked Homme Mystere rename adapter.
Every native card has zero fixed-frame differences, an identical reopened PSD
render and a successfully decoded barcode. The final Fei Long V3 artwork is
installed through `../../revisions/2026-10-09-fei-long-final/`, without changing
any gameplay field or any pixel outside the illustration window.

Ten integration/publication tests pass: all 216 faces, 54 complete games,
the final published artwork, collection filtering and previous catalogue.
`local-browser-proof/results.json` covers 54 readers across PC, Razr 50 and
320px, Ryu/Ken in the arena, reload and old-backup migration (+18 cards).
`visual-proof/` preserves both native contact sheets. Git publication and its
exact version are documented in the accompanying release, not inferred from
this local production status.

18 selected characters. Rose and Dan Hibiki are excluded from card production.
The new faction is STREETFIGHTER. Every collaboration character has a Kalistel.
Blanka uses the existing MACAKO race. No engine mechanic, weapon matchup, arena,
save schema or starter deck was changed.

## Earlier interrupted state (preserved history)

- Model and 18 QA decks prepared; six integration tests passed.
- 108 ATK faces and 108 DEF faces exercised against the actual engine.
- 36 new/new ABBA matches and 18 mixed legacy/new matches completed with
  repeated JSON save/restore.
- Native Photoshop batch stopped on a full scratch disk. The idle application
  was restarted without closing any open document, but the next batch failed
  for the same reason.
- Ryu, Ken, Chun-Li, Guile and Cammy have native outputs. See partial-checks.json
  for verification and remaining cards.
- No catalogue publication, release commit, version bump or push was performed.
- Preserve the separate concurrent v4.6.8 arena-console release. This expansion
  must use a later available version, checked against the actual remote.

## Fei Long: latest user correction

The first shortening overcorrected his reach. The latest selected artwork is:

V4/propositions/2026-10-09-street-fighter/images/fei-long-v3.png

The original scene, costume and Kalistar treatment are retained, with a
near-straight elbow and reach between the original and shortened versions.
The proposal gallery and provenance reference V3. See fei-long-middle-edit.json
and the gallery's fei-long-midpoint.json for the built-in imagegen prompt/source.

IMPORTANT: set.json and before.json froze the earlier V2 image before the user's
latest correction. Do not overwrite those inputs or their hashes. Produce an
additive artwork revision for character 49901717 with V3 and retain the base
proof. Keep every statistic, characterId and identity field unchanged. Do not
publish the outdated V2 artwork as the final selection.

## Resume

Free disk space first; no historic sources or unrelated files may be deleted.
The user was asked to free about 15-20 GB or authorize a specific temporary
directory. resume.cjs accepts 1-4 known, completely unrendered card keys and
checks the original frozen manifest. Never rerun build.cjs prepare.

After native completion, run build.cjs verify, integrate the additive Fei Long
art revision, exercise catalogue/backup migration and browser readers/duels on
desktop and phone, build Pages, then perform scoped publication and versioning.
The current local tests alone are NOT a claim of complete release validation.
