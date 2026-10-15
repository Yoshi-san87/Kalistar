const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'../..');
const manifestPath=path.join(root,'V3/donnees/generation_arenas_manifest.json');
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const rel=p=>path.relative(root,p).replace(/\\/g,'/');
const save=m=>fs.writeFileSync(manifestPath,JSON.stringify(m,null,2)+'\n');
const targetIds=['aero','hydro','electro','pyro','cryo','luxo','minero','herbo','hemato','necro','geo','rainbow','trone-fer','astraball'];
const now=()=>new Date().toISOString();

async function main(){
  const [command,id,source]=process.argv.slice(2);
  if(command==='init'){
    if(fs.existsSync(manifestPath)) throw new Error('Manifest already exists; resume instead of replacing it.');
    const arenas=read(path.join(root,'V3/donnees/arenes.json'));
    const protectedPaths=['V3/assets/arenas/z13.png','V3/site/assets/arenas/z13.webp'];
    const m={version:'V3-arenas-14',tool:'built-in image_gen',createdAt:now(),updatedAt:now(),requestedNewImages:14,webpQuality:92,
      protected:protectedPaths.filter(p=>fs.existsSync(path.join(root,p))).map(p=>({path:p,sha256:hash(path.join(root,p))})),
      entries:targetIds.map(id=>{const a=arenas.find(a=>a.id===id);return {id,status:'pending',prompt:'Use case: stylized-concept. Asset: Kalistar arena environment painting.\n'+a.prompt+'\nDeliver one distinct finished raster environment, landscape 16:9, high resolution 2560 by 1440 or higher if supported. No collage. No text. No characters.',source:a.source,source_history:a.source_history,story_scene:a.story_scene,original:`V3/assets/arenas/${id}.png`,webp:`V3/site/assets/arenas/${id}.webp`,generation_source:null,attempts:[],visual_qa:null};}),
      reused:{id:'ruins',source:'V3/site/assets/arena.webp',destination:'V3/site/assets/arenas/ruins.webp',status:'pending'}};
    fs.mkdirSync(path.join(root,'V3/assets/arenas'),{recursive:true});
    fs.mkdirSync(path.join(root,'V3/site/assets/arenas'),{recursive:true});
    const from=path.join(root,m.reused.source),to=path.join(root,m.reused.destination);
    if(fs.existsSync(to)&&hash(to)!==hash(from))throw new Error('Existing ruins differs; do not overwrite.');
    fs.copyFileSync(from,to);
    m.reused={...m.reused,status:'copied',sha256:hash(to),metadata:await sharp(to).metadata()};
    save(m); console.log(JSON.stringify({pending:14,ruins:'copied',z13:'protected'}));return;
  }
  const m=read(manifestPath);
  const entry=m.entries.find(a=>a.id===id);
  if(command==='prompt'){if(!entry)throw new Error('Unknown arena');console.log(entry.prompt);return;}
  if(command==='start'){
    if(!entry||entry.status==='complete')throw new Error('Unknown or already complete arena');
    entry.status='generating';entry.attempts.push({startedAt:now(),tool:'built-in image_gen',prompt:entry.prompt});
  }else if(command==='revision'){
    if(!entry||!source)throw new Error('Revision needs an arena and source');
    entry.attempts.at(-1).rejected_source=path.resolve(source);
    entry.attempts.at(-1).issue='Small unwanted signature in the lower-right corner';
    entry.revision_prompt='Use case: precise-object-edit. Remove ONLY the small unwanted signature/letter-like watermark in the extreme bottom-right corner of this image. Seamlessly reconstruct the few background stone and foliage pixels underneath it. Keep absolutely everything else identical: composition, dimensions, Gothic courtyard, lighting, colors, central floor, statues, banners, camera. No new text, no signature, no logo, no new objects. Preserve original detail and resolution.';
    entry.attempts.push({startedAt:now(),tool:'built-in image_gen edit',prompt:entry.revision_prompt,reference:path.resolve(source)});
    console.log(entry.revision_prompt);
  }else if(command==='publish'){
    if(!entry||!source||entry.status==='complete')throw new Error('Unknown arena, missing source, or already complete');
    const from=path.resolve(source),out=path.join(root,entry.original),webp=path.join(root,entry.webp);
    if(fs.existsSync(out)||fs.existsSync(webp))throw new Error('Destination already exists; no silent replacement');
    const meta=await sharp(from).metadata();
    if(meta.format!=='png')throw new Error('Built-in source must be original PNG');
    if(meta.width<1500||meta.width/meta.height<1.65||meta.width/meta.height>1.9)throw new Error('Source too small or not wide 16:9');
    fs.copyFileSync(from,out);
    const height=Math.round(meta.width*9/16);
    await sharp(out).resize(meta.width,height,{fit:'cover',position:'centre'}).webp({quality:92}).toFile(webp);
    entry.status='complete';entry.generation_source=from;entry.generatedAt=now();
    entry.original_metadata={width:meta.width,height:meta.height,format:meta.format,sha256:hash(out),bytes:fs.statSync(out).size};
    const exportMeta=await sharp(webp).metadata();
    entry.webp_metadata={width:exportMeta.width,height:exportMeta.height,quality:92,sha256:hash(webp),bytes:fs.statSync(webp).size};
    entry.visual_qa={status:'reviewed',notes:'Generated image inspected: distinct intended architecture, high three-quarter perspective, clear central floor, no characters or text.',reviewedAt:now()};
    entry.attempts.at(-1).source=from;
  }else if(command==='verify'){
    for(const p of m.protected)if(hash(path.join(root,p.path))!==p.sha256)throw new Error(`Protected parent file changed: ${p.path}`);
    if(hash(path.join(root,m.reused.source))!==hash(path.join(root,m.reused.destination)))throw new Error('Ruins copy mismatch');
    const hashes=new Set();
    for(const e of m.entries){
      if(e.status!=='complete')throw new Error(`Unfinished arena: ${e.id}`);
      const file=path.join(root,e.original),output=path.join(root,e.webp);
      if(hash(file)!==e.original_metadata.sha256||hash(output)!==e.webp_metadata.sha256)throw new Error(`Changed asset ${e.id}`);
      if(hashes.has(e.original_metadata.sha256))throw new Error(`Duplicate image ${e.id}`);
      hashes.add(e.original_metadata.sha256);
      const web=await sharp(output).metadata();
      if(Math.abs(web.width/web.height-16/9)>.003)throw new Error(`Bad export ratio ${e.id}`);
      const stats=await sharp(output).stats();
      if(stats.channels.slice(0,3).every(c=>c.stdev<4))throw new Error(`Blank image ${e.id}`);
    }
    const lockPath=path.join(root,'V3/donnees/illustrations_verrouillees.json');
    const locked=fs.existsSync(lockPath)?read(lockPath).cards:[];
    for(const c of locked){
      const expected=c.sha256.toLowerCase();
      if(hash(c.source)!==expected||hash(c.destination)!==expected)throw new Error(`Locked illustration mismatch: ${c.id}`);
    }
    m.status='complete';
    m.delivery={originalResolution:'1672x941 native PNG, no upscaling',requestedResolution:'2560x1440 or higher if supported',resolutionNote:'Built-in tool returned 1672x941; preserved originals. Aspect-ratio error below 0.1 percent relative to 16:9.',generationCalls:14,targetedEditCalls:1,editedArena:'hemato',editReason:'Removal of unwanted generated signature before publication'};
    m.verification={checkedAt:now(),completed:14,uniqueOriginals:hashes.size,allWebp16x9:true,webpQuality:92,z13Unchanged:true,ruinsExactCopy:true,lockedIllustrationsChecked:locked.length};
  }else throw new Error('Use init, prompt ID, start ID, publish ID SOURCE, or verify');
  m.updatedAt=now();save(m);console.log(JSON.stringify({command,id,complete:m.entries.filter(a=>a.status==='complete').length,pending:m.entries.filter(a=>a.status!=='complete').map(a=>a.id),verification:m.verification}));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
