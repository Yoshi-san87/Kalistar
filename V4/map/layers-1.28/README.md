# Map 1.28 - Published atlas and Cryptown inside the abyss

The author requests moving Cryptown's cross inside the hole and publishing
the current map. The same approved emblem is repositioned, not regenerated.
Its 32px icon is centered at (108,627), with the name below the island.
Rebuilding from the clean 1.26 PSD replaces the old Cryptown placement without
duplicating it. Prior terrain and all other city layers are unchanged.

Run `node V4/map/layers-1.28/build-cryptown.cjs`, then
`node V4/map/layers-1.28/publish.cjs` for the lossless runtime atlas and transparent
Vulkar/Cryptown thumbnails. Original generation/prompt stays in `layers-1.27/`.
Saved PSD round-trip, original layer identity and atlas/composite pixel identity
are checked. Native Photoshop not tested.

Map 1.28 is now the runtime atlas. Its six city accordion entries retain
stable IDs, accessible selection and marker anchors. Old maps remain intact.
