# Recover A Missing Publication Receipt

Optional companion for `publish.cjs`, not a second publisher. Nothing is run
automatically. The native renderer and its captured sources/preparations are
unchanged. No production finalization has been performed by this task.

## Only A Committed Transaction

Use only after a failed receipt write or a crash following the publisher's
durable `phase: "committed"` journal. The journal, installed files, reference
lock, catalogue, batch, preserved sources and previous creations must all pass.
The companion does not render, install cards, update journals or roll cards back.

- `applying`: inspect the transaction and use the existing publisher rollback.
  This companion refuses that phase and never invokes rollback itself.
- Occupied or stale `render.lock`: stop. No lock is reclaimed or deleted by
  this tool unless this invocation owns it. Do not interrupt the native worker.
- Missing/changed files, inconsistent metadata, foreign receipt, wrong journal
  hash, symbolic links or junctions: stop and inspect, without overwriting them.

## Parent Commands

From the project root, using the configured Node runtime:

```powershell
node V4/expansions/2026-09-23-return/finalize-publication.cjs <transaction-id>
node V4/expansions/2026-09-23-return/finalize-publication.cjs <transaction-id> --finalize <journal-sha256>
```

The first command is strictly read-only and returns `journalHash`. The second
requires that exact hash and obtains an exclusive render lock. Never substitute
a hash merely to bypass a discrepancy. Transactions are selected explicitly;
there is no latest-journal discovery or guessed transaction ID.

The recovered `published.json` has the publisher's fields: `cards`, `canonical`,
`created`, `referenceId`, `ids` (new creation IDs in catalogue order), `published`,
`transaction`, and `checkedAt`. The timestamp is the recovery verification time,
not a fabricated original publication time. `recovered: true` distinguishes it.
A matching original or recovered receipt is returned unchanged, including its
timestamp and bytes, but only after the same full validation.

## Boundaries And Durability

The companion imports the publisher's target allowlist; it does not evaluate
source strings or rerun publisher preflight against the already-published lock.
It requires the full set of expected card/metadata targets, validates their
SHA-256 against the pinned committed journal and verifies the journal backups.
It reconstructs the additive reference/catalogue relationship and preserves
the historical protected-file hashes and existing creation records/files.

Inputs are rehashed under lock before finalization. The complete receipt is
written to an exclusive (`wx`) sibling temporary file, flushed, and renamed
atomically after another input, lock and destination check. Only this receipt
is installed. Cooperative writers must respect the render lock; it is not a
security boundary against an external process modifying files concurrently.

An exception before rename removes only this invocation's unchanged temporary
file and owned lock. A crash may leave a temporary file or render lock; neither
is adopted or automatically removed by a later invocation. Cards and journal
remain untouched. An existing foreign/malformed `published.json` is never
replaced automatically, including an empty file left by another tool.

## Fixture Tests

```powershell
node --test --test-isolation=none V4/expansions/2026-09-23-return/finalize-publication.test.cjs
```

Tests create validated temporary fixture directories, not production cards or
registries. They cover read-only preflight, summary reconstruction, idempotence,
receipt-write failure/retry, committed-crash leftovers, wrong phases, missing
or stale evidence, foreign locks/receipts/edits, late changes, path confinement,
junctions and strict journal scope. They do not run Photoshop or Git.
