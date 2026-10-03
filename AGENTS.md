# Kalistar Workspace

- The active game and card production live in `V4/`. Read `V4/AGENTS.md` first.
- Read `docs/GUIDE_REPRISE.md` for the consolidated handoff and source priority.
  Its visual and gameplay references distinguish current decisions from old
  experiments. Do not treat an archived report as a new production instruction.
- Preserve paths under `V1/`, `V2/`, `V3/`, `V4/`, `main/` and `Templates/`.
  They include shared assets, original sources and historical dependencies.
- Before cleanup, check the current V4 reference lock and component manifests.
  Never remove an approved source or rewrite reference hashes to hide a change.
- Keep personal browser backups separate from project sources. IndexedDB is not
  stored inside this workspace.
- The user plans to create a new personal repository on another PC. Do not run
  Git initialization, configure a remote, commit or push here without an explicit
  subsequent request. Never select or reuse a work repository automatically.
- Preserve byte identity for protected files, including line endings. The root
  `.gitattributes` intentionally disables text normalization.
- The cleanup record is `maintenance/cleanup-2026-09-19/`. Archived root scripts
  are in `maintenance/scripts-historiques/`; they are not current entry points.

## Versioning Every Push (2 October 2026)

- Each user-authorized push to `Yoshi-san87/Kalistar` must advance the game
  version from the latest published release. Use a patch increment by default.
- Update the desktop title and version badge, mobile version badge and release
  assertions together. Do not change the V4 card edition or save schema merely
  to increment the application version.
- Tag the release commit as `vX.Y.Z` and push the branch and tag together.
  Include release documentation in that push, not in a later same-version push.
- Check for concurrent releases before choosing the next number. Preserve other
  work in the shared checkout and stage only the authorized release scope.
- This versioning rule does not authorize a push without a user request, nor
  does it authorize choosing a different repository or account.

## Standing Publication Request (3 October 2026)

- The user explicitly requests a push after each completed, validated change.
  This is standing authorization for the personal `Yoshi-san87/Kalistar`
  repository only, not for another account or project.
- Keep the versioning rule above: increment the patch version by default,
  commit the release documentation and push `main` with its annotated tag.
- Preserve unrelated or unfinished local work. Do not use a bulk stage or
  force push. Check the actual remote before each publication.
- Verify the Pages workflow and public version before reporting the site live.
