'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'__weapon_cards__.cjs'))('sharp');
const {layout,faces,backgrounds}=require('../site/weapon-cards.js'),{weapons}=require('../site/weapons.js');
const backdropSources=require('./background-sources.json');
const output=path.resolve(__dirname,'../site/assets/weapon-cards'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  await fs.mkdir(output,{recursive:true});const assets=[];
  const numbers=new Set();
  for(const w of weapons){
    const face=faces[w.id];
    if(!face?.number||numbers.has(face.number)||!face.alt?.trim()||!face.flavour?.trim()||face.flavour.length>50)throw Error('Incomplete or overlong collectible copy: '+w.id);
    if(!/^[a-z0-9-]+\.webp$/.test(face.illustration))throw Error('Expected a local, versioned illustration filename: '+w.id);
    numbers.add(face.number);
  }
  const files=[{name:layout.frame,frame:true},...weapons.map(w=>{
    if(!faces[w.id])throw Error('Missing collectible face: '+w.id);
    return {name:faces[w.id].illustration,frame:false,weapon:w};
  })];
  for(const {name,frame,weapon} of files){
    const source=path.join(__dirname,'sources',name.replace(/\.webp$/,'.png'));
    const bytes=await fs.readFile(source),meta=await sharp(bytes).metadata();
    if(frame&&(meta.width!==layout.width||meta.height!==layout.height))throw Error('Template dimensions changed: recalibrate the layout.');
    const image=sharp(bytes),webp=await(frame?image.webp({lossless:true}):image.resize({width:1122,withoutEnlargement:true}).webp({quality:92})).toBuffer();
    await fs.writeFile(path.join(output,name),webp);
    assets.push({source:'sources/'+path.basename(source),sourceHash:digest(bytes),width:meta.width,height:meta.height,
      file:'V4/site/assets/weapon-cards/'+name,sha256:digest(webp),bytes:webp.length});
    if(weapon?.collectible?.cutout){
      if(!meta.hasAlpha)throw Error('Weapon cutout needs transparency: '+weapon.id);
      const motif=await sharp(bytes).resize({width:240,height:240,fit:'inside'}).png().toBuffer();
      const m=await sharp(motif).metadata();
      const emblem=await sharp({create:{width:488,height:488,channels:4,background:'#00000000'}})
        .composite([{input:motif,left:Math.round((488-m.width)/2),top:Math.round((484-m.height)/2)}]).webp({quality:94}).toBuffer();
      const target=path.resolve(__dirname,'../site/assets/equipment',weapon.art+'.webp');
      await fs.writeFile(target,emblem);
      assets.push({source:'sources/'+path.basename(source),sourceHash:digest(bytes),
        file:'V4/site/assets/equipment/'+weapon.art+'.webp',sha256:digest(emblem),bytes:emblem.length,
        placement:{canvas:488,maximumMotifBox:240,maximumRadius:171,center:[244,242]}});
    }
  }
  const expected=new Set(Object.values(backgrounds));
  if(expected.size!==backdropSources.assets.length||backdropSources.assets.some(a=>!expected.has(a.file)))throw Error('Background sources do not match the renderer.');
  await fs.mkdir(path.join(output,'backgrounds'),{recursive:true});
  for(const a of backdropSources.assets){
    if(!/^[a-z0-9-]+\.webp$/.test(a.file))throw Error('Invalid background filename');
    const source=path.resolve(__dirname,'../..',a.source),bytes=await fs.readFile(source),meta=await sharp(bytes).metadata();
    const webp=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:86}).toBuffer();
    await fs.writeFile(path.join(output,'backgrounds',a.file),webp);
    assets.push({source:a.source,kind:a.kind,role:'background',sourceHash:digest(bytes),width:meta.width,height:meta.height,
      file:'V4/site/assets/weapon-cards/backgrounds/'+a.file,sha256:digest(webp),bytes:webp.length});
  }
  const result={schema:1,layoutVersion:layout.version,method:'Original raster preserved; WebP encoding only. Crop, frame, artwork and live medallion are separate HTML layers.',assets};
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify(result,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
