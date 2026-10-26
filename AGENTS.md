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
- The personal repository is Yoshi-san87/Kalistar. Never initialize another
  repository, reconfigure its remote, or select a work repository automatically.
  Publication authorization and coordination are defined below.
- Preserve byte identity for protected files, including line endings. The root
  `.gitattributes` intentionally disables text normalization.
- The cleanup record is `maintenance/cleanup-2026-09-19/`. Archived root scripts
  are in `maintenance/scripts-historiques/`; they are not current entry points.

## Engineering Quality (26 October 2026)

- Quality preference (26 October 2026): address the underlying contract or
  source of a problem rather than accumulating per-item compensations. For
  sprite V2, deliver bodies at a common native pixel density with a fixed root.
  The user subsequently approved one offline conversion from source art to
  native sprites (26 October): anatomical sizing, palette and reviewed anchors.
  Never use per-character runtime enlargement or per-frame scale corrections.

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

## Standing Publication Coordination (12 October 2026)

- The user authorizes coordination messages between Kalistar chats for release
  ordering and version conflicts without asking again. This applies only to
  Kalistar publication coordination, not unrelated projects or messages.
- Preserve each chat's scope and wait for the agreed publication order before
  changing shared version files or staging a release.

## Repository Organisation (14 October 2026)

- Read docs/INDEX.md and docs/ORGANISATION.md. Current guides are not changelogs;
  keep dated evidence in the original lot/release and history in docs/historique/.
- Preserve source paths and approved locks. A dated folder can still contain
  active dependencies; never move or remove it merely because it looks old.
- Put new scratch output, repeated QA captures and publication staging in work/,
  which is ignored except its README. Do not force-add generated/private files.
- Use maintenance/validation-suites.json as the single CI/local test registry.
  Name new browser tests *.browser.test.cjs; register other direct tests.
- Run npm run check after explicit staging. New root/V4 areas must have a purpose
  in maintenance/organisation.json. The check is read-only and never cleans files.
- Keep README and domain guides current, linking to docs/INDEX.md. Do not append
  every release story to the handoff/site README or create competing catalogues.

## Direct Cloudflare Publication (15 October 2026)

- The playable site is https://kalistar.pages.dev/jeu/ in the existing personal
  Pages project `kalistar`. Publish a frozen validated build from this PC with
  Wrangler, not through a GitHub/LFS build. Keep its origin and local player data.
- Git stores code, profiles, locks and the SHA-256 runtime media registry only.
  Images, PSDs, binary documents and compiled libraries stay physically at their
  existing paths on the production PC. Their removal from the Git index is NOT
  permission to delete or move local sources. Preserve .gitattributes byte identity.
- Before a release, back up new native sources outside the checkout. Refresh
  V4/deploy/runtime-media.json for approved cards and explicitly added web assets.
  Never force-add ignored binaries. npm run check enforces this boundary.
- Run the complete local validation suite with original media. The GitHub
  `repository` suite is deliberately text-only; it is not a replacement for
  local native, gameplay, build and desktop/mobile browser verification.
- Follow V4/deploy/README.md: stage only finished text, version/tag, prepare the
  exact commit with prepare-release.cjs, verify it, then deploy to the existing
  project. Do not change Cloudflare Access or turn Git-triggered builds back on.
- Do not push old archive branches/tags or use --mirror/--all/--tags to a clean
  remote: they can reintroduce the LFS history. Archive history stays in the
  verified PC backup. No remote purge or repository recreation without explicit
  human confirmation; deleting tracked files alone does not free old LFS storage.
