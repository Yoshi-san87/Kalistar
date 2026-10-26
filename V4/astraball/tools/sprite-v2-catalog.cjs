'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {ROOT,OUT:PILOT,read,save,hash}=require('./sprite-v2-production.cjs');
const {within,validate}=require('./sprite-template-v2.cjs');
const DATA=path.join(ROOT,'work/astraball-v2'),OUT=path.join(DATA,'full-catalog');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function planEntries(characters,inventory,pilots){
  const ids=new Set();
  return characters.map(c=>{
    if(!/^[a-z0-9-]+$/.test(c.characterId)||ids.has(c.characterId))throw Error('Duplicate or unsafe character identity');
    ids.add(c.characterId);
    const exact=inventory.find(e=>e.characterId===c.characterId&&String(e.modelId)===String(c.modelId));
    if(!exact)throw Error('No exact model for '+c.characterId);
    if(!Number.isFinite(exact.heightCm)||exact.heightCm<=0||!Number.isInteger(exact.bodyPixels)||!exact.physicalFamily||!exact.magicFamily)throw Error('Incomplete native contract for '+c.characterId);
    const pilot=pilots.find(e=>e.characterId===c.characterId&&String(e.modelId)===String(c.modelId));
    return {...exact,race:c.race,faction:c.faction,reference:c.reference,referenceSha256:c.referenceSha256,
      oldSprite:c.file,variantModelIds:(c.modelIds||[c.modelId]).map(String),
      pilotManifest:pilot?'ten-characters/'+pilot.manifest:null};
  });
}
function init(){
  const source=read(path.join(ROOT,'V4/astraball/sources/sprites-v3/production.json'));
  const inventory=read(path.join(DATA,'inventory.json')),pilots=read(path.join(PILOT,'library.json'));
  const entries=planEntries(source.characters,inventory.entries,pilots.entries);
  for(const e of entries){const file=within(ROOT,e.reference);if(!fs.existsSync(file)||hash(file)!==e.referenceSha256)throw Error('Reference missing or changed: '+e.characterId);}
  const plan={schemaVersion:1,templateId:'kalistar-actor-v2',scope:'One exact primary appearance per character; other card variants are listed, not silently aliased.',
    authorization:'User requested all characters and parallel agents on 2026-10-26. Native offline conversion approved; no runtime actor enlargement.',
    sourceFingerprint:digest(entries),entries};
  const file=path.join(OUT,'plan.json');
  if(fs.existsSync(file)){if(read(file).sourceFingerprint!==plan.sourceFingerprint)throw Error('Catalogue changed; reconcile the existing plan explicitly');return read(file);}
  save(file,plan);return plan;
}
function jobEntry(id){
  const plan=read(path.join(OUT,'plan.json')),entry=plan.entries.find(e=>e.characterId===id);
  if(!entry)throw Error('Unknown planned character');
  if(entry.pilotManifest)throw Error('Preserve the reviewed pilot; this character is already present');
  return {entry,plan,directory:within(OUT,'jobs/'+id)};
}
function workerPages(worker,entry){
  if(worker.characterId!==entry.characterId||String(worker.modelId)!==String(entry.modelId))throw Error('Worker identity mismatch');
  if(typeof worker.subject!=='string'||worker.subject.trim().length<20)throw Error('An inspected costume description is required');
  if(!Array.isArray(worker.pages)||worker.pages.length!==4)throw Error('Four source pages required');
  const pages=[...worker.pages].sort((a,b)=>a.page-b.page);
  for(const [i,p] of pages.entries()){
    if(p.page!==i||!new RegExp('^source-'+i+'-r[1-9][0-9]*\\.png$').test(p.file||''))throw Error('Unsafe or duplicate source page');
    if(!/^[a-f0-9]{64}$/.test(p.sha256||'')||typeof p.prompt!=='string'||p.prompt.length<100)throw Error('Source provenance is incomplete');
    if(!Number.isInteger(p.referenceFrame)||p.referenceFrame<0||p.referenceFrame>15||!Number.isInteger(p.crownInsetPx)||p.crownInsetPx<0)throw Error('Explicit source calibration required');
    if(p.soleInsetPx!==undefined&&(!Number.isInteger(p.soleInsetPx)||p.soleInsetPx<0))throw Error('Invalid sole measurement');
    if(p.sourceOrigins!==undefined&&p.authoredPlacement!==undefined)throw Error('Choose source origins or authored placement, never both');
    if(p.authoredPlacement!==undefined&&p.authoredPlacement?.source?.sha256!==p.sha256)throw Error('Authored placement is missing or stale');
    if(p.sourceOrigins!==undefined)require('./sprite-v2-bake.cjs').validateSourceOrigins(p.sourceOrigins,p.sha256);
  }
  return pages;
}
function workerRecipes(pages){
  return pages.map(p=>({file:p.file,referenceFrame:p.referenceFrame,crownInsetPx:p.crownInsetPx,
    ...(p.soleInsetPx!==undefined?{soleInsetPx:p.soleInsetPx}:{}),
    ...(p.order?{order:p.order}:{}),...(p.sourceOrigins?{sourceOrigins:p.sourceOrigins}:{}),
    ...(p.authoredPlacement!==undefined?{authoredPlacement:p.authoredPlacement}:{})}));
}
function canReuseBake(previous,entry,workerFingerprint){
  return !!previous?.bakes?.length&&previous.workerFingerprint===workerFingerprint&&
    ['characterId','modelId','heightCm','bodyPixels','weapon','physicalFamily','magicFamily'].every(key=>previous[key]===entry[key]);
}
async function importWorker(id){
  const {entry,plan,directory}=jobEntry(id),worker=read(path.join(directory,'worker.json')),pages=workerPages(worker,entry);
  for(const p of pages)if(hash(within(directory,p.file))!==p.sha256)throw Error('Worker source changed: '+p.file);
  // Validate observed landmarks against the actual pixels before writing a new handoff.
  const {bake,scan,pagePlacement}=require('./sprite-v2-bake.cjs');
  for(const p of pages)if(p.authoredPlacement!==undefined||p.soleInsetPx!==undefined)pagePlacement(p,p,await scan(within(directory,p.file)),entry.bodyPixels,p.page);
  const file=path.join(directory,'production.json'),existing=fs.existsSync(file)?read(file):null;
  const previous=existing?.entries[0];
  if(previous&&previous.modelId!==entry.modelId)throw Error('Never reuse another model job');
  const workerFingerprint=digest(worker);
  if(canReuseBake(previous,entry,workerFingerprint))return {id,status:'unchanged',manifest:previous.bakes.at(-1).manifest};
  const sources=[...(previous?.sources||[])];
  for(const p of pages){
    const old=sources.find(s=>s.file===p.file);
    if(old&&old.sha256!==p.sha256)throw Error('Preserve earlier source bytes: '+p.file);
    if(!old)sources.push({page:p.page,revision:Number(p.file.match(/-r([0-9]+)\.png$/)[1]),file:p.file,sha256:p.sha256,prompt:p.prompt,referencePaths:p.referencePaths||[],tool:'image_gen.imagegen',status:'source-review'});
    else if(old.prompt!==p.prompt)throw Error('Preserve earlier source provenance: '+p.file);
  }
  const next={...entry,subject:worker.subject,status:'source-review',sources,selectedSources:pages.map(p=>p.file),workerFingerprint:null,bakes:previous?.bakes||[]};
  save(file,{schemaVersion:1,templateId:plan.templateId,authorization:plan.authorization,entries:[next]});
  save(path.join(directory,'calibration.json'),{schemaVersion:1,status:'review',note:'Explicit source-page estimates; anatomy and animation anchors remain unapproved.',actors:{[id]:workerRecipes(pages)}});
  const result=await bake(id,{out:directory});
  // A failed bake must remain retryable even when an older native revision exists.
  const completed=read(file);completed.entries[0].workerFingerprint=workerFingerprint;save(file,completed);
  return result;
}
function refresh(){
  const plan=read(path.join(OUT,'plan.json')),entries=[],progress=[];
  for(const e of plan.entries){
    let manifest=e.pilotManifest,status='pending';
    const directory=path.join(OUT,'jobs',e.characterId),production=path.join(directory,'production.json');
    if(!manifest&&fs.existsSync(production)){
      const b=read(production).entries[0]?.bakes?.at(-1);
      if(b)manifest='full-catalog/jobs/'+e.characterId+'/'+b.manifest;
    }
    if(manifest){
      const actor=read(within(DATA,manifest));
      if(actor.modelId!==e.modelId||actor.characterId!==e.characterId||actor.pages?.length!==4||actor.reviews?.pixelGrid!==true)throw Error('Invalid completed entry '+e.characterId);
      status='review';entries.push({characterId:e.characterId,modelId:e.modelId,name:e.name,race:e.race,faction:e.faction,heightCm:e.heightCm,bodyPixels:e.bodyPixels,weapon:e.weapon,manifest});
    }else if(fs.existsSync(path.join(directory,'worker.json')))status='source-review';
    else if(fs.existsSync(directory)&&fs.readdirSync(directory).some(n=>/^source-[0-3]-r\d+\.png$/.test(n)))status='generating';
    progress.push({characterId:e.characterId,name:e.name,faction:e.faction,status});
  }
  const counts={total:progress.length,review:entries.length,sourceReview:progress.filter(e=>e.status==='source-review').length,generating:progress.filter(e=>e.status==='generating').length,pending:progress.filter(e=>e.status==='pending').length};
  save(path.join(OUT,'library.json'),{schemaVersion:2,templateId:plan.templateId,status:'review',counts,entries});
  save(path.join(OUT,'progress.json'),{schemaVersion:1,counts,entries:progress});return counts;
}
async function audit(){
  const library=read(path.join(OUT,'library.json')),results=[];
  for(const entry of library.entries){
    const result=await validate(within(DATA,entry.manifest),{sequences:true});
    if(!result.ok)throw Error(entry.characterId+': '+result.errors.join('; '));
    results.push({characterId:entry.characterId,manifest:entry.manifest,status:'technical-review-pass'});
  }
  const result={counts:library.counts,frames:results.length*64,pages:results.length*4,status:'technical-review-pass',notCertified:['motion and anatomical anchor approval','hand sockets and masks','game integration'],entries:results};
  save(path.join(OUT,'qa','audit.json'),result);return result;
}
async function contact(id,clipId){
  const {CLIPS,frameRect}=await import('../animation-kit/template-v2.mjs');
  const entry=read(path.join(OUT,'library.json')).entries.find(e=>e.characterId===id),clip=CLIPS[clipId];
  if(!entry||!clip)throw Error('Choose an available character and clip');
  const manifest=within(DATA,entry.manifest),actor=read(manifest),directory=path.dirname(manifest);
  const sharp=require(path.join(process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules','sharp'));
  const pieces=[];
  for(const [i,frame] of clip.frames.entries()){
    const rect=frameRect(frame.index),input=await sharp(within(directory,actor.pages[rect.page].file)).extract({left:rect.x,top:rect.y,width:320,height:320}).png().toBuffer();
    pieces.push({input,left:i*320,top:0});
  }
  const output=path.join(OUT,'qa',id,clipId+'.png');fs.mkdirSync(path.dirname(output),{recursive:true});
  await sharp({create:{width:pieces.length*320,height:320,channels:4,background:'#17251e'}}).composite(pieces).png().toFile(output);
  return {file:output,manifest:entry.manifest,frames:clip.frames.map(f=>f.index),scale:1};
}
module.exports={DATA,OUT,planEntries,workerPages,workerRecipes,canReuseBake,init,importWorker,refresh,audit,contact};
async function main(){const [command,id,clip]=process.argv.slice(2);if(command==='init'){const p=init();console.log(JSON.stringify({characters:p.entries.length,...refresh()}));}else if(command==='import')console.log(JSON.stringify(await importWorker(id)));else if(command==='refresh')console.log(JSON.stringify(refresh()));else if(command==='audit')console.log(JSON.stringify(await audit()));else if(command==='contact')console.log(JSON.stringify(await contact(id,clip)));else throw Error('Use init | import <characterId> | refresh | audit | contact <characterId> <clip>');}
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
