# Kalistar 4.6.38

Library is now a player manual, not a viewer for maintenance documents.
Six plain-French manuscripts cover duels, composition, turns/rounds,
equipment, current ultimates, and performance/trophies/medals. Worked examples
explain the rules without test links, source paths, hashes, code or migrations.
The parchment reader, mobile accordions, contents and browser Back remain.

Authoring: edit `V4/docs/joueurs/`, verify against the corresponding current
technical rule document, then regenerate `V4/site/rules-documents.js`.
The build checks both source hashes internally; neither is shown to players.
External links render as plain labels, without a technical URL tooltip.
Technical originals, combat logic, saves, native cards and rewards are unchanged.

Validation results and desktop/Razr screenshots are in `qa/`.
The release verifier tests and builds the staged snapshot, excluding the
concurrent Vaerok/Froz production and rejected Map experiments.

Validation passed: 919 tests across all 73 publication commands; Pages build
with 356 existing cards; Library in six formats (desktop, wide, tablet, Razr,
320px, touch landscape); all 18 Guide exercises desktop/Razr; 46 navigation
checks over ten viewports; Pages collection/reader/download/decks/arene/save.
Back, focus, accordions, contents, resize, reduced motion and cleanup are covered.

Screenshots: [desktop reader](qa/guide/desktop-manuscript.png) and
[Razr reader](qa/guide/razr-manuscript.png). `verify-stage.cjs` compares every
staged runtime/manual file byte-for-byte with the tested snapshot.
