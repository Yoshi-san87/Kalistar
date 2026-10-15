# Kalistar 4.6.56 - Seated Collection Vitrine

The glass/plastic edge sits inside the pedestal corners, like a museum display
held by its base. The copper corners rise slightly in front of the lower glass
joint rather than aligning the sleeve with the outer edge of the support.

The caption keeps its reserved 64px height. A shared 24px horizontal gutter
places the glass 8px inside each side support on desktop, phone and landscape.
Only the painted copper rises by 8px; its bottom stays in the same place.
Card aspect ratio and height constraints remain intact. The approved pedestal
WebP is reused without any image regeneration, raster edit or new asset.

Names, counters, favorite controls, position emblems and the mechanical version
change keep their existing actions and stable IDs. No native character card,
template, profile, reference lock, engine, gameplay rule, save schema or hosting
configuration changes. Unrelated work is excluded from the release.

The separate rectangular name plaque is removed at the user's request.
Ivory lettering is directly on the painted material, with only its existing
small letter shadow; no extra title border, background or box shadow.

Geometry: [revision](../../revisions/2026-10-13-collection-vitrine/README.md).

## Verification

The owning publication helpers validate a disposable snapshot of the staged
sources, with SHA-256-verified LFS dependencies, normal publication tests and
an isolated GitHub Pages build. Browser suites cover Collection, collection
filters, navigation and saved-game flows. Reports and screenshots are in `qa/`.

The Collection suite checks the 8px inset and overlap on seven formats, then
repeats the joint measurement for every compact real-name page on five formats.
Layer order is also checked during a real animated card version change.
Touch actions, keyboard focus, Reduced Motion, forced colors, Story navigation
and reload remain covered. Both public destinations are verified after push;
Cloudflare's content build ID is distinct from the Git commit SHA.

Validated: 1184 tests in 82 publication commands, plus seven deployment
assertions. The build contains 377 cards / 1374 files / 896.9 MiB, with no new
runtime image. Four browser suites passed: Collection, filters, navigation
and Pages flows. Collection covers seven formats and real touch controls;
70 compact name displays on 29 pages across five formats all keep their glass
inside the support. Navigation has 46 checks across ten formats. Reader,
PNG download, decks, arena, saved-match reload and additive publication pass
with no page, Atelier or HTTP errors.

Visual proofs: [desktop](qa/collection/flip-desktop-card.png),
[Razr](qa/collection/museum-names-412x1007-1.png),
[small phone](qa/collection/collection-320x568.png).
