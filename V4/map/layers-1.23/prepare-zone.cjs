const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const zone = JSON.parse(fs.readFileSync(path.join(__dirname, 'zone.json'), 'utf8'));
sharp(path.resolve(__dirname, zone.parentBase)).extract(zone.crop).png()
  .toFile(path.join(__dirname, 'zone-before.png')).catch(error => { console.error(error); process.exitCode = 1; });
