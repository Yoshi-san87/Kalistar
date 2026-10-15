# Kalistar 4.5.35 - Second editions

Two additive native cards requested on 6 October 2026:

| Character | Model | Edition | Printed weapon |
| --- | --- | --- | --- |
| 2B | 49900801 | Ce qui mérite de vivre | Epée longue |
| Balmhyr | 49900802 | La leçon dans la pierre | Poing |

Originals 45911726 and 30000007 remain intact. Stable character identities,
faction, race and crystal are preserved. No new preset, equipment definition,
schema or combat rule.
The first same-stat portraits were rejected before any commit/push and are
archived locally outside the release. Following review of Momo, Malaba and
Tidus editions, these replacements tell different scenes and have distinct
gameplay profiles, not merely different weapons:

- 2B kneels beside a small machine and offers it a flower, sword at rest.
  Primary role 1, positions 1/2, Gardienne, one Guard face, one magic face,
  two barriers. Lower attack and no dodge/Retry in exchange for tank defense.
- Balmhyr demonstrates a precise punch into a stone in his practice court.
  Primary role 3, positions 2/3, Mentor, one physical-support face, two magic
  faces, one barrier. More attack than his original Tank, less defense.

The current family matrix applies to the new printed weapon. Existing
Virtuous Treaty / Serment de Fer equipment now has a compatible second
edition; no equipment is silently granted or selected.

Art was generated with the built-in image tool, using approved character,
weapon and Kalistar style references. Prompts are in the expansion.
The native 897 x 1497 PSDs retain editable text and embedded components.
Original sources and reference locks were not changed.

## Validation

- Both native cards: zero fixed-frame differences, zero reopened-PSD
  differences, valid barcode, four-line description.
- Seven integration tests: identity/version grouping, role ceilings, all ATK/DEF faces,
  family restrictions, actual conditional DEF on both camps, logs,
  twelve full matches and save/restore.
- Weapon-bearer regression tests now cover both the original incompatible
  editions and the two new compatible editions, including legacy axe
  snapshots with LAST_STANDING. No production rule was relaxed.
- Isolated staged snapshot: 247 tests passed, complete GitHub Pages build.
- Dedicated browser checks: both grouped editions at 1440 x 1000,
  412 x 915 and 320 x 740; both arena camps and saved-game reload;
  no broken image, horizontal overflow or browser error.
- General Pages browser suite: 232 cards, PC/phone, reader, PNG download,
  decks, arena, saved match, additive publication and no HTTP errors.
- Desktop/mobile screenshots are kept in the expansion's browser-proof/.
  The public-check.cjs script verifies the release commit, both version
  badges, the two original identities and exact published PNG hashes.

Only this release's paths and workflow test are staged. Unrelated work
and the local performance workflow edit remain outside the commit.
