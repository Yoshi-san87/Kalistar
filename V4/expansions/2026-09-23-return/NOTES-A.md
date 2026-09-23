# Return Expansion: Art A

Seven cards prepared. Owned paths only: `art-a/`, `profiles-a.json`,
`provenance-a.json`, this file. No Photoshop, catalogue, shared source or Git edit.

## Profiles Ready For Integration

| Key | Identity | Element | Role / deployment | Gameplay |
| --- | --- | --- | --- | --- |
| zviri-tueuse | zviri | NECRO | P2 / P2 | Exact V3; Mort D4, Esquive D6 |
| zviri-chasse | zviri | NECRO | P2 / P2 | New hunter; no Mort, luck ATK D1, DEF reroll D2, Esquive D6 |
| julienne | julienne | HYDRO | P5 / P5 | Exact V3; guard D2, Reraise D1 |
| verminia-bureau | verminia | HEMATO | P3 / P3 | Exact V3; only scene/title/text changed |
| verminia-portail | verminia | HEMATO | P4 / P3,P4 | New caster; more magic, mana D3, lower numeric DEF |
| polux | polux | PYRO | P5 / P5 | Exact V3; Reraise D2 |
| nazar | nazar | GEO | P1 / P1 | Exact V3; new Canyonero scene, guard D2 |

All arrays are D6 to D1. `magic` and `barriers` use dice face numbers.
Legacy IDs are metadata only; parent owns canonical publication/creation IDs.
Both Zviri versions must share `characterId: zviri`, both Verminia versions
`characterId: verminia`, preserving single-character deck validation.

The user requested variants but no class rebalance for returning base versions.
Consequently base gameplay is unchanged, while the two added variants trade
off existing strengths. Zviri hunter loses instant death and damage for luck;
Verminia portal trades Middle defense for a P4 magic/support profile.
No rules were changed. All numeric faces respect principal-role bounds.

## Illustration Decisions

Reused byte-identically: original Zviri Tueuse redoutable, Julienne and Polux.
Each was opened and compared to Momo/Valazar; no new scene was requested for
these three and their emotion, materials and anatomy already fit Kalistar.

Four separately generated assets via built-in imagegen: hunting Zviri,
Verminia at her desk, Verminia closing a magical portal, Nazar on patrol.
Exact calls are the adjacent `*.request.json` files. Reference 1 is identity;
Momo and Valazar are references 2/3 for DA. All original reference images were
visually inspected first. No frame generation or deterministic image editing.

Nazar keeps Zarok faction and GEO. Canyonero is the new requested location,
not permission to rewrite his identity. His link as Belrog's son is present
in chapter 10 (`V3/sources/sources-extraites.json`) and the V3 narrative notes.
Verminia desk/portal stories and Zviri hunter are new narrative propositions,
not passages claimed to come from the manuscript.

## Remaining Parent Checks

Local validation passed for all seven profiles and image assets; detailed
check list in `art-a/validation.json`. All seven PNGs are 1122 x 1402. Three
reuse assets are byte-identical to V3. Five base game profiles were compared
field-for-field to their V3 source, plus positional bounds for both variants.

Compose from current locked template; preserve native text/components.
Inspect face, weapon and action in the actual art window and small game card.
Nazar's spear is nearly full-height: retain the 4:5 composition without extra
zoom. Zviri hunter's whip extends left, but face and tracking gesture remain
central. Verify final native barriers/icons/barcode/PSD before publication.
No assets here are labelled user-approved or published.
