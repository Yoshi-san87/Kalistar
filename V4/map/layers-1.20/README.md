# Map 1.20 - Northern mountain barrier

Generated with built-in image_gen from a context crop of map 1.19.
The exact prompt is `zone.prompt.txt`; the user's location is preserved in
`user-zone-reference.png`. A connected natural mountain barrier continues east,
with open tundra, small frozen lakes and a modest central ice shelf extension.

Run `node V4/map/layers-1.20/build-zone-map.cjs` to reproduce the masked composite.
The generated letterbox is removed before fitting to the original crop.
The PSD retains all previous layers and adds one independently editable masked
terrain layer. The saved PSD was reopened and its composite compared exactly.
Photoshop itself was not used. Outside the mask: zero changed pixels.

This is a versioned map proposal; the site's approved runtime map stays 1.19.
