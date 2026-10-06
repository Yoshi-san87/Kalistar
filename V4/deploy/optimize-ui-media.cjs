'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const root=path.resolve(__dirname,'../..'),runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'__ui_media__.cjs'))('sharp');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const output=path.resolve(process.env.KALISTAR_MEDIA_OUTPUT||path.join(root,'V4/site/assets/ui')),assets=[];await fs.mkdir(output,{recursive:true});
  for(const name of ['collection-grimoire-v1','collection-reader-grimoire-v1']){
    const source=await fs.readFile(path.join(root,'V4/site/assets/ui',name+'.png'));
    const bytes=await sharp(source).webp({lossless:true,effort:6}).toBuffer();
    const before=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true}),after=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    if(before.info.width!==after.info.width||before.info.height!==after.info.height||!before.data.equals(after.data))throw Error('UI pixels changed: '+name);
    await fs.writeFile(path.join(output,name+'.webp'),bytes);
    assets.push({name,source:'V4/site/assets/ui/'+name+'.png',target:'V4/site/assets/ui/'+name+'.webp',width:before.info.width,height:before.info.height,sourceSha256:hash(source),sha256:hash(bytes),pixelsSha256:hash(before.data),sourceBytes:source.length,bytes:bytes.length,lossless:true});
  }
  const manifest=process.env.KALISTAR_MEDIA_OUTPUT?path.join(output,'lossless-grimoire.json'):path.join(__dirname,'lossless-grimoire.json');
  await fs.writeFile(manifest,JSON.stringify({generator:'sharp lossless WebP, effort 6',assets},null,2)+'\n');
  console.log(JSON.stringify(assets.map(a=>({name:a.name,before:a.sourceBytes,after:a.bytes,savedPercent:+((1-a.bytes/a.sourceBytes)*100).toFixed(1)})),null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
