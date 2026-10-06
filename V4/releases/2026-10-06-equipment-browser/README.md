# Kalistar 4.5.48

## Equipment Browsing

- Desktop equipment gallery uses pages, with six columns on large screens
  and a row count fitted to the viewport. No vertical page scrolling.
- Previous/next controls, page selection and arrow-key navigation.
- Phone scrolling remains native and the last equipment stays reachable.
- Equipment detail shows a paged portrait roster with search, equipped-state
  highlighting, confirmation before transfer/replacement and accessible focus.
- Existing equipment definitions, combat mechanics and saves are unchanged.

Implementation and verification commands:
`V4/revisions/2026-10-06-equipment-browser/README.md`.

## Local Verification

- Equipment browser UX: nine desktop, narrow and phone viewport scenarios.
- Native mobile gestures and embedded Razr preview: six checks.
- Existing weapons browser suite: equip, replace, move, reload, backup, deck,
  duel overlays, both sides, native alignment and Reduced Motion.
- Equipment categories browser suite: category navigation, shared slot,
  replacement, persistence and combat.
- Defensive equipment browser suite: all 40 additions on desktop, equipment
  persistence, real combat, both sides, consumption and relay choices.
- Focused pure-rule/card/build/PWA regression: 42 tests passed.
- Isolated release snapshot: all 433 tests declared by the committed Pages
  workflow passed, followed by a successful static site build.
- Built-site Chrome verification passed on desktop and phone: catalogue,
  reader, image download, decks, arena, saved match and additive publication,
  with no script errors or failed HTTP requests.

Representative captures and JSON results are in
`V4/revisions/2026-10-06-equipment-browser/qa/`.
Browser tests use disposable profiles and do not modify the player's saves.

Publication is restricted to `Yoshi-san87/Kalistar`, `main`, with annotated
tag `v4.5.48`.
