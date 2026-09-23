# Return expansion: native production contract

## Inputs owned by the art/profile producers

- `profiles-a.json`: JSON array, 7 Kalistar cards.
- `profiles-b.json`: JSON array, 8 Kalistar cards.
- `profiles-c.json`: JSON array, 7 NieR / Replicant cards.
- Each card: `key`, `characterId`, `art`, `name`, `title`, `job`, `text`,
  `element`, `race`, `faction`, `weapon`, `positions`, `role`, `atk`, `defense`,
  `magic`, `barriers`; optional `legacyId`, `sentry`, `crop`, `edition`.
- `key`: unique lowercase ASCII slug. `art`: PNG path relative to this batch,
  under `art-a/`, `art-b/` or `art-c/`. Never a temporary generated-image path.
- `text` becomes the native editable description (at most 240 characters).
  `description` is accepted as an alias, but conflicting values are rejected.
- Native title: at most 40 characters; job: at most 22; name: at most 30.
- Dice arrays are D6 to D1. `magic` and `barriers` are dice faces, not indices.
- Positions keep their supplied left-to-right order. `role` must be included.
- `crop` is optional `{zoom:1,x:0,y:0}` with the existing Atelier convention.
- Variants MUST share `characterId`. A `legacyId` must resolve in V3 and have
  exactly the same `characterId`; the original record is never edited.

## Identity decision for the coordinating parent

Parent decision: historical editions retain their model ID. `model.cjs/EDITIONS`
explicitly maps 11 canonical originals and 4 new variants. Producers may supply
`edition: "canonical"` (original ID) or `"variant"` (new 4xxxxxxx ID), but must
retain this agreed edition mapping. Canonical additions use a strictly additive reference
publication and full native regression, never the creation index. All previous
reference entries and their protected hashes are preserved. No freeze rerun.
The other seven crossover cards may omit edition (defaults to `new`).

`assemble.cjs` assigns deterministic collision-checked 4xxxxxxx IDs to new cards,
preserves the canonical legacy IDs, and writes
`set.json`. It will not replace a different existing set: finish all profiles
before assembly. Producers should not invent IDs or write `set.json`.

## Replicant banner supplied by parent

`banner/flag-Replicant-packed.png` plus `banner/faction.json`:
`{"id":"Replicant","flagHash":"<64 hex>","packedGeometry":
{"left":672,"top":829,"width":98,"height":223}}`.
The PNG must use the approved packed geometry and nontransparent content
must reach each declared edge (Photoshop imports preserve exact pixel bounds).
Other Kalistar factions reuse their own locked banks. NieR reuses its approved
Automata banner. No faction is rendered with a placeholder banner.

## Execution boundary

No Photoshop run or publication has been authorized in this sidecar task.
Parent runs `capture.cjs`, `assets.cjs --short-sword`, `assemble.cjs`, then
`build.cjs check`, `prepare [key]`, `render [key]`, `verify [key]`,
`regression.cjs` (all old references and the new canonicals), and
`publish.cjs` preflight after review.
`publish.cjs --publish` is the separate commit step. Arena publication is owned
by the parent and is neither required nor performed by this card pipeline.

The renderer preserves the 897x1497, 300dpi locked frame, editable type and
embedded components. Native verification checks frame pixels, all text fields,
corrected typography, reopened PSD identity, actual CODE128 and NONE state.
All existing approved bytes and published creations remain guarded.
