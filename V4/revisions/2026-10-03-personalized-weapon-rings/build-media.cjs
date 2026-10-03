'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {sharp,ROOT}=require('../../atelier/lib.cjs');
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
const size=488,center={x:244,y:242},outerRadius=240;
const definitions=[
  {visual:'axe',ring:'stone-copper-ring-v1',body:'fallen-king-axe-v3',source:'stone-ring-source.png',weapon:'fallen-king-axe-v1.png'},
  {visual:'flute',ring:'electro-copper-ring-v1',body:'little-joys-flute-v3',source:'electric-ring-source.png',weapon:'little-joys-flute-v2-electric.png'}
];
async function pixels(bytes){return sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});}
function bounds(data,info){
  let left=info.width,top=info.height,right=-1,bottom=-1;
  for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]){
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
  }
  if(right<0)throw Error('Empty sprite.');
  return {left,top,width:right-left+1,height:bottom-top+1};
}
function hole(data,info){
  const {width:w,height:h}=info,start=Math.floor(h/2)*w+Math.floor(w/2),seen=new Uint8Array(w*h),queue=new Int32Array(w*h);
  if(data[start*4+3]>8)throw Error('The generated ring must have a transparent center.');
  let head=0,tail=1,left=w,top=h,right=0,bottom=0;queue[0]=start;seen[start]=1;
  // Flood the transparent opening, separately from the exterior background.
  while(head<tail){
    const at=queue[head++],x=at%w,y=Math.floor(at/w);
    if(!x||!y||x===w-1||y===h-1)throw Error('The ring opening leaks to the exterior.');
    left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);
    for(const next of [at-1,at+1,at-w,at+w])if(!seen[next]&&data[next*4+3]<=8){seen[next]=1;queue[tail++]=next;}
  }
  const c={x:(left+right+1)/2,y:(top+bottom+1)/2};
  let inner=Infinity,outer=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){
    const alpha=data[(y*w+x)*4+3];if(!alpha)continue;
    const r=Math.hypot(x+.5-c.x,y+.5-c.y);outer=Math.max(outer,r);if(alpha>32)inner=Math.min(inner,r);
  }
  return {center:c,innerRadius:inner,outerRadius:outer,transparentPixels:tail};
}
async function fit(bytes,b,c,ratio){
  const width=Math.max(1,Math.floor(b.width*ratio)),height=Math.max(1,Math.floor(b.height*ratio));
  const input=await sharp(bytes).extract(b).resize(width,height,{fit:'fill'}).png().toBuffer();
  const left=Math.round(center.x-(c.x-b.left)*width/b.width),top=Math.round(center.y-(c.y-b.top)*height/b.height);
  if(left<0||top<0||left+width>size||top+height>size)throw Error('Sprite exceeds its calibrated canvas.');
  const output=await sharp({create:{width:size,height:size,channels:4,background:'#00000000'}}).composite([{input,left,top}]).webp({lossless:true}).toBuffer();
  return {output,placement:{left,top,width,height}};
}
async function main(){
  const out=path.join(ROOT,'V4/site/assets/equipment'),assets=[];
  await fs.mkdir(out,{recursive:true});
  for(const d of definitions){
    const source=await fs.readFile(path.join(__dirname,'sources',d.source)),p=await pixels(source);
    let alphaSpecks=0;
    for(let i=3;i<p.data.length;i+=4)if(p.data[i]>0&&p.data[i]<=4){p.data[i]=0;alphaSpecks++;}
    const clean=await sharp(p.data,{raw:p.info}).png().toBuffer(),opening=hole(p.data,p.info);
    const ratio=outerRadius/opening.outerRadius,ring=await fit(clean,bounds(p.data,p.info),opening.center,ratio);
    const weaponPath='V4/revisions/2026-10-02-unique-weapon-art/sources/'+d.weapon;
    const weapon=await fs.readFile(path.join(ROOT,weaponPath)),wp=await pixels(weapon),b=bounds(wp.data,wp.info),c={x:b.left+b.width/2,y:b.top+b.height/2};
    let radius=0;
    for(let y=b.top;y<b.top+b.height;y++)for(let x=b.left;x<b.left+b.width;x++)if(wp.data[(y*wp.info.width+x)*4+3])radius=Math.max(radius,Math.hypot(x+.5-c.x,y+.5-c.y));
    const safeRadius=opening.innerRadius*ratio-8,body=await fit(weapon,b,c,safeRadius/radius);
    for(const [kind,name,result]of [['ring',d.ring,ring],['body',d.body,body]]){
      const file='V4/site/assets/equipment/'+name+'.webp';
      await fs.writeFile(path.join(ROOT,file),result.output);
      assets.push({visual:d.visual,kind,file,sha256:hash(result.output),bytes:result.output.length,placement:result.placement});
    }
    assets.push({visual:d.visual,kind:'sources',ringSource:'sources/'+d.source,ringHash:hash(source),weaponSource:weaponPath,weaponHash:hash(weapon),opening,scale:ratio,safeRadius,exportAlphaThreshold:4,alphaSpecks});
  }
  const proof={version:1,method:'Built-in image generation; alpha-bound fitting and size export only. No native card edits.',canvas:{width:size,height:size,center,outerRadius},assets};
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main,hole};
