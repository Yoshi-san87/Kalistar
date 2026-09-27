# Weapon Optical Sizing - Scoped Native Revision

Status: COMPLETE. Six native cards and both component banks published locally
after the parent's visual approval. Actual Photoshop regression passed for all
38 references, with exact pixels, exact PSD reopening and readable barcodes.
`complete.json` records completion and native queue release on 2026-09-27 at
13:20:38 UTC. No site code or Git operation belongs to this revision.

The user authorizes optical weapon sizing, not a frame, gameplay, illustration,
race or typography revision. Scope is exactly Faucille and Tome, six cards.

## Installed Revision

Reference ID: `ef7a6767b57723d896ceecb050079bfb1abad0e79e7289a200f87b34585f9380`.
Previous ID: `02f0808cbd56d2b0d4103450e7943db69b95ac120a0df349f4374c82f7f712e5`.

Native regression job: `7442a266-3f98-49f7-92d7-cea5c5a1c604`.
`native-regression.json` is an exact copy of the actual job's report, also installed
as `V4/atelier/data/regression.json` by the existing runner. Its SHA256 is
`e100050297f5fe19bb887ccf844e0df02954b89a7971396bdf69048f9b02e4a5`.
Manifest SHA256: `29ae8f04bfd9c1e16814896fa1f600cea10eedb7d1731e5c9ec4edcb4dcffbec`.
Icon-layouts SHA256: `ece2de2dac69deb59e008a72a3242ffbd732785f682683d0d88d9bcdc748f247`.
These describe this publication checkpoint; a subsequent approved revision may
legitimately supersede the shared files. Do not overwrite later work to restore
these hashes.

| Motif | Native before | Native after | Full-alpha radius | Inner-rim margin |
| --- | --- | --- | --- | --- |
| Faucille | 60 x 50 px | 67 x 54 px | 43.7293 px | 3.7707 px |
| Tome | 82 x 88 px | 67 x 72 px | 39.1950 px | 8.3050 px |

Measurements include every nonzero-alpha pixel's outer corners, not just bright
pixels. Both motifs preserve the original source silhouette; their independently
calibrated anchors do not equalize pixel area across different shapes.

`verification.json` proves all six PSD/PNG outputs: zero changed pixels outside
the painted inner circle, exact reopening, all other native layer properties
preserved, editable text retained, and four successful barcode readings each.
Three reference cards also have exact repeat placement. `E.bind` was actually
run for both motifs and reproduces each staged motif and bank with zero pixel
differences. `proof/six-cards-before-after.png` and `proof/*-small.png` provide
enlarged and game-scale visual checks. The parent approved the pilot comparison.

The upper-left weapon-rim repair remains untouched, as do every profile, race,
illustration, frame and the other 18 weapon banks. The all-weapon preliminary
audit below is a near-white proxy only: Instrument/Masse/Marteau were NOT given
full native-alpha clearance or declared perfect. They are outside final scope.

`published.json` lists exactly 28 installed paths and before/after SHA256 hashes.
`originals/` retains all 34 pre-mutation backups. The reference migration carries
every prior protection forward, updates only audited source hashes, and protects
the backups and immutable native proof. Do not regenerate that proof after
publication merely to refresh its date.

Two installation attempts safely rolled back before success: the first exposed
a catalogue check omitting created cards; the second encountered a Windows
atomic-rename refusal. All original bytes were verified restored each time.
Historical journals: `publication-attempt-rolled-back.json` and
`publication-attempt-rename-rolled-back.json`. The catalogue check now explicitly
includes created cards and has a regression test; the approved transaction then
completed with the required filesystem permission. No guard was bypassed.

## Next Renderer Requirements

The native queue is released. Before subsequent work, snapshot the current reference ID and
`V4/atelier/designer-assets/manifest.json` before freezing another batch. Use the
current packed banks and `V4/template-stable/icon-layouts.json`; never reuse an
old collaboration's Tome/Faucille copies. The stable renderer code was not edited.

Packed geometry stays 96 x 95 px at (89, 1116). Raw geometry stays 104 x 103 px
at (85, 1112). Exact bank hashes and geometry are in `banks.json`. In particular:

- Packed Faucille: `9762468bd7d5b6f07ccd2f0814d1f4ee2d90e3afc512583cec08ae4d03f3dcf1`.
- Packed Tome: `b6e511bbf3e5d1ec1b160383bcc7416a4cebe67f5620bef736ff78d613e9673f`.

Approved native sources updated: Iliane, Thalie and Voloden. Created sources
updated: Pascal, Nier and Lulu, with fresh current verification/creation receipts
linked to their original receipts. Historical production batch folders remain
unchanged and are not current component sources. There is no card overlap with
the Auron/Kaylis/Lanio artwork refresh. The parent stopped the Atelier server
for installation; its stale runtime file is left for the normal launcher.

## Preliminary Audit

Current source inventory: 100 catalogue cards, 38 locked reference cards,
20 weapon banks. Counts were read from current files, not the historical guide.

The 96 x 95 banks include opaque enamel. Their rectangular alpha bounds cannot
measure the motif. `audit.cjs` measures the visible near-white silhouette as a
read-only first pass. This is explicitly a proxy, NOT final native alpha proof.
`audit/all-weapons-before.png` shows all current banks at identical scale.

The Tome has about 4,122 pixels of weighted white mass, versus 425 for Faucille.
The existing Faucille anchor gives its thin head more influence than the long
handle. This limits its scale while leaving it visually small. Simply increasing
the old scale would hit the rim. A less head-biased optical anchor permits a
moderate increase; reducing the dense Tome supplies the larger visual balance.

Some other weapons almost touch the painted inner rim. The scoped change keeps
both revised motifs inside a measured full-alpha radius of 44 px, inside the 47.5 px
painted inner circle. The minimum final breathing room is 3.5 px. Pixel-corner
distance, not only pixel-centre distance, must pass the final native test.

## Historical Bounded Proposal

The parent explicitly narrowed the scope after the initial all-weapon audit:
correct the two concrete outliers only. The other 18 motifs stay byte-identical.
The initial broader sizes below are therefore NOT production instructions.

Dimensions below describe visible motifs, NOT the enamel bank. They are initial
targets to be refined against actual native transparency and small-size review.
The native calibration may adjust a target by up to 2 px to retain full alpha;
larger changes require another parent review.

| Weapon | Current px | Proposed px | Existing cards |
| --- | --- | --- | --- |
| Gun | 72 x 76 | unchanged | 6 |
| Fouet | 91 x 80 | unchanged | 5 |
| Instrument | 80 x 88 | unchanged | 7 |
| Poing | 79 x 77 | unchanged | 8 |
| Lance | 67 x 67 | unchanged | 8 |
| Arc | 68 x 68 | unchanged | 3 |
| Epee longue | 68 x 67 | unchanged | 11 |
| Sceptre | 67 x 67 | unchanged | 8 |
| Baton | 67 x 67 | unchanged | 9 |
| Tome | 82 x 88 | 67 x 72 | 5 |
| Masse | 69 x 70 | unchanged | 2 |
| Marteau | 73 x 73 | unchanged | 2 |
| Hache | 63 x 52 | unchanged | 1 |
| Orbe | 67 x 72 | unchanged | 3 |
| Dague | 67 x 68 | unchanged | 6 |
| Faucille | 60 x 50 | 66 x 55 | 1 |
| Epee courte | 54 x 53 | unchanged | 3 |
| Katana | 52 x 58 | unchanged | 3 |
| Projectile | 70 x 70 | unchanged | 7 |
| Fleau | 54 x 51 | unchanged | 2 |

Total proposed: 2 banks, 6 existing cards (3 approved, 3 created):
Voloden `30000028`, Iliane `30000017`, Thalie `30000041`, Pascal `42650442`,
Nier `47689975`, Lulu `43120563`. All other bank files remain unchanged.
Production masters only need an edit if inspection finds an embedded Tome or
Faucille bank used by future rendering; no unrelated active master icon changes.

## Original Coordination Contract

Do not start Photoshop until parent grants the exclusive slot. Do not freeze the
13-card new batch until this migration releases its new reference and manifest.
There is no active-card overlap with the Auron, Kaylis and Lanio artwork changes.
The reference/manifest publication still changes shared hashes, so the parent
must sequence the other agent's snapshots/freeze around that migration. Parent
must pause Atelier publication during installation. Neither site code nor the
personal Git clone belongs to this subtask.

## Native Procedure

1. Recheck reference, catalogue and bank hashes; snapshot all intended targets
   and preserve each original before its first modification.
2. Inspect pure native motif alpha and smart-object contents. Instrument includes
   distinct styling/enamel and must not be replaced with a simplified old glyph.
   Do not rescale the whole enamel bank. Extract/transform its motif only.
3. Calibrate and visually compare all changed motifs in the painted rim at 100%,
   enlargement and game scale. Reject full-alpha overflow and weak legibility.
4. Stage affected PSD/PNG outputs, embedded smart objects, updated component
   banks/layouts and honest verification metadata. Keep the existing lower frame
   and the 2026-09-20 upper-left rim repair byte-identical.
5. Compare the full native layer tree excluding ONLY allowed weapon properties.
   Compare all pixels outside a circular weapon mask; do not use a permissive
   full-card rectangle. Require exact reopened PSD pixels and barcode 4/4.
6. Install via journalled, hash-guarded transaction with backups and fail-closed
   rollback. Carry every old protected path forward; update only audited changes.
   Old verification reports remain historical, not silently relabelled as new.
7. Run all 38 current reference reproductions in Photoshop. Do not set a passed
   regression flag unless the actual native run has passed for the new lock.
8. Give parent the exact new reference/manifest hashes and active files changed.

The transaction helper in `../2026-09-23-nier-art-refinement/transaction.cjs`
provides the established before-hash / stage-hash / backup-hash commit and rollback
mechanism. `publish.cjs` uses it with complete native proofs and hash guards.
`complete.cjs` runs the real native regression and verifies the actual resulting
report; it never manufactures a passed regression flag.

## Verification Already Run

`node --test --test-isolation=none proposal.test.cjs publication.test.cjs`:
12 tests passed, including interrupted rollback, external-change refusal,
circle bounds, future-authoring consistency and complete catalogue verification.

`V4/atelier/game-catalog.test.cjs`: 12 tests passed after publication.
Default process-isolated Node test mode is blocked by this sandbox's spawn EPERM;
the existing project's no-isolation mode runs the same assertions normally.

These unit tests are distinct from the actual native proof in `verification.json`
and from the full reference regression. Do not infer native success from a unit
test alone. The authoritative final job and hashes belong in `complete.json`.
