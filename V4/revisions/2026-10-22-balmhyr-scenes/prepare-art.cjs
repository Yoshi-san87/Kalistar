'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../../..');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime, '_balmhyr_scenes.cjs'))('sharp');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function main() {
  const prompts = JSON.parse(fs.readFileSync(path.join(__dirname, 'prompts.json'), 'utf8'));
  const assets = [];
  const references = new Map();
  for (const scene of prompts.scenes) {
    const input = fs.readFileSync(path.join(root, scene.source));
    const sourceInfo = await sharp(input).metadata();
    if (Math.abs(sourceInfo.width / sourceInfo.height - 16 / 9) > .01) throw new Error('Expected panoramic source: ' + scene.id);
    for (const reference of scene.refs) references.set(reference, sha(fs.readFileSync(path.join(root, reference))));
    // Preserve the selected painting; only encode responsive delivery sizes.
    for (const [suffix, width, budget] of [['', 1672, 500000], ['-small', 840, 180000]]) {
      const output = 'V4/site/assets/journeys/' + scene.id + '-v1' + suffix + '.webp';
      const bytes = await sharp(input).resize({width, withoutEnlargement:true}).webp({quality:86, effort:6}).toBuffer();
      if (bytes.length > budget) throw new Error('Scene exceeds delivery budget: ' + output);
      const info = await sharp(bytes).metadata();
      fs.writeFileSync(path.join(root, output), bytes);
      assets.push({source:scene.source, sourceSha256:sha(input), output, sha256:sha(bytes), bytes:bytes.length, width:info.width, height:info.height});
    }
  }
  const provenance = {schemaVersion:1, method:'Original narrative paintings generated from approved character and equipment references. Responsive WebP encodings only; no crop or creative alteration. Madania scene preserved exactly as approved by the author.', references:Object.fromEntries(references), assets};
  fs.writeFileSync(path.join(__dirname, 'art-provenance.json'), JSON.stringify(provenance, null, 2) + '\n');
  console.log(JSON.stringify({assets:assets.length, bytes:assets.reduce((sum,item)=>sum+item.bytes,0), largest:Math.max(...assets.map(item=>item.bytes))}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
