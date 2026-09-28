# Metal Gear arenas

Three environment-only additions. Existing cards, PSDs, factions, saves and
combat mechanics are unchanged. Artwork generated with built-in image_gen;
exact prompts and reference URLs are in `prompts.json`, output provenance in
`installation.json`. The inspected Kalistar arena is a style reference, not
an input image sent to the generator.

- MGS1: Shadow Moses heliport, CRYO.
- MGS2: Big Shell platforms, HYDRO.
- MGS4: unnamed Middle Eastern streets, GEO.

The existing collaboration registry gates each arena by its own episode's
published cards. Home affinities follow shared character identity across
versions, exactly as existing arenas do. Shadow Moses includes its eight
published characters; Big Shell includes Snake; MGS4 includes Snake, Meryl
and Ocelot. These are game-design affinities, not new canonical lore.

Existing limits remain +15 elemental ATK, +10 home ATK and +10 home DEF;
maximum +25 ATK / +10 DEF, symmetric for both teams. No stacking rule changes.
Artwork lives in `V4/site/assets/arenes/mgs*.png`, with originals preserved
at their generated source paths. There are no new card PSDs for environments.

Run `node --test --test-isolation=none arena.test.cjs` from this directory.
Browser QA uses fresh isolated contexts, never the user's browser storage.
