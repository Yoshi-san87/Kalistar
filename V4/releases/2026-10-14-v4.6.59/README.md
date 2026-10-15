# Kalistar 4.6.59 - Collection Integrated Dial

Consolidated component CSS with larger character names in the unchanged copper
pedestal. The legacy binder/mobile/position overrides are removed, not layered
over. Real font bounds govern name fitting, preserving whole words first.
Single-version cards render no switcher or version count. Ownership moves to
the card's bottom-left corner as a card icon with its adjacent copy count.
The version selector becomes a recessed mechanical dial connected to the
painted rim, preserving its engraved count and finite switching animation.

No new runtime asset, idle animation, gameplay or save change. Native cards,
approved pedestal art, template locks and the glass joint remain untouched.
Unrelated Map work is not part of this publication.

[Geometry and responsibilities](../../revisions/2026-10-14-collection-integrated-dial/README.md).

## Verification

The helpers check a private snapshot of the explicitly staged sources with
SHA-256-verified LFS dependencies, run the publication tests and build Pages.
Browser checks cover Collection, filters, navigation and the playable release.
Collection includes seven formats, real long names, varied copy counts,
current-version IDs, touch, keyboard, reload, Reduced Motion and forced colors.
Future-name fixtures also exercise five positions on four formats without
changing the real catalogue. Version-specific tests check two owned copies vs
one after switching, rapid clicks, cancellation, keyboard focus and absence of
the selector in single-version filtered/owned groups. Local performance contracts
verify lazy native-card thumbnails, stable recruitment inputs, saved favorites,
cross-tab storage and IndexedDB fallback when localStorage reaches quota.

Reports and screenshots are retained in `qa/`. Both public destinations are
checked after publication; Cloudflare content IDs are distinct from Git SHAs.

Validated: 1185 tests in 82 publication commands, plus seven deployment
assertions (1192 total). Build: 377 cards / 1377 files / 898.9 MiB; no runtime
image added. Five frozen browser suites pass: versions, Collection, filters,
navigation and Pages. Local performance contracts also pass on PC and Razr.
The public-download test now resolves relative links against its page URL.

Visual proofs: [desktop](qa/collection/flip-desktop-card.png),
[Razr](qa/collection/museum-names-412x1007-1.png),
[small phone and five positions](qa/collection/name-fit-five-positions-320x568.png),
[Darnako local preview](qa/local-darnako-base.png).
