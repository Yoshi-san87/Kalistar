'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),S=require('./rules.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L;
const file=n=>path.join(__dirname,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const creation=(id,n)=>path.join(ROOT,'V4/creations',id,n),work=(id,n)=>file('work/'+id+'/'+n),original=(id,n)=>file('originals/'+id+'/'+n);
const catalogueFile=D.CATALOGUE,NAMES=['profile.json','card.png','card.psd','verification.json','illustration.png','creation.json'];
const PUBLISHED=['profile.json','card.png','card.psd','verification.json'];
const CODE=['revise.cjs','rules.cjs','plan.json','compose.jsx','render.ps1'];
const SHARED=['V3/donnees/regles_demo.json','V4/site/engine.js','V4/atelier/lib.cjs','V4/atelier/designer-render.cjs','V4/atelier/game-catalog.cjs',
 'V4/atelier/barcode.py','V4/scripts/stable/common.jsx','V4/scripts/stable/elements-common.jsx','V4/atelier/data/references.json','V4/atelier/designer-assets/manifest.json'];
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen file changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
function nativeSource(entry){
 const dir=entry.nativeRevision?path.dirname(path.join(ROOT,entry.nativeRevision.proof)):path.join(ROOT,entry.publicationSource,'cards',read(creation(entry.id,'creation.json')).key);
 assert(fs.existsSync(path.join(dir,'render/native.json')));return dir;
}
async function prepare(){
 assert(!fs.existsSync(file('before.json'))&&!fs.existsSync(file('originals')),'Never overwrite frozen originals');
 await stable();const catalogue=read(catalogueFile),cards=[],observed=[],backups=[],sources=[],inputs=[];
 for(const row of read(file('plan.json')).cards){
  const entry=catalogue.cards.find(c=>c.id===row.id);assert.equal(entry?.kind,'created');
  const before=read(creation(row.id,'profile.json'));assert.deepEqual(entry.profile,before);
  const next=S.after(before,row),dir=nativeSource(entry),oldPlan=read(path.join(dir,'render/composition.json'));
  fs.mkdirSync(work(row.id,'render'),{recursive:true});fs.mkdirSync(original(row.id,'render'),{recursive:true});
  for(const n of NAMES){fs.copyFileSync(creation(row.id,n),original(row.id,n),fs.constants.COPYFILE_EXCL);observed.push(creation(row.id,n));backups.push(original(row.id,n));}
  for(const n of ['native.json','composition.json']){
   fs.copyFileSync(path.join(dir,'render',n),original(row.id,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(original(row.id,'render/'+n));sources.push(path.join(dir,'render',n));
  }
  const donor=D.validate({...Object.fromEntries(D.FIELDS.filter(k=>k in next).map(k=>[k,next[k]])),faction:'Chroma'},{final:true});
  const stats=(await R.components(donor,{id:row.id})).filter(l=>S.statName(l.name));
  const oldLayers=oldPlan.layers.map(l=>({...l,input:path.join(dir,'render',l.file)}));
  const insert=oldLayers.findIndex(l=>S.statName(l.name));assert(insert>=0);
  const layers=oldLayers.filter(l=>!S.statName(l.name));layers.splice(insert,0,...stats);
  const composition={...oldPlan,layers:[]};
  for(const [i,l]of layers.entries()){
   const name='component-'+String(i).padStart(2,'0')+'.png';
   await sharp(l.input).png().toFile(work(row.id,'render/'+name));
   composition.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
   inputs.push(work(row.id,'render/'+name));
  }
  for(const l of oldPlan.layers)sources.push(path.join(dir,'render',l.file));
  await sharp(await R.composite(layers)).png().toFile(work(row.id,'render/expected-components.png'));
  write(work(row.id,'render/composition.json'),composition);write(work(row.id,'profile.json'),next);
  fs.copyFileSync(creation(row.id,'illustration.png'),work(row.id,'illustration.png'));
  inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>work(row.id,n)));
  cards.push({id:row.id,catalogueEntry:entry,reason:row.reason,original:rel(original(row.id,'card.psd')),native:rel(original(row.id,'render/native.json')),output:rel(work(row.id,''))});
 }
 write(file('render-request.json'),{revision:S.REV,cards});
 write(file('before.json'),{revision:S.REV,cards,observed:await hashes(observed),backups:await hashes(backups),sources:await hashes([...new Set(sources)]),protected:await hashes(SHARED.map(p=>path.join(ROOT,p))),inputs:await hashes(inputs.concat(CODE.map(file),file('render-request.json')))});
 await guard();return {prepared:cards.length,productionUnchanged:true};
}
async function guard(){
 const frozen=read(file('before.json'));await stable();
 for(const key of ['observed','backups','sources','protected','inputs'])await match(frozen[key]);
 const cat=read(catalogueFile);
 for(const c of frozen.cards){assert.deepEqual(cat.cards.find(e=>e.id===c.id),c.catalogueEntry);S.validate(read(original(c.id,'profile.json')),read(work(c.id,'profile.json')));}
 return frozen;
}
async function render(){
 assert.equal(process.env.KALISTAR_RE_FACES_PS,'2026-10-08');
 return B.locked(async()=>{
  const frozen=await guard();for(const c of frozen.cards)assert(!fs.existsSync(work(c.id,'card.psd')),'Native attempt exists; inspect before retry');
  const output=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
  await guard();return {rendered:frozen.cards.length,output};
 });
}
async function verify(){
 await guard();const checks=[];
 for(const c of read(file('before.json')).cards){
  const p=read(work(c.id,'profile.json')),old=read(original(c.id,'profile.json')),native=read(work(c.id,'render/native.json')),audit=read(work(c.id,'audit.json'));
  assert.equal(native.photoshop,'26.11.8');
  assert.deepEqual(S.unchangedState(audit.after),S.unchangedState(audit.before));
  assert.deepEqual(S.unchangedState(audit.reopened),S.unchangedState(audit.before));
  const previous=read(original(c.id,'render/native.json'));
  assert.deepEqual(S.unchangedState(audit.before),S.unchangedState(previous.layers));
  for(const [a,b]of [['before-card.png',original(c.id,'card.png')],['before-without-stats.png',work(c.id,'after-without-stats.png')],['after-without-stats.png',work(c.id,'reopened-without-stats.png')]])
   assert.equal((await L.diff(work(c.id,a),b)).changed,0,'Unchanged native frame mismatch: '+c.id);
  const pixels=f=>sharp(f).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const a=await pixels(original(c.id,'card.png')),b=await pixels(work(c.id,'card.png'));
  assert.deepEqual(a.info,b.info);
  const circles=S.changedCircles(old,p),scope=require('../2026-10-01-stat-personality/numeric-only.cjs').diffPixels(a.data,b.data,a.info.width,a.info.height,circles);
  assert.equal(scope.outside,0,'Pixels outside changed combat faces');assert(scope.changed>0);
  const v={...await B.verifyNative(work(c.id,''),p),revision:S.REV,scope,allowedCircles:circles,preservedArtworkAndIdentity:true,originalHash:await hash(original(c.id,'card.psd')),inputManifestHash:await hash(file('before.json'))};
  write(work(c.id,'verification.json'),v);await sharp(work(c.id,'card.png')).resize({width:300}).png().toFile(work(c.id,'small.png'));
  write(work(c.id,'verified.json'),{id:c.id,evidence:await hashes(PUBLISHED.concat(['audit.json','render/native.json','render/reopened.png','render/without-text.png']).map(n=>work(c.id,n)))});
  checks.push({id:c.id,scope,fixed:v.components.fixedDifferences,reopened:v.roundtrip.changed,barcode:v.barcode.passed});
 }
 await guard();write(file('native-checks.json'),checks);return checks;
}
async function preflight(){
 const frozen=await guard();assert(!fs.existsSync(file('published.json')));
 const catalogueHash=await hash(catalogueFile),before=read(catalogueFile),catalogue=structuredClone(before),metas=[];
 for(const c of frozen.cards){
  await match(read(work(c.id,'verified.json')).evidence);
  const v=read(work(c.id,'verification.json'));assert(v.passed&&v.scope.outside===0&&v.preservedArtworkAndIdentity);
  const p=read(work(c.id,'profile.json')),entry=catalogue.cards.find(e=>e.id===c.id);
  entry.profile=p;entry.nativeRevision={id:S.REV,key:c.catalogueEntry.nativeRevision?.key||c.id,proof:rel(work(c.id,'verification.json')),changedFields:S.FIELDS,previous:c.catalogueEntry.nativeRevision||null};
  const meta=read(original(c.id,'creation.json'));for(const n of PUBLISHED)meta.hashes[n]=await hash(work(c.id,n));
  meta.nativeRevision=entry.nativeRevision;metas.push({id:c.id,meta});
 }
 const G=require('../../atelier/game-catalog.cjs'),a=await G.buildCatalog({published:before.cards.filter(c=>c.kind==='created')}),b=await G.buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
 assert.equal(a.cards.length,b.cards.length);
 for(const old of a.cards){
  const next=b.cards.find(c=>c.id===old.id);
  if(frozen.cards.some(c=>c.id===old.id))S.validate(old,next);else assert.deepEqual(next,old);
 }
 before.cards.forEach((entry,i)=>{if(!metas.some(m=>m.id===entry.id))assert.deepEqual(catalogue.cards[i],entry);});
 assert.equal(await hash(catalogueFile),catalogueHash,'Concurrent catalogue change');
 return {catalogue,catalogueHash,metas,gameCount:b.cards.length};
}
async function publish(){
 assert.equal(process.env.KALISTAR_RE_FACES_PUBLISH,'2026-10-08');
 return B.locked(async()=>{
  const plan=await preflight(),frozen=read(file('before.json')),writes=[],done=[];
  fs.copyFileSync(catalogueFile,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);
  for(const {id,meta}of plan.metas){
   write(work(id,'creation.json'),meta);
   for(const n of PUBLISHED.concat('creation.json'))writes.push({stage:work(id,n),target:creation(id,n),backup:original(id,n),before:frozen.observed[rel(creation(id,n))]});
  }
  write(file('publication-catalogue.json'),plan.catalogue);
  writes.push({stage:file('publication-catalogue.json'),target:catalogueFile,backup:file('catalogue-before-publication.json'),before:plan.catalogueHash});
  for(const w of writes)w.after=await hash(w.stage);
  write(file('transaction.json'),{revision:S.REV,state:'publishing',writes});
  try{
   for(const w of writes){
    assert.equal(await hash(w.target),w.before);
    const temp=w.target+'.'+S.REV+'.tmp';fs.copyFileSync(w.stage,temp,fs.constants.COPYFILE_EXCL);
    assert.equal(await hash(temp),w.after);assert.equal(await hash(w.target),w.before);
    fs.renameSync(temp,w.target);done.push(w);assert.equal(await hash(w.target),w.after);
   }
   await stable();for(const key of ['backups','sources','protected','inputs'])await match(frozen[key]);
   for(const c of frozen.cards)assert.equal(await hash(creation(c.id,'illustration.png')),frozen.observed[rel(creation(c.id,'illustration.png'))]);
   write(file('published.json'),{revision:S.REV,ids:plan.metas.map(m=>m.id),gameCount:plan.gameCount,changed:writes.map(w=>rel(w.target))});
   write(file('transaction.json'),{revision:S.REV,state:'published'});return {published:plan.metas.length,gameCount:plan.gameCount};
  }catch(error){
   for(const w of done.reverse()){assert.equal(await hash(w.target),w.after,'External change; rollback refused');fs.copyFileSync(w.backup,w.target);}
   write(file('transaction.json'),{revision:S.REV,state:'rolled-back',error:String(error)});throw error;
  }
 });
}
module.exports={prepare,guard,render,verify,preflight,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(process.argv[2]==='preflight'?{ready:true,gameCount:r.gameCount}:process.argv[2]==='guard'?{frozen:true}:r,null,2))).catch(e=>{console.error(e);process.exitCode=1});

