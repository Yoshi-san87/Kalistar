# Position identities

Five approved Kalistar emblems replace visible P1-P5 labels throughout the
Collection, Deck Builder, Home carousel, reserve selection, card inspection,
arena headers, starting lineup, ceremony, match report and statistics.

The stable mapping is shield / Tank, blade / physical DPS, pivot / Middle,
projectile / magic-distance DPS and hands-light / Support. These are positions,
not elements, weapon families or new bonuses. P1-P5 remain in technical data,
rules, diagnostic messages and accessible labels. R1-R5 remain reserve indices.

## Artwork

`sources/approved-proposal.png` preserves the user-approved direction.
`sources/position-atlas.png` is the transparent five-cell production artwork.
`prompts.json` preserves the exact generation requests. `build-media.cjs` only
extracts each alpha contour and resizes it proportionally, producing five
128px lossless WebP files in `site/assets/positions/`. `media-provenance.json`
records source and output hashes. No character PNG, native template or lock
was modified. Runtime transfer is approximately 73KB for all five assets.

## Shared API

`positions.js` owns immutable position metadata, accessible icon markup, unique
compatible lists and native radio pickers. `positions.css` owns fixed dimensions,
focus states and local size variants. The module has no DOM listener, timer,
storage dependency or game rule. Invalid values are rejected.

Compatibility shown on a card is that card version's own positions. Statistics
aggregate the union of compatible positions for the filtered versions of the
character, never the position used in a historical match. Filtering occurs
before aggregation; historical rating versions remain explicit and unchanged.

## Responsive repair

The phone shell now requires width below 700px, or a coarse pointer with width
at most 1100px and height at most 500px. A fine-pointer short PC window keeps
its desktop menu. Intermediate desktop headers have two rows where necessary.
Short desktop Deck/Collection surfaces scroll rather than collapsing cards.
The Collection accounts for its new caption height when choosing rows and
sizing sleeves. Native radio keyboard navigation survives rerender.

## Verification

`positions.test.cjs` covers shared markup and stable role mapping.
`position-identities.test.cjs` covers filtered compatibility and old rating data.
`positions.browser.test.cjs` exercises real decks and matches, keyboard filters,
introductions, arena inspection, report, ceremony and Home on six device profiles.
`position-identities.browser.test.cjs` covers mouse/touch filtering and accords.
Menu assertions cover ten sizes; sleeve assertions cover seven sizes and touch.
Final frozen-build evidence is in `releases/2026-10-12-v4.6.23/qa/`.
Phone evidence uses Chrome emulation, not a claimed physical Razr test.
