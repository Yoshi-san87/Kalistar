# NieR - native art refinement

Revision scope confirmed on 2026-09-23. The parent owns visual selection,
`art/` and `art-provenance.json`. This directory supplies the native pipeline.
It does not generate illustrations, run Photoshop or publish on import.

Published and verified on 2026-09-23. See [RESULTAT.md](RESULTAT.md) and
[ART_REVIEW.md](ART_REVIEW.md). Do not rerun prepare/render on this completed
revision. Current verification command: `node revise.cjs preflight`.

## Scope

- Pascal: physically coherent bound book; preserve the approved teacher scene.
- A2: large Type-40 Blade; existing `Epee longue` category unchanged.
- Adam, Eve, Anemone: painterly Kalistar DA corrections selected by the parent.
- Adam only: `Poing` becomes the existing `Orbe` category and weapon index 14.
  The calibrated bank icon comes from `designer-assets/packed/banks/weapon-Orbe.png`.
- All stats, buffs, positions, identity and lower native texts are unchanged.
- Emil, 2B, 9S, all other cards, reference locks and component banks are preserved.

## Parent Inputs

Place the five selected original PNGs at the paths in `selection.json`:
`art/pascal.png`, `art/a2.png`, `art/adam.png`, `art/eve.png`, `art/anemone.png`.
The parent writes `art-provenance.json` containing actual prompts, references,
generated originals, selections and review notes. The render records its hash.
No script edits these parent-owned files.

Finalize the selection before `prepare`: selected bytes are frozen at that point.
Do not substitute another artwork or rewrite the frozen hashes afterward. A new
selection after preparation needs a separately traced revision, not a bypass.

## Execution

From the project root, use the bundled Node executable:

```powershell
$node = 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe'
$revision = 'V4/revisions/2026-09-23-nier-art-refinement/revise.cjs'
& $node $revision check
& $node --test --test-isolation=none V4/revisions/2026-09-23-nier-art-refinement/revision.test.cjs
& $node $revision prepare
```

`check` only reports input readiness. `prepare` verifies the current original
batch and approved dependencies, backs up every future replacement, prepares
the 737 x 921 artwork components, and copies the original components. Nothing
in the source set or published creations changes. Missing images are rejected
before any backup/staging work starts.

After the parent explicitly authorizes Photoshop:

```powershell
& $node $revision render
& $node $revision verify
& $node $revision preflight
```

Photoshop 2025 / `Photoshop.Application.190` must be available. The existing
bridge and single render lock are reused. `render` duplicates the backed-up
current PSDs, replaces only embedded illustration contents and Adam's embedded
weapon, saves, closes and reopens the copies. No reconstruction of the frame,
no flattened patch layer and no text restyling are performed.

`verify` needs permission to launch the existing Python barcode reader. It checks
the actual rendered barcode, unchanged native texts/typography, full smart-object
inventory, fixed-frame pixels, exact round-trip PNG equality, unchanged component
geometry and pixel identity with changed layers hidden. Any changed pixel outside
the illustration and Adam's weapon footprint fails verification. It also builds
the game catalogue and proves that only Adam's weapon/index changed.

Review `work/<key>/card.png` and its small-size readability before publication.
Technical verification does not replace the parent's visual approval. Then:

```powershell
& $node $revision publish
& $node $revision preflight
```

Publication replaces the source card PSD/PNG/illustration/current native proof,
matching creations and Adam's source/published profiles. `creation.json` links
to the revision. The catalogue is committed last. Other source/artwork/metadata
remain byte-identical. Reload the local game page to clear its in-memory images.
The parent performs the browser and artistic checks; this pipeline does not
touch personal IndexedDB or create a test collection.

## Historical Lineage

The initial `nier-set-02/set.json`, its model contract, `art/`, `preparation.json`
files, provenance and preservation snapshots remain historical and unchanged.
They described the initial manufactured cards, including Adam with `Poing`.
The active revised specification is `revised-set.json` in this directory; the
active source profiles remain `nier-set-02/cards/<key>/profile.json`.

All six initial preparations bind shared art/profile/component hashes. We do
not overwrite those hashes to make a revision look like the original build.
Instead, `validateHistoricalLineage()` runs the original preservation guard with
an explicit read-only mapping of replaced paths to their checked backups. Every
other path is checked live. Separately, the new proof binds current assets,
native rendering, profiles, staged bytes and creation metadata. Emil's unchanged
preparation and both pilot cards are included in preservation checks.

Consequently, the initial batch's old `build.cjs`/`publish.cjs` are not the current
revision entry points: their original-preparation check will correctly reject
the changed source paths after publication. Use this `revise.cjs preflight` for
the current revision. Do not rerun the old preparer or relax its assertions.

## Recovery

Every replaced file has an exact backup under `originals/`. `before.json` binds
the original hashes and inventories. `render-inputs.json` binds pipeline code,
parent art/provenance and prepared components. `verified.json` binds all staging
files and technical evidence. Native proofs identify their original preparation,
verification and PSD hashes explicitly.

`transaction.json` is written before the first replacement. A failed publication
restores the complete batch in reverse order. An interrupted `publishing` state
can be recovered explicitly:

```powershell
& $node $revision rollback
```

Restoration first checks every target against its old/new hash, plus all backups.
An outside edit blocks recovery before any file is restored, preserving that edit.
Do not manually refresh hashes or remove the journal to conceal an interrupted
transaction. Keep originals and staging until the parent has completed review.

## Tests

`revision.test.cjs` exercises the exact five-card scope, Adam-only profile delta,
locked Orbe footprint, native-layer audit and transactional success/recovery.
Faults are injected after every partial write and after the final validation;
stale stage/target, interrupted publication and external-edit refusal are covered.
Fixtures live only in this revision directory and never touch production files.

At implementation handoff: 11 tests passed. Photoshop, final artwork verification
and publication have not been run by this pipeline author.
