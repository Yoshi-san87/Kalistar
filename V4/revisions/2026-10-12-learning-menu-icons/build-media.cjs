'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.KALISTAR_SHARP||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../../..');
(async()=>{
  const assets=[];
  for(const name of ['guide','library']){
    const source=path.join(__dirname,name+'-source.png');
    const target=path.join(root,'V4/site/assets/navigation',name+'-v1.webp');
    const fitted=await sharp(source).trim().resize(112,112,{fit:'contain',background:'#00000000'}).png().toBuffer();
    await sharp(fitted).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).webp({lossless:true}).toFile(target);
    const metadata=await sharp(target).metadata();
    if(metadata.width!==128||metadata.height!==128||!metadata.hasAlpha)throw new Error('Invalid icon '+name);
    assets.push({name,file:path.relative(root,target).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex'),sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(source)).digest('hex')});
  }
  fs.writeFileSync(path.join(__dirname,'media-provenance.json'),JSON.stringify({generator:'OpenAI imagegen',transparent:true,size:128,assets},null,2)+'\n');
})();
