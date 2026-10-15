# Ownership Backend Handoff

## Delivered

Changed only `V3/site/local-db.js`, new `V3/site/ownership.js`, new
`V3/scripts/verify_ownership_db.cjs`, and `backend*` reports in this directory.
No app, catalogue, HTML, CSS, engine, artwork, or printed barcode edits.

- Same IndexedDB database, additive migration of populated version 1, with no
  downgrade request when local-db runs without the ownership module.
- Paris starts with exactly one registered collectible for each of 41 versions;
  Tokyo starts empty. Migration does not turn engine/opponent copies into ownership.
- Independent random 128-bit public identifiers and random 256-bit activation
  secrets. Only SHA-256 hashes, consumption state and rate limits are stored.
- Atomic one-use claims, admin issuance, two-party offer/accept/cancel/reject,
  immutable public identities, and chronologically ordered ownership history.
- Synchronous cloned registry reads; shared transactional ownership validation
  for saves, claims, transfers and imports; same-page and cross-tab cache refresh.
- Bound side-0 careers follow collectibles. Side-1 copies never earn owned
  careers. Legacy global archive APIs and original Paris side-0 history remain.
- Explicit `releaseGame(userId, matchId)` frees an abandoned game's ownership
  locks without changing engine state or creating results. Resume/save is then
  rejected. Other unfinished games retain their own locks.
- `activeGames(userId)` returns cloned full records for this profile's bound,
  unfinished, non-released matches, newest update first. It excludes legacy
  unbound games and reflects release/completion after the corresponding write.
- Legacy continuation and new saves/results require each exact seeded original
  to remain owned by Paris without a pending offer. A newly purchased KC of the
  same version cannot substitute for a sold original. Checks are transactional;
  no legacy transfer locks are introduced. Existing finalized history remains
  readable/idempotent and full registry restores preserve archived legacy states.
- Schema-2 historical backup support and schema-3 registry backups. Default merge
  cannot roll ownership or secret-consumption state backward. Explicit full restore
  replaces all tables atomically, subject to consistency checks.

## Parent Integration

See `backend-api.md` for the complete contract. In particular:

```js
game = db.registry.bindGame(userId, game);
// game.collection = {schema:1, userId, bindings:{[K3InstanceId]:publicId}, opponent:"virtual"}
db.registry.validateGame(game, userId); // true or OwnershipError
await db.saveGame(game);
await db.registry.releaseGame(userId, game.matchId); // explicit abandonment
```

`registry.initialized` becomes false after close/version change. Missing registry
support must fail closed in the UI. Sender cancellation is `cancelled`; recipient
rejection is `rejected`. Public transfer records expose exactly the six requested
fields. No `registry.meta` dependency is needed. Obtain explicit UI confirmation
before `importBackup(value, {replaceRegistry:true})` and before abandoning a game.

The legacy K3-002 rejection is deliberate: an engine copy/instance row is not a
second owned collectible. An unbound side-0 copy without an original mapping
cannot resume or add results, even after buying another KC of the same version.
Existing archives and unchanged finalized saves remain preserved; unmapped rows
do not contribute to an owned collectible's career. This does not prohibit K3-002
in a new bound game backed by a distinct real owned KC. See the dedicated 002
section in `backend-api.md` for the distinction between archive and playability.

## Verification

41/41 isolated real-browser IndexedDB scenarios pass; details and SHA-256 hashes
of tested sources are in `backend-tests.json`. Tests cover populated-v1 and
simultaneous migration, seed uniqueness, reopen, clone isolation, issue/claim
entropy and hash-only persistence, durable throttling, concurrent claims/offers/
accept/cancel/save/import, wrong actors, ownership spoofing, historical account
forgery, game leases, atomic late-failure rollback, full restore, old backups,
standalone local-db compatibility, and cross-tab refresh. Active-game getter tests
also cover nested clone isolation, profile isolation, unknown/closed registry
errors, release/completion, connected caches, reopen and full backup restore.
Seven additional legacy cases cover pending/sold originals, stale continuation
across connections and reopen, final-result/import rejection without counter
changes, same-version repurchase, existing final history/idempotence, full archive
restore, default schema-3 merge enforcement, unmapped K3-002 copies and the
standalone-loader guard on an already upgraded database.

The existing unchanged suites also pass: 61 engine tests, 26 V3 engine tests,
18 statistics tests and 11 stacked-buff tests (116 total). The bundled real roster
suite passes 41 cards, 16 arenas, 246 attack faces and 80 complete campaigns.

Commands used with the bundled Node executable:

```text
node V3/scripts/verify_ownership_db.cjs
node -e "for (const f of ['engine.test.cjs','engine-v3.test.cjs','match-stats.test.cjs','buff-stacking.test.cjs']) require('./V3/site/'+f)"
node V3/site/engine-roster.test.cjs --bundle
```

Chrome ran headless with a fresh temporary profile, isolated browser context,
intercepted local test pages, and test-prefixed databases only. The actual user
profile and actual `kalistar-v3-cards` database were never opened. Browser spawning
needed the approved sandbox escalation. Tests delete their temporary IDB databases.
UI integration is owned by the parent and was not modified or validated here.

## Limits

This is local multi-profile bookkeeping, not authentication, authorization against
a hostile local user, or server security. Anyone controlling devtools, browser
storage, the system clock, or a fully rewritten backup can bypass local controls.
There are no emails, passwords, remote services, or security claims about global
ownership. Throttling is local friction. A confirmed full restore can intentionally
roll back ownership and reactivate a previously unused backed-up secret; default
merge rejects such conflicts. Unbound legacy games remain Paris history and do not
hold registry leases. Their continuation requires the exact original collectibles;
default historical imports that cannot meet the guard are conservatively rejected.
Full restore can preserve them as archives without making them playable. Released
games cannot resume; start a newly bound game.
Cross-tab synchronous reads are eventually refreshed via BroadcastChannel; every
write rechecks authoritative IDB state regardless of cache freshness. Explicit
`refresh()` is available before rendering. Storage durability and quotas remain
browser-managed, and this bounded local implementation reads table snapshots per
transaction rather than claiming large-scale server performance.
