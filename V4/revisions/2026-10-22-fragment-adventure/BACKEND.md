# Fragment adventure: reward and save compatibility

Scope: migration, authoritative reward projection and isolated regression tests.
No real account/database, browser session, secret, game rule, asset, version,
shared test registry or Git index was changed by this work.

## Integration contract

Apply `V4/deploy/supabase/migrations/202610220013_journey_momo_reward.sql`
only to the personal Kalistar project after a verified pre-migration backup.
The script accepts registry version 11 or 12, requires the known Momo book at
`journeys-1` with seven stages, and is transactional and repeatable. It advances
registry version to 12. It does not reset or rewrite personal rows.

Future, unclaimed Momo receipts use `30000014`, LE BAL DES OBJETS PERDUS.
Existing `30000001` receipts and specimens remain unchanged, including a receipt
awaiting its animation ACK. A completed-but-unclaimed player receives the new
version. A completed-and-claimed player cannot claim again, even after transfer.
The original `(user_id,book_id)` receipt key and owned-model uniqueness remain.

`kalistar_journey_library()` now returns, per book:

- `rewardModelId`: actual claimed version if present, otherwise configured reward.
- `configuredRewardModelId`: current reward for an unclaimed book (`30000014`).
- `claimedRewardModelId`: actual historical receipt version, or null.
- Existing progress, equipment receipts, ACKs and active attempt fields unchanged.

`journey-client.js` projects the effective server `rewardModelId` into
`snapshot().books`. UI code using these books therefore gets the correct cover,
reward details and ceremony model without changing the configured definitions.
The client rejects a known reward belonging to another character or malformed
receipt identity. New fields are optional for old server responses.

UI integration must not rebuild the books directly from static definitions after
refresh, and must retain the cover mapping for old `30000001` as well as new
`30000014`. A replayed claim still returns the actual collectible certificate.

## Existing tester behaviour

No Paris/Tokyo state was inspected. The approved starter distribution already
includes `30000014` for Tokyo; Paris received a full set. If either still owns
this model when making a first Momo claim, the receipt reuses it (`alreadyOwned`)
instead of minting another. If they already claimed the old Momo reward, the
old receipt remains final and the continuation stays available at its earned
progress. Testing a fresh full card award requires an isolated account/fixture,
not a reset of either personal account.

## Combat compatibility

No changes to `journey-combat.js`, engine modules or hash allowlists.
Executable runtime SHA-256 remains:

`84a92b1a93b6f8ff6d11ec8a8af187f9061509c196c563a64c31a4fb9a233c9e`

The public journey definitions and client UI are intentionally outside this hash.
Initialized games retain their saved opponent, arena, profiles, equipment and
sequence. Real Worker context/move tests prove this after the SQL migration and
a changed public catalogue. New definitions are not retroactively applied.

An attempt with sequence 0 and no initial state has not yet presented a team or
drawn its opening: the Worker initializes it once from the current stable book
and stage, keeping its saved player deck, specimens, seed and attempt identity.
The test covers this current-hash path and repeated context reads without a new
initialization. Keep book IDs, stage IDs/indices and `journeys-1` stable. Rerun
`journey-compatibility.test.cjs` against the final definitions too, particularly
the much older pre-snapshot pending-attempt path using the frozen 4.6.85 catalogue.

## Deck audit

The starting code used fixed `stage.deck` lists, with a shared `base` for most
original encounters. `journey-combat.initial()` passed these lists directly to
`Team.fromPreset`; no progressive-deck selector was wired in that path. The
narrative deck work must replace the actual 21 definitions, not merely add an
unused difficulty helper. No change to AI rules is part of this backend work.

## Verification

New `progression.test.cjs` runs in fresh in-memory PGlite/PostgreSQL only:
transaction rollback, idempotent migration, guarded identity mismatch, unchanged
personal tables, old and new receipts, transfer/non-reminting, existing-model
reuse, unique index, unauthorized progress, RLS/signatures, stage 4/5/6 ACK gates,
real Worker snapshot resume, pending initialization and logical backup restore.
The ACK-gate test fixtures earned wins explicitly; it is not a claim of full
signed combat simulation. Existing Supabase journey tests cover actual outcomes.

Completed commands (Node 24 runtime on this PC):

```text
node --test V4/revisions/2026-10-22-fragment-adventure/progression.test.cjs V4/site/journey-client.test.cjs V4/deploy/supabase/backup.test.cjs V4/deploy/journey-compatibility.test.cjs
node --test V4/deploy/supabase/journeys.test.cjs
```

Results before the parallel definition rewrite: the first command passes
141/141 tests; the historical Supabase suite passes its 21 subtests (22 including
the parent test). No skips. These are isolated backend/client checks, not a
claim of final UI acceptance or a deployed migration.

The historical 001-009 test intentionally retains its original Momo SQL reward;
its comparison now allows the explicit old/new definition pair without changing
historical migrations or their hash checks.

`journey-sequels.test.cjs` must also pass after definition integration. During
parallel work it correctly fails at the Momo reward assertion while SQL returns
`30000014` but the not-yet-updated definition still says `30000001`. Do not relax
that assertion. Balmhyr/Kaylis full sequel tests already pass.

Register the new progression test in the shared `local` suite (PGlite required);
that registry remains owned by the integrating task. `browser-fixture.cjs`
already loads sorted migrations and needs no edit. Backup bundling now accepts
schema 12/13 migration files while keeping schema 11/12 files for pre-migration
backups. No production migration or publication has been performed here.
