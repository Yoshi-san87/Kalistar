'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),B=require('../../collaborations/nier-pilot-01/build.cjs');
const W=require('../../scripts/stable/white-weapon-component.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,home=__dirname,REV=path.basename(home);
const cards=require('../../expansions/2026-10-13-fourteen-new-voices/set.json').cards;
const source=path.join(ROOT,'V4/expansions/2026-10-13-fourteen-new-voices'),catalogue=path.join(ROOT,'V4/donnees/catalogue.json');
const file=n=>path.join(home,n),work=(c,n='')=>file('cards/'+c.key+'/'+n),old=(c,n='')=>file('originals/'+c.key+'/'+n),prod=(c,n)=>path.join(ROOT,'V4/creations',c.id,n);
const names=['card.psd','card.png','profile.json','illustration.png','verification.json','creation.json'],rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(files){for(const [f,h]of Object.entries(files))assert.equal(await hash(path.join(ROOT,f)),h,'Changed input '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
function copyOnce(a,b){if(fs.existsSync(b))assert(fs.readFileSync(a).equals(fs.readFileSync(b)),'Existing copy changed '+b);else fs.copyFileSync(a,b,fs.constants.COPYFILE_EXCL);}
async function guard(){await stable();const b=read(file('before.json'));await match(b.inputs);await match(b.backups);await match(b.observed);for(const c of b.cards)assert.deepEqual(read(catalogue).cards.find(v=>v.id===c.id),c.entry);return b;}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Preserve the frozen revision');await stable();
 const cat=read(catalogue),inputs=['revise.cjs','replace.jsx','render.ps1'].map(file).concat(path.join(ROOT,'V4/scripts/stable/white-weapon-component.cjs'),path.join(ROOT,'V4/site/base-weapons.js'));
 const backups=[],observed=[],entries=[],glyphs=[];
 for(const c of cards){
  const entry=cat.cards.find(v=>v.id===c.id);assert(entry);assert(!entry.nativeRevision,'Unexpected earlier native revision');
  fs.mkdirSync(old(c,'render'),{recursive:true});fs.mkdirSync(work(c,'render'),{recursive:true});
  for(const n of names){copyOnce(prod(c,n),old(c,n));backups.push(old(c,n));observed.push(prod(c,n));}
  const from=path.join(source,'cards',c.key),plan=read(path.join(from,'render/composition.json'));
  copyOnce(path.join(from,'render/native.json'),old(c,'render/native.json'));backups.push(old(c,'render/native.json'));
  for(const n of ['profile.json','illustration.png'])copyOnce(prod(c,n),work(c,n));
  const layers=[];
  for(const l of plan.layers){
   const input=fs.readFileSync(path.join(from,'render',l.file));let next=input;
   if(l.name.startsWith('ARME - ')){
    const glyph=await W.component(c.weapon,input,l);next=glyph.input;
    glyphs.push({id:c.id,key:c.key,family:c.weapon,...Object.fromEntries(Object.entries(glyph).filter(([k])=>k!=='input'))});inputs.push(path.join(ROOT,glyph.source));
   }
   fs.writeFileSync(work(c,'render/'+l.file),next);layers.push({...l,input:next});
  }
  write(work(c,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(work(c,'render/expected-components.png'));
  inputs.push(work(c,'profile.json'),work(c,'illustration.png'),...fs.readdirSync(work(c,'render')).map(n=>work(c,'render/'+n)));
  entries.push({id:c.id,key:c.key,entry});
 }
 inputs.push(path.join(ROOT,'V4/site/assets/base-weapons/enamel.png'));
 write(file('before.json'),{cards:entries,catalogue:cat,glyphs,inputs:await hashes([...new Set(inputs)]),backups:await hashes(backups),observed:await hashes(observed)});
 return {prepared:cards.length,glyphs};
});}
async function render(){return B.locked(async()=>{
 await guard();for(const c of cards)assert(!fs.existsSync(work(c,'card.psd')));
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
 await guard();return result;
});}
async function verify(){return B.locked(async()=>{
 await guard();const reports=[],verified=[];
 for(const c of cards){
  const p=read(work(c,'profile.json'));assert.deepEqual(p,read(old(c,'profile.json')));
  assert.equal(await hash(work(c,'illustration.png')),await hash(old(c,'illustration.png')));
  const proof=await B.verifyNative(work(c),p),scope=await L.diff(old(c,'card.png'),work(c,'card.png'),[[89,1115,185,1212]]);
  assert(scope.changed>0);assert.equal(scope.outside,0,'Only the weapon enamel may change');
  const n=read(work(c,'render/native.json')),prior=read(old(c,'render/native.json'));
  assert.deepEqual(n.layers.filter(l=>l.kind==='LayerKind.TEXT'),prior.layers.filter(l=>l.kind==='LayerKind.TEXT'));
  require('../../expansions/2026-10-06-fifteen-faces/accent-typography.cjs').verify(n);
  const before=await L.diff(old(c,'card.png'),work(c,'card.png'));assert.equal(before.changed,scope.changed);
  const v={...proof,revision:REV,scope,weaponOnly:true,profileUnchanged:true,source:read(file('before.json')).glyphs.find(g=>g.id===c.id),inputManifestHash:await hash(file('before.json'))};
  write(work(c,'verification.json'),v);await sharp(work(c,'card.png')).resize({width:300}).png().toFile(work(c,'small.png'));
  reports.push({id:c.id,key:c.key,family:c.weapon,scope,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  verified.push(...names.filter(n=>n!=='creation.json').map(n=>work(c,n)),work(c,'render/native.json'),work(c,'render/reopened.png'));console.log('VERIFIED '+c.name);
 }
 const layers=[];for(const [i,c]of cards.entries()){
  const crop={left:75,top:1102,width:124,height:124};
  layers.push({input:await sharp(old(c,'card.png')).extract(crop).resize(186,186).png().toBuffer(),left:i%4*400+12,top:Math.floor(i/4)*202+8});
  layers.push({input:await sharp(work(c,'card.png')).extract(crop).resize(186,186).png().toBuffer(),left:i%4*400+204,top:Math.floor(i/4)*202+8});
 }
 await sharp({create:{width:1600,height:808,channels:4,background:'#101918'}}).composite(layers).png().toFile(file('comparison.png'));
 write(file('verified.json'),await hashes(verified));write(file('verification.json'),{passed:true,cards:reports});return reports;
});}
async function publish(){return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(catalogue),next=structuredClone(before),writes=[];
 for(const c of cards){
  const entry=next.cards.find(v=>v.id===c.id),meta=read(old(c,'creation.json'));
  entry.nativeRevision={id:REV,key:c.key,proof:rel(work(c,'verification.json')),changedFields:['weaponGlyph'],previous:entry.nativeRevision||null};meta.nativeRevision=entry.nativeRevision;
  for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(work(c,n));write(work(c,'creation.json'),meta);
  for(const n of names)writes.push({stage:work(c,n),target:prod(c,n),backup:old(c,n),before:frozen.observed[rel(prod(c,n))]});
 }
 for(const c of before.cards)if(!cards.some(n=>n.id===c.id))assert.deepEqual(next.cards.find(n=>n.id===c.id),c);
 fs.copyFileSync(catalogue,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),next);
 writes.push({stage:file('publication-catalogue.json'),target:catalogue,backup:file('catalogue-before-publication.json'),before:await hash(catalogue)});
 for(const w of writes)w.after=await hash(w.stage);const done=[];write(file('transaction.json'),{state:'publishing',writes});
 try{
  for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
  await stable();await match(frozen.inputs);await match(frozen.backups);
  write(file('published.json'),{revision:REV,cards:cards.map(c=>c.id),profilesUnchanged:true});write(file('transaction.json'),{state:'published',writes});return {published:cards.length};
 }catch(e){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(e)});throw e;}
});}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
