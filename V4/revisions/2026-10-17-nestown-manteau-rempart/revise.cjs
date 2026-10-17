'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,home=__dirname,REV=path.basename(home);
const proposal=path.join(ROOT,'V4/propositions',REV),catalogue=path.join(ROOT,'V4/donnees/catalogue.json');
const sources={vessa:'V4/revisions/2026-10-04-kalistel-armor/cards/vessa',karrok:'V4/expansions/2026-10-04-city-guards/cards/karrok',neryk:'V4/revisions/2026-10-04-armor-refinement/cards/neryk',khariel:'V4/revisions/2026-10-13-voices-weapon-glyphs/cards/khariel'};
const cards=read(path.join(proposal,'selection.json')).cards.map(c=>({...c,id:c.modelId}));
const file=n=>path.join(home,n),work=(c,n='')=>file('cards/'+c.key+'/'+n),old=(c,n='')=>file('originals/'+c.key+'/'+n),prod=(c,n)=>path.join(ROOT,'V4/creations',c.id,n);
const names=['card.psd','card.png','profile.json','illustration.png','verification.json','creation.json'],rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(files){for(const [f,h]of Object.entries(files))assert.equal(await hash(path.join(ROOT,f)),h,'Changed input '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
const rules=p=>Object.fromEntries(Object.entries(p).filter(([k])=>!['artworkSource','visual_revision'].includes(k)));
async function guard(){await stable();const b=read(file('before.json'));await match(b.inputs);await match(b.backups);await match(b.observed);for(const c of b.cards)assert.deepEqual(read(catalogue).cards.find(v=>v.id===c.id),c.entry);return b;}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Preserve the frozen revision');await stable();
 const cat=read(catalogue),inputs=['revise.cjs','replace.jsx','render.ps1'].map(file),backups=[],observed=[],entries=[];
 for(const c of cards){
  const entry=cat.cards.find(v=>v.id===c.id),from=path.join(ROOT,sources[c.key]);assert(entry&&entry.profile.characterId===c.characterId);
  assert.equal(await hash(prod(c,'card.png')),c.original.cardSha256);assert.equal(await hash(prod(c,'card.psd')),c.original.psdSha256);
  assert.equal(await hash(path.join(from,'card.png')),c.original.cardSha256,'Composition donor must be active revision');
  assert.equal(await hash(path.join(proposal,c.file)),c.sha256,'Approved illustration');
  fs.mkdirSync(old(c,'render'),{recursive:true});fs.mkdirSync(work(c,'render'),{recursive:true});
  for(const n of names){fs.copyFileSync(prod(c,n),old(c,n),fs.constants.COPYFILE_EXCL);backups.push(old(c,n));observed.push(prod(c,n));}
  for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(from,'render',n),old(c,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old(c,'render/'+n));}
  const p={...entry.profile,artworkSource:rel(work(c,'illustration.png')),visual_revision:'V4-'+REV};assert.deepEqual(rules(p),rules(entry.profile));
  write(work(c,'profile.json'),p);fs.copyFileSync(path.join(proposal,c.file),work(c,'illustration.png'),fs.constants.COPYFILE_EXCL);
  const plan=read(path.join(from,'render/composition.json')),layers=[];
  for(const l of plan.layers){
   const input=l.name.startsWith('ILLUSTRATION - ')?await sharp(work(c,'illustration.png')).resize(l.width,l.height,{fit:'cover',position:'centre'}).png().toBuffer():fs.readFileSync(path.join(from,'render',l.file));
   fs.writeFileSync(work(c,'render/'+l.file),input);layers.push({...l,input});
  }
  write(work(c,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(work(c,'render/expected-components.png'));
  inputs.push(path.join(proposal,c.file),work(c,'profile.json'),work(c,'illustration.png'),...fs.readdirSync(work(c,'render')).map(n=>work(c,'render/'+n)));
  entries.push({id:c.id,key:c.key,entry,approvedArtHash:c.sha256});
 }
 write(file('before.json'),{cards:entries,catalogue:cat,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(observed)});
 return {prepared:cards.length};
});}
async function render(){return B.locked(async()=>{
 await guard();for(const c of cards)assert(!fs.existsSync(work(c,'card.psd')));
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
 await guard();return result;
});}
async function verify(){return B.locked(async()=>{
 await guard();const reports=[],verified=[];
 for(const c of cards){
  const p=read(work(c,'profile.json'));assert.deepEqual(rules(p),rules(read(old(c,'profile.json'))));
  assert.equal(await hash(work(c,'illustration.png')),c.sha256);
  const proof=await B.verifyNative(work(c),p),artOnly=await L.diff(old(c,'card.png'),work(c,'card.png'),[[80,156,817,1077]]);
  assert(artOnly.changed>0);assert.equal(artOnly.outside,0,'Only illustration pixels may change');
  const n=read(work(c,'render/native.json')),prior=read(old(c,'render/native.json'));
  assert.deepEqual(n.layers.filter(l=>l.kind==='LayerKind.TEXT'),prior.layers.filter(l=>l.kind==='LayerKind.TEXT'));
  require('../../expansions/2026-10-06-fifteen-faces/accent-typography.cjs').verify(n);
  write(work(c,'verification.json'),{...proof,revision:REV,artOnly,gameplayUnchanged:true,inputManifestHash:await hash(file('before.json'))});
  await sharp(work(c,'card.png')).resize({width:300}).png().toFile(work(c,'small.png'));
  reports.push({id:c.id,key:c.key,artOnly,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  verified.push(...names.filter(n=>n!=='creation.json').map(n=>work(c,n)),work(c,'render/native.json'),work(c,'render/reopened.png'));
  console.log('VERIFIED '+c.name);
 }
 write(file('verified.json'),await hashes(verified));write(file('verification.json'),{passed:true,cards:reports});return reports;
});}
async function publish(){return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(catalogue),next=structuredClone(before),changes=[];
 for(const c of cards){
  const entry=next.cards.find(v=>v.id===c.id),meta=read(old(c,'creation.json'));
  entry.profile=read(work(c,'profile.json'));
  entry.nativeRevision={id:REV,key:c.key,proof:rel(work(c,'verification.json')),changedFields:['artwork'],previous:entry.nativeRevision||null};meta.nativeRevision=entry.nativeRevision;
  for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(c,n));write(work(c,'creation.json'),meta);
  for(const n of names)changes.push({stage:work(c,n),target:prod(c,n),backup:old(c,n),beforeHash:frozen.observed[rel(prod(c,n))],afterHash:await hash(work(c,n))});
 }
 for(const c of before.cards)if(!cards.some(n=>n.id===c.id))assert.deepEqual(next.cards.find(n=>n.id===c.id),c);
 fs.copyFileSync(catalogue,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),next);
 changes.push({stage:file('publication-catalogue.json'),target:catalogue,backup:file('catalogue-before-publication.json'),beforeHash:await hash(catalogue),afterHash:await hash(file('publication-catalogue.json'))});
 const result=await require('../2026-09-23-nier-art-refinement/transaction.cjs').transactionIO(L,file('transaction.json')).commit({changes});
 await stable();await match(frozen.inputs);await match(frozen.backups);
 write(file('published.json'),{revision:REV,cards:cards.map(c=>c.id),gameplayUnchanged:true});return result;
});}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
