'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {sharp,ROOT}=require('../../atelier/lib.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const input=await fs.readFile(path.join(__dirname,'sources/position-atlas.png')),meta=await sharp(input).metadata();
  assert(meta.hasAlpha,'The generated atlas must have genuine transparency');
  const out=path.join(ROOT,'V4/site/assets/positions');await fs.mkdir(out,{recursive:true});const assets=[];
  for(let i=0;i<5;i++){
    const x=Math.round(i*meta.width/5),rect={left:x,top:0,width:Math.round((i+1)*meta.width/5)-x,height:meta.height};
    const bytes=await sharp(input).extract(rect).png().toBuffer(),{data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let left=info.width,top=info.height,right=-1,bottom=-1;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>4){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    assert(left>1&&top>1&&right<info.width-2&&bottom<info.height-2,'The whole emblem must fit its cell: P'+(i+1));
    const crop={left:left-1,top:top-1,width:right-left+3,height:bottom-top+3};
    const content=await sharp(bytes).extract(crop).resize(116,116,{fit:'contain',background:'#00000000'}).extend({top:6,bottom:6,left:6,right:6,background:'#00000000'}).webp({lossless:true}).toBuffer();
    const file='V4/site/assets/positions/p'+(i+1)+'-v1.webp';await fs.writeFile(path.join(ROOT,file),content);
    assets.push({position:i+1,file,width:128,height:128,bytes:content.length,sha256:sha(content),cell:rect,crop});
  }
  const proof={method:'Built-in image generation, transparent atlas, alpha-bound extraction and lossless WebP resize only.',source:{file:'sources/position-atlas.png',sha256:sha(input),width:meta.width,height:meta.height},assets};
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify(proof,null,2)+'\n');console.log(JSON.stringify(proof));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
