'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(modules,'__kaylis_boots__.cjs'))('sharp');
const root=path.resolve(__dirname,'../../..'),hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const assets=[];
  for(const role of ['body','scene']){
    const name='kaylis-next-step-boots'+(role==='scene'?'-scene':'')+'-v2';
    const source='V4/weapon-cards/sources/'+name+'.png',bytes=await fs.readFile(path.join(root,source)),meta=await sharp(bytes).metadata();
    let output,placement=null;
    if(role==='body'){
      if(!meta.hasAlpha)throw Error('Transparent body required');
      const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
      let clear=0;for(let i=3;i<data.length;i+=4)if(!data[i])clear++;
      if(clear<info.width*info.height*.1)throw Error('Transparent contour missing');
      const motif=await sharp(bytes).resize({width:240,height:240,fit:'inside'}).png().toBuffer(),m=await sharp(motif).metadata();
      output=await sharp({create:{width:488,height:488,channels:4,background:'#00000000'}}).composite([{input:motif,left:Math.round((488-m.width)/2),top:Math.round((484-m.height)/2)}]).webp({quality:94}).toBuffer();
      placement={canvas:488,center:[244,242],maximumMotifBox:240};
    }else output=await sharp(bytes).resize({width:1122,withoutEnlargement:true}).webp({quality:92}).toBuffer();
    const file='V4/site/assets/'+(role==='scene'?'weapon-cards/':'equipment/')+name+'.webp';
    await fs.writeFile(path.join(root,file),output);
    assets.push({source,sourceHash:hash(bytes),width:meta.width,height:meta.height,file,sha256:hash(output),bytes:output.length,role,placement});
  }
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify({version:1,method:'Black leather color revision; original sources and equipment snapshot identity preserved.',assets},null,2)+'\n');
  console.log('Built two black Kaylis boots assets.');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
