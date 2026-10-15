# Replicant Arena And Public Banner Publisher

Implementation and fixture verification only. No production preflight or
publication has been run by this worker. Do not remove an occupied render.lock.

## Scope

Exactly one additive registry entry: replicant-village. Exactly two public media:

- V4/site/assets/arenes/replicant-village.png
- V4/site/assets/factions/Replicant.png (full 109 x 230 flag, not packed)

No card profile, reference, card publication, native component, old arena
publisher or other shared source is edited. Existing different media are an
error, never overwritten. Identical existing media are reused without rewriting.

## Parent Review Prerequisite

After reviewing the full and packed banner, add this second member under
`assets` in arena/art-review.json, preserving the existing village review:

```json
"faction-Replicant": {
  "sha256": "e97d77b787f98aaae448ef6d0181aab4ef8c6f7217a7ab29164ec654c3fc46ec",
  "packedSha256": "ee380b3c1e886151cef44e9c2cb0203f1f0492d95246d9a43847ee25a39b976b"
}
```

This is intentionally not inferred from the technical verification report.
Without that explicit hash-bound review, both preflight and publish reject.
If the artwork changes, a new review must bind its newly verified hashes.

The four home character identities must already exist in the real built game
catalogue with faction Replicant and origin approved/published. Automata-only
Devola/Popola versions do not satisfy this prerequisite. The arena's requested
home affinity still uses shared character IDs during gameplay.

## Commands For Parent

Run only after card publication and after Photoshop releases the render lock:

```powershell
node V4/expansions/2026-09-23-return/arena/publish.cjs
node V4/expansions/2026-09-23-return/arena/publish.cjs --publish
```

The first command is read-only preflight. Factory injection of root,
buildCatalog, decodeImage and checkpoints is reserved for isolated tests.

## Safety Properties

- Registry data is parsed and validated with the real collaboration-arena
  validator. A single byte insertion appends the new entry, preserving all
  previous bytes, formatting, BOM and line endings, not just parsed values.
- Faction metadata, source/packed/full flag hashes, native outline hash, alpha
  proof, arena proof and both visual reviews are bound to current files.
- Paths are rooted in the selected workspace; symbolic links/junctions reject.
- Exclusive render lock, exclusive media copies, read-set rechecks before
  commit, and an atomic same-directory rename install the registry last.
- Before/next registry bytes and immutable preparation/result journals are
  retained under arena/publication/<transaction-id>/.
- On failure after commit, the old registry is restored only if the registry
  still equals this transaction's next bytes and the lock is still owned.
- Only media actually created here with unchanged file identity/hash can be
  removed. Existing media are never deleted. Foreign registry/media edits or
  foreign locks are preserved and reported as rollback conflicts.
- A hard process/power interruption is not an automatic rollback. Journals
  support inspection; no blind recovery or cleanup command is provided.

## Verification

21 isolated tests passed with Node --test --test-isolation=none, including:
read-only preflight, actual faction gating, test-only rejection, missing/stale
visual reviews, hashes/formats, conflicts, lock ownership, byte-preserving
append, idempotence, missing-media repair, source/destination races, junction
rejection, rollback before/after registry commit, preservation of foreign
edits, final async-catalogue race, and real PNG decode/publication in a fixture.

```powershell
node --test --test-isolation=none V4/expansions/2026-09-23-return/arena/publish.test.cjs
```

Fixture roots are validated temporary directories, removed after each test.
No fixture card, image, registry or test review is written to production.
