# Astraball Core Audit

Validated 2026-10-25 at 03:24:56 UTC on Windows, Node.js v24.14.0.
Result: **69/69 tests passed**, no skipped tests, and **120/120 AI games finished**.
No engine defect or public-contract deviation was detected by this audit.

## Scope

Only `tests/core.test.mjs`, `tests/simulation.mjs` and this report are owned by
this audit. No engine, renderer, Kalistar source, Git, publication or deployment
changes. Browser testing belongs to the parent task.

## Commands

From the active checkout root, with Node.js 24+:

```sh
node --test V4/astraball/tests/core.test.mjs
node V4/astraball/tests/simulation.mjs --games 120 --out work/astraball/simulation.json
```

The simulator confines optional generated JSON to `work/astraball/`; no output
is committed. It reports seeded replay hashes, source hashes, score/event tallies,
termination, activation counts and AI decision timings.

Full generated evidence: `work/astraball/simulation.json` (ignored scratch output).
The unit test run completed in approximately 169 ms. Timings are observations on
this machine, not portable performance guarantees.

## Simulation Results

| Measure | Observed |
| --- | ---: |
| Seeds | 1 through 120 |
| Games completed | 120 |
| Full seeded replay checks | 1, 61, 120 |
| Duration, including three replays | 3.758 s |
| Activations checked, excluding replays | 13,651 |
| Commands checked, excluding replays | 25,060 |
| Wins, team 0 / team 1 | 35 / 61 |
| Draws | 24 |
| Target-score / round-cap endings | 27 / 93 |
| Total points, team 0 / team 1 | 325 / 386 |
| Mean rounds | 11.458 |
| Mean / maximum AI decision | 0.0231 / 0.8685 ms |

Every command was legal and followed by both engine validation and independent
invariant checks. Score totals exactly matched the 461 goal events, including
each scorer's team and one-point/two-point role rule. No activation repeated
within a round, no unit or ball left the pitch, and no possession/occupancy
invariant failed. Planning left state and RNG unchanged. Full replay hashes
matched for all three replayed seeds.

Event totals: 11,409 moves, 1,329 passes, 8,150 charges, 614 shots, 461 goals,
1,255 round transitions, 120 end events and 3,558 waits. There were zero
interceptions in this batch because this AI selects clear passing/shooting lines;
interception behavior is exercised explicitly by the deterministic unit fixtures.

## Tested Sources

The simulator checks these SHA-256 hashes before and after the run and fails if
the source files change during execution.

| Source | SHA-256 |
| --- | --- |
| `src/core/game.mjs` | `9176a24fbb5cc145771ee555db93aa6b97ddcf4f7a535967fb986c08c4199129` |
| `src/core/geometry.mjs` | `7a4a7fe8a1a818e66eb2d842c8825359e52503ddbc16f2f6d7b70e0cba2bd100` |
| `src/core/ai.mjs` | `d5887895d07cb4e9f331f55954faeea2251d9718cc00e2b5222b147576b5e467` |
| `data/teams.mjs` | `470f45217148c40b03f188c5b628e0d2901473c7413c9b5271ab1807ccd08e27` |

## Coverage

- Symmetric roster/stats, kickoff and independent match state.
- All-role actions; orthogonal paths, collisions, one move, ball pickup and Pilier zones.
- Pure speed order, consecutive teammates, round tie alternation and one turn per unit.
- Pass range/self/enemy validation, supercover corner contacts and first interception.
- 1,980 directed lines checked against independent segment/square intersection geometry.
- All four diagonal directions and the documented horizontal-first corner tie ordering.
- All three goal targets, shot range/chance, actual line blocking and scoring values.
- Goal formation reset with no restored turns; missed shots and immediate pickup.
- Charge adjacency/chance, current versus next round slowdown, blocked pushes and no stun.
- Cumulative slowdown caps, zero-speed activations, and penalty preservation after goals.
- Target score, twelve-round draw cap, custom caps and terminal-state rejection.
- 36 forged save cases; pure deterministic AI planning and JSON save continuation.
- Explicit AI shot, advancing scorer pass, loose-ball recovery and carrier charge fixtures.
- At least 100 AI-versus-AI games with independent invariants after every command.

## Integration Notes

The parent owns registration in `maintenance/validation-suites.json` and the
new-area purpose in `maintenance/organisation.json`; those files are out of scope.

Confirmed API details for renderer integration:

- Movement paths exclude their origin and include their destination.
- Preview trajectories include both endpoints. Exact corner ties visit the
  horizontal neighbor, then vertical neighbor, then diagonal cell.
- An intercepted pass/shot remains a legal command, with `blockerId` and
  `chance: 0`; the attempt consumes its activation and transfers possession.
- A failed clear shot rebounds to the interior cell immediately next to its
  selected goal cell and is immediately collected if that cell is occupied.
- A blocked successful charge drops the ball on the unmoved carrier's cell,
  so that carrier immediately collects it again; slowdown still applies.
- AI planning is read-only and supports either team; it returns an empty array
  only after the match ends.

The standard Pilier cannot reach the opposing goal with its natural shot range
while remaining in its three-column zone. This is a consequence of the supplied
stats/rules, not a role-specific shooting ban; no artificial stat changes are used
to manufacture a Pilier goal.

No balance claim is supported by this deterministic simulation, even if every
engineering assertion passes. AI self-play does not establish human-play quality,
fairness, difficulty, tactical variety or visual correctness.

Suggested parent checks: preview/animation agreement for corner interceptions,
visible deferred versus current slowdown, goal reset with the remaining initiative
list intact, loading a validated JSON save, and desktop/mobile interaction. These
browser and presentation checks were not performed here.
