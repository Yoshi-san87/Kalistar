'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__kaylis_rapiers__.cjs'))('sharp');
const root=path.resolve(__dirname,'../../..'),plan=require('./art-plan.json');
const hash=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
async function main(){
  const assets=[];
  for(const item of plan.objects)for(const role of ['body','scene','ring']){
    const name=item.id+(role==='body'?'':'-'+role)+'-v1',source='V4/weapon-cards/sources/'+name+'.png';
    const bytes=await fs.readFile(path.join(root,source)),meta=await sharp(bytes).metadata();
    let output,placement=null;
    if(role==='scene')output=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:92}).toBuffer();
    else{
      if(!meta.hasAlpha)throw Error('Alpha missing: '+source);
      const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let clear=0;for(let i=3;i<data.length;i+=4)if(!data[i])clear++;
      if(clear<info.width*info.height*.1)throw Error('Transparent contour missing: '+source);
      if(role==='ring')for(let y=Math.floor(info.height*.35);y<info.height*.65;y++)for(let x=Math.floor(info.width*.35);x<info.width*.65;x++){
        if(data[(y*info.width+x)*4+3]>8)throw Error('Ring center not empty: '+source);
      }
      const size=role==='ring'?484:240,motif=await sharp(bytes).resize({width:size,height:size,fit:'inside'}).png().toBuffer(),m=await sharp(motif).metadata();
      output=await sharp({create:{width:488,height:488,channels:4,background:'#00000000'}}).composite([{input:motif,left:Math.round((488-m.width)/2),top:Math.round((484-m.height)/2)}]).webp({quality:94}).toBuffer();
      placement={canvas:488,center:[244,242],maximumMotifBox:size};
    }
    const file='V4/site/assets/'+(role==='scene'?'weapon-cards/':'equipment/')+name+'.webp';
    await fs.writeFile(path.join(root,file),output);
    assets.push({source,sourceHash:hash(bytes),width:meta.width,height:meta.height,file,sha256:hash(output),bytes:output.length,role,placement});
    if(role==='body'){
      const file='V4/site/assets/weapon-cards/'+name+'.webp',large=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:92}).toBuffer();
      await fs.writeFile(path.join(root,file),large);assets.push({source,sourceHash:hash(bytes),file,sha256:hash(large),bytes:large.length,role:'collectible-source'});
    }
  }
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify({version:1,method:'3 independently generated images; existing 488px optical medallion canvas preserved.',assets},null,2)+'\n');
  console.log('Built '+assets.length+' Kaylis exports.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
