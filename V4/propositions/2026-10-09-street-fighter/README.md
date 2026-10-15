# Street Fighter - Illustration Proposals

Twenty standalone illustrations for user review, 9 October 2026. No cards,
stats, faction, banner, catalogue entry or game version is changed by this set.
This is a fan-art proposal, not an official collaboration.

`index.html` is the local desktop/mobile gallery. Each image opens its original
PNG. These files are original built-in image_gen outputs, not repainted cards.
`prompts.json` preserves the first-wave prompts. `provenance.json` preserves
the source paths and awaiting-selection status. Originals remain untouched.

Momo and Valazar were opened and visually studied before generation. Their
painted colour planes, visible strokes, worn materials and expressive faces
guide this series. After the first two calls, the user reinforced the need for
especially quiet backgrounds; the remaining prompts explicitly prioritize
broad low-detail masses and a single setting cue. Ryu and Ken subsequently
received background-only simplifications, now displayed as `*-v2.png`.
Their original proposals remain preserved. `background-edits.json` records
the exact edit prompts, inputs and outputs and supplements `provenance.json`.

The second wave adds Balrog, Sagat, E. Honda, Dee Jay, Fei Long, T. Hawk,
Rose and Dan Hibiki. Their fighting styles vary the actions: boxing hook,
Muay Thai knee, sumo palm strike, rhythmic jab, precise interception,
two-flat-hand guard, scarf deflection and a modest Gadoken.

User-requested revisions now displayed:
- Guile v4: wider full-body stance, arms spread and a clear Sonic Boom arc.
- Chun-Li v3: entirely new scene with brown tights, then a wider framing
  preserving the new pose, face and quiet courtyard.
- Vega v3: raised guard inside his cage; straight claws may exit the top
  of the canvas instead of being shortened or bent to fit.
- Juri v2: a new grounded stance and expressive face.
- T. Hawk v2: both hands open and flat in his characteristic guard.

Prompts and iteration records:
- `round-2-prompts.json`: initial additions and revision requests.
- `round-3-prompts.json`: fresh Guile, Vega and Chun-Li scenes, plus
  adjusted final prompts for T. Hawk, Rose and Dan in `remainingWave`.
- `guile-round-4-prompt.json`: Guile's wider Sonic Boom composition.
- `chun-li-reframe-prompt.json`: modest zoom-out of the new Chun-Li.
- `t-hawk-guard-prompt.json`: two-flat-hand guard edit.
- `revision-results.json`: actual generated sources, superseded variants
  and the initial unsuccessful clothing-only edit, before the user requested
  a completely new Chun-Li scene.

Old images remain intact under versioned names. `provenance-round-1.json`
preserves the first manifest. All images use the built-in image generator.
The current gallery's source hashes, image links and responsive layout
are checked by `node verify.cjs`; new proofs are in `verification/round-2/`.
Earlier verification files are preserved.

No playable card production or publication until the user selects artwork.
