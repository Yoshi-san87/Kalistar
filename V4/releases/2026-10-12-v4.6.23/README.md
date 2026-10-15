# Kalistar 4.6.23

Icon-only position identities across Collection, Decks, recruitment, reserve
selection, card details, starting lineup, arena, ceremony, reports and Stats.
The PC navigation remains desktop in short fine-pointer windows; the phone
retains its five-button bar. No engine rule, save schema or native card changes.

Artwork provenance and component API:
`../../revisions/2026-10-12-position-identity/README.md`.

Release verification exports the reviewed Git index to an isolated snapshot,
hydrates playable/proof assets by LFS hash, runs the full publication suite and
builds Pages. Browser suites exercise that same frozen distribution. Their logs,
results and desktop/touch captures are stored under `qa/`.

The staged release deliberately excludes the simultaneous relic-ultimate and
Elyrane development. An initial isolated-build run detected a misplaced archive
heading insertion and an unrelated effect-label call; both were removed from
this release's index without reverting the shared working files. A regression
guards the archive heading scope. Browser failures remain available locally;
the final passing records identify the actual verified runtime and build.

## Final Verification

- 68 publication commands, 753 tests passed; Pages build: 350 cards, 1270 files.
- Twelve browser families verify the same frozen distribution.
- Six real-game profiles: decks, native radio keyboard filters, introductions,
  arena, details, ceremony, report and Home; no combat-state mutation.
- Menu: 46 checks across ten public formats, plus 20 local-shell checks.
- Collection: seven formats, map/sleeve geometry, contrast, paging and touch.
- Stats: ten real completed games, unchanged values/storage, accordions and CSV.
- Card details: six isolated profiles, equipment, Back, archives and reload.
- Android standalone introduction: all eleven rejection, interruption, rotation,
  reload, slow-device and Reduced Motion scenarios passed. A bounded compositor
  wait preserves the exact final-face assertion instead of relaxing it.
- Exact runtime/driver hashes and unchanged gameplay/native registries are in
  `qa/stage.json`; publication results and logs are alongside it.

Representative captures:
[PC menu](qa/navigation/short-window-decks.png),
[PC composition](qa/positions/desktop-deck.png),
[Razr composition](qa/positions/razr-deck.png),
[Razr arena](qa/positions/razr-arena.png),
[Razr card detail](qa/positions/razr-detail.png),
[Collection](qa/sleeves/collection-razr-touch.png),
[Stats](qa/statistics/razr-open.png).

Phone checks use Chrome touch/Android emulation, not a claimed physical Razr run.
Post-push Pages/public-asset evidence is saved outside Git to avoid a second
same-version publication. Staging and repair helpers are historical release
records, not general future entry points.
