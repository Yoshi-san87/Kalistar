# Kaylis training: native illustration-only revision

## Final Browser Review

Parent review passed after local publication: `browser-review/report.json`.
Isolated GET-only contexts at 1600x1000 and 390x844; final PNG bytes match the
native output, no browser errors, no viewport overflow. Both screenshots were
visually inspected. Real browser storage and collection remain untouched.
Generation used built-in `image_gen`; exact prompts, references, iterations and
final v6 selection are recorded in `art/provenance.json`. The last request is
`art/original-expression.request.json`. Local publication only, no Git push.

## Published Result

V6 was visually approved by the parent, verified under Photoshop 26.11.7 and
published locally with explicit GO. `transaction.json` is `published`: exactly
six files changed, catalogue still 89 cards, profile/crop/gameplay unchanged.
Final preflight passed. Post-publication tests: `tests-published.tap`, 12/12.

Selected art SHA-256:
`6e58eb561d8e5ef2a08f99ecdf133b1b25a19bae61c801b8f802c92c45f8ccde`.
Original reproduction, pixels outside art, art-hidden comparison and PSD reopen
all have zero differences. Text/style/geometry and embedded objects are unchanged.
Actual rendered barcode `49055457` decoded in all four modes. No raster repair,
threshold relaxation or protected-file/renderer change was used.

Published files: `V4/creations/49055457/card.png` and `card.psd`. Proofs:
`verified.json`, `work/kaylis/verification.json`, `proof-small.png`,
`transaction.json`, `final-check.json`. V4/v5 nonfinal attempts remain archived.
Parent owns web QA, `browser-review.cjs`, `browser-review/`, `art/` and global docs.

## Scope

Scope: creation `49055457`, KAYLIS / L'ELAN DES COULEURS. The parent owns
`art/`, generation, artistic selection, UI/site work and global documentation.
This revision owns the native copy, local proofs and publication after explicit GO.
No Photoshop before final art and parent GO. No Git actions.

The current creation PSD is archived, opened read-only and duplicated. Only
`ILLUSTRATION - cadrage` is replaced. The native window stays 80,156,737x921;
export stays 897x1497 at 300 dpi. Profile, crop, identity, text and all other
layers stay unchanged. The protected expansion and original Kaylis are read-only.

`revise.cjs` reuses the Pascal art-only route, RoyalTraining native style-run
auditing, existing native verifier/barcode decoder, and the unchanged transaction
helper from `2026-09-23-nier-art-refinement`. No shared renderer is changed.
The 38-reference native regression is therefore not rerun.

The v4 attempt failed before JSX execution: the shared bridge targets Photoshop
2025, while Photoshop 2026 was already running. The v5 attempt under 2026 had
minor native pixel drift and is archived as nonfinal. Starting 2025 while 2026
was running did not persist. After confirming exactly zero documents, the empty
2026 instance was closed gracefully, without force or any document closure.
Photoshop 2025 then started successfully. Local `render.ps1` now attaches only
to Photoshop 2025 (26.11.7, matching the original native proof), retaining the
existing native mutex. No shared bridge was edited. Actual Photoshop version
is recorded in the native proof; all pixel gates remain strictly zero.

## Commands

The native and publication commands below document the completed sequence;
do not rerun them over certified outputs. `check` and `preflight` are read-only.

Run from the workspace root, using `node`:

```powershell
node --test --test-isolation=none V4/revisions/2026-09-25-kaylis-training/revision.test.cjs
node V4/revisions/2026-09-25-kaylis-training/revise.cjs prepare
node V4/revisions/2026-09-25-kaylis-training/revise.cjs check
node V4/revisions/2026-09-25-kaylis-training/revise.cjs preview --art=art/illustration-v1.png
```

Only after explicit native GO, substituting the final selected art filename:

```powershell
node V4/revisions/2026-09-25-kaylis-training/revise.cjs render --go-native --art=art/FINAL.png
node V4/revisions/2026-09-25-kaylis-training/revise.cjs verify
node V4/revisions/2026-09-25-kaylis-training/revise.cjs preflight
```

Show `work/kaylis/card.png` and `proof-small.png` for visual review. QA previews
under `qa/` are approximate non-native previews, never publication inputs.

Only after explicit publication GO:

```powershell
node V4/revisions/2026-09-25-kaylis-training/revise.cjs publish --go-publish
node V4/revisions/2026-09-25-kaylis-training/revise.cjs preflight
```

## Gates And Evidence

- `before.json`: exact source hashes, complete creation inventory, 89-card
  catalogue, protectedFiles, reference/regression/manifest and route dependencies.
- `originals/`: exact creation outputs and profile, catalogue, control JSONs,
  original native layer proof and composition. No overwritten originals.
- `baseline-verification.json`: current source's native proof rechecked without
  opening Photoshop, including actual rendered barcode decoding in four modes.
- `render-inputs.json`: final art, local code and prepared inputs frozen for native.
- `work/kaylis/audit.json`: all layer states and native mixed-style text runs
  before/after/reopen. Existing embedded objects must remain embedded.
- `verified.json`: zero pixels outside art, zero changes with art hidden, zero
  PSD reopen differences, exact native text/style/geometry and real barcode decode.
- Six publication targets: creation `card.psd`, `card.png`, `illustration.png`,
  `verification.json`, `creation.json`, and `V4/donnees/catalogue.json` last.
  Catalogue changes only Kaylis native evidence metadata; all 89 playable
  records are compared to `baseline-game.json` and stay identical.
- `transaction.json`: existing CAS transaction, atomic rename per file, complete
  preflight and rollback on failure. This is not a single cross-file filesystem
  transaction. External edits block publication/restoration instead of being erased.
- A local `operation.lock` serializes this tool without writing outside its scope.
  Existing Atelier render lock is checked; the same named Photoshop mutex
  provides native mutual exclusion. Parent assigns sole Photoshop ownership.

Never retry an interrupted render over its outputs. Preserve the attempt first.
Explicit recovery, after inspection: `revise.cjs rollback --go-rollback`.
