# Metal Gear and mine variants - release coordination

The user's 27 September request authorizes this batch and publication to the
personal `Yoshi-san87/Kalistar` repository. Naked Snake is explicitly excluded.

## Scope and ownership

- Ten Metal Gear cards, with separate MGS1, MGS2 and MGS4 faction banners.
- Three Kalistar variants: Malaba, Voloden and the third Momo.
- Illustration-only revisions of Auron, Kaylis L'elan des couleurs and Lanio
  Le vertige pour rire. Supplied Kaylis and Lanio sources remain byte-identical.
- Optical calibration of Tome and Faucille, affecting six existing cards and
  the shared native/Atelier component banks. The other 18 weapon banks remain
  unchanged. This is not a claim of a new native-alpha audit of all 20 weapons.
- Additive collection integration, shared Solid Snake identity and support for
  more than two Momo variants. Existing gameplay and personal saves are retained.

Native production is serialized: weapon migration and real 38-reference
regression, then three artwork replacements, then thirteen new cards. Their
individual revision folders retain source provenance, snapshots, native proofs
and publication journals. Never regenerate the entire card with image generation.

## Release checks

`browser-review.cjs` verifies the actual published native PNG hashes, profiles,
weapon/faction display, all twelve faces, three banners and browser crop against
the native card. It exercises desktop and mobile in temporary browser contexts,
with same-origin GET requests only. It never opens the user's browser profile.
Set `KALISTAR_REVIEW_URL` to the public `/Kalistar/jeu/` URL for the deployed check.
The timestamped `qa/browser/*/report.json` files are the authoritative outcomes;
the existence of this README is not a passed verification.

`capture-repository.cjs` recorded the existing personal clone's HEAD and local
UI hashes before the synchronization. Do not rerun it to bypass a concurrency
failure. `sync-personal-repository.cjs` first supports a dry-run, then `--apply`.
It requires the real native regression, completed publication journals, exact
old gameplay preservation and the expected personal remote and branch. It keeps
the public clone's newer interface rather than replacing it with the older local
site. Redundant staging/publication directories and test scratch directories are
not transferred; sources, original backups, final native outputs and proofs are.

After synchronization, use the generated null-delimited `stage-paths.txt` for
explicit Git staging, inspect the staged diff, test/build the personal clone and
push only its `origin main`. Verify the Pages deployment and actual public cards.
