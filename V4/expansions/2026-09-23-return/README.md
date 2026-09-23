# Return expansion native pipeline

Scope: 22 cards, with 11 canonical V3 identities preserved, four new Kalistar
variants, seven NieR/Replicant models. Arena and banner art are parent-owned;
this pipeline reads the finished Replicant banner and does not publish arenas.

## Completed native production

On 24 September: all 22 native PSD/PNG pairs passed verification; the complete
27-old + 11-new canonical regression passed with zero pixel differences and
all barcodes decoded. Read `RAPPORT_NATIVE.md`, `native-batch.json` and
`canonical-regression.json`. Publication preflight passed, but no publication
or Git operation has been performed by this worker.

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
The first Photoshop attempt failed on scratch capacity, before final outputs.
The 24 September restart preserves attempts 01 through 03. `ATTEMPT-04.md`
documents the current measured-glyph verifier; no shared typography or native
composition geometry was modified. Julienne and Commander are pixel-identical
to their visually reviewed native outputs and have fresh verification proofs.
Read `ATTEMPT-01.md` through `ATTEMPT-04.md` and `ETAT_REPRISE.md` for the state.
The completed production evidence is listed at the top of this README.

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

Twenty-one isolated tests pass: canonical identity, variants, balance, modes,
source-path confinement, banks, prospective game validation, immutable captures,
stale proofs, target allowlist, a complete 22-card simulated publication, and
rollback preserving exact previous bytes.
Regression reports are copied byte-for-byte into
`evidence/old-regression/<job>/verification.json`, including failed reports.
The publication gate uses this tracked copy and SHA-256, not ignored runtime
jobs. New canonical native states and rendered/reopened PNGs are hash-bound
and rechecked before transaction application.
`typography-calibration*.json` records independently measured native glyph
bounds for the 16 distinct names. The local verifier requires exact font/style
and measured width/height, including accents, within the approved name band.
Its native request, output and approved-source hashes are bound to preparation.
They are not a substitute for Photoshop or visual approval. The pipeline does
not assert that a generated illustration is artistically accepted.
