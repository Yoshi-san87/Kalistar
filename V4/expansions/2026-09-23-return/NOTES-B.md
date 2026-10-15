# Return Expansion: Art B

Eight independent illustration/profile deliverables. Parent owns model IDs,
native composition, game catalogue publication and final card QA. No native
template, shared file, Photoshop document or Git state was changed here.

## Profiles

`profiles-b.json` is an array. Card fields are top-level, using `text` for the
printed description. `legacyId` is provenance metadata, NOT the new model ID.
Six returning profiles preserve the V3 gameplay exactly: Skully, Xiaomi,
Gen repair, Lanio Astraball, Reevus and Kognus. Lanio Astraball's text has only
French punctuation/accent corrections; no narrative or gameplay change.

- Skully: NECRO, SKULLZ, Cryptown, short sword, P3. Trefle ATK D3.
- Xiaomi: NONE, HUMAIN, Z13, Katana, P2. Esquive DEF D3.
- Gen repair: NONE, CYBORG, Z13, Projectile, P4, no magical face/barrier.
- Gen Electro: new variant, ELECTRO, same identity/race/faction/weapon/P4.
  ATK [286,238,188,mana,90,40], DEF [169,138,108,80,49,24].
  Magic D6/D5/D4/D2, barriers D5/D3. Numeric values slightly below base Gen;
  D3 potion replaces damage. No Reraise or guard reserved to support/tank.
- Lanio mines: new variant, NONE, HUMAIN, Z13, Lance, P3. Lower numeric values,
  ATK D2 trefle replaces damage; DEF D3 dodge versus Astraball's D4 dodge.
- Lanio Astraball: NONE, HUMAIN, Z13, Lance, P3, preserved legacy values.
- Reevus: NONE, NAIN, Z13, Fleau, P3. ATK D1 physical buff preserved.
- Kognus: NONE, NAIN, Z13, Dague, P2. DEF D1 trefle preserved.

Keep shared `characterId` gen and lanio across their variants, preserving the
one-character-per-deck rule. All other identities are original V3 identities.
NONE profiles must keep zero advantage/disadvantage and `sentry:false` like
their sources; Skully/Gen Electro use normal 30/30 and `sentry:true`.
These bounds checks are not a claim of simulated win-rate balance.

## Art

Five source illustrations already matched the requested moment and Kalistar
DA, so they are copied byte-identically rather than regenerated. Three final
artworks were generated with the built-in image tool, using viewed Momo,
Valazar and each existing character as references. Exact submitted requests
are the `*.request.json` files, with original paths and selection reviews in
`provenance-b.json`. Gen's first output was rejected for the wrong arm side;
the corrected selected version has the full mechanical LEFT arm.

Final native layout still needs crop review: Xiaomi's long blade approaches
the right edge, Gen's electrical contact is toward the left, and Lanio's upper
hand is near the top/right. Retain as much full illustration as possible.
Do not silently call the wrong-arm rejected image `gen-electro.png`.

No complete-card image was generated; no paint patches or frame alteration.
