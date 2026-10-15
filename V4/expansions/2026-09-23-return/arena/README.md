# Replicant Village Arena Proposal

One unpublished arena: `replicant-village.png`, 1672 x 941 PNG.
`spec.json` supplies exact workspace source and proposed registry entry.
`manifest.json` wraps that spec in the existing arena-batch format.

- Collaboration key: replicant, distinct from nier.
- Element: AERO, numeric ATK +15.
- Home characters: nier-replicant, kaine-replicant, devola-nier, popola-nier.
- Home numeric ATK/DEF: +10/+10, matching current arena limits.
- Intended future media path: /jeu/assets/arenes/replicant-village.png.

Shared twin identities mean both game variants qualify for their requested
home affinity; this does not merge the NieR and Replicant faction bonuses.
The arena remains gated until a character id ending -replicant is present.

Art was generated once using the built-in image tool and retained unchanged.
Exact prompt and references: request.json and provenance.json. Official World
references establish the village/Northern Plains; additional actual gameplay
captures identify the library facade and fountain. Layout is a painterly
reinterpretation, not a claim of exact in-game map geometry.

Sources:
- https://www.jp.square-enix.com/nierreplicantv1p2/world_sp_village_northenplains.html
- https://e-poko.com/entry/2025/03/22/215900
- https://www.pcgamer.com/nier-replicant-pc-review/

`verify.cjs` checks every decoded pixel for opacity, image dimensions/variance,
generated-original byte identity, all reference decodes/hashes and the real
game-catalog collaboration-arena validator. Gating, home-id filtering, excessive
bonuses and duplicate-id rejection pass. See verification.json.

Not published: no game registry, source catalogue, media destination or shared
file changed. Parent owns integration and in-game screenshot review. The old
nier-arenas-01 publisher has hardcoded IDs and must not be executed for this set.
