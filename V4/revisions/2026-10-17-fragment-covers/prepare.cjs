'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../../..');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime, '_fragment_covers.cjs'))('sharp');
const assets = [
  {source:'V4/revisions/2026-10-17-fragment-covers/sources/binding-v1.png', output:'binding-v1.webp', width:1024},
  {modelId:'30000001', source:'V3/assets/illustrations/01_ELECTRO_MOMO.png', output:'30000001-art-v1.webp', width:900},
  {modelId:'49900802', source:'V4/Illustrations/Variants_Balmhyr_Fist_03.png', output:'49900802-art-v1.webp', width:900},
  {modelId:'49055457', source:'V4/creations/49055457/illustration.png', output:'49055457-art-v1.webp', width:900}
];
async function main() {
  const output = path.join(root, 'V4/site/assets/journeys');
  fs.mkdirSync(output, {recursive:true});
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const records = [];
  for (const asset of assets) {
    const source = fs.readFileSync(path.join(root, asset.source));
    const buffer = await sharp(source).resize({width:asset.width, withoutEnlargement:true}).webp({quality:91, alphaQuality:100, effort:6}).toBuffer();
    fs.writeFileSync(path.join(output, asset.output), buffer);
    const {width,height,hasAlpha} = await sharp(buffer).metadata();
    records.push({...asset, sourceSha256:sha(source), output:'V4/site/assets/journeys/'+asset.output, sha256:sha(buffer), bytes:buffer.length, width,height,hasAlpha});
  }
  fs.writeFileSync(path.join(__dirname,'provenance.json'), JSON.stringify({schemaVersion:1,method:'Built-in image generation for binding only; original approved paintings resized and encoded, never regenerated.',assets:records},null,2)+'\n');
  console.log(JSON.stringify(records.map(({output,bytes,width,height})=>({output,bytes,width,height})),null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
