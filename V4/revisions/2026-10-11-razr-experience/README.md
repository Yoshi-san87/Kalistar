# Kalistar Razr experience

## Scope

V4.6.19 is an interface revision. Engine rules, combat RNG, ABBA, performance
index, equipment definitions, native cards and IndexedDB schemas remain unchanged.
No player history, profile or game is reset. QA uses separate browser databases.

## Home and Navigation

Fresh phone visits open `#home`; existing explicit routes still work. The phone
bar is K / Decks / Arena / Stats / Plus, with a larger native Arena emblem. Plus
contains Story (and the existing local-only Atelier). The same bar stays available
in combat. Coarse-pointer Razr landscape at 1007 x 412 uses the phone shell too.

The home uses the existing Astralia map, native equipment medallions, and a random
pool of eight actual catalogue cards. Cards float into place with their identity
and narrative. The pool does not mutate the catalogue or combat RNG. Rotation
pauses for dialogs, keyboard focus, hidden documents and reduced motion. Listeners,
observers and timers are destroyed when leaving the view.

`page-transitions.js` adds short, non-blocking native-icon transitions, with a
three-card fan for Decks. It never covers the lineup presentation. Initial loading
is the real application boot, not a fabricated wait or progress percentage.

## Introduction Reliability

The exact physical Razr failure is not proven. Additional reproducible failure
paths were found around weapon-clue icons and layout measurement. Icon work is
prepared once per actor, not rescanned at each clue beat. Failed individual visual
operations preserve the existing timeline. An unexpected presentation error holds
the game in initiative and offers an explicit Continue action, never silently
rolls the captains or starts gameplay. A bounded diagnostic is stored in session
storage as `kalistar.v4.lineup-diagnostic`.

`openingMatch` is a profile-scoped localStorage preference containing the pending
match ID. Reload during the five-pair presentation replays it without changing the
saved game or consuming combat RNG. A winning captain draw / explicit skip clears
the preference. Legacy saves without it retain their former captain-only resume.

## Statistics and Card Detail

Phone career rows expand one accessible accordion at a time, with genuine totals,
weighted means, historical tracking denominators, donor/support data and Golden
trophies. Sorting, filters, CSV, grouping and PC direct card inspection are kept.

Character detail places actual equipment mini-cards immediately below the native
card. Deck composition, local profile and match snapshots remain distinct. In an
arena inspection only active overlays appear on the card; all carried mini-cards
show explicit active/inactive labels. Faces, lore and career use readable folds.
Archives without equipment evidence do not fabricate current profile equipment.
The nested equipment catalogue keeps its existing current-definition behavior;
the historical match mini-card uses the saved definition.

## Verification

Arena decisions use `arena-prompts.css` and the read-only `arenaCardPrompt`
helper. Both teams invite the missing selection; choosing a card settles its
team's cue. Once the pair is ready, an enabled action receives a quiet copper
reflection. Busy states, AI decisions, introductions and dialogs suppress these
decorations. Support/placement cues use the existing eligibility predicates.
Only composited opacity/transform animate; Reduced Motion keeps static outlines.
No card dimensions, hit areas, engine phases or combat calculations change.

Local checks cover PC, Razr, 320 px compact and both landscape formats; native
equipment cards, Back, favorites, PNG, active/inactive states and historical
snapshots; modern and historical statistics with eight real completed games.
The eleven lineup scenarios are normal, rejected clue animation, unavailable
animation, cancelled flight, rotation, reduced motion, rejected layout, rejected
icons, 6x CPU slowdown, unexpected stage failure, and reload at P1 weapon.

`qa/` keeps local captures. The release directory records the isolated staged
build, publication suite, and final built-site checks. Chrome touch/standalone
emulation is not a physical Razr validation; retest the installed application.
