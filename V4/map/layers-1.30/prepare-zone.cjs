'use strict';
const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const zone = JSON.parse(fs.readFileSync(path.join(__dirname, 'zone.json'), 'utf8'));
(async () => {
  await sharp(path.resolve(__dirname, zone.parentBase)).extract(zone.crop).png().toFile(path.join(__dirname, 'zone-before.png'));
  await sharp(path.join(__dirname, 'zone-before.png')).resize(1024,973).png().toFile(path.join(__dirname, 'zone-before-large.png'));
  console.log(JSON.stringify({crop:zone.crop, lake:zone.lake, city:zone.city},null,2));
})().catch(error => { console.error(error); process.exitCode = 1; });
