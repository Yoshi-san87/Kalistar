# Kalistar 4.5.54

The equipped character thumbnail (or assignment plus) now occupies the
lower-left corner of equipment cards. Its size, proportions and vertical
position are unchanged. The hit target uses the same calibrated anchor.

The bearer label expands from 350 to 512 native units and is centered under
the full right-hand text panel. This shared layout applies to character,
job, faction and race labels across weapons, protections and relics.

No artwork, native card, equipment restriction, bonus, combat rule or saved
profile schema is changed. The dynamic collectible layout advances to v3;
existing media manifests continue to describe their preserved source assets.

## Verification

- Focused presentation, bearer, build and PWA tests: 21 tests passed.
- Browser: six viewport formats, assignment via the plus, equipped portrait,
  reload, unequip, personal/job labels and non-overlapping hit targets.
- All 75 equipment labels checked at card widths 190, 310, 570 and 1000 px.
- Isolated Pages validation: 445 tests passed and the static build succeeded.
- The six browser scenarios also passed against the built Pages files.
- Captures and results: `V4/revisions/2026-10-08-equipment-holder/qa/`.

Publication: personal `Yoshi-san87/Kalistar` repository, `main`, annotated
tag `v4.5.54`.
