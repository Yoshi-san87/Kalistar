# Map 1.21 - Tropical southern archipelago

Built-in image_gen produced a tropical crop, then a layout refinement using
`zone-before.png` as the edit target and `style-reference.png` as a style input.
Exact prompts: `zone.prompt.txt` and `refinement.prompt.txt`.
Coral shoals, sheltered lagoons, sparse coconut palms and a tiny sailing ship
remain miniature sepia cartographic details, not a modern tropical illustration.

Rebuild: `node V4/map/layers-1.21/build-zone-map.cjs`.
The PSD retains every previous layer and adds one independently masked layer.
All pixels outside the mask and all city layers are unchanged. Saved PSD
round-trip is checked; native Photoshop was not tested.
The site's approved runtime atlas remains 1.19 pending map validation.
