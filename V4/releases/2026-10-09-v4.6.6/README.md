# Kalistar V4.6.6

## Scope

- Robin, seven X-Men and Geralt V2, using supplied or previously approved art.
- The original approved X-Men banner, recovered and adapted to native geometry.
- All eleven Batman collaboration cards have a Kalistel. Six existing NONE
  cards receive only an element revision; their stats and effects are preserved.
- Gotham is displayed as Batman in the site, with historical keys compatible.
- Geralt V2 shares V1's character identity and cannot duplicate him in a deck.
- Desktop and mobile version labels advance together. No save-schema change.

Production details, role assignments, source provenance and native evidence:
[crossover batch](../../expansions/2026-10-09-crossover-crystals/README.md).

## Validation

- Native checks passed on all fifteen cards: zero fixed-frame differences,
  zero reopened-PSD differences, correct barcodes and editable text. The six
  elemental revisions have zero pixel changes outside the authorized regions.
- `qa/verified/workflow-tests.json`: all 53 workflow commands passed, including
  the Pages build: 315 cards, 1085 files, 756.6 MiB.
- Batch `browser-proof/results.json`: all fifteen cards inspected at 1440,
  412 and 320 px; 49 captures; two real duels on desktop and phone; no browser
  or HTTP errors. Old backups, the 306-to-315 migration, match reload and
  Geralt's two-version pocket passed.
- `qa/local-release.json` records the exact tested build asset hashes.
  `check-snapshot.cjs` compares the final index's runtime and card sources
  with the tested isolated snapshot before committing.
- The full `V4/deploy/browser.test.cjs` journey also passed: reader, PNG
  download, decks, pre-match lobby, arena, manual fullscreen, saved match,
  additive publication, desktop and phone. Captures: `qa/pages-browser/`.
  Snapshot comparison passed for 862 files, including 42 hydrated LFS sources.
  Raw earlier logs retain their original whitespace; source diffs are clean.

## Shared Checkout

The user authorized coordination with the equipment chat. Cards publish first
as 4.6.6; its unfinished twelve-equipment release is reserved for 4.6.7.
The tested snapshot contains the 93-equipment HEAD baseline, not the other
chat's 105-equipment worktree. Only this release's two CI additions are staged;
concurrent equipment and performance workflow edits remain untouched.

Early failures are retained rather than overwritten: `qa/workflow-tests.json`
is the first shared-worktree run, and `qa/final/` is the first isolated run.
The latter found four approved X-Men illustration sources not yet tracked;
they and their provenance are now included. `qa/verified/` is the complete
successful rerun after that correction.

Public deployment is checked after the atomic `main` / `v4.6.6` push. Only
after Pages and the public version are verified is the next chat told that
the Git index is empty and available for 4.6.7.
