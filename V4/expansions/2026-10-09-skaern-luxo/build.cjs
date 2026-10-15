'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),A=require('../2026-10-08-eleven-lives/assets.cjs');
const {fs,path,assert,ROOT,read,write,hash,sharp}=L,set=require('./set.json'),home=__dirname;
const file=n=>path.join(home,n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const card=(key,n='')=>file('cards/'+key+'/'+n),prod=(id,n)=>path.join(ROOT,'V4/creations',id,n);
const names=['profile.json','illustration.png','card.psd','card.png','verification.json','creation.json'];
const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds;
const old=n=>file('originals/49901001/'+n),cat=path.join(ROOT,'V4/donnees/catalogue.json');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function match(entries){for(const [f,h]of Object.entries(entries))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);}
async function stable(){await L.protectedCheck();await R.verifyAssets();}
function donor(p){return D.validate({...Object.fromEntries(D.FIELDS.filter(k=>k in p).map(k=>[k,p[k]])),faction:'Chroma'},{final:true});}
function validate(p){
 assert(p.positions.includes(p.role));
 for(const side of ['atk','defense']){assert.equal(p[side].length,6);p[side].forEach((v,i)=>{
  if(typeof v==='number')assert(Number.isInteger(v)&&v>=(bounds[p.role][side][i+1]||0)&&v<=bounds[p.role][side][i]);
  else assert((side==='atk'?['guard','retry']:['retry','dodge']).includes(v));
 });}
 assert.equal(p.canGuard,p.atk.includes('guard'));assert.equal(p.canHeal,false);
 if(p.element==='NONE')assert.equal(p.magic.length+p.barriers.length,0);
}
async function components(key,p,layers){
 const out=card(key,'render');fs.mkdirSync(out,{recursive:true});
 const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
 for(const [i,l]of layers.entries()){
  const f='component-'+String(i).padStart(2,'0')+'.png';
  await sharp(l.input).png().toFile(path.join(out,f));
  plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
 }
 write(card(key,'profile.json'),p);write(path.join(out,'composition.json'),plan);
 await sharp(await R.composite(layers)).png().toFile(path.join(out,'expected-components.png'));
}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();
 const catalogue=read(cat),entry=catalogue.cards.find(c=>c.id===set.revision.id);
 assert.equal(entry.profile.element,'NONE');assert(!catalogue.cards.some(c=>c.id===set.cards[0].id));assert(!fs.existsSync(prod(set.cards[0].id,'')));
 fs.mkdirSync(old('render'),{recursive:true});
 for(const n of names)fs.copyFileSync(prod(entry.id,n),old(n),fs.constants.COPYFILE_EXCL);
 const previous=path.dirname(path.join(ROOT,entry.nativeRevision.proof)),composition=read(path.join(previous,'render/composition.json'));
 for(const n of ['native.json','composition.json'])fs.copyFileSync(path.join(previous,'render',n),old('render/'+n),fs.constants.COPYFILE_EXCL);
 const spec=set.cards[0],p={...D.profileCard(donor(spec),spec.id),faction:spec.faction,role:spec.role,characterId:spec.characterId,
  source:'Personnage original Kalistar, validation utilisateur du 9 octobre 2026',artworkSource:spec.artworkSource,visual_revision:'V4-'+set.id};
 validate(p);
 let layers=await A.replace(await R.components(donor(p),{id:p.id,positionsText:false}),p);
 layers[0]={...layers[0],input:await sharp(path.join(ROOT,p.artworkSource)).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
 await components('skaern',p,layers);fs.copyFileSync(path.join(ROOT,p.artworkSource),card('skaern','illustration.png'));
 const q={...entry.profile,element:'LUXO',color:'F4E9AF',hue:47,sentry:true};validate(q);
 const bank=read(path.join(R.ASSETS,'manifest.json')),e=bank.elements.LUXO;layers=[];
 const scope=[];
 // Replace only element-specific pieces. Preserve the later FFIX banner and race portrait.
 for(const l of composition.layers){
  let replacement=null,name=l.name;
  const atk=/^ATK D([1-6]) - fond physique$/.exec(name);
  if(atk)replacement=bank.stats.atk.LUXO[atk[1]].physical;
  else if(name.startsWith('BRANCHES NONE')){replacement=e.branch;name=name.replace('NONE','LUXO');}
  else if(name==='CRISTAL NONE'){replacement=e.crystal;name='CRISTAL LUXO';}
  const geometry=replacement||l,input=replacement?path.join(R.ASSETS,replacement.file):path.join(previous,'render',l.file);
  layers.push({name,input,left:geometry.left,top:geometry.top,width:geometry.width,height:geometry.height});
  if(replacement)for(const g of [l,replacement])scope.push([g.left,g.top,g.left+g.width,g.top+g.height]);
 }
 scope.push([207,1154,378,1190],[514,1154,684,1190]);
 await components('djidane',q,layers);fs.copyFileSync(prod(q.id,'illustration.png'),card('djidane','illustration.png'));
 const inputs=['set.json','build.cjs','compose.jsx','render.ps1'].map(file);
 inputs.push(path.join(ROOT,spec.artworkSource));
 for(const key of ['skaern','djidane']){
  inputs.push(...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(key,n)));
  inputs.push(...read(card(key,'render/composition.json')).layers.map(l=>card(key,'render/'+l.file)));
 }
 write(file('before.json'),{entry,scope,inputs:await hashes(inputs),backups:await hashes(names.map(old)),observed:await hashes(names.map(n=>prod(entry.id,n)))});
 return {prepared:[p.id,q.id]};
});}
async function guard(){await stable();const b=read(file('before.json'));for(const k of ['inputs','backups','observed'])await match(b[k]);assert.deepEqual(read(cat).cards.find(c=>c.id===set.revision.id),b.entry);return b;}
async function render(){assert.equal(process.env.KALISTAR_SKAERN_PS,'2026-10-09');return B.locked(async()=>{
 await guard();for(const key of ['skaern','djidane'])assert(!fs.existsSync(card(key,'card.psd')));
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));await guard();return result;
});}
async function verify(){return B.locked(async()=>{
 const before=await guard(),results=[];
 for(const key of ['skaern','djidane']){
  const p=read(card(key,'profile.json'));validate(p);
  const proof=await B.verifyNative(card(key),p),native=read(card(key,'render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  if(p.element==='NONE')proof.none=await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(card(key),read(card(key,'render/composition.json')),read(path.join(R.ASSETS,'manifest.json')));
  if(key==='djidane'){
   const prior=read(old('profile.json')),restored={...p};for(const f of set.revision.changedFields)restored[f]=prior[f];assert.deepEqual(restored,prior);
   assert.equal(await hash(card(key,'illustration.png')),await hash(old('illustration.png')));
   proof.scope={...await L.diff(old('card.png'),card(key,'card.png'),before.scope),rectangles:before.scope};assert.equal(proof.scope.outside,0);assert(proof.scope.changed>0);
   proof.elementChange={from:'NONE',to:'LUXO'};proof.numericFacesAndEffectsUnchanged=true;
  }
  write(card(key,'verification.json'),{...proof,typographyCheck,revision:set.id,inputManifestHash:await hash(file('before.json'))});
  await sharp(card(key,'card.png')).resize({width:300}).png().toFile(card(key,'small.png'));
  results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed,scope:proof.scope});
 }
 write(file('verified.json'),await hashes(['skaern','djidane'].flatMap(key=>names.filter(n=>n!=='creation.json').map(n=>card(key,n)))));
 return results;
});}
async function publish(){assert.equal(process.env.KALISTAR_SKAERN_PUBLISH,'2026-10-09');return B.locked(async()=>{
 const frozen=await guard();await match(read(file('verified.json')));assert(!fs.existsSync(file('published.json')));
 const before=read(cat),catalogue=structuredClone(before),q=read(card('djidane','profile.json')),p=read(card('skaern','profile.json'));
 const revised=catalogue.cards.find(c=>c.id===q.id),meta=read(old('creation.json'));
 revised.profile=q;revised.element=q.element;revised.nativeRevision={id:set.id,key:'djidane',proof:rel(card('djidane','verification.json')),changedFields:set.revision.changedFields,previous:revised.nativeRevision};
 meta.nativeRevision=revised.nativeRevision;for(const n of names.filter(n=>n!=='creation.json'))meta.hashes[n]=await hash(card('djidane',n));write(card('djidane','creation.json'),meta);
 const newmeta={job:L.crypto.randomUUID(),setId:set.id,key:'skaern',modelId:p.id,hashes:{},createdAt:new Date().toISOString()};
 for(const n of names.filter(n=>n!=='creation.json'))newmeta.hashes[n]=await hash(card('skaern',n));
 write(card('skaern','creation.json'),newmeta);
 const prefix='V4/creations/'+p.id;
 assert(!catalogue.cards.some(c=>c.id===p.id));assert(!fs.existsSync(prod(p.id,'')));
 catalogue.cards.push({id:p.id,kind:'created',creationJob:newmeta.job,name:p.name,title:p.title,element:p.element,profile:p,png:prefix+'/card.png',psd:prefix+'/card.psd',pngUrl:'/media/created/'+p.id+'.png',psdUrl:'/media/created/'+p.id+'.psd',createdAt:newmeta.createdAt,publicationSource:rel(home)});
 before.cards.forEach((c,i)=>{if(c.id!==q.id)assert.deepEqual(c,catalogue.cards[i]);});
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:catalogue.cards.filter(c=>c.kind==='created')});
 assert.equal(data.cards.find(c=>c.id===q.id).element,'LUXO');assert.equal(data.cards.find(c=>c.id===p.id).race,'OKAMI');
 fs.copyFileSync(cat,file('catalogue-before-publication.json'),fs.constants.COPYFILE_EXCL);write(file('publication-catalogue.json'),catalogue);
 const writes=names.map(n=>({stage:card('djidane',n),target:prod(q.id,n),backup:old(n),before:frozen.observed[rel(prod(q.id,n))]}));
 writes.push({stage:file('publication-catalogue.json'),target:cat,backup:file('catalogue-before-publication.json'),before:await hash(cat)});
 for(const w of writes)w.after=await hash(w.stage);
 // New files are fully staged before changing the catalogue. An interrupted install stays recoverable.
 const staging=file('staging/'+p.id);fs.mkdirSync(staging,{recursive:true});for(const n of names)fs.copyFileSync(card('skaern',n),path.join(staging,n),fs.constants.COPYFILE_EXCL);
 await guard();assert.deepEqual(read(cat),before);const done=[];write(file('transaction.json'),{state:'publishing',writes,newCard:p.id});
 try{
  fs.renameSync(staging,prod(p.id,''));
  for(const w of writes){assert.equal(await hash(w.target),w.before);fs.copyFileSync(w.stage,w.target);done.push(w);assert.equal(await hash(w.target),w.after);}
  await stable();await match(frozen.inputs);await match(frozen.backups);
  write(file('published.json'),{id:set.id,added:p.id,revised:q.id,element:'LUXO'});write(file('transaction.json'),{state:'published',writes,newCard:p.id});return {added:p.id,revised:q.id,cards:data.cards.length};
 }catch(error){for(const w of done.reverse()){assert.equal(await hash(w.target),w.after);fs.copyFileSync(w.backup,w.target);}write(file('transaction.json'),{state:'rolled-back',error:String(error),orphanCard:p.id});throw error;}
});}
module.exports={prepare,render,verify,publish,validate,set};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});

