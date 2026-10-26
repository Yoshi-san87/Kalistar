'use strict';
const fs=require('node:fs'),path=require('node:path');
process.env.KALISTAR_NODE_MODULES||='C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp=(...args)=>require(path.join(process.env.KALISTAR_NODE_MODULES,'sharp'))(...args);
const {ROOT,OUT,read,save,hash}=require('./sprite-v2-production.cjs');
const {audit,checkSequences}=require('./sprite-template-v2.cjs');
const {solve:solvePlacement}=require('./sprite-v2-placement.cjs');
const {quantizeGlyphs}=require('./sprite-v2-palette.cjs');
function calibration(recipe,source,parts,bodyPixels){
  if(recipe?.file!==source.file)throw Error('Source calibration is missing or stale');
  if(!Number.isInteger(recipe.referenceFrame)||recipe.referenceFrame<0||recipe.referenceFrame>=16)throw Error('Invalid calibration frame');
  const reference=parts[recipe.referenceFrame],inset=recipe.crownInsetPx;
  if(!Number.isInteger(inset)||inset<0||inset>=reference.height)throw Error('Invalid cranial measurement');
  const soleInsetPx=recipe.soleInsetPx===undefined?0:recipe.soleInsetPx;
  if(!Number.isInteger(soleInsetPx)||soleInsetPx<0||inset+soleInsetPx>=reference.height)throw Error('Invalid sole measurement');
  const order=recipe.order||Array.from({length:16},(_,i)=>i);
  if(order.length!==16||new Set(order).size!==16||order.some(i=>!Number.isInteger(i)||i<0||i>15))throw Error('Source order must use every drawing exactly once');
  const sourceBody=reference.height-inset-soleInsetPx;
  return {reference,sourceBody,sourceScale:bodyPixels/sourceBody,soleInsetPx,order};
}
async function scan(file){
  const {silhouettes}=require('./prepare-sprites.cjs');
  const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  return {...silhouettes(data,info.width,info.height),data,info};
}
function compactPalette(pixels,limit=127){
  if(!Number.isInteger(limit)||limit<1||limit>255)throw Error('Invalid palette limit');
  if(pixels.length%4)throw Error('Expected RGBA pixels');
  const counts=new Map(),mapping=new Map(),merges=[];
  for(let i=0;i<pixels.length;i+=4){
    if(pixels[i+3]!==0&&pixels[i+3]!==255)throw Error('Expected binary alpha');
    if(!pixels[i+3])continue;
    const color=pixels[i]*65536+pixels[i+1]*256+pixels[i+2];
    counts.set(color,(counts.get(color)||0)+1);mapping.set(color,color);
  }
  // Reserve one transparent entry by merging the least costly opaque pair.
  // The same mapping covers the entire atlas; geometry and alpha never change.
  while(counts.size>limit){
    const colors=[...counts.keys()].sort((a,b)=>a-b);let best;
    for(let a=0;a<colors.length;a++)for(let b=a+1;b<colors.length;b++){
      const x=colors[a],y=colors[b];
      const squaredDistance=((x>>16)-(y>>16))**2+(((x>>8)&255)-((y>>8)&255))**2+((x&255)-(y&255))**2;
      const from=counts.get(x)<counts.get(y)?x:y,to=from===x?y:x;
      const cost=squaredDistance*counts.get(from);
      if(!best||cost<best.cost)best={from,to,squaredDistance,cost};
    }
    const {from,to,squaredDistance}=best,population=counts.get(from);
    merges.push({from,to,pixels:population,squaredDistance});
    counts.set(to,counts.get(to)+population);counts.delete(from);
    for(const [original,current] of mapping)if(current===from)mapping.set(original,to);
  }
  if(!merges.length)return {pixels,colors:counts.size,merges};
  const result=Buffer.from(pixels);
  for(let i=0;i<result.length;i+=4){
    if(!result[i+3])continue;
    const mapped=mapping.get(result[i]*65536+result[i+1]*256+result[i+2]);
    result[i]=mapped>>16;result[i+1]=(mapped>>8)&255;result[i+2]=mapped&255;
  }
  return {pixels:result,colors:counts.size,merges};
}
function torsoAnchor(part,labels,width){
  const columns=new Uint32Array(part.width);
  for(let y=Math.floor(part.height*.43);y<Math.floor(part.height*.72);y++)for(let x=0;x<part.width;x++){
    if(labels[(part.top+y)*width+part.left+x]===part.label)columns[x]++;
  }
  const half=columns.reduce((a,b)=>a+b,0)/2;let sum=0;
  for(let x=0;x<columns.length;x++){sum+=columns[x];if(sum>=half)return x;}
  return Math.round(part.width/2);
}
function validateSourceOrigins(origins,sha256,dimensions){
  if(origins===undefined)return null;
  if(!origins||origins.schemaVersion!==1||origins.coordinateSpace!=='source-pixels'||origins.method!=='manual'||origins.review!=='proposed')throw Error('Invalid source-origin contract');
  if(!/^[a-f0-9]{64}$/.test(origins.sourceSha256||'')||origins.sourceSha256!==sha256)throw Error('Source origins are stale');
  if(typeof origins.note!=='string'||origins.note.trim().length<20)throw Error('Source origins need measurement context');
  if(!Array.isArray(origins.points)||origins.points.length!==16)throw Error('Sixteen source origins required');
  for(const point of origins.points){
    if(!point||!Number.isInteger(point.x)||!Number.isInteger(point.y)||point.x<0||point.y<0||typeof point.grounded!=='boolean')throw Error('Invalid source-origin coordinates or support state');
    if(Object.keys(point).some(key=>!['x','y','grounded'].includes(key)))throw Error('Source origins only contain position and support state');
    if(dimensions&&(point.x>dimensions.width||point.y>dimensions.height))throw Error('Source origin outside image');
  }
  return origins;
}
function placeFrame({part,index,sourceLocal,sourceScale,referenceFullHeight,labels,width,origins}){
  const w=Math.round(part.width*sourceScale),h=Math.round(part.height*sourceScale);
  if(origins){
    // Coordinates describe the source drawing's root, not a runtime offset.
    const sourceAnchor=origins.points[sourceLocal];
    return {left:160-Math.round((sourceAnchor.x-part.left)*sourceScale),
      top:272-Math.round((sourceAnchor.y-part.top)*sourceScale),w,h,
      sourceAnchor:{x:sourceAnchor.x,y:sourceAnchor.y},anchorMode:'manual-proposal',airborne:!sourceAnchor.grounded};
  }
  let anchorX=torsoAnchor(part,labels,width);
  if([39,40,62,63].includes(index))anchorX=Math.round(part.width*.5);
  const left=160-Math.round(anchorX*sourceScale);
  let top=272-h;
  const airborne=[12,13,14].includes(index);
  if(airborne)top=272-referenceFullHeight-({12:14,13:32,14:12}[index]);
  return {left,top,w,h,sourceAnchor:{x:part.left+anchorX,y:part.top+(272-top)/sourceScale},
    anchorMode:'automatic-proposal',airborne};
}
function pagePlacement(recipe,source,{info,parts},bodyPixels,page){
  if(recipe?.sourceOrigins!==undefined&&recipe?.authoredPlacement!==undefined)throw Error('Choose source origins or authored placement, never both');
  const calibrated=calibration(recipe,source,parts,bodyPixels);
  const origins=validateSourceOrigins(recipe.sourceOrigins,source.sha256,info);
  const authored=solvePlacement(recipe.authoredPlacement,{sourceSha256:source.sha256,width:info.width,height:info.height,
    page,parts,order:calibrated.order,pageScale:calibrated.sourceScale});
  return {...calibrated,origins,authored};
}
async function bake(id,{out=OUT,paletteMode='canonical-glyphs-v1'}={}){
  if(!['canonical-glyphs-v1','legacy-placed-v1'].includes(paletteMode))throw Error('Unknown native palette mode');
  const manifest=read(path.join(out,'production.json')),entry=manifest.entries.find(e=>e.characterId===id);
  if(!entry)throw Error('Unknown character');
  const {createDraft,CLIPS}=await import('../animation-kit/template-v2.mjs');
  const recipes=read(path.join(out,'calibration.json')).actors[id];
  const actor=createDraft(entry),pages=[],glyphs=[],authoring={authorization:manifest.authorization,method:'Offline conversion only. One anatomical calibration per source page, same factor for every pose on that page; no runtime character scale.',sourcePages:[],frames:[],anchorReview:'Proposed source anchors; inspect motion before accepting for game use.'};
  let revision=(entry.bakes?.length||0)+1;
  while(fs.existsSync(path.join(out,id+'/native-r'+revision)))revision++;
  const relative=id+'/native-r'+revision,dir=path.join(out,relative);
  const sources=Array.from({length:4},(_,page)=>entry.selectedSources
    ?entry.sources.find(s=>s.page===page&&s.file===entry.selectedSources[page])
    :entry.sources.filter(s=>s.page===page).at(-1));
  if(sources.some(s=>!s))throw Error('Four source pages required');
  for(let page=0;page<4;page++){
    const source=sources[page],file=path.join(out,source.file);if(hash(file)!==source.sha256)throw Error('Source hash changed');
    const {data,info,parts,labels}=await scan(file);
    if(parts.some(p=>p.left<2||p.top<2||p.left+p.width>info.width-2||p.top+p.height>info.height-2))throw Error('Source figure touches image edge; regenerate without clipping');
    const recipe=recipes?.[page],{reference,sourceBody,sourceScale,soleInsetPx,order,origins,authored}=pagePlacement(recipe,source,{info,parts},actor.bodyPixels,page);
    const referenceFullHeight=Math.round(reference.height*sourceScale);
    authoring.sourcePages.push({page,file:source.file,sha256:source.sha256,dimensions:[info.width,info.height],referenceFrame:recipe.referenceFrame,crownOffset:recipe.crownInsetPx,soleOffset:soleInsetPx,sourceBody,sourceScale,parts,...(origins?{sourceOrigins:origins}:{}),...(authored?{authoredPlacement:recipe.authoredPlacement,resolvedPlacement:authored}:{})});
    const frames=[];
    for(let local=0;local<16;local++){
      const sourceLocal=order[local];
      const index=page*16+local,p=parts[sourceLocal],rgba=Buffer.alloc(p.width*p.height*4);
      for(let y=0;y<p.height;y++)for(let x=0;x<p.width;x++){
        const sourceIndex=(p.top+y)*info.width+p.left+x;if(labels[sourceIndex]!==p.label)continue;
        const dest=(y*p.width+x)*4;data.copy(rgba,dest,sourceIndex*4,sourceIndex*4+3);rgba[dest+3]=255;
      }
      const placement=authored?.frames[local]||placeFrame({part:p,index,sourceLocal,sourceScale,referenceFullHeight,labels,width:info.width,origins});
      const {left,top,w,h,sourceAnchor,anchorMode,airborne}=placement;
      if(origins||authored)actor.frames[index].grounded=!airborne;
      if(left<4||top<4||left+w>316||top+h>316)throw Error(`Frame ${index} exceeds native gutter: ${left},${top},${w},${h}`);
      const input=await sharp(rgba,{raw:{width:p.width,height:p.height,channels:4}}).resize(w,h,{kernel:'nearest'}).png().toBuffer();
      if(paletteMode==='canonical-glyphs-v1')glyphs.push({pixels:await sharp(input).ensureAlpha().raw().toBuffer(),width:w,height:h});
      else frames.push({input,left:(local%4)*320+left,top:Math.floor(local/4)*320+top});
      authoring.frames.push({index,sourcePage:page,sourceLocal,sourceBounds:p,sourceAnchor,anchorMode,nativeBounds:{x:left,y:top,width:w,height:h},root:{x:160,y:272},airborne,
        ...(authored?{virtualOrigin:placement.virtualOrigin,supportIsMeasuredFact:false,phase:placement.phase}:{})});
    }
    if(paletteMode==='legacy-placed-v1')pages.push(await sharp({create:{width:1280,height:1280,channels:4,background:'#00000000'}}).composite(frames).png().toBuffer());
  }
  const finalPages=[];
  if(paletteMode==='canonical-glyphs-v1'){
    // Learn shared colours before placement: moving a root must not recolour another clip.
    const quantized=await quantizeGlyphs(glyphs,{compactPalette});
    authoring.palette={...quantized.palette,sharedPages:4};
    for(let page=0;page<4;page++){
      const frames=quantized.glyphs.slice(page*16,page*16+16).map(({pixels,width,height},local)=>{
        const {x,y}=authoring.frames[page*16+local].nativeBounds;
        return {input:pixels,raw:{width,height,channels:4},left:local%4*320+x,top:Math.floor(local/4)*320+y};
      });
      finalPages.push(await sharp({create:{width:1280,height:1280,channels:4,background:'#00000000'}}).composite(frames).png().toBuffer());
    }
  }else{
    // Explicit reproduction path for historical evidence; existing files are never rewritten.
    const composite=await sharp({create:{width:2560,height:2560,channels:4,background:'#00000000'}}).composite(pages.map((input,p)=>({input,left:p%2*1280,top:Math.floor(p/2)*1280}))).png().toBuffer();
    const candidate=await sharp(composite).png({palette:true,colours:128,quality:95,dither:0,effort:10}).toBuffer();
    const palette=compactPalette(await sharp(candidate).ensureAlpha().raw().toBuffer());
    const atlas=palette.merges.length
      ?await sharp(palette.pixels,{raw:{width:2560,height:2560,channels:4}}).png().toBuffer():candidate;
    authoring.palette={method:paletteMode,colors:palette.colors,quantizedOpaqueColors:palette.colors+palette.merges.length,quality:95,dither:0,sharedPages:4,merges:palette.merges};
    for(let page=0;page<4;page++)finalPages.push(await sharp(atlas).extract({left:page%2*1280,top:Math.floor(page/2)*1280,width:1280,height:1280}).png().toBuffer());
  }
  fs.mkdirSync(dir,{recursive:true});
  actor.status='review';actor.pages=[];const frameHashes=[];
  for(let page=0;page<4;page++){
    const file=path.join(dir,`body-${page}.png`);
    fs.writeFileSync(file,finalPages[page]);
    const checked=await audit(file);if(checked.errors.length)throw Error(checked.errors.join('\n'));
    frameHashes.push(...checked.frames.map(f=>f.pixelHash));
    actor.pages.push({file:path.basename(file),sha256:hash(file)});
  }
  const sequenceErrors=checkSequences(frameHashes,CLIPS);
  if(sequenceErrors.length)throw Error(sequenceErrors.join('\n'));
  actor.frames[12].events=['takeoff'];actor.frames[15].events=['land'];actor.frames[46].events=['release'];actor.frames[51].events=['contact'];actor.frames[57].events=['release'];
  authoring.targetLandmarks={crownY:272-actor.bodyPixels,groundY:272,note:'Nominal anatomical crown with soles on ground. Accessories below soles can lift the body; source-page soleOffset is a size measurement, not a root override.'};
  actor.reviews.pixelGrid=true;
  actor.production={stage:'animation-review',grips:'unreviewed',runtimeScale:1,sourceAuthoring:'authoring.json',nativeHeightPx:actor.bodyPixels};
  save(path.join(dir,'actor.json'),actor);save(path.join(dir,'authoring.json'),authoring);
  entry.bakes||=[];entry.bakes.push({revision,directory:relative,manifest:relative+'/actor.json',status:'review'});entry.status='review';save(path.join(out,'production.json'),manifest);
  const library={schemaVersion:2,templateId:'kalistar-actor-v2',status:'review',entries:manifest.entries.filter(e=>e.bakes?.length).map(e=>({characterId:e.characterId,name:e.name,modelId:e.modelId,heightCm:e.heightCm,bodyPixels:e.bodyPixels,weapon:e.weapon,manifest:e.bakes.at(-1).manifest}))};
  save(path.join(out,'library.json'),library);return {id,directory:dir,frames:64,pages:4,bodyPixels:actor.bodyPixels,status:'review'};
}
async function main(){const [cmd,id]=process.argv.slice(2);if(cmd==='bake')console.log(JSON.stringify(await bake(id)));else if(cmd==='scan'){const {parts,info}=await scan(id);console.log(JSON.stringify({width:info.width,height:info.height,parts},null,2));}else throw Error('Use bake <id> | scan <file>');}
module.exports={scan,bake,torsoAnchor,calibration,compactPalette,validateSourceOrigins,placeFrame,pagePlacement};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
