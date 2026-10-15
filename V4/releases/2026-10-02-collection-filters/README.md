# Collection Filters Release

Application version: 4.3.3. Card edition and browser save schema remain V4.

## Scope

- Keep `Mes cartes` and `Catalogue` as the two ownership scope tabs.
- Group collection universes in a native dropdown in the header and filter
  dialog: Kalistar, Final Fantasy, NieR, Metal Gear, Resident Evil, One Piece
  and The Witcher. Only populated universes are offered.
- Synchronize both selectors, preserve the collection when changing ownership
  scope, restart pagination on a new selection and clear it on filter reset.
- Combine collection with faction, crystal, race, position, weapon, search and
  favorite filters. Counts follow the chosen ownership scope.
- Keep 44px phone targets and compact desktop and landscape layouts.
- Record the user-mandated version increment and release tag on every push.

This release does not publish the separately edited 80,000-word Story or alter
card sources, ownership registries, gameplay, protected assets or reference locks.

## Verification

The collection unit tests cover grouped universes and faction intersections.
`V4/site/collaborations.browser.test.cjs` uses an isolated fixture without
personal browser data to check selectors, pagination, reset, empty states and
ten desktop, phone and landscape viewport sizes.

`V4/site/collection-versions.test.cjs` also checks the full local site's card
details and smooth version switching across seven viewport sizes. Generated
verification images are not part of this release.

`node --test V4/releases/2026-10-02-collection-filters/verify.cjs` runs the main
deployment and catalogue regressions with an in-memory read-only overlay of the
already published Story and boot files. Add `--build` instead of `--test` to
produce the normal guarded static output without publishing unfinished Story
edits. No source file is temporarily replaced.
