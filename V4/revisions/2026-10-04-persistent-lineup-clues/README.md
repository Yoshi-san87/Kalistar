# Persistent Opening Clues

Requested sequence: reveal the weapon, retain it top-left; reveal the crystal,
retain it top-centre; reveal the faction, retain it top-right; reveal the card.
Each clue keeps both its image and its name visible. The three clues stay above
the card during the flip and disappear only as it joins its board slot.

Each clue beat is now 600 ms instead of 500 ms, with the 160 ms docking movement
included in that beat. Five pairs take 17 seconds rather than 15.5 seconds.
Reduced motion uses 280 ms instead of 180 ms and no spatial animation.

## Implementation

- Three persistent nodes per card, outside the rotating back/front container.
- FLIP movement of the same symbol and label into a CSS-responsive dock.
- Dock space reserved in card placement, including short landscape screens.
- Resize cancels in-progress clue transforms to use the current CSS anchor.
- Existing abort, skip, exit, focus trap and cleanup lifecycle retained.
- Native card clues only. No equipped-weapon substitution or game-state write.
- No changes to card assets, reference locks, engine, AI or save schemas.

## Checks

```text
node --test V4/site/lineup-intro.test.cjs
node V4/site/lineup-intro.browser.test.cjs
```

The browser suite uses an isolated Chromium profile and IndexedDB name.
It checks clue accumulation and docking, labels, visibility during the flip,
captains, formation order, unchanged saved state, skip at four stages, exit,
reload, resize during travel and docking, and reduced motion.
Phone widths: 320, 360, 390, 412 (Razr 50), 430; landscape: 844 x 390.
All catalogue clue labels are checked against the dock geometry on each size.

Evidence is in `qa/results.json`, `qa/samples.json` and PNG screenshots.
Representative views: `qa/desktop-p1-faction.png`, `qa/desktop-p1.png`,
`qa/mobile-412-reveal.png`, `qa/mobile-844-reveal.png`.
