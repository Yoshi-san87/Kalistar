# Resident Evil - 1 October 2026

25 new cards, IDs 49700101..49700125; unpublished fan crossover.
Baseline: 138 cards. Coordinated publication target: 163 cards.
Jill, Leon, Ada and Chris variants share their respective character identities.
No presets, arenas, existing-card edits, Git operations or catalogue writes.

Ownership: this directory and new V4/Illustrations/RE* files only.
Gibbs owns banners and filters; Kepler has Photoshop priority for MGS revisions.
Freeze waits for banner/filter completion. Native rendering requires explicit
parent permission and the Photoshop render lock, COM190 / version 26.11.7.

Preparation uses the proven Metal Gear saga pipeline without relaxing QA:
native editable text, embedded components, fixed-frame pixel comparisons,
reopened PSD comparison, actual barcode recognition and typography checks.
Generated illustrations are not approved merely because generation succeeded.

Crystals, role assignments and monster HUMAIN groupings are Kalistar gameplay
classifications, not claims about canonical biology. Dimitrescu uses the existing
VAMP race. Moreau's Lance is the requested game category, not an invented prop.
Saddler's canonical staff maps to the native Bâton category.

Salazar is a moderate P5/P4 support (mana and physical buff, no Reraise),
providing a second distinct P5 character alongside Eveline. The RE-only QA deck
has actual coverage {P1:2,P2:2,P3:5,P4:3,P5:2}; validatePlayableDeck passes,
simultaneous formation exists, Leon duplicate versions are rejected, and RE2
faction synergy does not spill into RE4. This QA deck is not a published preset.

The native pipeline is scaffolded in build.cjs/compose.jsx/render.ps1. The
publish action requires KALISTAR_RE_PARENT_COORDINATED=2026-10-01: publication
belongs to the parent coordinated release. Dependencies and creation snapshot are frozen;
all artworks/provenance must be final before native preparation.
