'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),A=require('./assets.cjs'),M=require('./model.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,{set}=M,home=__dirname;
const file=n=>path.join(home,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const card=(key,n='')=>file('cards/'+key+'/'+n),prod=(id,n='')=>path.join(ROOT,'V4/creations',id,n),old=(id,n='')=>file('originals/'+id+'/'+n);
const names=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
const cat=path.join(ROOT,'V4/donnees/catalogue.json');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
async function components(key,p,layers){
 const out=card(key,'render');fs.mkdirSync(out,{recursive:true});
 const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
 for(const [i,l]of layers.entries()){
  const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(out,f));
  plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
 }
 write(card(key,'profile.json'),p);write(path.join(out,'composition.json'),plan);
 await sharp(await R.composite(layers)).png().toFile(path.join(out,'expected-components.png'));
}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();M.validateSet();
 const catalogue=read(cat),scopes={},observed=[],backups=[];
 for(const spec of set.cards){
  assert(!catalogue.cards.some(c=>c.id===spec.id));assert(!fs.existsSync(prod(spec.id)));
  const p=M.profile(spec);let layers=await A.replace(await R.components(M.donor(p),{id:p.id,positionsText:false}),p);
  layers[0]={...layers[0],input:await sharp(path.join(ROOT,p.artworkSource)).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
  await components(spec.key,p,layers);fs.copyFileSync(path.join(ROOT,p.artworkSource),card(spec.key,'illustration.png'));
 }
 const bank=read(path.join(R.ASSETS,'manifest.json')),elements=read(path.join(ROOT,'V3/donnees/elements.json'));
 for(const spec of set.revisions){
  const entry=catalogue.cards.find(c=>c.id===spec.id);assert.equal(entry.profile.element,'NONE');
  const previous=path.dirname(path.join(ROOT,entry.nativeRevision?.proof||entry.publicationSource+'/cards/'+spec.key+'/verification.json'));
  const composition=read(path.join(previous,'render/composition.json'));fs.mkdirSync(old(spec.id,'render'),{recursive:true});
  for(const n of names){fs.copyFileSync(prod(spec.id,n),old(spec.id,n),fs.constants.COPYFILE_EXCL);observed.push(prod(spec.id,n));backups.push(old(spec.id,n));}
  for(const n of ['native.json','composition.json']){fs.copyFileSync(path.join(previous,'render',n),old(spec.id,'render/'+n),fs.constants.COPYFILE_EXCL);backups.push(old(spec.id,'render/'+n));}
  const {color,hue}=elements[spec.element],p={...entry.profile,element:spec.element,color,hue,sentry:true},layers=[],scope=[];
  M.validate(p);
  for(const l of composition.layers){
   let replacement=null,name=l.name;const atk=/^ATK D([1-6]) - fond physique$/.exec(name);
   if(atk)replacement=bank.stats.atk[p.element][atk[1]].physical;
   else if(name.startsWith('BRANCHES NONE')){replacement=bank.elements[p.element].branch;name=name.replace('NONE',p.element);}
   else if(name==='CRISTAL NONE'){replacement=bank.elements[p.element].crystal;name='CRISTAL '+p.element;}
   const g=replacement||l,input=replacement?path.join(R.ASSETS,replacement.file):path.join(previous,'render',l.file);
   layers.push({name,input,left:g.left,top:g.top,width:g.width,height:g.height});
   if(replacement)for(const box of [l,replacement])scope.push([box.left,box.top,box.left+box.width,box.top+box.height]);
  }
  scope.push([207,1154,378,1190],[514,1154,684,1190]);scopes[spec.id]=scope;
  await components(spec.key,p,layers);fs.copyFileSync(prod(spec.id,'illustration.png'),card(spec.key,'illustration.png'));
 }
 const inputs=['set.json','model.cjs','assets.cjs','build.cjs','compose.jsx','render.ps1','art/xmen-banner-approved.png','components/components.json','components/flag-XMEN.png','components/flag-XMEN-packed.png'].map(file);
 inputs.push(...set.cards.map(c=>path.join(ROOT,c.artworkSource)));
 for(const spec of M.all()){
  inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(spec.key,n)));
  inputs.push(...read(card(spec.key,'render/composition.json')).layers.map(l=>card(spec.key,'render/'+l.file)));
 }
 write(file('before.json'),{catalogue,scopes,inputs:await hashes(inputs),backups:await hashes(backups),observed:await hashes(observed)});
 return {prepared:M.all().map(c=>c.id)};
});}
async function guard(){await stable();const b=read(file('before.json'));for(const k of ['inputs','backups','observed'])await match(b[k]);for(const s of set.revisions)assert.deepEqual(read(cat).cards.find(c=>c.id===s.id),b.catalogue.cards.find(c=>c.id===s.id));return b;}
async function render(){assert.equal(process.env.KALISTAR_CROSSOVER_PS,'2026-10-09');return B.locked(async()=>{
 await guard();const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));await guard();return result;
});}
async function verify(){return B.locked(async()=>{
 const before=await guard(),results=[];
 for(const spec of M.all()){
  const p=read(card(spec.key,'profile.json'));M.validate(p);
  const proof=await B.verifyNative(card(spec.key),p),native=read(card(spec.key,'render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  if(set.revisions.includes(spec)){
   const prior=read(old(p.id,'profile.json')),restored={...p};for(const f of set.changedFields)restored[f]=prior[f];assert.deepEqual(restored,prior);
   assert.equal(await hash(card(spec.key,'illustration.png')),await hash(old(p.id,'illustration.png')));
   proof.scope={...await L.diff(old(p.id,'card.png'),card(spec.key,'card.png'),before.scopes[p.id]),rectangles:before.scopes[p.id]};assert.equal(proof.scope.outside,0);assert(proof.scope.changed>0);
   proof.elementChange={from:'NONE',to:p.element};proof.numericFacesAndEffectsUnchanged=true;
  }
  write(card(spec.key,'verification.json'),{...proof,typographyCheck,revision:set.id,inputManifestHash:await hash(file('before.json'))});
  await sharp(card(spec.key,'card.png')).resize({width:300}).png().toFile(card(spec.key,'small.png'));
  results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,outside:proof.scope?.outside});
 }
 write(file('verified.json'),await hashes(M.all().flatMap(c=>names.filter(n=>n!=='creation.json').map(n=>card(c.key,n)))));return results;
});}
async function publish(){assert.equal(process.env.KALISTAR_CROSSOVER_PUBLISH,'2026-10-09');return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(cat),catalogue=structuredClone(before),writes=[],additions=[];
 for(const spec of set.revisions){
  const p=read(card(spec.key,'profile.json')),entry=catalogue.cards.find(c=>c.id===p.id),meta=read(old(p.id,'creation.json'));
  entry.profile=p;entry.element=p.element;entry.nativeRevision={id:set.id,key:spec.key,proof:rel(card(spec.key,'verification.json')),changedFields:set.changedFields,...(entry.nativeRevision?{previous:entry.nativeRevision}:{})};
  meta.nativeRevision=entry.nativeRevision;for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(card(spec.key,n));write(card(spec.key,'creation.json'),meta);
  writes.push(...names.map(n=>({stage:card(spec.key,n),target:prod(p.id,n),backup:old(p.id,n),before:frozen.observed[rel(prod(p.id,n))]})));
 }
 for(const spec of set.cards){
  const p=read(card(spec.key,'profile.json')),meta={job:L.crypto.randomUUID(),setId:set.id,key:spec.key,modelId:p.id,hashes:{},createdAt:new Date().toISOString()};
  for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(card(spec.key,n));write(card(spec.key,'creation.json'),meta);
  const prefix='V4/creations/'+p.id;assert(!catalogue.cards.some(c=>c.id===p.id));assert(!fs.existsSync(prod(p.id)));
  catalogue.cards.push({id:p.id,kind:'created',creationJob:meta.job,name:p.name,title:p.title,element:p.element,profile:p,png:prefix+'/card.png',psd:prefix+'/card.psd',pngUrl:'/media/created/'+p.id+'.png',psdUrl:'/media/created/'+p.id+'.psd',createdAt:meta.createdAt,publicationSource:rel(home)});
  const staging=file('staging/'+p.id);fs.mkdirSync(staging,{recursive:true});for(const n of names)fs.copyFileSync(card(spec.key,n),path.join(staging,n),fs.constants.COPYFILE_EXCL);additions.push({id:p.id,staging,target:prod(p.id)});
 }
 before.cards.forEach((c,i)=>{if(!set.revisions.some(s=>s.id===c.id))assert.deepEqual(c,catalogue.cards[i]);});
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});M.validateGame(data,require('../../site/engine.js').createEngine);
 fs.copyFileSync(cat,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),catalogue);
 writes.push({stage:file('publication-catalogue.json'),target:cat,backup:file('catalogue-before-publication.json'),before:await hash(cat)});for(const w of writes)w.after=await hash(w.stage);
 await guard();assert.deepEqual(read(cat),before);const done=[],installed=[];write(file('transaction.json'),{state:'publishing',writes,additions});
 try{
  for(const a of additions){fs.renameSync(a.staging,a.target);installed.push(a.id);}
  for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
  await stable();await match(frozen.inputs);await match(frozen.backups);
  const result={id:set.id,added:set.cards.map(c=>c.id),revised:set.revisions.map(c=>c.id),cards:data.cards.length};write(file('published.json'),result);write(file('transaction.json'),{state:'published',writes,additions});return result;
 }catch(error){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(error),orphanCards:installed});throw error;}
});}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
