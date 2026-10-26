'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {pathToFileURL}=require('node:url');
const ROOT=path.resolve(__dirname,'../../..'),KIT=path.join(ROOT,'V4/astraball/animation-kit');
const OUTPUT=path.join(ROOT,'work/astraball-v2');
const hash=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const read=file=>JSON.parse(fs.readFileSync(file,'utf8'));
const sharp=()=>require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','sharp'));
const contract=()=>import(pathToFileURL(path.join(KIT,'template-v2.mjs')));
function save(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(value,null,2)+'\n');}
function within(base,name){
  const file=path.resolve(base,name),relative=path.relative(base,file);
  if(relative==='..'||relative.startsWith('..'+path.sep)||path.isAbsolute(relative))throw Error('Outside template directory');
  return file;
}
async function audit(file){
  const {TEMPLATE}=await contract(),{data,info}=await sharp()(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const errors=[],frames=[];
  if(info.width!==1280||info.height!==1280)return {errors:['Page must be exactly 1280 x 1280; no resizing allowed'],frames};
  for(let row=0;row<4;row++)for(let col=0;col<4;col++){
    let count=0,partial=0,border=0,x0=320,y0=320,x1=-1,y1=-1;
    const colors=new Set(),pixels=Buffer.alloc(320*320*4);
    for(let y=0;y<320;y++)for(let x=0;x<320;x++){
      const i=((row*320+y)*info.width+col*320+x)*4,a=data[i+3];if(!a)continue;
      data.copy(pixels,(y*320+x)*4,i,i+4);
      count++;if(a!==255)partial++;
      if(x<TEMPLATE.margin||y<TEMPLATE.margin||x>=320-TEMPLATE.margin||y>=320-TEMPLATE.margin)border++;
      colors.add(data[i]*65536+data[i+1]*256+data[i+2]);
      x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);
    }
    const index=row*4+col;
    if(!count)errors.push('Blank frame '+index);
    if(partial)errors.push('Non-binary alpha in frame '+index);
    if(border)errors.push('Frame '+index+' touches its safety gutter');
    if(colors.size>128)errors.push('Frame '+index+' exceeds the 128-colour pixel palette');
    frames.push({index,pixels:count,partial,border,colors:colors.size,pixelHash:crypto.createHash('sha256').update(pixels).digest('hex'),bounds:count?{x:x0,y:y0,width:x1-x0+1,height:y1-y0+1}:null});
  }
  return {errors,frames};
}
async function guides(actor,directory){
  const {TEMPLATE,CLIPS,frameRect}=await contract();fs.mkdirSync(directory,{recursive:true});
  for(const name of ['layout.json',...Array.from({length:4},(_,i)=>['guide-'+i+'.png','blank-'+i+'.png']).flat()]){
    if(fs.existsSync(path.join(directory,name)))throw Error('Preserve existing guide: '+path.join(directory,name));
  }
  for(let page=0;page<4;page++){
    const target=path.join(directory,'guide-'+page+'.png');if(fs.existsSync(target))throw Error('Preserve existing guide: '+target);
    await sharp()({create:{width:1280,height:1280,channels:4,background:'#00000000'}}).png().toFile(path.join(directory,'blank-'+page+'.png'));
    const data=Buffer.alloc(1280*1280*4);
    const pixel=(x,y,r,g,b,a=255)=>{const i=(y*1280+x)*4;data[i]=r;data[i+1]=g;data[i+2]=b;data[i+3]=a;};
    for(let y=0;y<1280;y++)for(let x=0;x<1280;x++){
      const xx=x%320,yy=y%320;pixel(x,y,15,23,25);
      if(xx===0||yy===0)pixel(x,y,70,81,83);
      if(yy===272)pixel(x,y,66,186,161);
      if(xx===160)pixel(x,y,58,78,84);
      if(yy===272-actor.bodyPixels&&xx>=112&&xx<=208)pixel(x,y,226,182,91);
      if(Math.abs(xx-160)<=4&&Math.abs(yy-272)<=1||Math.abs(xx-160)<=1&&Math.abs(yy-272)<=4)pixel(x,y,250,220,130);
    }
    await sharp()(data,{raw:{width:1280,height:1280,channels:4}}).png().toFile(target);
  }
  save(path.join(directory,'layout.json'),{template:TEMPLATE,actorHeight:actor.bodyPixels,clips:CLIPS,rects:Array.from({length:64},(_,i)=>frameRect(i))});
}
async function inventory(){
  const {createDraft}=await contract();
  const {getAthlete}=await import('../data/athletes.mjs');
  const {measurementsFor}=await import('../data/athlete-measurements.mjs');
  const published=read(path.join(ROOT,'V4/donnees/catalogue.json')).cards.filter(c=>c.kind!=='approved');
  const {cards}=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  const actors=cards.map(c=>{
    const measure=measurementsFor(getAthlete(c.characterId));
    const draft=createDraft({characterId:c.characterId,modelId:c.id,name:c.name,heightCm:measure.heightCm,weapon:c.weapon});
    return {id:draft.id,characterId:c.characterId,modelId:String(c.id),name:c.name,weapon:c.weapon,
      physicalFamily:draft.physicalFamily,magicFamily:draft.magicFamily,heightCm:draft.heightCm,bodyPixels:draft.bodyPixels,status:'pending'};
  });
  const target=path.join(OUTPUT,'inventory.json');
  save(target,{schemaVersion:2,templateId:'kalistar-actor-v2',entries:actors});
  return actors;
}
function checkSequences(frameHashes,clips){
  const errors=[];
  for(const [id,clip] of Object.entries(clips)){
    const hashes=clip.frames.map(f=>frameHashes[f.index]);
    if(hashes.some(h=>!h)){errors.push('Missing drawings in clip '+id);continue;}
    // Pixel differences cannot certify gait, but exact copies cannot supply it.
    if(new Set(hashes).size<2)errors.push('Static repeated drawings in clip '+id);
    else if(id==='run'&&new Set(hashes).size!==clip.frames.length)errors.push('Run requires six distinct drawings; use duration for held poses');
  }
  return errors;
}
async function validate(file,{ready=false,sequences=false}={}){
  const {validateActor}=await contract(),actor=read(file),errors=validateActor(actor,{ready});
  const base=path.dirname(file),frameHashes=[];
  for(const [i,p] of (Array.isArray(actor?.pages)?actor.pages:[]).entries()){
    for(const [key,sha] of [['file','sha256'],['handsFile','handsSha256']]){
      if(key==='handsFile'&&!ready&&!p[key])continue;
      try{
        const asset=within(base,p[key]);
        if(hash(asset)!==p[sha]){errors.push('Wrong hash: '+p[key]);continue;}
        if(key==='file'){
          const result=await audit(asset);errors.push(...result.errors.map(e=>'Page '+i+': '+e));
          for(const frame of result.frames)frameHashes[i*16+frame.index]=frame.pixelHash;
          if(i===0&&result.frames[0]?.bounds&&actor.landmarks?.crown){
            const {data,info}=await sharp()(asset).ensureAlpha().raw().toBuffer({resolveWithObject:true});
            for(const landmark of ['crown','sole']){
              const p=actor.landmarks[landmark];
              const y=landmark==='sole'?p.y-1:p.y;
              if(data[(y*info.width+p.x)*4+3]!==255)errors.push('Anatomical landmark must touch opaque art: '+landmark);
            }
          }
        }else{
          const meta=await sharp()(asset).metadata();if(meta.width!==1280||meta.height!==1280)errors.push('Wrong hand-mask dimensions');
          // Front fingers are an occlusion layer, never a second arbitrary drawing.
          const body=await sharp()(within(base,p.file)).ensureAlpha().raw().toBuffer();
          const hands=await sharp()(asset).ensureAlpha().raw().toBuffer();
          for(let b=0;b<hands.length;b+=4)if(hands[b+3]&&(hands[b+3]!==255||!hands.subarray(b,b+4).equals(body.subarray(b,b+4)))){
            errors.push('Front hands must be exact opaque pixels from the body page');break;
          }
        }
      }catch(e){errors.push('Page '+i+': '+e.message);}
    }
  }
  if(ready||sequences){
    const {CLIPS}=await contract();
    errors.push(...checkSequences(frameHashes,CLIPS));
  }
  return {ok:errors.length===0,errors};
}
async function serve(port=4350){
  const http=require('node:http');
  const types={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.md':'text/plain; charset=utf-8'};
  const server=http.createServer((req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      const file=pathname==='/icons.js'?path.join(ROOT,'V3/site/assets/lucide.min.js'):pathname.startsWith('/data/')?within(OUTPUT,pathname.slice(6)):within(KIT,pathname==='/'?'studio.html':pathname.slice(1));
      if(!types[path.extname(file)])throw Error('Unsupported resource');
      const data=fs.readFileSync(file);
      res.writeHead(200,{'Content-Type':types[path.extname(file)],'Cache-Control':'no-store','Content-Security-Policy':"default-src 'self'; img-src 'self' blob:; script-src 'self'; style-src 'self'; object-src 'none'; base-uri 'none'"});res.end(data);
    }catch{res.writeHead(404).end();}
  });
  await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve);});
  console.log('Sprite V2 studio http://127.0.0.1:'+server.address().port+'/');return server;
}
async function main(){
  const [command,arg]=process.argv.slice(2);
  if(command==='inventory')console.log('Prepared '+(await inventory()).length+' model-specific drafts (none published).');
  else if(command==='audit'){
    const result=await audit(path.resolve(arg));console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
  }
  else if(command==='validate'){
    const result=await validate(path.resolve(arg),{ready:process.argv.includes('--ready')});console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
  }else if(command==='guides')await guides(read(path.resolve(arg)),path.join(path.dirname(path.resolve(arg)),'guides'));
  else if(command==='serve')await serve(Number(arg)||4350);
  else throw Error('Use inventory | audit <PNG> | validate <manifest> [--ready] | guides <manifest> | serve [port]');
}
module.exports={audit,validate,inventory,guides,serve,within,checkSequences};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
