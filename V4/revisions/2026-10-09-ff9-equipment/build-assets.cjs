'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__ff9_media__.cjs'))('sharp');
const root=path.resolve(__dirname,'../../..'),plan=require('./art-plan.json');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const assets=[];
  for(const {id} of plan.objects)for(const role of ['body','scene','ring']){
    const name=id+(role==='body'?'':'-'+role)+'-v1',source='V4/weapon-cards/sources/'+name+'.png';
    const bytes=await fs.readFile(path.join(root,source)),meta=await sharp(bytes).metadata();
    let out,placement=null;
    if(role==='scene')out=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:92}).toBuffer();
    else{
      if(!meta.hasAlpha)throw Error('Expected alpha: '+source);
      const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let clear=0;for(let i=3;i<data.length;i+=info.channels)if(!data[i])clear++;
      if(clear<info.width*info.height*.1)throw Error('Missing transparent contour: '+source);
      if(role==='ring'){
        for(let y=Math.floor(info.height*.35);y<info.height*.65;y++)for(let x=Math.floor(info.width*.35);x<info.width*.65;x++){
          if(data[(y*info.width+x)*4+3]>8)throw Error('Ring center is not empty: '+source);
        }
      }
      const size=role==='ring'?484:240,motif=await sharp(bytes).resize({width:size,height:size,fit:'inside'}).png().toBuffer(),m=await sharp(motif).metadata();
      out=await sharp({create:{width:488,height:488,channels:4,background:'#00000000'}}).composite([{input:motif,left:Math.round((488-m.width)/2),top:Math.round((484-m.height)/2)}]).webp({quality:94}).toBuffer();
      placement={canvas:488,center:[244,242],maximumMotifBox:size};
    }
    const file='V4/site/assets/'+(role==='scene'?'weapon-cards/':'equipment/')+name+'.webp';
    await fs.writeFile(path.join(root,file),out);
    assets.push({source,sourceHash:hash(bytes),width:meta.width,height:meta.height,file,sha256:hash(out),bytes:out.length,role,placement});
    if(role==='body'){
      const file='V4/site/assets/weapon-cards/'+name+'.webp',large=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:92}).toBuffer();
      await fs.writeFile(path.join(root,file),large);assets.push({source,sourceHash:hash(bytes),file,sha256:hash(large),bytes:large.length,role:'collectible-source'});
    }
  }
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify({version:1,method:'18 individually generated objects, scenes and hollow rings. Native 488px medallion anchor preserved.',assets},null,2)+'\n');
  console.log('Built '+assets.length+' FFIX assets.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
