# Kalistar 4.6.27

User correction: Momo's flute is his weapon, not his relic.

- La Flute des Petits Bonheurs returns to the weapon slot, with the shared
  retained numeric ATK6 rule (+30 ATK). Its stable ID and artwork are unchanged.
- His existing Boite des Petits Bonheurs receives the outnumbered Clover
  ultimate, replacing its former ally-loss DEF gift. Aeris and 2B are unchanged.
- Flute and Box can be equipped together, with independent effects and visuals.
- Editable profiles/decks migrate only the former flute assignment to weapon.
  The Box is never auto-equipped. Formation, captain and other slots remain.
- Started matches retain their frozen flute/box rules, pending gifts and stats.

No native card changes, new items, art replacements, save-schema bump or reset.
The migration remains strict about IDs, compatibility, duplicates and categories.

Publication check: the boot regression now expects the 49 modules including
Map introduced in 4.6.26, and explicitly checks Map loads before the app.

Rules: `../../docs/RELIQUES_ULTIMES.md`.
Reproduction and final QA: `../../revisions/2026-10-12-momo-equipment/README.md`.
The publication snapshot and browser reports live in that revision's `qa/`.

Validation: 71 CI commands passed (876 tests), 351-card Pages build, 18
ultimate browser scenarios, 2 final Momo PC/phone paths and 9 isolated
persistence checks. In-game help now describes the corrected two items.
Guide/Library work from the concurrent task is not part of this release.
