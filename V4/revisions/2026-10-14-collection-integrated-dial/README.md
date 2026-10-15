# Collection - Integrated Dial and Larger Names

User-approved follow-up to the faction watermark and on-card favorite.
Character names are enlarged within the unchanged 64px copper pedestal.
Large 20px lettering keeps responsive card-relative queries. Real font bounds
determine shrinking only when necessary, on paint, resize and initial font load.
Whole words are preserved; exceptionally long unbroken names can wrap as a
fallback. Up to five position emblems have a reserved grid, never over the name.
Legacy caption/type/counter/position rules are removed from the binder, mobile
and position sheets rather than overridden. The pedestal sheet is the sole
owner of this component's geometry, typography and controls.

The owned-copy counter is a read-only sibling of the card reader and favorite,
4px inside the card's lower-left corner. The existing Collection bitmap and
number are adjacent; the number and accessible label belong to the current
card ID. It never intercepts pointer input. A large count may ellipsize visually,
while its accessible label keeps the full count. No storage migration.

The multi-version dial is recessed in an engraved rail connected to the lower
painted rim, without its former separately bordered capsule. The existing
rotate-3d glyph, version count, focus restoration and 640ms card switch remain.
No permanent animation or timer is introduced. Reduced Motion disables rotation;
forced colors restore explicit controls. Single-version cards render no version
control or count at all, and no right-hand grid column is reserved for one.

The same nine-sliced pedestal WebP, 8px glass-to-corner inset and vertical glass
joint are preserved. No card PNG, PSD, template, reference lock, profile,
equipment, rule, match or save change. Other chats' Map work stays excluded.

Checks: UI unit suite, Collection browser geometry on seven formats, touch and
keyboard actions, favorite reload, edition switching, and compact real-name
rows with varied copy counts. Publication proof lives with
[4.6.59](../../releases/2026-10-14-v4.6.59/README.md).
