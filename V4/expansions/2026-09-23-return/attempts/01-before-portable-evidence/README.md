# Return expansion native pipeline

Scope: 22 cards, with 11 canonical V3 identities preserved, four new Kalistar
variants, seven NieR/Replicant models. Arena and banner art are parent-owned;
this pipeline reads the finished Replicant banner and does not publish arenas.

## Producer contract

Read `CONTRACT.md` and `INTEGRATION-NOTES.md`. The final inputs are the three
profile arrays plus PNG artwork. `model.cjs/EDITIONS` explicitly records the
canonical/variant distinction. A canonical is never disguised as a 4xxxxxxx
creation. Twins share their character identity even when their faction differs.

## Parent execution

Use the configured Node runtime. All commands below run from this directory.

```powershell
node capture.cjs
node assets.cjs --short-sword
node assemble.cjs
node build.cjs check
node build.cjs prepare
node build.cjs render
node build.cjs verify
node regression.cjs
node publish.cjs
node publish.cjs --publish
```

`capture.cjs` and the short-sword preparation have already been executed in the
sidecar task. Capture is idempotent and refuses changed dependencies; the icon
preparation deliberately refuses replacement. Do not rerun the icon command.
No Photoshop composition or publication was executed by the pipeline author.

`prepare`, `render` and `verify` accept a card key. To reduce rework, finish the
profiles and banner first, assemble once, prepare all, then render/check one
canonical and one collaboration before the remaining cards. Preparations bind
the exact code, inputs, reference lock and components; a subsequent source edit
invalidates them. Do not edit evidence or renew dependency hashes to make a
failed comparison pass. A changed art direction requires a new explicit revision.

Rendering is serialized by render.lock and the existing Photoshop bridge mutex.
The batch opens only its references and closes its own documents. Progress is
written to progress.json. Every deliverable retains its native PSD. The only
discarded PSD is the explicitly scoped temporary regression roundtrip file.

## Checks and publication

- Exact per-role bounds, face modes, NONE, support permissions, character IDs.
- Original faction banks; approved ANDROID/CYBORG banks; calibrated weapon icons.
- Pixel-identical fixed frame, no severe component drift, native editable type,
  centered fields, unchanged reopened PSD, actual color/grayscale CODE128 reads.
- Canonical PSDs carry the hidden registered controls needed by the existing
  native renderer. The full regression checks old references with runner.cjs
  and new canonicals through the same renderRegistered function before commit.
- Original lock entries and protected hashes remain unchanged; publication
  appends new references, new protected files and missing weapon banks only.
- New variants/crossovers use creations/<4xxxxxxx>/ with independent provenance.
- An isolated prospective catalogue runs the actual unchanged game-catalog.cjs
  against an in-memory candidate reference file. No production index swap is
  needed for gameplay validation.
- All files stage before commit. Prior metadata is backed up byte-for-byte.
  Rollback refuses third-party changes. An interrupted applying transaction can
  be inspected and resumed with `publish.cjs --rollback <transaction-id>`.

Successful publication writes published.json. It is deliberately not silently
repeatable. Do not delete the receipt or regenerate the reference lock.

## Tests

```powershell
node --test --test-isolation=none pipeline.test.cjs
```

Fifteen isolated tests pass: canonical identity, variants, balance, modes,
source-path confinement, banks, prospective game validation, immutable captures,
stale proofs, target allowlist, a complete 22-card simulated publication, and
rollback preserving exact previous bytes.
They are not a substitute for Photoshop or visual approval. The pipeline does
not assert that a generated illustration is artistically accepted.
