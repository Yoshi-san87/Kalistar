# Weapon Medallion Revision

User-requested correction of the small white fragment at the upper-left inside
the weapon medallion. The fragment belonged to the common lower-frame bitmap,
not to the weapon icon or its alignment.

- `frame-original.png` is the embedded 950 x 1655 source exported from Taulio.
- `frame-clean.png` contains a local Photoshop enamel retouch. The copper rim,
  medallion geometry and weapon icons remain unchanged.
- `plan.json` identifies the current 27 cards, both production masters and the
  private Cloud trial. No archived V3 assets are changed.
- The same corrected embedded content is installed in the native PSDs, with
  the original smart-object transformation and lock restored.
- The six Atelier frame images receive the exact native raster correction;
  all other component files remain byte-identical.

`verification.json` requires unchanged layer properties and editable text,
zero pixel differences outside the tiny medallion rectangle, and pixel-exact
PSD reopening. `published.json` records the explicit reference migration and
original-file backups. The shared renderer itself is unchanged. The current
Atelier regression must be rerun against the new reference ID before delivery;
`complete.json` records the result, not an inferred or automatically reset pass.

`originals/` preserves the replaced files. The staged PSD copies may be removed
only after their hashes match the published originals. Historical proof images
are historical; the current registry and this revision supersede their small
medallion region. Do not rerun the old frame extraction from previous masters.
