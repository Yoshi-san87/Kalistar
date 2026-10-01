# Rikka - La ville sous ses pas

Additive model 49800201, characterId rikka, previous model 40000042. The original
approved Rikka remains protected. Requested gameplay values are exact, including
magic D5, DEF D6 dodge and DEF D1 retry. No guard, heal, barrier or preset.

The selected final illustration 04 shows a true side-profile crouch above a
calmer futuristic Chroma metropolis on a modern concrete and metal rooftop.
Images 01, 02 and 03 are superseded proposals. approved-art.json records the
selected image, exact final prompt and preserved canonical/style references.
Parent review is recorded separately and is not described as final user approval.
The image fits the native window without zoom. Its 30px right translation is
covered by opaque frame pixels at both window edges, with no generated bleed.

This folder reuses the One Piece native typography/composer and the approved
component bank read-only. Editable text, embedded smart objects, separate magic
and effects, exact fixed pixels, reopened PSD identity and actual barcode reading
remain mandatory. Artwork and small-size native cropping are reviewed separately.

The preservation guard consumes the unchanged parent baseline of 174 cards and
818 files from releases/2026-10-01-character-profiles/baseline.json. Explicit
allowed-changes.json lists the concurrent stat-plan IDs and Kaine 45951088.
Only requested ATK/DEF values and native revision evidence may vary for those
IDs. Their illustrations, identities and unrelated profiles remain protected.
The guard never refreshes the baseline or accepted hashes to conceal changes.

Commands from the active clone root: build.cjs check, freeze, prepare, render,
verify, delivery. Render requires KALISTAR_RIKKA_PHOTOSHOP_HANDSHAKE=2026-10-01
after the parent provides a free slot; render.lock and the local Photoshop mutex
are both acquired. Preparation uses a batch-local lock to allow parallel work
while other agents render. Photoshop COM190 version 26.11.7 is required.

publish.cjs with no arguments is a read-only preflight. --publish is permitted
only after parent final card preview is recorded in native-review.json and
KALISTAR_RIKKA_PARENT_NATIVE_REVIEW=2026-10-01 is set. The atomic existing publisher
adds this single entry while checking all current entries remain unchanged.
Concurrent changes cause a transaction failure, not an old catalogue restore.

No Git commit/push and no edits to dirty boot/build/story files or gameplay docs.
Portable model tests use node --test model.test.cjs. Native and preservation
tests additionally require the configured local dependencies; they do not start
Photoshop or publish cards.
