# Kalistar v4.6.9

Renames LE SPHINX to L'HOMME MYSTÈRE in the active native card, catalogue,
equipment lore and Batman proposal gallery. Stable model 49901503 and
characterId sphinx-batman are preserved. No game rule or statistic changes.

Native check: name-only pixel differences, identical PSD roundtrip and valid
barcode. Regression tests cover the unchanged profile, original artwork,
equipment compatibility, legacy decks and saved matches. Publication QA and
desktop/mobile screenshots are recorded in qa/ and the revision browser proof.

Verified before release: 614 tests passed in the isolated staged snapshot;
315 existing cards retained; static build 765.5 MiB; reader/search/reload checked
at 1440, 412 and 320 px. Only the name zone changed (5400 pixels, zero outside).

Street Fighter production and unrelated work remain outside this release.
