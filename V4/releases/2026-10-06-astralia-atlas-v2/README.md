# Astralia Collection background - selected V2

Revision requested by the author on 6 October 2026. Release v4.5.50,
following the independent equipment-gallery .48 and Rhovan-illustration .49.

## Scope

- The author's attached map replaces the first Atlas background.
- Two large side continents, central island, southern archipelago and a northern
  ice continent joining the sides.
- Only the background layer has a restrained static 1.6px CSS blur, in both the
  Collection and its page index. Cards, captions and commands remain sharp.
- The unblurred source is preserved for reuse, and its decoded pixels match the
  author's attachment exactly. The runtime WebP is also unblurred.
- Original V1 assets, native card artwork, game rules, profiles, saved data,
  Story and character reading backgrounds are unchanged.

The selected source, exact built-in image_gen prompt, conversion script and
SHA-256 manifest are in
`../../propositions/2026-10-06-astralia-atlas-v2/`.
The later more minimal study remains unused.

## Media

Selected source: 1774 x 887 PNG, 3,303,321 bytes,
SHA-256 `ed35a624086c2a965bf3a19fa148d76be8f5dff54c7e3e60d2f18b0a1b756604`.

Runtime: 1774 x 887 WebP, 473,020 bytes (approximately 462 KiB),
SHA-256 `3f8f076e2ad7479bcebc2560173b36ec0baaeb567e2d67a596b78a1668fc4191`.
Neither file contains a baked-in blur. No extra blurred image or animation loop
is required.

## Local Validation

`collection-map.browser.test.cjs` passes across 2041x1383, 1440x1000,
1024x768, 412x1007, 390x844, 320x568 and 844x390, plus a real-touch Chrome
context at 412x1007.

Checks include decoded background, aspect ratio, background-only filter,
noninteractive backdrop, sharp cards, caption contrast, overflow, page
navigation, page index, collection filters, version switch, notebooks, Story
and reload. Local screenshots are in `verification/local/`.

## Release Validation

All 433 tests from the committed Pages workflow pass in an isolated copy of the
staged release. Build/PWA checks also pass separately (8 tests). The static site
build includes 232 cards, 914 files and 609.1 MiB of runtime media; original
authoring PNGs stay outside the deployed artifact.

The built site passes the atlas browser checks on seven formats plus real touch,
then the version-switch and notebook legibility suites on seven formats each.
Final screenshots are in `verification/`; earlier local screenshots remain in
`verification/local/`. The workflow results are retained alongside them.

Stage only this map revision, its source/provenance, scoped tests, documentation
and the six application-version files. Gameplay, native cards, the separate
performance work and old reports remain outside the release diff. Publish main
with annotated tag `v4.5.50`; confirm Pages success, public version and hashes,
then run the atlas browser checks against the public site before announcing it
live. No bulk stage or force push is used.
