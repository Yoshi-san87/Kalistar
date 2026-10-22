'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../../..');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'_balmhyr_cover.cjs'))('sharp');
async function main(){
  const source='V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_02_CANYONERO.png';
  const output='V4/site/assets/journeys/30000007-art-v1.webp';
  const bytes=fs.readFileSync(path.join(root,source)),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
  const approved=require('../../atelier/data/references.json');
  if(!JSON.stringify(approved).includes(hash(bytes)))throw Error('The approved painting hash must remain locked');
  const encoded=await sharp(bytes).resize({width:900,withoutEnlargement:true}).webp({quality:91,alphaQuality:100,effort:6}).toBuffer();
  fs.writeFileSync(path.join(root,output),encoded);
  const {width,height}=await sharp(encoded).metadata();
  const record={modelId:'30000007',source,sourceSha256:hash(bytes),output,sha256:hash(encoded),bytes:encoded.length,width,height};
  fs.writeFileSync(path.join(__dirname,'cover-provenance.json'),JSON.stringify({schemaVersion:1,method:'Original approved Canyonero painting, resized and encoded only.',assets:[record]},null,2)+'\n');
  console.log(JSON.stringify(record));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
