# Kalistar 4.6.58 - WoodLand map

The author approved map 1.30 and explicitly requested site publication on
14 October 2026. The western coastal forest reaches its shoreline, the small
black spot is removed and a heart-shaped lake sits immediately left of WoodLand.
The Cerelf city has an independent tree-palace emblem with bridges and waterfalls.

The runtime now selects the 1.30 terrain and exposes seven cities in the existing
accordion, selection, zoom and phone layout. All six former cities retain their
IDs, coordinates, nominal sizes and assets. The terrain remains pixel-identical
outside the local editable mask. PSD terrain, city, shadow, outline and native
editable name layers stay separate; the complete PSD was reopened with ag-psd.
Native Photoshop has not been tested. All historical maps remain preserved.

Sources, exact prompts and image hashes:
[Map 1.30](../../map/layers-1.30/README.md).

No cards, approved locks, character profiles, weapons, engine rules, save schema,
Collection UI, DNS, Access, hosting plan or publication limit changes. Concurrent
Collection and Kaylis work stays outside the staged tree and this release.

The existing Pages browser test derives its media prefix from the current URL
so the same download check works on both Cloudflare root and GitHub project URLs.
Version assertions are aligned with the 4.6.58 desktop and phone badges.

## Verification

The publication helper follows the prior releases' scoped-index snapshot and
SHA-256-checked LFS hydration. It runs the existing workflow tests, local map
source invariants and an isolated static build without touching shared dist.
Retained reports in `qa/` record the exact staged tree, build and browser results.

Map browser coverage: seven formats (desktop, wide, Razr, phone, 320px phone,
touch landscape and tablet), menu entry, seven city selections, details, labels,
geographic anchors, focused symbol sizes, zoom, keyboard, remount, reload,
Reduced Motion, phone bottom placement and nine runtime media hashes.
Tests use a fresh browser and test-only IndexedDB names, never personal saves.

Validated: 1192 tests across 83 publication commands. The isolated build contains
377 cards and 1377 files, 898.8777 MiB, below the unchanged 900 MiB GitHub guard.
The built Map passes all seven formats and all nine media hashes. The Pages
browser flow passes desktop/phone, card reader/download, decks, arena, saved
match restoration and additive catalogue without JavaScript or HTTP errors.

The Pages flow additionally checks collection, card reader/download, decks,
arena and saved-match restoration. Both public hosts are checked after the push;
Cloudflare's content build ID need not equal the Git commit SHA.
