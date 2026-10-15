'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
(async()=>{
 const root=path.resolve(__dirname,'../../..'),assets=[];
 const atlas=path.join(root,'V4/site/assets/ui/kalistar-atlas-1.28.webp');
 await sharp(path.join(__dirname,'kalistar-map-1.28-preview.png')).webp({lossless:true}).toFile(atlas);
 assets.push(atlas);
 for(const [name,source] of [['vulkar','../layers-1.25/vulkar-source.png'],['cryptown','../layers-1.27/cryptown-source.png']]){
  const fitted=await sharp(path.join(__dirname,source)).trim().resize(112,112,{fit:'contain',background:'#00000000'}).png().toBuffer();
  const target=path.join(root,'V4/site/assets/map',name+'-v1.webp');
  await sharp(fitted).extend({top:8,bottom:8,left:8,right:8,background:'#00000000'}).webp({lossless:true}).toFile(target);assets.push(target);
 }
 fs.writeFileSync(path.join(__dirname,'published-media.json'),JSON.stringify({version:'1.28',lossless:true,assets:assets.map(file=>({file:path.relative(root,file).replaceAll('\\','/'),sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')}))},null,2)+'\n');
})().catch(error=>{console.error(error);process.exitCode=1;});
