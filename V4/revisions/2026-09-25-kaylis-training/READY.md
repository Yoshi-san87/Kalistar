# Published: Kaylis Training V6

V6 native and local publication are complete with explicit parent GO and visual
approval. Exactly six targets were published; final preflight passed. V4 and V5
remain separately archived as nonfinal. Parent handles browser QA and global docs.

## Final Proof

- Art: `art/illustration-v6.png`, SHA-256
  `6e58eb561d8e5ef2a08f99ecdf133b1b25a19bae61c801b8f802c92c45f8ccde`.
- Photoshop: 26.11.7, exactly matching the original native proof.
- Original PSD reproduction: 0 changed pixels. Outside illustration: 0.
- Art-hidden comparison: 0 changed pixels. Reopened PSD vs final PNG: 0.
- Native text, mixed-style runs, all layer geometry and embedded objects unchanged.
- Actual rendered barcode `49055457`: color-1, color-4, gray-1, gray-4 all pass.
- Final tests: `tests-published.tap`, 12/12. Final preflight: `published`.
- Proofs: `verified.json`, `work/kaylis/verification.json`, `transaction.json`,
  `final-check.json`; parent inspected `work/kaylis/card.png` and `proof-small.png`.
- Published PNG SHA-256:
  `984532fdeef4983632a291b3d2bb3c6569e76961e5b254a48665aa95ae42ddd0`.
- Published PSD SHA-256:
  `3280b0b6f393cd9982786e4a32c65a80ba7ffcb5f00fc6ac3c649f2bbab0c413`.

## Preserved Scope

- Creation: `V4/creations/49055457`, KAYLIS / L'ELAN DES COULEURS.
- Catalogue: 89 cards; reference ID
  `02f0808cbd56d2b0d4103450e7943db69b95ac120a0df349f4374c82f7f712e5`.
- Snapshot: `before.json`, 1,232 observed file hashes, including 901 protected
  files and the complete creation inventory. Final preflight verifies all sources
  against that snapshot, allowing only the six certified publication changes.
- Exact backups: 13 files in `originals/`, including all creation outputs,
  unchanged profile, catalogue, reference/regression/manifests and native proofs.
- Tests: `tests.tap`, 11 passed / 0 failed. JSX syntax checked without execution.
- Updated local-bridge tests: `tests-v5.tap`, 12 passed / 0 failed.
- Baseline: `baseline-verification.json`, current rendered barcode `49055457`
  decoded in color-1, color-4, gray-1 and gray-4. Existing reopen proof has zero
  pixel difference. These are checks of the OLD output, not of new artwork.
- Native tool: `revise.cjs` and `replace.jsx`. Existing protected native route
  and transaction helper are reused unchanged. Six final publication targets.

## Art Status

- `art/` is owned by the parent; this subtask has written nothing there.
- v1 QA: `qa/illustration-v1/frame-preview.png`; native frame components with
  approximate preview typography, not a native or publishable output.
  The sword tip is occluded by the right DEF rail; the left hand also meets
  the ATK rail. The central framing needs the parent's coherent art revision.
- v2 is explicitly NOT selected: third-foot defect reported by parent.
- v4 was inspected in `qa/illustration-v4/frame-preview.png`: face/smile clear,
  complete sword tip clear of the right rail, two complete brown suede boots.
  Art hash: `8803671e69bef250c8699b672e5895cbab7c6600460850b6d8c362efa865d1d6`.
- Parent authorized that v4 native attempt, then superseded the selection:
  restore a smaller, discreet/complicit smile of pleasure from the reference.
- V5 (`5543093713bd2fbab7cad5c0f817c456c5130c82771447f4ff02bb8b99f05757`)
  was then approved for native, previewed and rendered. While running, the parent
  superseded it: v6 must recover the COMPLETE original expression, including eyes.
  Native v5 was allowed to finish without interruption, then archived.
- V6 restored the complete expression, including eyes. Parent approved the full
  native output and small proof, then explicitly authorized local publication.
- Preserve two legs/feet, soft higher Timberland-like brown suede footwear,
  black trousers, close scalp braids/soft rear bun and Rainbow incandescence.
- Parent also exclusively owns `browser-review.cjs` and `browser-review/`.

## Nonfinal V4 Attempt

`attempts/01-v4-com-connection/` preserves the prepared work, frozen inputs,
render request, exact executed code copies and Photoshop error log. The COM
factory returned `80080005 / CO_E_SERVER_EXEC_FAILURE` before JSX execution.
No `card.psd`, native `card.png` or new native proof was produced. The attempt
was moved intact into its own directory, not overwritten or rerun. The original
snapshot passed `check` after archival; that attempt changed no production files.

## Nonfinal V5 Attempt

`attempts/02-v5-nonfinal/` preserves actual PSD/PNG, all audits, prepared work,
request, frozen inputs and exact code copies. `work/kaylis/diagnostic.json` records:

- Actual Photoshop: 27.10.0; original native proof: 26.11.7.
- Original PNG vs original PSD re-export: 37 different pixels, not acceptable.
- Final PNG vs original: 2 pixels outside art, not acceptable.
- Art-hidden images: zero different pixels. PSD reopen: zero different pixels.
- Native layers, texts and native style runs: unchanged.

Do not publish this candidate or loosen the strict zero thresholds. For final V6,
the runtime mismatch was resolved: the empty 2026 instance was closed gracefully
only after confirming zero documents; 2025 then started and reported 26.11.7.
No user document or unsaved session was closed. The local `render.ps1` now
attaches to that exact source version. V6 passed every strict zero-pixel gate.

## Completed Sequence

1. V6 selected by parent, preview inspected, explicit native GO.
2. Runtime 26.11.7 restored without shared/protected script edits.
3. Current PSD duplicated, single illustration smart object replaced, reopened.
4. Full strict verification passed; parent approved full-size and small native proof.
5. Explicit local publication GO, six-target CAS transaction, final preflight passed.

Remaining parent-owned activity: browser QA. No native or publication work remains.

No 38-reference Photoshop regression: no common renderer was changed.
No Git, UI/site modifications, global documentation changes, protected-file
rewrites, shared-author changes or profile/crop changes were performed.

During preparation, the sandbox initially blocked subprocess spawning for the barcode reader.
The verifier call chain was inspected and confirmed read-only with Python as
its only child process; the narrowly explained retry succeeded. Photoshop
remained uninvoked throughout preparation. Existing partial backups were byte-checked and
preserved, not overwritten, when preparation resumed.
