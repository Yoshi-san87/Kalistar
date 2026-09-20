# Local ownership backend contract

Load `ownership.js` before `local-db.js`. The existing database API remains;
`db.registry` is exposed only when the ownership module is loaded.
`KalistarOwnership.PARIS` is `user-paris`; `TOKYO` is `user-tokyo`.
These are local profiles, not secure authentication or a server authority.

## Synchronous UI API

- `users()`, `user(id)`, `owned(userId, cardId?)`, `get(publicId)`,
  `transfers(userId)`, `events(publicId)` return cloned cached records.
- `deckErrors(userId, cardIds)` returns ownership errors only. Deck rules
  remain the engine's responsibility. Repeated versions require separate collectibles.
- `bindGame(userId, game)` returns a clone. New setup games receive
  `collection: {schema:1, userId, bindings, opponent:"virtual"}`. `bindings`
  maps side-0 engine `instanceId` to public collectible ID. Units and schema 6
  stay unchanged; side 1 never owns anything. Existing bindings are preserved.
  An old unbound game beyond setup may be preserved only by Paris, unchanged,
  subject to the exact-original legacy checks below.
- `validateGame(game, userId)` returns `true` or throws. Account identity is
  always checked. Persisted finished history may outlive current ownership.
- `career(userId, cardId, publicId = null)` has the existing `db.career` shape.
  Bound career rows follow the collectible to its current owner. Original legacy
  side-0 history follows the original seeded collectible, never an AI copy.
- `matches(userId)` filters by bound account; unbound legacy games belong to Paris.
- `activeGames(userId)` synchronously returns cloned full match records, ordered
  by `updatedAt` descending, for this profile's bound, non-finalized, non-released
  games only. Legacy unbound games are excluded. Unknown profiles throw
  `UNKNOWN_USER`; a closed registry throws `REGISTRY_UNAVAILABLE`. Await `db.idle()`
  before reading pending saves, or `registry.refresh()` for explicit cross-tab refresh.

## Async API

`issue(actorId, cardId)` (Paris admin only) returns `{collectible, code}`;
`activate(userId, publicId, code)` returns the claimed collectible;
`offer(userId, publicId, toUserId)`, `accept(userId, transferId)` and
`cancel(userId, transferId)` return a transfer. Only the recipient can accept;
the sender can cancel (`cancelled`) and the recipient can reject (`rejected`).
Collectible statuses are `owned` and `unclaimed`; transfer statuses are `pending`,
`accepted`, `cancelled`, and `rejected`. Errors have `name: "OwnershipError"`, a
stable `code`, and a readable French `message`. `registry.initialized` is true
only after successful initialization and becomes false when the connection closes.
Pending offers exclude another offer and new bindings.
Public transfer records contain exactly `id`, `collectibleId`, `fromUserId`,
`toUserId`, `status`, and `createdAt`. Backups also preserve an internal
`resolvedAt` timestamp for resolved transfers to replay ownership in causal order.
Unfinished saved games block transfer. All mutations re-read transactional state;
cached state is not trusted. `refresh()` explicitly refreshes this connection.
Same-page connections are refreshed after writes; other tabs refresh on broadcast
or explicitly before displaying changes. `db.idle()` waits for this DB's queue.

`await registry.releaseGame(userId, matchId)` explicitly abandons an unfinished
bound game and returns `{id, matchId, userId, releasedAt}`. Only the game's profile
can release it. This is idempotent and recorded in registry metadata/events. It
releases that game's ownership locks without changing engine state, fabricating
results, or deleting history. Another unfinished game can still hold a lock.
Released games remain in `matches(userId)` as archives but `validateGame` and
`saveGame` reject resuming them (`LEASE_RELEASED`). Confirm abandonment in the UI.
They disappear from `activeGames(userId)` after `releaseGame` resolves. Creating
a new game does not implicitly release another game; the UI chooses and confirms
the game to abandon, then awaits its release before proceeding.
There is no required `registry.meta` API.

## Legacy continuation

Call `validateGame(game, userId)` for every game, including unbound legacy games,
before resuming, importing or progressing it and after ownership changes.
An unfinished unbound game can continue only as Paris, and every side-0 unit
(board, reserve and dead) must match a seeded collectible by its exact
`legacyInstanceId` and `cardId`. That original must still be owned by Paris, with
no pending transfer. A different KC of the same version cannot substitute for it.
Missing mappings (including old synthetic K3-002 copies) and sold originals throw
`NOT_OWNER`; pending offers throw `PENDING_TRANSFER`. Side 1 stays virtual.

`saveGame` rechecks this rule in its write transaction for new or updated legacy
states, including newly submitted final results. It is also enforced by standalone
local-db when it opens an already upgraded registry. No new legacy locks are
created: old games do not block offers, but a pending offer or transfer blocks
their continuation. `activeGames` remains limited to explicitly bound games.

Already stored finalized games with identical state remain valid historical
reads and idempotent saves/imports, even after transfer or with unmapped old copies.
Their recognized history continues to travel with mapped original collectibles.
Default imports conservatively reject new legacy states/results whose originals
are sold, pending or unmapped; they do not enrich the new owner's career.
Validated full schema-3 registry restores (including restoration into a pristine
seeded target) preserve all archived legacy states regardless of current owner.
Restoring an unfinished archive does not authorize playing it: the same exact-
original check still applies on resume. Merely supplying a schema-3 backup to
default merge does not grant this full-restore exception.

### Why an unbound 002 copy is rejected

`K3-30000001-002` is an engine copy identifier, not proof of a second owned
collectible. A row in the legacy `instances` table does not establish ownership.
Only the original `-001` has a seeded `legacyInstanceId` mapping. Consequently,
an unbound side-0 `-002` without a real collectible mapping must be refused for
continuation, a new result, or a default import (`NOT_OWNER`). This is an intentional
ownership guard, not lost data. Buying another KC of that version does not
retroactively assign that collectible to the old unbound copy.

Existing match/result archives are not deleted or rewritten by this refusal.
They remain readable through the global archive APIs; unchanged stored finals
remain idempotent, and valid full registry restores preserve them. Unmapped copy
rows remain historical engine statistics only: they neither create ownership nor
enter an owned collectible's career. An unfinished archive can remain visible
without being playable.

This is not a blanket ban on the `-002` suffix. A new explicitly bound game may
use two real owned collectibles of the same version, including a side-0 `-002`,
when `collection.bindings` maps each unit to a distinct owned public KC ID.
Side-1 opponent copies remain virtual and never require or grant ownership.

## Persistence and backup

Public IDs use `KC-` plus 32 lowercase hex digits (128 random bits). Activation
codes are 64 lowercase hex digits (256 independent random bits), returned only
by issue. Only SHA-256 hashes and consumption/rate-limit state are persisted.
Five failed attempts block further attempts for 60 seconds, per profile and
per collectible. This is local abuse friction, not a security boundary.

Backups with a registry use schema 3 and include `users`, `collectibles`,
`activations`, `transfers`, `events`, and `registryMeta` alongside legacy tables.
No plaintext activation codes are exported. Schema-2 historical imports remain
supported. Default schema-3 import accepts identical registry state or replaces
an entirely pristine seeded target; it rejects conflicting ownership/history.
`importBackup(value, {replaceRegistry:true})` atomically replaces the complete
library and registry. The UI must obtain explicit confirmation before this call:
full restore can intentionally roll back local ownership and activation use.
Default merge cannot do so. Import never derives ownership from engine instances.

Ownership metadata cannot be removed or changed on an existing bound match.
Newly submitted finished games still need valid current ownership; only known
persisted bindings qualify as historical. Standalone local-db loads can open an
upgraded DB without downgrading it, but cannot write registry-bound games without
the module. Browser storage/devtools/backup editing remain under the local user's
control; no email, password, network backend, or tamper-proof audit is provided.
