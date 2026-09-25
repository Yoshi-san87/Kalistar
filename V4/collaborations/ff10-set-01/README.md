# Kalistar x Final Fantasy X

Eleven native cards, ten characters, two ten-card decks and two arenas.
Private fan reinterpretation, not an official collaboration.

Published locally on 2026-09-25: 100 cards / 25 arenas, previous 89 preserved.
All eleven native proofs pass; 36 targeted tests pass after publication.
See `READY.md`, `native-contact-11.jpg` and `publication-result.json` for the
current outputs, exact installed hashes and transaction backup. No Git or
server restart was performed by this pipeline task.

## Contract

`set.json` is the immutable preparation input once a card is prepared. Changes
invalidate its native preparation hashes. Every numeric face is bounded by the
actual primary role in `V3/donnees/regles_demo.json`; compatible positions never
combine their stat ceilings. Both Tidus cards have `characterId: tidus-ff10`.

| Key | Model ID | Role | Positions | Weapon | Crystal |
| --- | --- | --- | --- | --- | --- |
| tidus-epee | 40738164 | P1 | P1/P2 | Epee longue | HYDRO |
| tidus-blitz | 46513388 | P3 | P3/P4 | Projectile | HYDRO |
| wakka | 49451961 | P4 | P1/P4 | Projectile | ELECTRO |
| lulu | 43120563 | P4 | P4 | Tome | NECRO |
| auron | 41124231 | P1 | P1 | Epee longue | PYRO |
| yuna | 42258087 | P5 | P5 | Sceptre | LUXO |
| kimahri | 41354159 | P1 | P1/P3 | Lance | AERO |
| rikku | 40032462 | P2 | P2 | Dague | GEO |
| jecht | 46269197 | P2 | P1/P2 | Epee longue | PYRO |
| seymour | 41536078 | P4 | P4 | Sceptre | NECRO |
| yunalesca | 43726101 | P5 | P3/P5 | Orbe | HEMATO |

The requested Grimoire is the existing Tome category; the crystal sphere is
Orbe, exactly as Adam's current profile. Sang is HEMATO. Kimahri uses FELINEUS
as a gameplay mapping of Ronso, Seymour CERELF for Guado ancestry; these are
not literal Final Fantasy species claims. No new race or weapon component.

Yuna and Yunalesca supply two P5 supports. Sword Tidus deck coverage is
5/3/2/3/2; blitz Tidus deck coverage is 4/2/3/4/2. All ten positions can be
deployed through a complete P1-P5 formation. The two variants cannot coexist
in a legal deck. Initial bounded values are not a statistical win-rate claim.

## Sources And Rendering

- `art-a/`: Tidus variants, Auron, Jecht. Parent-owned accepted aliases only.
- `art-b/`: Yuna, Lulu, Rikku, Yunalesca.
- `art-c/`: Wakka, Kimahri, Seymour.
- `arenas/`: generated arena images and flag texture, separate ownership.
- `prepare-flag.cjs`: exact approved FF8 pennant alpha, 98x223 at (672,829).
  Existing bar and shadow stay in the native frame; no silhouette regeneration.
- `cards/<key>/`: profile, source illustration, preview, native PSD/PNG/proofs.
- `compose-one.jsx`: isolated native composition using the verified NieR
  typography helper; Times New Roman identity fields, native editable stats,
  embedded image/components. No shared renderer edits.
- `render.ps1`: attaches only to Photoshop.Application.190, version 26.11.7;
  it never launches a second version or closes pre-existing user documents.

Descriptions have 195-210 characters; preview and native checks enforce at
most four lines. Native gates also require exact fixed-frame pixels, zero
severe component deltas, reopened-PSD identity, native fields, typography,
embedded smart objects and decoding the real rendered barcode.

## Preservation And Publication

`dependencies.json` locks current shared code/resources. Do not rewrite hashes
to hide drift. `existing-created.snapshot.json` preserves all 51 current created
cards and 308 files, including the latest Kaylis revision. The existing
reference lock retains 38 canonical cards. Publication adds eleven entries and
never rewrites the existing 89 cards, their images, PSDs or profile metadata.

The local publication core derives from the tested FF8 transaction. Its only
identity adaptation is explicit shared `characterId` for Tidus. It stages and
hash-checks media, checks concurrent index/source changes, atomically commits
the catalogue and permits recovery of matching orphan directories. The guard
revalidates all existing files and preparation proofs before index commit.

Integration files outside this folder are restricted to:
`V4/site/collaborations.js`, `V4/atelier/game-catalog.cjs`,
`V4/donnees/arenes-collaborations.json` and new FF10 faction/arena PNGs.
No UI, gameplay engine, component bank or reference registry change.

## Commands

Run with the configured Node runtime from the Kalistar root:

```powershell
node --test --test-isolation=none V4/collaborations/ff10-set-01/pipeline.test.cjs V4/atelier/game-catalog.test.cjs V4/atelier/collaboration-arenas.test.cjs
node V4/collaborations/ff10-set-01/freeze.cjs
node V4/collaborations/ff10-set-01/prepare-flag.cjs
node V4/collaborations/ff10-set-01/build.cjs check
node V4/collaborations/ff10-set-01/build.cjs prepare [key]
node V4/collaborations/ff10-set-01/build.cjs render [key]
node V4/collaborations/ff10-set-01/build.cjs verify [key]
node V4/collaborations/ff10-set-01/install-environments.cjs
node V4/collaborations/ff10-set-01/publish.cjs
node V4/collaborations/ff10-set-01/publish.cjs --publish
```

The parent must explicitly authorize the first native run and publication.
Do not render unaccepted illustrations. `prepare` never runs Photoshop but
does invoke the existing barcode helper and may need process permissions.
No Git operation belongs to this pipeline.

The initial native/publication authorization has now been fulfilled. These
commands document production and are not an instruction to regenerate the
published cards. Use a separate revision for subsequent changes.
