# Kalistar V4.6.10 - arena closing ceremony

Release scope: final-result button, native arena ceremony and related tests,
documentation, boot dependency and version assertions.

The final exchange says Duel termine only when the unchanged engine resolver
would finish the match. The user still chooses when to advance. Earned cards
and their Golden trophies are staged on the arena, MVP first, without confetti.
Palmares and the last duel remain immediately accessible. PC and phone use
the same results and assets; partial archives cannot fabricate trophies.

No gameplay, RNG, native artwork, equipment rule, save format, ownership,
professional Drive or protected reference is changed. Unrelated shared
checkout work is excluded from staging.

Validation evidence:
- 620 publication tests pass across 56 workflow commands. Static build:
  315 cards, 1,136 files, 765.5 MiB. No catalogue change in this release.
- `qa/publication.json`: all workflow commands run on an isolated staged tree,
  followed by the GitHub Pages static build.
- `../../revisions/2026-10-09-arena-finale/qa/built/`: five viewport captures,
  real final action, carousel, report, last duel, reload, resize, Reduced Motion.
- Pages browser regression passes: Collection, reader, PNG download, Decks,
  arena, saved match, additive publication, no Atelier or HTTP/page errors.
- Existing central-console cue passes all 42 checks across 21 real engine
  states on desktop and phone, including the neutral finished match.
- GitHub Pages workflow and exact public asset/version checks are verified
  after the atomic main/tag push before reporting the site live.

Personal repository: https://github.com/Yoshi-san87/Kalistar
Annotated release tag: v4.6.10.
