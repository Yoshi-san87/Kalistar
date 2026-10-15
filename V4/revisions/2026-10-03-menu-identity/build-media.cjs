'use strict';
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const {sharp,ROOT}=require('../../atelier/lib.cjs');
const names=['collection','story','decks','weapons','arena','statistics','more','kalistel'];
const hash=b=>crypto.createHash('sha256').update(b).digest('hex');
async function main(){
  const source=await fs.readFile(path.join(__dirname,'sources/navigation-atlas.png'));
  const meta=await sharp(source).metadata();
  if(!meta.hasAlpha)throw Error('Expected a transparent 4 x 2 atlas.');
  const cell={width:meta.width/4,height:meta.height/2},assets=[];
  const out=path.join(ROOT,'V4/site/assets/navigation');await fs.mkdir(out,{recursive:true});
  for(const [i,name] of names.entries()){
    const x=i%4,y=Math.floor(i/4),leftEdge=Math.round(x*cell.width),topEdge=Math.round(y*cell.height);
    const rect={left:leftEdge,top:topEdge,width:Math.round((x+1)*cell.width)-leftEdge,height:Math.round((y+1)*cell.height)-topEdge};
    const custom=name==='kalistel'?'sources/kalistel-rainbow.png':null;
    const bytes=custom?await fs.readFile(path.join(__dirname,custom)):await sharp(source).extract(rect).png().toBuffer();
    const {data,info}=await sharp(bytes).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    let left=info.width,top=info.height,right=-1,bottom=-1;
    for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>4){
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
    if(right<left||left<2||top<2||right>info.width-3||bottom>info.height-3)throw Error('Empty or clipped atlas cell: '+name);
    const crop={left:Math.max(0,left-2),top:Math.max(0,top-2),width:right-left+5,height:bottom-top+5};
    const output=await sharp(bytes).extract(crop).resize(128,128,{fit:'contain',background:'#00000000'}).webp({lossless:true}).toBuffer();
    const file='V4/site/assets/navigation/'+name+(custom?'-rainbow':'')+'-v1.webp';await fs.writeFile(path.join(ROOT,file),output);
    assets.push({name,file,sha256:hash(output),bytes:output.length,crop,width:128,height:128,...(custom?{source:custom,sourceSha256:hash(bytes)}:{})});
  }
  const fonts=[];
  for(const [file,url] of [
    ['cinzel-v26-latin.woff2','https://fonts.gstatic.com/s/cinzel/v26/8vIJ7ww63mVu7gt79mT7.woff2'],
    ['cinzel-v26-latin-ext.woff2','https://fonts.gstatic.com/s/cinzel/v26/8vIJ7ww63mVu7gt7-GT7LEc.woff2'],
    ['Cinzel-OFL.txt','https://raw.githubusercontent.com/google/fonts/main/ofl/cinzel/OFL.txt']
  ]){const location='V4/site/assets/fonts/'+file,bytes=await fs.readFile(path.join(ROOT,location));fonts.push({file:location,url,sha256:hash(bytes),bytes:bytes.length});}
  const proof={version:1,method:'Built-in image generation; atlas extraction, alpha-bound fitting and lossless WebP export only. Native cards and original logo unchanged.',source:{file:'sources/navigation-atlas.png',sha256:hash(source),width:meta.width,height:meta.height},assets,fonts};
  await fs.writeFile(path.join(__dirname,'media-provenance.json'),JSON.stringify(proof,null,2)+'\n');
  console.log(JSON.stringify(proof,null,2));
}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
module.exports={names};
