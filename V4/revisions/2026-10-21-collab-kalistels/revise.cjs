'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,plan=require('./plan.json');
const home=__dirname,file=n=>path.join(home,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const card=(c,n='')=>file('cards/'+c.key+'/'+n),old=(c,n='')=>file('originals/'+c.id+'/'+n);
const prod=(c,n='')=>path.join(ROOT,'V4/creations',c.id,n),cat=path.join(ROOT,'V4/donnees/catalogue.json');
const names=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
const selected=keys=>{const found=plan.cards.filter(c=>!keys||keys.split(',').includes(c.key));assert(found.length);return found;};
async function hashes(files){const out={};for(const f of new Set(files))out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen source changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
function reviseProfile(p,s){
 assert.equal(p.characterId,s.characterId);assert.equal(p.element,'NONE');
 const {color,hue}=read(path.join(ROOT,'V3/donnees/elements.json'))[s.element];
 return {...p,element:s.element,color,hue};
}
async function game(catalogue=read(cat)){
 return require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Preserve the frozen revision');await stable();
 const catalogue=read(cat),bank=read(path.join(R.ASSETS,'manifest.json')),inputs=['plan.json','revise.cjs','compose.jsx','render.ps1'].map(file),backups=[],observed=[],scopes={};
 const exception=catalogue.cards.find(c=>c.id===plan.exception.id);assert.equal(exception.profile.element,'NONE');
 for(const s of plan.cards){
  const entry=catalogue.cards.find(c=>c.id===s.id),meta=read(prod(s,'creation.json'));
  assert.deepEqual(read(prod(s,'profile.json')),entry.profile);
  const previous=path.dirname(path.join(ROOT,entry.nativeRevision?.proof||entry.publicationSource+'/cards/'+meta.key+'/verification.json'));
  fs.mkdirSync(old(s,'render'),{recursive:true});fs.mkdirSync(card(s,'render'),{recursive:true});
  for(const n of names){fs.copyFileSync(prod(s,n),old(s,n),fs.constants.COPYFILE_EXCL);observed.push(prod(s,n));backups.push(old(s,n));}
  for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(previous,'render',n),old(s,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old(s,'render/'+n));}
  const p=reviseProfile(entry.profile,s),composition=read(old(s,'render/composition.json')),layers=[],scope=[];
  for(const l of composition.layers){
   let replacement=null,name=l.name;const atk=/^ATK D([1-6]) - fond physique$/.exec(name);
   if(atk)replacement=bank.stats.atk[p.element][atk[1]].physical;
   else if(name.startsWith('BRANCHES NONE')){replacement=bank.elements[p.element].branch;name=name.replace('NONE',p.element);}
   else if(name==='CRISTAL NONE'){replacement=bank.elements[p.element].crystal;name='CRISTAL '+p.element;}
   const g=replacement||l,input=replacement?path.join(R.ASSETS,replacement.file):path.join(previous,'render',l.file);
   fs.copyFileSync(input,card(s,'render/'+l.file),fs.constants.COPYFILE_EXCL);
   const item={file:l.file,name,left:g.left,top:g.top,width:g.width,height:g.height,...(replacement?{replaces:l.name}:{})};
   layers.push({...item,input:card(s,'render/'+l.file)});
   if(replacement)for(const b of [l,replacement])scope.push([b.left,b.top,b.left+b.width,b.top+b.height]);
  }
  assert.equal(layers.filter(l=>l.replaces).length,8);scope.push([207,1154,378,1190],[514,1154,684,1190]);scopes[s.id]=scope;
  write(card(s,'profile.json'),p);fs.copyFileSync(prod(s,'illustration.png'),card(s,'illustration.png'),fs.constants.COPYFILE_EXCL);
  write(card(s,'render/composition.json'),{...composition,layers:layers.map(({input,...rest})=>rest)});
  await sharp(await R.composite(layers)).png().toFile(card(s,'render/expected-components.png'));
  inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(s,n)),...layers.map(l=>l.input));
  console.log('Prepared '+s.key+' '+p.element);
 }
 const hypothetical=structuredClone(catalogue);for(const s of plan.cards){const e=hypothetical.cards.find(c=>c.id===s.id);e.profile=read(card(s,'profile.json'));e.element=e.profile.element;}
 await game(hypothetical);
 inputs.push(...['V4/scripts/stable/elements-common.jsx','V4/scripts/stable/common.jsx','V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/atelier/designer-assets/manifest.json'].map(p=>path.join(ROOT,p)));
 write(file('before.json'),{entries:catalogue.cards.filter(c=>plan.cards.some(s=>s.id===c.id)),otherEntries:catalogue.cards.filter(c=>!plan.cards.some(s=>s.id===c.id)),scopes,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(observed),exceptionFiles:await hashes(names.map(n=>prod(plan.exception,n)))});
 return {prepared:plan.cards.length};
});}
async function guard(){
 await stable();const b=read(file('before.json'));for(const k of ['inputs','backups','observed','exceptionFiles'])await match(b[k]);
 const now=read(cat);for(const e of b.entries)assert.deepEqual(now.cards.find(c=>c.id===e.id),e);
 assert.deepEqual(now.cards.filter(c=>!plan.cards.some(s=>s.id===c.id)),b.otherEntries);return b;
}
async function render(keys){assert.equal(process.env.KALISTAR_COLLAB_CRYSTALS_PS,'2026-10-21');return B.locked(async()=>{
 await guard();const cards=selected(keys);for(const s of cards)assert(!fs.existsSync(card(s,'card.psd')));
 const scratch=path.join(ROOT,'work/collab-kalistels');write(path.join(scratch,'render-request.json'),{keys:cards.map(s=>s.key)});
 const out=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],path.join(scratch,'photoshop-'+cards[0].key+'.log'));await guard();return out;
});}
async function verify(keys){return B.locked(async()=>{
 const b=await guard(),results=[];
 for(const s of selected(keys)){
  const p=read(card(s,'profile.json')),prior=read(old(s,'profile.json'));assert.deepEqual(p,reviseProfile(prior,s));
  assert.equal(await hash(card(s,'illustration.png')),await hash(old(s,'illustration.png')));
  const proof=await B.verifyNative(card(s),p),scope=await L.diff(old(s,'card.png'),card(s,'card.png'),b.scopes[s.id]);assert(scope.changed>0);assert.equal(scope.outside,0,'Only element regions may change');
  const native=read(card(s,'render/native.json')),oldNative=read(old(s,'render/native.json'));
  for(const l of oldNative.layers.filter(l=>l.kind==='LayerKind.TEXT')){
   const next=native.layers.find(n=>n.name===l.name);assert.equal(next.text,l.text);assert.deepEqual(next.ink,l.ink,'Text geometry preserved: '+l.name);
  }
  write(card(s,'verification.json'),{...proof,revision:plan.id,elementChange:{from:'NONE',to:p.element},scope:{...scope,rectangles:b.scopes[s.id]},numericFacesAndEffectsUnchanged:true,inputManifestHash:await hash(file('before.json'))});
  await sharp(card(s,'card.png')).resize({width:300}).png().toFile(card(s,'small.png'));
  results.push({id:p.id,name:p.name,element:p.element,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,outside:scope.outside});console.log('Verified '+s.key);
 }
 if(!keys){write(file('native-summary.json'),results);write(file('verified.json'),await hashes(plan.cards.flatMap(s=>names.filter(n=>n!=='creation.json').map(n=>card(s,n)))));}
 return results;
});}
async function publish(){assert.equal(process.env.KALISTAR_COLLAB_CRYSTALS_PUBLISH,'2026-10-21');return B.locked(async()=>{
 const b=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(cat),catalogue=structuredClone(before),writes=[];
 for(const s of plan.cards){
  const entry=catalogue.cards.find(c=>c.id===s.id),meta=read(old(s,'creation.json'));
  entry.profile=read(card(s,'profile.json'));entry.element=entry.profile.element;
  entry.nativeRevision={id:plan.id,key:s.key,proof:rel(card(s,'verification.json')),changedFields:plan.changedFields,previous:entry.nativeRevision||null};
  meta.nativeRevision=entry.nativeRevision;for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(card(s,n));write(card(s,'creation.json'),meta);
  for(const n of names)writes.push({stage:card(s,n),target:prod(s,n),backup:old(s,n),before:b.observed[rel(prod(s,n))]});
 }
 assert.deepEqual(catalogue.cards.filter(c=>!plan.cards.some(s=>s.id===c.id)),b.otherEntries);
 const data=await game(catalogue);assert.equal(data.cards.filter(c=>require('../../site/collaborations.js').of(c)&&c.element==='NONE').length,1);
 const scratch=path.join(ROOT,'work/collab-kalistels/publication');fs.mkdirSync(scratch,{recursive:true});
 fs.copyFileSync(cat,path.join(scratch,'catalogue.before.json'),fs.constants.COPYFILE_EXCL);write(path.join(scratch,'catalogue.next.json'),catalogue);
 writes.push({stage:path.join(scratch,'catalogue.next.json'),target:cat,backup:path.join(scratch,'catalogue.before.json'),before:await hash(cat)});
 for(const w of writes)w.after=await hash(w.stage);await guard();const done=[];write(path.join(scratch,'transaction.json'),{state:'publishing',writes});
 try{
  for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
  await stable();await match(b.inputs);await match(b.backups);await match(b.exceptionFiles);
  write(file('published.json'),{revision:plan.id,revised:plan.cards.map(s=>s.id),exception:plan.exception,cards:data.cards.length});write(path.join(scratch,'transaction.json'),{state:'published',writes});return {revised:plan.cards.length,cards:data.cards.length};
 }catch(error){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(path.join(scratch,'transaction.json'),{state:'rolled-back',error:String(error)});throw error;}
});}
module.exports={prepare,render,verify,publish,reviseProfile,game,guard};
if(require.main===module)module.exports[process.argv[2]](process.argv[3]).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
