# Native attempt 04 - independent glyph validation

No visual production code, shared renderer, typeface, font size, style, leading,
centering or frame geometry was changed. `compose.jsx` is byte-identical.

The inherited 2B/9S verifier rejected Kaine's accented uppercase name because it assumed every name's
ink height was at most 35 px. The correct native 10 pt Times New Roman name
measures 39 px including its accent, fully inside the approved name band.
All other style checks passed. This is a verification assumption, not a
card-rendering defect.

An independent Photoshop document now measures the 16 unique batch names from
the approved Ruby name layer with the existing KT.apply function. It produces
`typography-calibration-native.json`, with an immutable request and a SHA-256
binding to the approved source and measuring code. The sidecar verifier keeps
every prior font/style check and compares both width AND height with the actual
measured glyph dimensions, plus existing center and header bounds. It does not
increase a generic tolerance. Existing shared validation files are untouched.

All attempt-03 card files, preparations and three produced native outputs are
preserved in `attempts/03-before-native-glyph-validation/`. New preparations
bind the changed verifier and calibration evidence. Julienne and Commander
retain their exact approved native files after component/profile comparisons,
followed by fresh verification. Their earlier proofs remain in the archive.

Kaine's second illustration-only framing revision is recorded in
`evidence/kaine-art-revision-20260924-framing.json`; its profile and crop are
unchanged. This card alone needs a new native render for the new artwork.

Publication and Git remain parent-owned and have not been run.

Completed: 22 native pairs verified; full 38-reference regression passed;
publication preflight passed without publishing. See `RAPPORT_NATIVE.md`.
