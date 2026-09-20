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
