# Royal Training: Original Characters B

Five ORIGINAL narrative proposals dated 2026-09-24, not manuscript characters.
Names were checked against extracted source text (zero matches). New IDs are
owned by the parent/native pipeline. No shared files, PSD, catalogue or Git edits.

| Character | Race / faction | Role | Scene |
| --- | --- | --- | --- |
| Keryn | KORBOW / Nestown | P5 AERO, Baton | Black raven ferryman docking a wind-tossed medicine nacelle |
| Brindor | CARNIVERT / Arborium | P1 HERBO, Marteau | Broad seed guardian bracing a storehouse door during a storm |
| Asteran | AURELION / Solaria | P2 LUXO, Epee longue | Crystal-skinned warrior cutting the chain barring the rejected |
| Ornelle | Female CERELF / Woodland | P4 HERBO, Sceptre | Doe-headed bridge-weaver joining roots across a broken bank |
| Tazrik | FELINEUS / Chroma | P3 ELECTRO, Projectile | Tiger-headed street acrobat recovering copper juggling balls |

## Source Grounding

Read root/V4 instructions, consolidated guide, visual and gameplay documents.
`V3/sources/sources-extraites.json`, story `KALISTAR - GUIDE COMPLET DES MONDES.docx`:
Solaria's tension between purity and mercy motivates Asteran; the aerial-city
and living-architecture themes inform Keryn/Ornelle/Brindor. Existing V3 card
profiles anchor actual faction labels Nestown, Arborium, Woodland and Chroma.
The guide's regional labels are not silently substituted for these factions.

Opened Momo and Valazar as mandatory painting references. Opened Scrow for
Korbow anatomy, Thalie for Carnivert skin/leaf traits, Iliane for Aurelion
semi-crystalline skin, Elenion for Cerelf deer-headed humanoid anatomy and
Polux for Felineus humanoid anatomy. These are race references, not identities
to copy. Ornelle is explicitly female, with a doe head and no male stag antlers.
Keryn is black-feathered, distinct in face/outfit/job from Scrow, with no extra
arms or spread wings. All five scenes use calm supporting backgrounds.

## Gameplay

All faces are D6 through D1; magic/barrier arrays hold face numbers.
All roles P1-P5 represented once, with one clear main position each.
Keryn trades damage for three support faces; Brindor favors bounded defense;
Asteran is mostly physical with a single magic face and one ally physical buff;
Ornelle has four magic attacks plus mana/luck and modest defense; Tazrik trades
damage faces for team momentum and evasive defense. No new effects or weapons.
Guard only P1/P5, Reraise only P5. No Mort on these new characters.

Solaria is intentionally retained as faction. Its banner/component correction
belongs to parent/Einstein; this batch never changes any existing asset bank.

## Handoff

Profiles are in `profiles-b.json`. `art-b/*.request.json` stores the exact
built-in imagegen calls, and `art-b/provenance.json` records selected originals,
hashes, visual review and generation method. `art-b/validation.json` records
local profile/asset checks. New images are not yet user-approved card renders.
Parent owns native composition, protected-frame checks, barcode/PSD validation
and publication. Keep crop zoom 1 unless an actual native preview requires it.

## V1 Checks And Fit Reservations (Historical)

All five PNGs are 1122 x 1402, copied byte-for-byte from their generated originals.
One built-in imagegen call per art, no Photoshop, no retouches and no publication.
Parent conditionally accepted the five individual selections pending native fit.
Exact requests, original paths, reference hashes and selected hashes are recorded
in `art-b/provenance.json`. Profile validation passes all role minima/maxima,
effect permissions, six-face indexing and existing weapon/race/faction checks.
The raw spreadsheet has contradictory DEF D5 maxima for P2/P4 (50 versus minimum
120); this check uses the already-established V3 builder maximum 150, without
changing the spreadsheet, gameplay engine or any shared source.

`art-b/verify-b.cjs` reproducibly builds a read-only component preview from the
current designer manifest. `art-b/qa/contact-native-windows.png` shows all five
737 x 921 native windows, including actual rails, selected magic halos/barriers,
position tiles and faction flags. Individual window and 897 x 1497 frame proofs
are beside it. This is an occlusion proof, NOT a complete card or PSD proof:
numeric/identity text and generated barcodes are deliberately omitted.

All faces are clear. Three weapon-fit issues remain before production:
- Brindor: hammer head/handle concealed by bottom-right flag; pushing hand also
  reaches right rail. Seed jar and protective action remain readable.
- Asteran: straight sword's distal blade and point concealed by bottom-right flag.
- Ornelle: sceptre head/upper shaft hidden under left rail; root-working hand clear.
- Keryn: partial staff and staff hand overlap left rail, but face and rope/docking
  action read clearly; parent can decide whether this utility-staff crop is acceptable.
- Tazrik: face, hands and all three projectiles clear in component preview.

See `art-b/visual-review.json`. Do not mark these as fully production-ready or
move/shrink protected rails or flags to hide these issues. Images stay stable
while parent/Einstein decide native fit versus targeted inward weapon recomposition.
Any later art revision must preserve these selected originals non-destructively.

## V2 Weapon Corrections: Ready For Native Composition

2026-09-25: parent accepted partial Keryn utility-staff occlusion and Tazrik fit,
then requested exactly one localized generative edit for each of Brindor,
Asteran and Ornelle. Three calls completed, no extra variant or Photoshop use.

Current selections in `profiles-b.json` are `brindor-v2.png`, `asteran-v2.png`,
`ornelle-v2.png`, plus unchanged `keryn.png` and `tazrik.png`. All remain
1122 x 1402. Every non-art profile field, including crop, is unchanged.

Fresh `art-b/qa-v2/contact-native-windows.png` confirms:
- Brindor's hammer head and shaft visible on the floor ahead of his feet,
  clear of the flag and position tile; jar, face and brace visually preserved.
- Asteran's straight blade rotates downward, with its point now fully visible
  inward of the flag; face, chains, pose and scene visually preserved.
- Ornelle's sceptre head and holding hand now inside the left rail/halos,
  clear of her face; root gesture, doe identity and bridge visually preserved.

Generated landmarks differ slightly from requested percentages (documented in
`art-b/visual-review-v2.json`) but all three occlusion constraints pass at the
unchanged cover crop. These are visual invariants, not pixel-identity claims
for generative edits. No native template, rail, flag or gameplay was changed.

The original five PNGs, exact requests, `qa/`, `validation.json` and
`visual-review.json` remain unchanged. `art-b/provenance-v1.json` and
`art-b/profiles-v1.json` preserve the earlier manifest/profile snapshots.
Current `art-b/provenance.json` includes the complete V1 history and V2 edit
lineage, exact requests, original generated paths and SHA256 checks.
`art-b/validation-v2.json` records all five profile/asset checks passing.

Reproduce the current proof from the project root:

```text
node V4/expansions/2026-09-24-royal-training/art-b/verify-b.cjs V4/expansions/2026-09-24-royal-training/profiles-b.json v2
```

Use a Node runtime with sharp available (or set SHARP_MODULE); no Photoshop.
The retained `profiles-preview-v2.json` is the identical candidate used before
changing active art paths. Parent/Einstein owns final native PSD/render checks
and publication. This fit proof does not certify native text or barcodes.

Parent subsequently approved all five final selections for native composition.
The final V2 overlay check passes, so selection aliases are frozen in
`profiles-b.json`; no further art iteration is needed. `art-b/READY-B.json`
is the compact handoff manifest for Einstein. This subset is five of the nine
cards being assembled by the parent/native pipeline.
