'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L;
const home=__dirname,file=n=>path.join(home,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const plan=()=>read(file('plan.json')),work=(id,n='')=>file('work/'+id+'/'+n),old=(id,n)=>file('originals/'+id+'/'+n),prod=(id,n)=>path.join(ROOT,'V4/creations',id,n);
const cat=path.join(ROOT,'V4/donnees/catalogue.json'),site=path.join(ROOT,'V4/site/assets/factions/FF9.png');
const source=path.join(ROOT,'V4/expansions/2026-10-09-final-fantasy-trilogy/components/flag-FF9.png');
const NAMES=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function prepare(){
 assert(!fs.existsSync(file('before.json')),'Preserve frozen revision');
 await stable();const inputs=['plan.json','revise.cjs','compose.jsx','render.ps1'].map(file).concat(source,path.join(ROOT,plan().source)),backups=[],observed=[site],cards=[];
 fs.mkdirSync(file('originals/assets'),{recursive:true});
 fs.copyFileSync(site,file('originals/assets/FF9.png'),fs.constants.COPYFILE_EXCL);backups.push(file('originals/assets/FF9.png'));
 for(const row of plan().cards){
  const entry=read(cat).cards.find(c=>c.id===row.id),meta=read(prod(row.id,'creation.json'));
  const original=entry.nativeRevision?path.dirname(path.join(ROOT,entry.nativeRevision.proof)):path.join(ROOT,entry.publicationSource,'cards',meta.key);
  fs.mkdirSync(work(row.id,'render'),{recursive:true});fs.mkdirSync(old(row.id,'render'),{recursive:true});
  for(const n of NAMES){fs.copyFileSync(prod(row.id,n),old(row.id,n),fs.constants.COPYFILE_EXCL);observed.push(prod(row.id,n));backups.push(old(row.id,n));}
  for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(original,'render',n),old(row.id,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old(row.id,'render/'+n));}
  for(const n of ['profile.json','illustration.png'])fs.copyFileSync(prod(row.id,n),work(row.id,n),fs.constants.COPYFILE_EXCL);
  const composition=read(path.join(original,'render/composition.json')),layers=[];let count=0;
  for(const layer of composition.layers){
   const input=layer.name==='FACTION - FF9'?(count++,path.join(ROOT,plan().source)):path.join(original,'render',layer.file);
   fs.copyFileSync(input,work(row.id,'render/'+layer.file),fs.constants.COPYFILE_EXCL);
   layers.push({...layer,input:work(row.id,'render/'+layer.file)});inputs.push(work(row.id,'render/'+layer.file));
  }
  assert.equal(count,1);write(work(row.id,'render/composition.json'),composition);
  await sharp(await R.composite(layers)).png().toFile(work(row.id,'render/expected-components.png'));
  inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>work(row.id,n)));
  cards.push({...row,entry});
 }
 write(file('before.json'),{cards,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(observed)});return {prepared:cards.length};
}
async function guard(){
 await stable();const before=read(file('before.json'));
 for(const key of ['inputs','backups','observed'])await match(before[key]);
 for(const c of before.cards)assert.deepEqual(read(cat).cards.find(e=>e.id===c.id),c.entry);return before;
}
async function render(){
 assert.equal(process.env.KALISTAR_FF_LOGO_PS,'2026-10-09');
 return B.locked(async()=>{await guard();for(const c of plan().cards)assert(!fs.existsSync(work(c.id,'card.psd')));
 const output=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
 await guard();return output;});
}
async function verify(){
 await guard();const checks=[];
 for(const c of plan().cards){
  const p=read(work(c.id,'profile.json'));assert.deepEqual(p,read(old(c.id,'profile.json')));
  assert.equal(await hash(work(c.id,'illustration.png')),await hash(old(c.id,'illustration.png')));
  const v=await B.verifyNative(work(c.id),p);
  const a=await sharp(old(c.id,'card.png')).ensureAlpha().raw().toBuffer(),b=await sharp(work(c.id,'card.png')).ensureAlpha().raw().toBuffer();
  const rectangles=[[672,829,770,1052]];let changed=0,outside=0;
  for(let i=0;i<a.length;i+=4)if(a[i]!==b[i]||a[i+1]!==b[i+1]||a[i+2]!==b[i+2]||a[i+3]!==b[i+3]){
   changed++;const x=i/4%897,y=Math.floor(i/4/897);if(!rectangles.some(([l,t,r,b])=>x>=l&&x<r&&y>=t&&y<b))outside++;
  }
  assert(changed>0);assert.equal(outside,0,'Unexpected visual change '+c.id);
  const proof={...v,revision:plan().revision,scope:{changed,outside,rectangles},gameplayUnchanged:true,previousProofHash:await hash(old(c.id,'verification.json')),inputManifestHash:await hash(file('before.json'))};
  write(work(c.id,'verification.json'),proof);
  await sharp(work(c.id,'card.png')).resize({width:300}).png().toFile(work(c.id,'small.png'));
  write(work(c.id,'verified.json'),await hashes(NAMES.filter(n=>n!=='creation.json').concat(['render/native.json','render/reopened.png']).map(n=>work(c.id,n))));
  checks.push({id:c.id,fixed:v.components.fixedDifferences,reopened:v.roundtrip.changed,barcode:v.barcode.passed,scope:proof.scope});
 }
 await guard();write(file('native-checks.json'),checks);return checks;
}
async function publish(){
 assert.equal(process.env.KALISTAR_FF_LOGO_PUBLISH,'2026-10-09');
 return B.locked(async()=>{
  const frozen=await guard(),before=read(cat),catalogue=structuredClone(before),writes=[],done=[];
  assert(!fs.existsSync(file('published.json')));
  fs.copyFileSync(cat,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);
  for(const c of frozen.cards){
   await match(read(work(c.id,'verified.json')));const entry=catalogue.cards.find(e=>e.id===c.id),meta=read(old(c.id,'creation.json'));
   entry.nativeRevision={id:plan().revision,key:meta.key,proof:rel(work(c.id,'verification.json')),changedFields:['factionIllustration'],previous:entry.nativeRevision||null};
   for(const n of NAMES.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(c.id,n));
   meta.nativeRevision=entry.nativeRevision;write(work(c.id,'creation.json'),meta);
   for(const n of NAMES)writes.push({stage:work(c.id,n),target:prod(c.id,n),backup:old(c.id,n),before:frozen.observed[rel(prod(c.id,n))]});
  }
  writes.push({stage:source,target:site,backup:file('originals/assets/FF9.png'),before:frozen.observed[rel(site)]});
  write(file('publication-catalogue.json'),catalogue);
  writes.push({stage:file('publication-catalogue.json'),target:cat,backup:file('catalogue-before-publication.json'),before:await hash(file('catalogue-before-publication.json'))});
  before.cards.forEach((e,i)=>{if(!frozen.cards.some(c=>c.id===e.id))assert.deepEqual(catalogue.cards[i],e);});
  for(const w of writes)w.after=await hash(w.stage);
  write(file('transaction.json'),{state:'publishing',writes});
  try{
   for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
   await stable();await match(frozen.inputs);await match(frozen.backups);
   write(file('published.json'),{revision:plan().revision,ids:frozen.cards.map(c=>c.id),gameplayUnchanged:true});
   write(file('transaction.json'),{state:'published',writes});return {published:frozen.cards.length};
  }catch(error){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(error)});throw error;}
 });
}
module.exports={prepare,guard,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1});

