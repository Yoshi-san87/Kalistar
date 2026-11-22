'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_album_assets.cjs'));
const sharp=runtime('sharp'),root=path.resolve(__dirname,'../../..'),out=path.join(root,'V4/site/assets/album');
const files=[
  {
    "name": "album-open-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-a6c41ea0-b140-483e-879a-70ec387aeadf.png",
    "width": 1774
  },
  {
    "name": "hud-frame-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-adcca901-fb26-4ec4-a4dc-b61ae1b36464.png",
    "width": 1200
  },
  {
    "name": "album-sleeve-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-42651ed6-66f2-4219-9fed-81b931aaf333.png",
    "width": 448
  },
  {
    "name": "hud-material-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-6521579d-7100-45e0-99a8-10cc3de9b1a8.png",
    "width": 1536
  },
  {
    "name": "album-leaf-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-3c1f012c-d807-42e2-88ee-4098976ee6bd.png",
    "width": 720
  },
  {
    "name": "album-open-phone-v1",
    "source": "C:/Users/guill/.codex/generated_images/01a0b4b1-d740-7ec2-b8fb-65be8d2942c9/exec-c689c8a5-def8-4049-b425-1b0d63e1326b.png",
    "width": 960
  }
];
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const evidence=[];
  for(const item of files){
    const source=fs.readFileSync(item.source),target=path.join(out,item.name+'.webp');
    let pipeline=sharp(source);
    if(item.name==='hud-frame-v1')pipeline=pipeline.trim({threshold:8});
    const bytes=await pipeline.resize({width:item.width,withoutEnlargement:true}).webp({quality:86,alphaQuality:100,effort:6}).toBuffer();
    if(fs.existsSync(target)&&!fs.readFileSync(target).equals(bytes))throw Error('Refusing to overwrite a different prepared asset: '+target);
    fs.writeFileSync(target,bytes);
    const metadata=await sharp(bytes).metadata();
    evidence.push({...item,target:path.relative(root,target).split(path.sep).join('/'),bytes:bytes.length,width:metadata.width,height:metadata.height,alpha:metadata.hasAlpha,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),sha256:crypto.createHash('sha256').update(bytes).digest('hex')});
  }
  fs.writeFileSync(path.join(__dirname,'assets.json'),JSON.stringify({generator:'Built-in ImageGen; original sources preserved outside the checkout',transform:'WebP export and transparent-padding trim only; no repainting',files:evidence},null,2)+'\n');
  console.log(JSON.stringify({files:evidence.length,bytes:evidence.reduce((sum,f)=>sum+f.bytes,0),assets:evidence.map(f=>f.target)},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
