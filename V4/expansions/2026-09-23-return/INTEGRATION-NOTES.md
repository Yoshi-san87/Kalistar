# Parent integration notes

Native pipeline only; no Photoshop call or publication performed.

Dependencies captured: 31 existing creations, 188 files, plus the approved
reference source set. Short-sword component prepared and viewed: full alpha
radius 38.539px, optical error 0.559px. Fifteen pipeline tests passed, including
a complete isolated 22-card publication and rollback checks. Twenty-two existing
catalogue/arena/static-build tests also pass.

DO NOT modify game-catalog.cjs, engine.js, designer-core.cjs or native scripts
after capture. The UI worker can edit site UI files; none is a pinned pipeline
dependency. A necessary shared-core change must be coordinated explicitly before
preparation, with a documented source revision rather than overwritten hashes.

Parent owns Photoshop execution. Current no-go is input validation plus the
unfinished packed banner, not a renderer failure. Once those are fixed: assemble,
check, prepare; render/verify one canonical and one new collaboration, inspect
visually; then render/verify the other keys; full regression; preflight; publish.
Do not run the default render after rendering two pilots: it rerenders all cards.
Use the remaining individual keys or choose one full batch from the outset.

## Input issues found (do not silently repair producer data)

- profiles-c / popola-automata: role 5 ATK D4 is 128; maximum is 120.
- profiles-c / popola-replicant: text is 243 characters; limit is 240.

## Explicit canonical mapping

Original IDs: zviri-tueuse, julienne, verminia-bureau, polux, nazar,
capitaine-skully, xiaomi, gen-reparation, lanio-astraball, reevus, kognus.
New variant IDs: zviri-chasse, verminia-portail, gen-electro, lanio-mines.
This keeps the original combat identity (Verminia's P3 bureau profile;
Lanio's Astraball). Verminia portail is a new P4 profile. All four variants keep
their legacy characterId. No old owned copy is replaced by a new model ID.

NieR/Replicant has seven new 4xxxxxxx IDs. The twins intentionally share
devola-nier / popola-nier across factions. HUMAIN for Nier and Kaine is a
game-category adaptation, not a claim that Replicants are Androids. Commander
and both generations of the twins use ANDROID.

Art paths may be batch-relative or use the exact root-relative batch prefix;
normalization strips only that known prefix. Banner paths are under banner/.

The missing short-sword bank is prepared with the already approved native
enamel and the V3 weapon 16 silhouette. The existing optical calibrator is
reused; full alpha radius <=39, optical error <=0.75px. No Photoshop needed
for this deterministic source preparation.
