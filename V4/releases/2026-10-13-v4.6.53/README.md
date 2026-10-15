# Kalistar 4.6.53 - Independent Collection Museum Plinth

The glass sleeve now surrounds only the character card. Its sculpted copper
pedestal is a separate piece immediately beneath it, using the same 64px
height. Card sizes and paging are unchanged.

The nameplate is moved inside the painted face, with a dedicated centered
row clear of the border, faction crest and favorite. The existing generated
WebP is reused through nine-slicing; no raster image, native character card,
template, registry, equipment, gameplay rule or save schema is modified.
Copy counts, position emblems, favorites and the finite mechanical flip
retain their existing actions, IDs and keyboard/touch behavior.

Geometry and source cuts:
[revision](../../revisions/2026-10-13-collection-museum/README.md).
Original artwork/prompt remain in the previous sculpted revision, unchanged.

## Verification

The staged sources are validated in a private disposable snapshot, including
SHA-256-checked LFS resources and the normal publication build/tests.
Browser suites cover Collection, filters, navigation and Pages flows.
Name tests compare text bounds to the painted interior, exercise Iliane
and real long names in compact multi-card pages, and assert that the glass
stops before the pedestal. Reduced Motion and forced colors are retained.
Reports and screenshots are under `qa/`.

No changes to publication policy, reference locks, Cloudflare configuration,
player storage or other concurrent work. Both public destinations are checked
after the push; Cloudflare's content build ID is distinct from the Git SHA.

Validated: 1163 tests in 80 commands; 363 cards /1360 build files /874 MiB.
Collection: seven formats, real touch, focus, versions, favorites, Reduced
Motion and forced colors. Compact-name stress: 70 displays on29 pages across
five formats, including all14 selected real names. All fit the painted face.
Filters: ten formats. Navigation:46 checks across ten formats. Pages: reader,
download, decks, arena and saved-match flow, with no Atelier/HTTP errors.

Visual proof: [desktop museum cards](qa/collection/museum-names-1440x1000-1.png),
[Razr museum cards](qa/collection/museum-names-412x1007-1.png),
[long names on Razr](qa/collection/museum-names-412x1007-2.png).
