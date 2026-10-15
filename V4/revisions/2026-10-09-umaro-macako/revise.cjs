'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,plan=require('./plan.json');
const home=__dirname,file=n=>path.join(home,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/'),id=plan.cards[0].id;
const work=n=>file('work/'+id+'/'+n),old=n=>file('originals/'+id+'/'+n),prod=n=>path.join(ROOT,'V4/creations',id,n),cat=path.join(ROOT,'V4/donnees/catalogue.json');
const names=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function prepare(){
 assert(!fs.existsSync(file('before.json')),'Preserve frozen revision');await stable();
 const entry=read(cat).cards.find(c=>c.id===id),meta=read(prod('creation.json'));
 assert.equal(entry.profile.race,'YETI');assert(!entry.nativeRevision);
 const original=path.join(ROOT,entry.publicationSource,'cards',meta.key),inputs=['plan.json','revise.cjs','compose.jsx','render.ps1'].map(file),backups=[];
 const source=path.join(ROOT,plan.source),race=read(path.join(ROOT,'V4/atelier/designer-assets/race-extensions.json')).races.MACAKO;
 assert.equal(await hash(source),race.sha256);inputs.push(source);
 fs.mkdirSync(work('render'),{recursive:true});fs.mkdirSync(old('render'),{recursive:true});
 for(const n of names){fs.copyFileSync(prod(n),old(n),fs.constants.COPYFILE_EXCL);backups.push(old(n));}
 for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(original,'render',n),old('render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old('render/'+n));}
 const profile={...entry.profile,race:'MACAKO'};write(work('profile.json'),profile);fs.copyFileSync(prod('illustration.png'),work('illustration.png'),fs.constants.COPYFILE_EXCL);
 const composition=read(path.join(original,'render/composition.json')),layers=[];let count=0;
 for(const layer of composition.layers){
  const changing=layer.name==='RACE - YETI',input=changing?source:path.join(original,'render',layer.file);
  if(changing){count++;layer.name='RACE - MACAKO';for(const k of ['left','top','width','height'])assert.equal(layer[k],race[k]);}
  fs.copyFileSync(input,work('render/'+layer.file),fs.constants.COPYFILE_EXCL);inputs.push(work('render/'+layer.file));layers.push({...layer,input:work('render/'+layer.file)});
 }
 assert.equal(count,1);write(work('render/composition.json'),composition);
 await sharp(await R.composite(layers)).png().toFile(work('render/expected-components.png'));
 inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(work));
 write(file('before.json'),{entry,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(names.map(prod))});return {id,from:'YETI',to:'MACAKO'};
}
async function guard(){await stable();const before=read(file('before.json'));for(const k of ['inputs','backups','observed'])await match(before[k]);assert.deepEqual(read(cat).cards.find(c=>c.id===id),before.entry);return before;}
async function render(){
 assert.equal(process.env.KALISTAR_UMARO_PS,'2026-10-09');return B.locked(async()=>{
  await guard();assert(!fs.existsSync(work('card.psd')));
  const output=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
  await guard();return output;
 });
}
async function verify(){
 await guard();const profile=read(work('profile.json')),before=read(old('profile.json'));assert.deepEqual({...profile,race:before.race},before);assert.equal(profile.race,'MACAKO');
 assert.equal(await hash(work('illustration.png')),await hash(old('illustration.png')));
 const proof=await B.verifyNative(work(''),profile),scope=await L.diff(old('card.png'),work('card.png'),[[711,1116,807,1211],[514,1158,684,1188]]);
 assert(scope.changed>0);assert.equal(scope.outside,0,'Only the race portrait and printed race label may change');
 const native=read(work('render/native.json'));assert.equal(native.layers.find(l=>l.name==='RACE').text,'MACAKO');
 const v={...proof,revision:plan.revision,scope,raceChange:{from:'YETI',to:'MACAKO'},statsUnchanged:true,previousProofHash:await hash(old('verification.json')),inputManifestHash:await hash(file('before.json'))};
 write(work('verification.json'),v);await sharp(work('card.png')).resize({width:300}).png().toFile(work('small.png'));
 write(file('verified.json'),await hashes(names.filter(n=>n!=='creation.json').map(work).concat(work('render/native.json'),work('render/reopened.png'))));
 return {id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,scope};
}
async function publish(){
 assert.equal(process.env.KALISTAR_UMARO_PUBLISH,'2026-10-09');return B.locked(async()=>{
  const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
  const before=read(cat),catalogue=structuredClone(before),entry=catalogue.cards.find(c=>c.id===id),meta=read(old('creation.json'));
  entry.profile=read(work('profile.json'));entry.nativeRevision={id:plan.revision,key:meta.key,proof:rel(work('verification.json')),changedFields:['race','raceIllustration'],previous:null};
  meta.nativeRevision=entry.nativeRevision;for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(n));write(work('creation.json'),meta);
  fs.copyFileSync(cat,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),catalogue);
  before.cards.forEach((c,i)=>{if(c.id!==id)assert.deepEqual(c,catalogue.cards[i]);});
  const writes=names.map(n=>({stage:work(n),target:prod(n),backup:old(n),before:frozen.observed[rel(prod(n))]}));
  writes.push({stage:file('publication-catalogue.json'),target:cat,backup:file('catalogue-before-publication.json'),before:await hash(file('catalogue-before-publication.json'))});
  for(const w of writes)w.after=await hash(w.stage);const done=[];write(file('transaction.json'),{state:'publishing',writes});
  try{
   for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
   await stable();await match(frozen.inputs);await match(frozen.backups);write(file('published.json'),{revision:plan.revision,id,race:'MACAKO',statsUnchanged:true});write(file('transaction.json'),{state:'published',writes});return {published:id,race:'MACAKO'};
  }catch(error){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(error)});throw error;}
 });
}
module.exports={prepare,guard,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1});
