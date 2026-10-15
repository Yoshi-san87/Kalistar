# Pascal - book binding correction 02

Published on 2026-09-23. Native pixel, text, barcode and PSD round-trip checks
passed. Desktop 1600 px and mobile 390 px media/UI checks passed in an isolated
browser. See [RESULTAT.md](RESULTAT.md). Do not rerun prepare/render on this
completed revision; use `revise.cjs preflight` for the current state.

One-card native revision of Pascal `42650442`. Only the illustration is replaced.
The parent owns `art/` and `art-provenance.json`; this pipeline never edits them.
The approved robot, teacher scene and book geometry are reviewed by the parent.
No profile, gameplay, catalogue, typography, frame, other card or Git change.

## Inputs and execution

Provide the selected full-size PNG at `art/pascal.png` and its actual generation
provenance at `art-provenance.json`. Finalize both before preparing. No script
silently refreshes frozen hashes if an input changes afterward.

From the project root with the bundled Node runtime:

```powershell
$node = 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$revision = 'V4/revisions/2026-09-23-pascal-book-02/revise.cjs'
& $node $revision check
& $node --test --test-isolation=none V4/revisions/2026-09-23-pascal-book-02/revision.test.cjs
& $node $revision prepare
```

`prepare` checks the currently published prior revision, freezes its entire
directory and the current creations/source cards, backs up all future targets,
and prepares the 737 x 921 illustration component. No Photoshop or publication.
The prior revision folder remains historical evidence, byte-identical.

Only after parent authorization:

```powershell
& $node $revision render
& $node $revision verify
& $node $revision preflight
```

Photoshop 2025 / `Photoshop.Application.190` must be available. The existing bridge
and render lock are reused. The current backed-up PSD is duplicated, its embedded
illustration smart-object contents replaced, saved, closed and reopened. All
other layers retain their native state. No reconstruction or flattened patch.

Verification requires the existing Python barcode reader. It checks the actual
barcode, identical texts, positions, layer geometry, embedded objects, fixed
frame, zero changed pixels outside the illustration rectangle, identical images
with the illustration hidden, and exact reopened PSD/PNG equality. Inspect
`work/pascal/card.png` visually before publication; tests are not art approval.

Only after parent visual approval:

```powershell
& $node $revision publish
& $node $revision preflight
```

Source and creation PSD/PNG/illustration/current proof are committed together.
Native source render evidence and previews are updated consistently. The original
profile and global catalogue stay byte-identical. Reload the site for its image
cache. Parent handles browser checks and Git separately.

## Lineage and recovery

`before.json` records exact current bytes and file inventories. `originals/`
contains every replaced file. `render-inputs.json` binds production code and
inputs. `verified.json` binds native evidence and staged outputs.

Previous revision `2026-09-23-nier-art-refinement` is not edited. Its published
hashes are verified against unchanged live targets or these exact backups. Its
historical preparations and proofs remain intact, never relabelled as this run.
The new `creation.json` and verification explicitly link to that prior revision.
After publication use this revision's `preflight`, not the old revision's live
preflight: the latter intentionally describes the superseded Pascal image.

The existing journalled `transaction.cjs` is reused without modification.
Any commit failure restores the entire replacement set. Explicit recovery from
an interrupted transaction is `node revise.cjs rollback`. External edits block
restoration before any file is overwritten. Never remove the journal or renew
hashes to bypass a failed comparison.
