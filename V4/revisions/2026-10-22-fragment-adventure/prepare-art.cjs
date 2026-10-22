'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../../..');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime, '_fragment_art.cjs'))('sharp');
const names = ['momo-rebuts','momo-passage','momo-carillons','momo-rester','momo-souffle','momo-coutures','momo-boite'];
async function main() {
  const destination = path.join(root,'V4/site/assets/journeys');
  fs.mkdirSync(destination,{recursive:true});
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), records = [];
  for (const name of names) {
    const revision = name === 'momo-boite' ? 2 : 1;
    const source = 'V4/revisions/2026-10-22-fragment-adventure/sources/'+name+'-v'+revision+'.png';
    const input = fs.readFileSync(path.join(root,source));
    // Separate responsive encodings, no crop or alteration of the original painting.
    for (const [suffix,width] of [['',1672],['-small',840]]) {
      const output = 'V4/site/assets/journeys/'+name+'-v'+revision+suffix+'.webp';
      const bytes = await sharp(input).resize({width,withoutEnlargement:true}).webp({quality:86,effort:6}).toBuffer();
      fs.writeFileSync(path.join(root,output),bytes);
      const info = await sharp(bytes).metadata();
      records.push({source,sourceSha256:sha(input),output,sha256:sha(bytes),bytes:bytes.length,width:info.width,height:info.height});
    }
  }
  const source = 'V3/assets/illustrations/14_electro_momo_carillon.png', input = fs.readFileSync(path.join(root,source));
  const output = 'V4/site/assets/journeys/30000014-art-v1.webp';
  const bytes = await sharp(input).resize({width:900,withoutEnlargement:true}).webp({quality:91,effort:6}).toBuffer();
  fs.writeFileSync(path.join(root,output),bytes);
  const info = await sharp(bytes).metadata();
  records.push({modelId:'30000014',source,sourceSha256:sha(input),output,sha256:sha(bytes),bytes:bytes.length,width:info.width,height:info.height});
  fs.writeFileSync(path.join(__dirname,'art-provenance.json'),JSON.stringify({schemaVersion:1,method:'Generated narrative scenes from approved character references; reward cover from original approved illustration. Responsive WebP encodings only.',assets:records},null,2)+'\n');
  console.log(JSON.stringify({assets:records.length,bytes:records.reduce((sum,item)=>sum+item.bytes,0),largest:Math.max(...records.map(item=>item.bytes))}));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
