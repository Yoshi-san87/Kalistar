# White Flail Glyph

Explicit user-requested replacement of the white nunchaku pictogram with a
white chain-and-spiked-ball flail for every current Fléau card.
Current catalogue: Reevus `30000026` and Selphie `40976482`.
Their stable identity, gameplay, illustration, text and card frame are unchanged.

## Source And Scope

Flail icon by **Delapouite**, [Game-icons.net](https://game-icons.net/1x1/delapouite/flail.html),
licensed [CC BY 3.0](https://creativecommons.org/licenses/by/3.0/).
Original SVG and white raster export are retained in `assets/`.
The visible shape is resized and optically centered inside the approved
native weapon email. The alpha contour has at least 3.5 px clearance.
The original email's outer semi-transparent pixels are retained byte-for-byte
after compositing, avoiding premultiplied-alpha rounding at the copper rim.

The actual current cards embed a combined `ARME - Fléau` smart object.
Only this smart object is replaced in Photoshop copies. It stays editable
and embedded; the native text layers are untouched.

Future packed/raw designer banks use the same audited PNG. The optical
registry also supplies a declarative `source` for canonical native binds,
so the obsolete donor pictogram cannot return. Existing other layouts remain.

The site reuses the new silhouette in the weapon Codex and crystal-less
weapon display. Author/license links appear in the Codex.

## Native Evidence

- Originals and pre-change hashes: `originals/`, `before.json`.
- PSD and PNG staging plus reopened-layer reports: `staged/`.
- Pixel diff: zero changes outside the 47.5 px weapon circle for both cards.
- PSD reopen: zero changed pixels, all other layers and text preserved.
- Four barcode reads passed for each card.
- Optical error 0.205 px; full alpha radius 40.302 px within 44 px.
- Honest reference migration and transactional rollback guard:
  `publication-plan.json`, `published.json`, `transaction.json`.
- Previous protections remain. No archived proof or lock rewritten to hide
  a failure. The new migration requires an actual 38-reference regression.
- Actual regression completed: 38 references identical, reopened PSDs and
  all barcode checks passed. Reports and native layer records are retained
  in `native-regression/`; digest manifest in `native-regression.json`.

Commands: `revision.cjs prepare <downloaded-svg>`, `bank`, `native`,
`verify`, `publish`; then `node V4/atelier/runner.cjs`.
All production publication goes through verified staging and backups.
