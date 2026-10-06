# Equipment Gallery and Bearer Picker

## Scope

The equipment catalogue now uses viewport-sized pages on desktop, matching
the Collection browsing model. Six columns remain on large screens; narrower
desktop screens use three. The available height determines the row count and
card size. Previous/next arrows, a page selector and keyboard arrows navigate
the catalogue with a short transition. Filters reset the page. Empty results
remain visible within the available area.

Phones retain native vertical scrolling, including gestures beginning on a
card. Reduced Motion disables the page transition.

The detail dialog keeps the collectible card on the left and presents
compatible characters as a two-column portrait roster. Search matches names,
jobs and factions without requiring accents. The roster is paginated according
to viewport height. The equipped character appears first, with an explicit
equipped state. Replacement and transfer still require the existing atomic
confirmation. Full lore remains available in a disclosure below the card.

No equipment definition, compatibility restriction, saved-game schema, combat
bonus or animation anchor changed.

## Verification

- `node V4/site/equipment-browser-ux.browser.test.cjs`: desktop 1440x1000,
  laptop 1366x768, wide 1920x1080, short 1280x600, tablet 1024x768,
  narrow 700x700, phone 412x1007,
  compact 320x568 with Reduced Motion, landscape 844x390.
- Checks every equipment page is reachable, no desktop vertical overflow,
  no clipped rows, empty filters, search, roster pages, equip, cancel transfer,
  confirm transfer, persistence after reload, unequip and view teardown.
- `node V4/site/weapons-scroll.browser.test.cjs`: real touch scrolling,
  last-card reachability, fixed navigation, filtered lists, desktop paging and
  embedded Razr preview.
- `node V4/site/weapons.browser.test.cjs`: existing equipment, deck, duel,
  medallion alignment, persistence and Reduced Motion regression.
- `node V4/site/equipment-categories.browser.test.cjs`: category navigation
  and the shared equipment slot.

Browser tests use disposable browser contexts and separate IndexedDB names.
They never touch the user's profile. `equipment-browser-test-helpers.cjs`
navigates the real page selector before opening off-page equipment, keeping
existing equipment browser suites compatible with the new interaction.

Screenshots and machine-readable results are in `qa/`.
