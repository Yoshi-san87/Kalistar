# Delivery: Umaro Macako and portable Final Fantasy tests

## Scope

- Umaro 49901114: YETI -> existing MACAKO race and native portrait.
- Same artwork, lore, identity, roles, positions, stats, effects and banner.
- Existing Macako DEF synergy applies normally; no engine change.
- New native revision with original files preserved, editable PSD, barcode
  validation, identical reopened PNG and zero changes outside the race zones.
- Integration tests read delivered profiles without the Photoshop designer.
- The initial trilogy source and its frozen proofs remain unchanged.

## Verification

The ten Final Fantasy integration checks pass, including 174 ATK faces,
174 DEF faces, 87 complete matches and the new Macako synergy assertion.
All 44 mechanics/portability commands in the isolated Git snapshot pass.
The following static build initially exhausted disk space; its failed record
is retained. Only this task's temporary snapshot was removed. The subsequent
build succeeds: 294 cards, 989 files, 710.5 MiB.

Browser verification succeeds at 1440x1000, 412x915 and 320x740, with all
29 cards, eight readers, three restored matches and no JavaScript/HTTP errors.
The desktop and Razr Umaro captures were visually inspected. Fresh captures
are under the Umaro revision's browser-proof directory; old captures remain
untouched.

The first shared-worktree rerun records failures from separate in-progress
equipment additions. Those files are not part of this release. The isolated
snapshot uses the Git versions plus only this task's corrections.
