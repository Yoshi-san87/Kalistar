# Kalistar V4.6.12 - Street Fighter

Adds the 18 approved Street Fighter cards (49901701-49901718), their native
sources and proofs, the dedicated faction banner and collection filter.
Rose and Dan Hibiki remain proposals only. The catalogue grows from 315 to
333 cards. Fei Long uses the user's final midpoint-reach illustration V3.

Ryu Cryo P2, Ken Pyro P2, Guile Aero, Chun-Li Hydro, Zangief Minero,
Dhalsim Pyro, Blanka Electro/Macako, M. Bison Necro, Akuma Hemato,
E. Honda Hydro P1 and T. Hawk Geo preserve the requested assignments.
Every card has a Kalistel. Eighteen distinct face distributions use existing
role bounds and effects. No new mechanic, balance rule, save schema,
weapon matchup, starter deck or arena is introduced.

Validation:
- 18 native proofs: fixed frame unchanged, reopened PSD identical, barcode OK.
- Fei Long: 437800 pixels changed in the artwork, zero outside its window.
- 108 ATK faces, 108 DEF faces, 36 new/new and 18 mixed complete games.
- 54 readers across 1440px, Razr 50 and 320px; Ryu/Ken duel and reload.
- Old backup migration keeps all existing cards and adds the 18 newcomers.
- 639 publication tests pass across 58 workflow commands on the isolated index.
- Pages build: 333 cards, 1157 files, 793.7 MiB. All 54 readers, the Ryu/Ken
  duel and old-backup migration pass again against this exact build.
- General Pages browser regression passes: Collection, reader, PNG download,
  Decks, Arena, match reload, additive catalogue update and no HTTP/page errors.
- The staged-tree workflow, build and browser evidence are in qa and the
  expansion's browser-proof directory.

The original interrupted batch report and frozen inputs are preserved.
The prior authorized Homme Mystere rename is explicitly checked by its
compatibility adapter. Unrelated work and Castlevania illustration proposals
are excluded from this release. Publication follows v4.6.11 by coordination.

Repository: https://github.com/Yoshi-san87/Kalistar
Tag: v4.6.12. Check the actual Pages workflow and public hashes before calling
the deployment live.
