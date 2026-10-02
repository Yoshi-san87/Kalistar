'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp=createRequire(path.join(runtime,'__weapon_art__.cjs'))('sharp');
const revision=path.resolve(__dirname,'../revisions/2026-10-02-unique-weapon-art');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const scale=4,size=122*scale,safeRadius=44.5*scale,cx=61*scale,cy=60.5*scale;

async function fitSprite(bytes){
  const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width,top=info.height,right=-1,bottom=-1,transparent=0;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){
    const alpha=data[(y*info.width+x)*4+3];
    if(!alpha){transparent++;continue;}
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<0||transparent<info.width*info.height*.2)throw Error('Expected an isolated transparent weapon sprite.');
  const mx=(left+right+1)/2,my=(top+bottom+1)/2;
  let radius=0;
  for(let y=top;y<=bottom;y++)for(let x=left;x<=right;x++){
    if(data[(y*info.width+x)*4+3])radius=Math.max(radius,Math.hypot(x+.5-mx,y+.5-my));
  }
  // Fit the entire alpha contour, including the flute's glow, without clipping it.
  const ratio=(safeRadius-2)/radius,width=Math.max(1,Math.floor((right-left+1)*ratio)),height=Math.max(1,Math.floor((bottom-top+1)*ratio));
  const sprite=await sharp(bytes).extract({left,top,width:right-left+1,height:bottom-top+1}).resize(width,height).png().toBuffer();
  const x=Math.round(cx-width/2),y=Math.round(cy-height/2);
  const resized=await sharp(sprite).ensureAlpha().raw().toBuffer();
  let maxRadius=0;
  for(let j=0;j<height;j++)for(let i=0;i<width;i++){
    if(resized[(j*width+i)*4+3])maxRadius=Math.max(maxRadius,Math.hypot(x+i+.5-cx,y+j+.5-cy));
  }
  if(maxRadius>safeRadius)throw Error('Weapon contour overlaps the approved copper rim.');
  return {input:sprite,left:x,top:y,proof:{sourceDimensions:{width:info.width,height:info.height},placement:{left:x,top:y,width,height},maxRadius,maxAllowedRadius:safeRadius}};
}

async function main(){
  const native=JSON.parse(await fs.readFile(path.join(__dirname,'verification/weapons/media-provenance.json'),'utf8'));
  const bank=path.resolve(__dirname,'../atelier/designer-assets'),frameFile='frame/default.png';
  const frame=await fs.readFile(path.join(bank,frameFile));
  if(hash(frame)!==native.sourceHashes[frameFile])throw Error('Approved frame differs from the existing provenance.');
  const pixels=await sharp(frame).extract(native.box).resize(size,size).ensureAlpha().raw().toBuffer();
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const alpha=Math.max(0,Math.min(1,(61*scale-Math.hypot(x+.5-cx,y+.5-cy))/scale)),i=(y*size+x)*4+3;
    pixels[i]=Math.round(pixels[i]*alpha);
  }
  const background=await sharp(pixels,{raw:{width:size,height:size,channels:4}}).png().toBuffer();
  const assets=[];
  for(const [key,source] of [['fallen-king-axe-v2','fallen-king-axe-v1.png'],['little-joys-flute-v2','little-joys-flute-v2-electric.png']]){
    const bytes=await fs.readFile(path.join(revision,'sources',source)),fit=await fitSprite(bytes);
    const body=await sharp(background).composite([{input:fit.input,left:fit.left,top:fit.top}]).webp({lossless:true}).toBuffer();
    await fs.writeFile(path.join(__dirname,'assets/equipment',key+'.webp'),body);
    assets.push({visual:key,source:'sources/'+source,sourceHash:hash(bytes),file:'assets/equipment/'+key+'.webp',derivedHash:hash(body),bytes:body.length,...fit.proof});
  }
  const proof={version:1,method:'built-in image generation; alpha-contour fit on unchanged native frame',native:{box:native.box,center:native.center,frameHash:hash(frame)},render:{width:size,height:size,scale,safeRadius},assets};
  await fs.writeFile(path.join(revision,'media-provenance.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={fitSprite};
