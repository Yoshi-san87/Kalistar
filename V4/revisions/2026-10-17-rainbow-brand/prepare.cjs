'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const {createRequire} = require('node:module');
const root = path.resolve(__dirname, '../../..');
const modules = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(modules, '_rainbow_brand.cjs'))('sharp');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const assets = [
  {source:'sources/logo-original.webp', output:'V4/site/assets/logo-rainbow-v2.webp', box:{left:466,top:41,width:64,height:96}, middle:43},
  {source:'sources/kalistel-original.webp', output:'V4/site/assets/navigation/kalistel-rainbow-v2.webp', box:{left:43,top:17,width:42,height:85}, middle:40}
];
async function main() {
  const source = fs.readFileSync(path.join(__dirname, 'sources/rainbow-jewel-upright-v1.png'));
  // Fit only the generated jewel insert. The approved wordmark and mount remain untouched.
  const jewel = await sharp(source).extract({left:29,top:34,width:788,height:1725}).toBuffer();
  const records = [];
  for (const asset of assets) {
    const original = fs.readFileSync(path.join(__dirname, asset.source));
    const {width,height} = asset.box;
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><path d="M${width/2} 0 L${width} ${asset.middle} L${width/2} ${height} L0 ${asset.middle}Z" fill="white"/></svg>`);
    const insert = await sharp(jewel).resize(width,height,{fit:'fill'}).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
    const before = await sharp(original).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const composed = await sharp(original).ensureAlpha().composite([{input:insert,left:asset.box.left,top:asset.box.top}]).raw().toBuffer();
    // Avoid premultiplication rounding on the untouched translucent metal edge.
    for(let y=0;y<before.info.height;y++)for(let x=0;x<before.info.width;x++){
      if(x>=asset.box.left&&x<asset.box.left+width&&y>=asset.box.top&&y<asset.box.top+height)continue;
      const index=(y*before.info.width+x)*4;
      before.data.copy(composed,index,index,index+4);
    }
    const output = await sharp(composed,{raw:{width:before.info.width,height:before.info.height,channels:4}}).webp({lossless:true,effort:6}).toBuffer();
    const destination = path.join(root,asset.output);
    fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,output);
    const after = await sharp(output).ensureAlpha().raw().toBuffer();
    let outsideChanges=0;
    for(let y=0;y<before.info.height;y++)for(let x=0;x<before.info.width;x++){
      if(x>=asset.box.left&&x<asset.box.left+width&&y>=asset.box.top&&y<asset.box.top+height)continue;
      const index=(y*before.info.width+x)*4;
      if(before.data[index+3]===0&&after[index+3]===0)continue;
      for(let c=0;c<4;c++)if(before.data[index+c]!==after[index+c])outsideChanges++;
    }
    if(outsideChanges)throw Error('Pixels outside the jewel changed: '+asset.output);
    records.push({...asset,sourceSha256:sha(original),sha256:sha(output),bytes:output.length,outsideChanges});
  }
  const proposals=path.join(root,'V4/propositions/2026-10-17-card-backs');
  for(let i=1;i<=5;i++)await sharp(path.join(proposals,`sources/dos-${i}.png`)).resize({width:600}).webp({quality:92,effort:6}).toFile(path.join(proposals,`dos-${i}.webp`));
  fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({schemaVersion:1,generator:'Built-in image_gen',jewelSha256:sha(source),method:'Generated upright jewel inserted into existing mounts; wordmark and original assets preserved; lossless runtime exports.',assets:records},null,2)+'\n');
  console.log(JSON.stringify(records,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
