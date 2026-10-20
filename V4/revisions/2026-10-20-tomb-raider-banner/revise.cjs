'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,REV=path.basename(__dirname);
const lot=path.join(ROOT,'V4/expansions/2026-10-18-lara-croft'),cards=read(path.join(lot,'set.json')).cards;
const file=n=>path.join(__dirname,n),work=(c,n='')=>file('cards/'+c.key+'/'+n),old=(c,n='')=>file('originals/'+c.key+'/'+n),prod=(c,n)=>path.join(ROOT,'V4/creations',c.id,n);
const catalogue=path.join(ROOT,'V4/donnees/catalogue.json'),names=['card.psd','card.png','profile.json','illustration.png','verification.json','creation.json'];
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(files){for(const [f,h]of Object.entries(files))assert.equal(await hash(path.join(ROOT,f)),h,'Changed input '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function guard(){await stable();const b=read(file('before.json'));await match(b.inputs);await match(b.backups);await match(b.observed);for(const c of b.cards)assert.deepEqual(read(catalogue).cards.find(v=>v.id===c.id),c.entry);return b;}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Preserve the frozen revision');await stable();
 const cat=read(catalogue),inputs=['revise.cjs','replace.jsx','render.ps1','assets.cjs','asset-provenance.json','banner-source.png','components.json','flag.png','flag-packed.png'].map(file),backups=[],observed=[],entries=[];
 const component=read(file('components.json'));assert.equal(component.transform.scaleX,component.transform.scaleY);
 for(const c of cards){
  const entry=cat.cards.find(v=>v.id===c.id),from=path.join(lot,'cards',c.key);assert(entry&&entry.profile.characterId===c.characterId);assert(!entry.nativeRevision);
  for(const n of ['card.png','card.psd'])assert.equal(await hash(prod(c,n)),await hash(path.join(from,n)),'Current donor '+n);
  fs.mkdirSync(old(c,'render'),{recursive:true});fs.mkdirSync(work(c,'render'),{recursive:true});
  for(const n of names){fs.copyFileSync(prod(c,n),old(c,n),fs.constants.COPYFILE_EXCL);backups.push(old(c,n));observed.push(prod(c,n));}
  for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(from,'render',n),old(c,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old(c,'render/'+n));}
  for(const n of ['profile.json','illustration.png'])fs.copyFileSync(prod(c,n),work(c,n),fs.constants.COPYFILE_EXCL);
  const plan=read(path.join(from,'render/composition.json')),layers=[];
  assert.equal(plan.layers.filter(l=>l.name==='FACTION - TOMBRAIDER').length,1);
  for(const l of plan.layers){
   const input=fs.readFileSync(l.name==='FACTION - TOMBRAIDER'?file('flag-packed.png'):path.join(from,'render',l.file));
   fs.writeFileSync(work(c,'render/'+l.file),input,{flag:'wx'});layers.push({...l,input});
  }
  write(work(c,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(work(c,'render/expected-components.png'));
  inputs.push(work(c,'profile.json'),work(c,'illustration.png'),...fs.readdirSync(work(c,'render')).map(n=>work(c,'render/'+n)));
  entries.push({id:c.id,key:c.key,entry});
 }
 write(file('before.json'),{cards:entries,catalogue:cat,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(observed)});
 return {prepared:cards.length};
});}
async function render(){return B.locked(async()=>{
 await guard();for(const c of cards)assert(!fs.existsSync(work(c,'card.psd')));
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],path.join(ROOT,'work/qa/tomb-raider-banner/photoshop.log'));
 await guard();return result;
});}
async function verify(){return B.locked(async()=>{
 await guard();const reports=[],verified=[],g=read(file('components.json')).geometry;
 for(const c of cards){
  const p=read(work(c,'profile.json'));assert.deepEqual(p,read(old(c,'profile.json')));assert.equal(await hash(work(c,'illustration.png')),await hash(old(c,'illustration.png')));
  const proof=await B.verifyNative(work(c),p),bannerOnly=await L.diff(old(c,'card.png'),work(c,'card.png'),[[g.left,g.top,g.left+g.width,g.top+g.height]]);
  assert(bannerOnly.changed>0);assert.equal(bannerOnly.outside,0,'Only banner pixels may change');
  const n=read(work(c,'render/native.json')),prior=read(old(c,'render/native.json'));
  assert.deepEqual(n.layers.filter(l=>l.kind==='LayerKind.TEXT'),prior.layers.filter(l=>l.kind==='LayerKind.TEXT'));
  require('../../expansions/2026-10-06-fifteen-faces/accent-typography.cjs').verify(n);
  write(work(c,'verification.json'),{...proof,revision:REV,bannerOnly,gameplayUnchanged:true,inputManifestHash:await hash(file('before.json'))});
  await sharp(work(c,'card.png')).resize({width:300}).png().toFile(work(c,'small.png'));
  reports.push({id:c.id,key:c.key,bannerOnly,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  verified.push(...names.filter(n=>n!=='creation.json').map(n=>work(c,n)),work(c,'render/native.json'),work(c,'render/reopened.png'));
  console.log('VERIFIED '+c.id);
 }
 write(file('verified.json'),await hashes(verified));write(file('verification.json'),{passed:true,cards:reports});return reports;
});}
async function publish(){return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(catalogue),next=structuredClone(before),changes=[];
 for(const c of cards){
  const entry=next.cards.find(v=>v.id===c.id),meta=read(old(c,'creation.json'));
  entry.nativeRevision={id:REV,key:c.key,proof:rel(work(c,'verification.json')),changedFields:['factionBanner'],previous:null};meta.nativeRevision=entry.nativeRevision;
  for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(c,n));write(work(c,'creation.json'),meta);
  for(const n of names)changes.push({stage:work(c,n),target:prod(c,n),backup:old(c,n),beforeHash:frozen.observed[rel(prod(c,n))],afterHash:await hash(work(c,n))});
 }
 for(const c of before.cards)if(!cards.some(n=>n.id===c.id))assert.deepEqual(next.cards.find(n=>n.id===c.id),c);
 fs.copyFileSync(catalogue,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),next);
 changes.push({stage:file('publication-catalogue.json'),target:catalogue,backup:file('catalogue-before-publication.json'),beforeHash:await hash(catalogue),afterHash:await hash(file('publication-catalogue.json'))});
 const result=await require('../2026-09-23-nier-art-refinement/transaction.cjs').transactionIO(L,file('transaction.json')).commit({changes});
 const target=path.join(ROOT,require('./assets.cjs').WEB);assert(!fs.existsSync(target));fs.copyFileSync(file('flag.png'),target,fs.constants.COPYFILE_EXCL);
 await stable();await match(frozen.inputs);await match(frozen.backups);
 write(file('published.json'),{revision:REV,cards:cards.map(c=>c.id),gameplayUnchanged:true,web:rel(target)});return result;
});}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
