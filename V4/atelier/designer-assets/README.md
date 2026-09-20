# Exact V4 designer components

See `CONTRACT.md` for the compositor API. Do not consume the pack for production
until `manifest.json.status` equals `ready`.

## Reproduction

Run from the Kalistar root, with no simultaneous Photoshop composition:

```powershell
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File V4/atelier/extract-designer.ps1 -Mode inspect
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File V4/atelier/extract-designer.ps1 -Mode extract
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File V4/atelier/extract-designer.ps1 -Mode frames
powershell.exe -NoProfile -ExecutionPolicy RemoteSigned -File V4/atelier/extract-designer.ps1 -Mode effects
node V4/atelier/extract-designer-finalize.cjs
node V4/atelier/extract-designer-qa.cjs
node V4/atelier/extract-designer-finalize.cjs --publish
```

The PowerShell bridge sets Process/RemoteSigned and owns the shared
`Local\KalistarV4AtelierRender` mutex. All native passes use `K.lifecycle`.
Already-open unsaved sources are rejected, and user documents are never saved
or closed. Temporary copies and documents opened by this extraction are closed.
The native frame pass explicitly repairs the clipping chain after inserting the
black/white artwork matte; merely hiding the artwork is not sufficient.

## Native Inputs

- The 26 approved PSDs listed by `V4/atelier/data/references.json`; exact paths,
  their hashes and source card keys are recorded in the manifest/verification.
- `V4/scripts/stable/common.jsx` and `elements-common.jsx`, read-only APIs.
- Their per-card registry banks for weapon, race and faction selections.
- Embedded native branches include the approved 2026-09-18 non-Electro repair.
- Rikka's native retry/dodge motifs and calibrated optical anchors; Valazar's
  native death motif and optical anchor. Other effects are extracted from their
  actual approved PSD layers, including hidden registered choices.
- `V3/assets/effets/shield_physical.png` and `barrier.png`, read-only existing
  motifs, provide the two engine shield ids that lack approved V4 effect layers.

No character artwork is generated. `proof/*-art.png` is only an extracted native
reference for verification, not the default designer placeholder.

## Composition Notes

Native circle rims and track decorations stay in the frame. Draw one ATK
`physical` or `magic` overlay per slot. `magic` already includes its halo and
coloured interior; do not add `halo` again. MINERO magic intentionally omits the
gold overlay, matching production. NONE has no magic assets.

DEF `plain` describes the native circles but is already in the frame. Only D1
and D4 require a separate native `effectBackground` overlay. D2/D3/D5 keep the
same native dark circle; D6 keeps its own larger native support. Their explicit
`effectBackgroundMode` metadata documents this choice.

Each faction sprite includes its cloth, cast shadow, and contact shadow.
The bottom-to-top order is recorded as `zOrder`. Sprite coordinates are native
integer global pixel coordinates; no consumer-side scaling is required.

Position numerals are preview sprites only. Final PSDs should clone native
`POSITION SLOT` text, just as number/identity fields clone their native text
styles. `textStyles.ruby` contains actual Bahnschrift number metadata and all
other native typography. Native source layers remain untouched.

New effect/slot combinations are calibrated derivatives, not newly approved
card renders. Each derivative records its optical center, normalized anchor,
safe radius and measured alpha-contour radius. `shield_magic` uses the existing
barrier motif; it does not invent another shield drawing.

## Verification

`verification.json` records input PSD preservation, component counts and native
recomposition comparisons. `state/` records full native layer inventories and
the corrected frame clipping state. `frame/*-black.png` and `*-white.png` remain
available as full-canvas diagnostic renders. PNG hashes are in `manifest.hashes`.
The approved reference lock is only read, never rewritten.
Finalization first writes `qa-pending`; inspect the two contact sheets and
recomposition PNGs before running the explicit `--publish` command.
The completed visual inspection and classified source-comparison residuals are
documented in `proof/QA.md`; the source comparison is not a byte-identity claim.
