'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_album_lock.cjs'));
const sharp=runtime('sharp'),root=path.resolve(__dirname,'../../..');
const inputs=[
  {name:'album-open-v2',source:'C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-415e3411-986c-45cf-ad48-9513aad0e69c.png',width:1774},
  {name:'album-open-phone-v2',source:'C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-813bd233-149c-4e14-91a5-a52c5b36a799.png',width:1000},
  {name:'album-folio-phone-v1',source:'C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-e8c952b6-ccc9-45b7-a087-2dd1be05902a.png',width:906},
  {name:'album-reader-phone-v2',source:'C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-9d3493dc-492e-408b-87b5-1e3d10ffbee2.png',width:1024}
];
async function main(){
  const files=[];
  for(const input of inputs){
    const source=fs.readFileSync(input.source),target='V4/site/assets/album/'+input.name+'.webp',absolute=path.join(root,target);
    const bytes=await sharp(source).resize({width:input.width,withoutEnlargement:true}).webp({quality:88,alphaQuality:100,effort:6}).toBuffer(),meta=await sharp(bytes).metadata();
    if(fs.existsSync(absolute)&&!fs.readFileSync(absolute).equals(bytes))throw Error('Refusing to overwrite a different asset: '+target);
    fs.mkdirSync(path.dirname(absolute),{recursive:true});fs.writeFileSync(absolute,bytes);
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const cornerAlpha=[[0,0],[info.width-1,0],[0,info.height-1],[info.width-1,info.height-1]].map(([x,y])=>data[(y*info.width+x)*4+3]);
    if(!meta.hasAlpha||cornerAlpha.some(a=>a!==0))throw Error('Asset must have transparent corners: '+target);
    files.push({...input,target,width:meta.width,height:meta.height,bytes:bytes.length,alpha:meta.hasAlpha,cornerAlpha,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  fs.writeFileSync(path.join(__dirname,'assets.json'),JSON.stringify({generator:'Built-in ImageGen; original sources retained outside checkout',transform:'WebP resize/export only; no alpha removal or repainting',files},null,2)+'\n');
  console.log(JSON.stringify(files,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
