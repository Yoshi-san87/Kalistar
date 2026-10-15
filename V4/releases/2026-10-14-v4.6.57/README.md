# Kalistar 4.6.57 - Collection Team Plinth

The circular faction badge is replaced with the current card's flag as a
large cropped, slightly offset watermark in the copper pedestal. Positions
move left, leaving the center for the character name without a separate plaque.
Compact plinths reserve a full upper row for the name and put the small
position/copy/version controls below it.

Favorite moves onto the card's bottom-right corner. Its visible star stays
close to the frame; coarse pointers have a 44px target. It remains independent
from the card reader and keeps its existing ID, pressed state and save callback.

The approved bitmap, seated glass joint, caption height, native cards,
templates, reference locks, profiles, engine and save schema are unchanged.
No new runtime asset or idle animation. Other local work stays excluded.

Geometry and behavior:
[revision](../../revisions/2026-10-14-collection-team-base/README.md).

## Verification

The publication helpers verify a private snapshot of the staged sources,
SHA-256-checked LFS dependencies, repository tests and the isolated Pages build.
Collection browser coverage includes seven formats and compact real-name rows,
low-opacity cropped flags, worst-case text contrast, left positions, separate
favorite hit targets, touch, keyboard focus, reload and current-version IDs.
Filters, navigation and Pages flows are checked separately.
Retained reports and screenshots are in `qa/`.

Both public destinations are verified after publication. Cloudflare's content
build ID is distinct from the Git commit SHA. No hosting configuration change.

Validated: 1184 tests in 82 publication commands, plus seven deployment
assertions. Build: 377 cards / 1374 files / 896.9 MiB, without a new runtime
image. Four browser suites pass: Collection (seven formats, touch, favorite
reload/filter/focus, current-version ID and faction, Reduced Motion and forced
colors), filters (ten formats), navigation (46 checks across ten formats),
and Pages (reader, download, decks, arena and saved-match reload).
Compact real-name stress: 70 displays on 29 pages across five formats,
all within the painted face and with their glass seated in the support.

Visual proofs: [desktop](qa/collection/flip-desktop-card.png),
[Razr](qa/collection/museum-names-412x1007-1.png),
[small phone](qa/collection/collection-320x568.png).
