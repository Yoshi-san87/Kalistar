'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'__astralia_atlas__.cjs'))('sharp');
const source=path.join(__dirname,'astralia-planisphere-original-v1.png');
const target=path.resolve(__dirname,'../../site/assets/ui/collection-astralia-planisphere-v1.webp');
const sha=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const original=await fs.readFile(source),metadata=await sharp(original).metadata();
  await sharp(original).resize({width:2048,withoutEnlargement:true}).webp({quality:86,effort:6}).toFile(target);
  const output=await fs.readFile(target),optimized=await sharp(output).metadata();
  const manifest={generator:'built-in image_gen',prompt:'prompt.txt',source:{file:path.basename(source),width:metadata.width,height:metadata.height,bytes:original.length,sha256:sha(original)},runtime:{file:'V4/site/assets/ui/'+path.basename(target),width:optimized.width,height:optimized.height,bytes:output.length,sha256:sha(output)},conversion:{maxWidth:2048,withoutEnlargement:true,format:'webp',quality:86,effort:6}};
  await fs.writeFile(path.join(__dirname,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(JSON.stringify(manifest));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
