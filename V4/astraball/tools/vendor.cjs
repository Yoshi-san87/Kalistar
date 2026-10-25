const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const out = path.join(root, 'assets/vendor');
fs.mkdirSync(out, { recursive: true });
require('esbuild').buildSync({
  stdin:{contents:"export { Application, Container, Sprite, Graphics, Text, Assets, Texture, Rectangle } from 'pixi.js'; import 'pixi.js/unsafe-eval';",resolveDir:root,sourcefile:'pixi-csp-entry.mjs'},
  bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,legalComments:'inline',
  outfile:path.join(out,'pixi-csp-sprites-v8.22.0.mjs')
});
fs.copyFileSync(path.join(root, 'node_modules/pixi.js/LICENSE'), path.join(out, 'PIXI-LICENSE.txt'));
console.log('PixiJS browser runtime prepared locally.');
