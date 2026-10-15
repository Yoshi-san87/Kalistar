# Kalistar 4.5.17 - Catalogue notification correction

The persistent "Nouvelles cartes (3)" notice came from three historical IDs
kept in the local registry but absent from the current approved catalogue.
Reloading correctly preserved those records, so the raw difference never cleared.

The UI now compares the loaded catalogue to the currently available catalogue.
Only real, available additions are announced. Both notices and Collection share
that verified count. No browser records, owned copies or archived matches are
deleted. A running engine and match remain unchanged until explicit refresh.
Save schemas, card assets, mechanics and the backup import guard are untouched.

## Validation

- 98 Node checks: catalogue, additive ownership, notice logic, offline/invalid
  results, request ordering, teardown, build, navigation, version consistency,
  equipment, initiative, 250 full ABBA matches, stats and shared UI.
- Built Pages browser test with three synthetic archived IDs and one real
  addition: both notices, desktop/phone, peer-tab notification, manual refresh,
  second reload, owned copies, archived matches and active-game preservation.
- No personal browser data is modified by those tests.
- The older `phone-preview.test.cjs` did not complete: it waits for the removed
  `[data-action=start]` control. It is not changed to hide that stale selector.
  The targeted built-browser suite above passes on both desktop and phone.

Captures and machine-readable results: `V4/site/verification/catalogue-notice/`.
Implementation and reproduction commands: `V4/site/README.md`.
`public-check.cjs` verifies the deployed release ID, displayed version and the
hashes of the four updated production modules against Git HEAD and release.json.

Publication is restricted to `Yoshi-san87/Kalistar`, main with annotated tag
`v4.5.17`, following the separately committed Arborium 4.5.16 release.
Parallel weapon work is not staged by this correction.
