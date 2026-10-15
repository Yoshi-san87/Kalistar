# Skull Face: native art and race revision

Target: creation `49600118`, native key `skull-face`, MGS5.
Native evidence: `V4/expansions/2026-09-30-metal-gear-saga/cards/skull-face/`.
Production remains in `V4/creations/49600118/`; the historical expansion stays intact.

User-authorized changes: embedded illustration, embedded race emblem HUMAIN to
existing SKULLZ, editable RACE text, and profile.race only. All other profile
values, native layers, text styles and effects are exact-preservation requirements.
Artwork source metadata in the original profile is deliberately unchanged;
`nativeRevision.artworkSource` records the new illustration on publication.

The parent owns `art-prompt.json`, `art-references/`, illustration generation,
visual approval and release QA. This pipeline does not edit them. Expected art:
`V4/Illustrations/Skull_Face_MGS5_Fidelity_20261001.png`.

## Execution gates

Run from the active checkout with the existing Node runtime:

```powershell
node V4/revisions/2026-10-01-skull-face/revise.cjs check
node --test --test-isolation=none V4/revisions/2026-10-01-skull-face/revision.test.cjs
```

Only after the parent confirms Gibbs has stabilized SHARKAN's shared code and
the art is final, freeze the actual inputs with prepare. Do not refresh hashes
to conceal later changes; investigate and retain any superseded attempt.

```powershell
$env:KALISTAR_SKULL_CODE_STABLE = '2026-10-01'
node V4/revisions/2026-10-01-skull-face/revise.cjs prepare
```

The parent coordinates the Photoshop handoff with the 11-card native agent.
Only after the explicit Photoshop grant:

```powershell
$env:KALISTAR_SKULL_PS_GRANTED = '2026-10-01'
node V4/revisions/2026-10-01-skull-face/revise.cjs render
node V4/revisions/2026-10-01-skull-face/revise.cjs verify
node V4/revisions/2026-10-01-skull-face/revise.cjs preflight
```

Render takes the existing process lock and Photoshop mutex. It attaches only
to active `Photoshop.Application.190`, version `26.11.7`. No other COM route.
It duplicates the original PSD and changes exactly the three native layers.

## Strict proof

- Immutable byte backups of all six creation files plus original native evidence.
- Original PSD export versus original PNG: zero changed pixels.
- Final versus original: zero outside illustration `[80,156,817,1077]`, race icon
  `[711,1116,807,1211]` and tight old/new race text bounds with 2 px padding.
- Art, icon and race text each demonstrably change.
- All three edited layers hidden before/after/reopened: zero changed pixels.
- All other native layers exact; all text/paragraph style streams exact, including
  RACE (HUMAIN and SKULLZ both have six letters); all layer-effect streams exact.
- Same smart-object geometry; art and race icon remain embedded, never linked.
- Reopened PSD/PNG equality, component/frame checks, editable values and four
  actual barcode reads via the existing verifier, not a replacement framework.
- Profile deep equality except race; all verified evidence hash-bound for publish.

## Parent-only publication

Do not publish until the parent has finished the 11 One Piece cards and approved
the visual result. No Git operations are part of this revision.

```powershell
$env:KALISTAR_SKULL_PARENT_COORDINATED = '2026-10-01'
node V4/revisions/2026-10-01-skull-face/revise.cjs publish
```

Preparation freezes only the existing target, its native evidence and actual
dependencies, never the whole catalogue or unrelated creations. Preflight reads
the current catalogue (163 cards observed before One Piece; 174 expected after,
neither hardcoded), preserves every non-target entry and checks the playable
target changes only race. Publication takes the shared process lock and checks
the fresh catalogue hash before replacing it. Any concurrent change aborts;
it must never overwrite One Piece additions with a stale snapshot.
Protected reference/component hashes are read and verified, never rewritten.
