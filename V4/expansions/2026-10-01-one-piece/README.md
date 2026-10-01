# One Piece - 1 October 2026

Eleven unpublished fan crossover models, IDs 49800101..49800111, ten characters.
No official collaboration is claimed. No catalogue, Git, publication, preset or
arena writes in this task. Existing external deployment changes are not ours.

## Profiles

All profiles use faction and collaboration ONEPIECE. Luffy is role 2, P1/P2/P3,
NONE with no magic or barriers. Zoro has ATK death and DEF dodge. Sanji remains
role 4 with P3/P4 compatibility. The two Chopper versions share
tony-tony-chopper-op, so they cannot coexist in a deck.

The requested Grimoire maps to the existing native Tome weapon; there is no
Grimoire key in the weapon matrix. Robin uses Poing for her canonical grappling
and strikes, not an invented orb. Sanji's Poing includes unarmed leg techniques,
Nami's Lance maps her long weather baton without inventing a spear blade.
Crystals and Kalistar races are game classifications, not canonical biology.
The small Chopper uses HERBO medicine/support; Heavy Point uses MINERO endurance.
Brook provides mana and physical support, never revive. Chopper's revive is the
existing preventive Reraise, not resurrection from the graveyard.

The pure One Piece QA deck selects small Chopper and excludes Heavy Point.
Coverage is P1:3, P2:3, P3:4, P4:2, P5:2 with a simultaneous lineup. Selecting
Heavy Point instead needs another P5 from outside this set. No preset is installed.
Stat choices follow current role bounds; this is not a statistical win-rate study.

French printed descriptions are 170-180 characters. Native verification also
requires no more than four rendered lines. Names include MONKEY D. LUFFY,
RORONOA ZORO and NICO ROBIN with approved native typography.

## Ownership And Art

This agent owns this expansion and five current artworks: Luffy, Zoro, Sanji,
Nami, Usopp. Parent explicitly took both not-yet-started Chopper generations.
Other agent owns one-piece-assets-01 and Robin, Franky, Brook, Jinbe.
The original seven-art allocation and transfer are recorded in coordination.json.

Each first asset uses one built-in imagegen call. Explicit parent QA requested
one targeted face revision for Luffy and Zoro: natural young-adult anatomy using
RE_leon4_01 as face-painting anchor, preserving costume and narrative scene.
Initial versions remain archived; final revised versions are parent-approved.
No initial anime-face version may enter production.
Art approval and native technical verification are distinct.

## Native Pipeline

Reuses the proven Resident Evil pipeline and its unchanged Nier typography and
component/barcode verifier. Text stays editable, components are embedded smart
objects, fixed-frame pixels must match and reopened PSD rendering must be exact.
Photoshop must be COM190, version 26.11.7, with both render.lock and named mutex.

Portable CI: run model.test.cjs with Node's --test; it uses only standard Node
modules, project JSON and the actual portable V4 engine. No sharp, Photoshop
or local absolute runtime is imported. Native Windows tests are separate:
native.test.cjs, pipeline.test.cjs and typography.test.cjs, with
--test --test-isolation=none. None of these tests starts Photoshop.

Only after parent art review and other-agent final input stability:

- art-audit.cjs verifies provenance and images without changing prompts.
- build.cjs freeze requires KALISTAR_OP_ASSETS_STABLE=2026-10-01.
- build.cjs prepare creates native components, profiles and draft previews.
- build.cjs render requires KALISTAR_OP_PHOTOSHOP_HANDSHAKE=2026-10-01.
- build.cjs verify checks every reopened PSD and actual barcode.
- delivery.cjs creates the pre-publication release manifest, never publishes.

Never refresh the dependency freeze to hide a failure. Parent coordinates the
eventual catalogue integration and push. Do not overwrite protected references.

## Parent Publication Handoff

The future release consumes cards/<key>/profile.json, card.psd, card.png and
verification.json only after delivery.cjs succeeds. The release manifest names
every source and output with SHA-256; counts derive from the live catalogue.
The collaborator's separate handoff.json and provenance.json cover faction,
race, filter and four artworks; they must accompany the parent release.

There is deliberately no publish action in build.cjs. The separate publish.cjs
defaults to a read-only preflight; --publish requires the explicit parent gate
KALISTAR_OP_PARENT_COORDINATED=2026-10-01. The parent-approved order is One Piece
publication first, then Skull Face. Existing sources must remain unchanged until
One Piece publication completes; do not edit fixed inputs after preparation.
Do not stage deploy/README.md, deploy/build.cjs, deploy/build.test.cjs,
site/boot.js or preexisting verification images as this task's changes.
HEAD f862a26c was reported as a preexisting user commit and is not our work.

Portable CI command from the active clone root:

```text
node --test V4/expansions/2026-10-01-one-piece/model.test.cjs
```
