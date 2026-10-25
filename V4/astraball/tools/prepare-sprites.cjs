'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sharp=require(process.env.KALISTAR_NODE_MODULES?path.join(process.env.KALISTAR_NODE_MODULES,'sharp'):'sharp');
const root=path.resolve(__dirname,'..'),repo=path.resolve(root,'../..');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const CELL=96,FOOT=90;

// Generated sheets have uneven gutters. Find the sixteen actual silhouettes,
// then pack them on a shared foot anchor instead of cutting through equal cells.
function silhouettes(data,width,height){
  const labels=new Int32Array(width*height),queue=new Int32Array(width*height),parts=[];
  let label=0;
  for(let start=0;start<labels.length;start++){
    if(labels[start]||data[start*4+3]<192)continue;
    label++;let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;queue[0]=start;labels[start]=label;
    while(head<tail){
      const i=queue[head++],x=i%width,y=Math.floor(i/width);
      minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
      for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
        const xx=x+dx,yy=y+dy;if(xx<0||xx>=width||yy<0||yy>=height)continue;
        const n=yy*width+xx;if(!labels[n]&&data[n*4+3]>=192){labels[n]=label;queue[tail++]=n;}
      }
    }
    if(tail>2000)parts.push({label,count:tail,left:minX,top:minY,width:maxX-minX+1,height:maxY-minY+1});
  }
  if(parts.length!==16)throw Error('Expected 16 separate sprites, found '+parts.length);
  parts.sort((a,b)=>(a.top+a.height/2)-(b.top+b.height/2));
  const ordered=[];for(let row=0;row<4;row++)ordered.push(...parts.slice(row*4,row*4+4).sort((a,b)=>a.left-b.left));
  return{parts:ordered,labels};
}
async function main(){
  const spec=JSON.parse(fs.readFileSync(path.join(root,'sources/sprites-v1/prompts.json'),'utf8'));
  const out=path.join(root,'assets/sprites-v1');fs.mkdirSync(out,{recursive:true});
  const report=[];
  for(const character of spec.characters){
    const source=path.join(root,character.source),{data,info}=await sharp(source).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const {parts,labels}=silhouettes(data,info.width,info.height);
    const scale=Math.min(80/Math.max(...parts.map(p=>p.height)),74/Math.max(...parts.map(p=>p.width)));
    const frames=[],placements=[];
    for(const [index,p] of parts.entries()){
      const pixels=Buffer.alloc(p.width*p.height*4),columns=new Uint32Array(p.width);
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
        const i=(p.top+y)*info.width+p.left+x,j=(y*p.width+x)*4;
        if(labels[i]!==p.label)continue;
        data.copy(pixels,j,i*4,i*4+3);pixels[j+3]=255;
        if(y>p.height*.4&&y<p.height*.75)columns[x]++;
      }
      const mass=columns.reduce((a,b)=>a+b,0);let accumulated=0,anchor=p.width/2;
      for(let x=0;x<columns.length;x++){accumulated+=columns[x];if(accumulated>=mass/2){anchor=x;break;}}
      const width=Math.round(p.width*scale),height=Math.round(p.height*scale);
      const left=Math.max(3,Math.min(CELL-width-3,Math.round(CELL/2-anchor*scale))),top=FOOT-height;
      const input=await sharp(pixels,{raw:{width:p.width,height:p.height,channels:4}}).resize(width,height,{kernel:'nearest'}).png().toBuffer();
      frames.push({input,left:(index%4)*CELL+left,top:Math.floor(index/4)*CELL+top});
      placements.push({index,sourceBounds:p,left,top,width,height,foot:FOOT});
    }
    const target=path.join(out,character.id+'.png');
    const packed=await sharp({create:{width:CELL*4,height:CELL*4,channels:4,background:'#00000000'}}).composite(frames).png().toBuffer();
    if(process.env.KALISTAR_SPRITE_PROOF){
      fs.mkdirSync(process.env.KALISTAR_SPRITE_PROOF,{recursive:true});
      fs.writeFileSync(path.join(process.env.KALISTAR_SPRITE_PROOF,character.id+'-packed.png'),packed);
      fs.writeFileSync(path.join(process.env.KALISTAR_SPRITE_PROOF,character.id+'-first.png'),frames[0].input);
    }
    await sharp(packed).png({palette:true,colours:128,dither:0,effort:10}).toFile(target);
    report.push({id:character.id,file:'assets/sprites-v1/'+character.id+'.png',source:character.source,sourceSha256:hash(source),reference:character.reference,referenceSha256:hash(path.join(repo,character.reference)),sha256:hash(target),bytes:fs.statSync(target).size,cell:CELL,foot:FOOT,frames:placements});
  }
  fs.writeFileSync(path.join(root,'sources/sprites-v1/atlas-report.json'),JSON.stringify({version:1,tool:'Built-in image_gen; deterministic Sharp alpha segmentation and nearest-neighbour packing',characters:report},null,2)+'\n');
  console.log(JSON.stringify(report.map(({id,bytes,frames})=>({id,bytes,frames:frames.length})),null,2));
}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1;});
module.exports={silhouettes};
