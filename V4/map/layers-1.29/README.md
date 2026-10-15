# Map 1.29 - City legibility

The old flattened atlas reduced 32-50px monuments to roughly 7-12px on phones.
Runtime now separates the unchanged 1.26 terrain from six sharp alpha emblems.
Each emblem is positioned from native coordinates, independently sized with a
minimum screen size and a proximity cap. Tight parchment underprint and cast
shadows separate silhouettes from forests without a generic badge or glow.
Names use a stable readable type size; compact overview hides non-selected
names to avoid crowding. City selection focuses compact maps automatically.
Touch landscape places the list beside the map to recover vertical map space.

No new image generation or terrain edits. Approved landmark source images are
reused. `build-media.cjs` creates the lossless terrain, six 192px-high alpha
emblems, native print preview and layered PSD. Historical city layers are
preserved hidden; the new city groups keep separate shadows, underprint, images
and editable names. PSD reopening and terrain/runtime pixel identity verified.
Native Photoshop not tested.

Run `node V4/map/layers-1.29/build-media.cjs` to rebuild exports. Runtime anchors
and nominal sizes live in `V4/site/map-view.js`. Add an approved alpha source to
the builder source registry when adding a city; do not bake it into the runtime
terrain. Existing city IDs, accordion navigation, zoom and cleanup are retained.
