'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const M=require('../../expansions/2026-09-27-metal-gear-mines/model.cjs'),T=require('../../collaborations/nier-pilot-01/typography.cjs');
const S=require('./specs.cjs'),{fs,path,ROOT,read,write,hash,sharp,assert}=L;
const home=__dirname,f=n=>path.join(home,n),rel=n=>path.relative(ROOT,n).replace(/\\/g,'/');
const FILES=['profile.json','card.png','card.psd','verification.json','illustration.png','creation.json'];
const rev='2026-10-04-guards-arborium',bank=path.join(ROOT,'V4/atelier/designer-assets');
const select=key=>S.cards.filter(c=>!key||key.split(',').includes(c.key));
async function locked(fn){const lock=path.join(L.DATA,'render.lock'),id=L.crypto.randomUUID();let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,kind:rev}));return await fn();}finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}}
async function freeze(){
 assert(!fs.existsSync(f('before.json')),'Never reset a snapshot');await L.protectedCheck();await R.verifyAssets();
 const cat=D.catalogue(),before={catalogue:cat,files:{},backups:{}};
 const preserved=new Set();for(const c of cat.cards){if(c.kind==='created')for(const n of FILES){const p=path.join(ROOT,'V4/creations',c.id,n);if(fs.existsSync(p))preserved.add(p);}else if(c.png)preserved.add(path.join(ROOT,c.png));}
 for(const p of preserved)before.files[rel(p)]=await hash(p);
 const backups=[D.CATALOGUE,path.join(bank,'race-extensions.json'),path.join(bank,'extensions/race-CRUSTOS.png'),path.join(ROOT,'V4/site/assets/races/CRUSTOS.png')];
 for(const c of S.revised)for(const n of FILES)backups.push(path.join(ROOT,'V4/creations',c.id,n));
 for(const src of backups){const dest=f('before/'+rel(src));fs.mkdirSync(path.dirname(dest),{recursive:true});fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);before.backups[rel(src)]={backup:rel(dest),sha256:await hash(src)};}
 for(const c of S.additions){assert(!cat.cards.some(p=>p.id===c.id||p.profile?.characterId===c.characterId));assert(!fs.existsSync(path.join(ROOT,'V4/creations',c.id)));}
 write(f('before.json'),before);return {frozen:Object.keys(before.files).length};
}
async function unchanged(includeTargets=false){
 const before=read(f('before.json')),allowed=new Set([...S.revised.map(c=>c.id),...S.removed]);
 for(const [p,h]of Object.entries(before.files)){const id=p.split('/')[2];if(!includeTargets&&allowed.has(id))continue;assert.equal(await hash(path.join(ROOT,p)),h,'Preservation: '+p);}
 await L.protectedCheck();await R.verifyAssets();
}
async function race(){return locked(async()=>{
 await unchanged(true);const target=path.join(bank,'race-extensions.json'),original=read(f('before.json')).backups;
 for(const p of [target,path.join(bank,'extensions/race-CRUSTOS.png')])assert.equal(await hash(p),original[rel(p)].sha256);
 const A=require('../../collaborations/nier-pilot-01/assets.cjs'),output=f('race-CRUSTOS.png'),proof=await A.race(f('selected-art/crustos.png'),output);
 write(f('race-proof.json'),proof);fs.copyFileSync(output,path.join(bank,'extensions/race-CRUSTOS.png'));
 await sharp(f('selected-art/crustos.png')).resize(256,256,{fit:'contain',background:'#00000000'}).png().toFile(path.join(ROOT,'V4/site/assets/races/CRUSTOS.png'));
 const registry=read(target);registry.races.CRUSTOS={...registry.races.CRUSTOS,sha256:proof.sha256};write(target,registry);await R.verifyAssets();return proof;
});}
function profile(c){
 const old=read(f('before.json')).catalogue.cards.find(p=>p.id===c.id)?.profile;
 const p=old?{...old,description:c.description,text:c.description,artworkSource:M.artPath(c)}:M.profile(c,D);
 p.visual_revision='V4-'+rev;p.source='Personnage original Kalistar, demande du 4 octobre 2026';return p;
}
function validate(c,p){
 M.validateProfile(p,c);assert(c.description.length>=160&&c.description.length<=190,c.key+' text budget '+c.description.length);
 const bounds=require('../../../V3/donnees/regles_demo.json').roleBounds[c.role];
 for(const side of ['atk','defense'])c[side].forEach((v,i)=>{if(typeof v==='number')assert(v>= (bounds[side][i+1]||0)&&v<=bounds[side][i],c.key+' bounds');});
 if(S.revised.some(r=>r.id===c.id)){const old=read(f('before.json')).catalogue.cards.find(p=>p.id===c.id).profile;for(const field of ['id','characterId','role','race','element','faction','weapon','positions','atk','defense','magic','barriers','canGuard','canHeal','sentry'])assert.deepEqual(p[field],old[field],c.key+' gameplay');}
}
async function prepare(key){return locked(async()=>{
 await unchanged(true);
 for(const c of select(key)){
  const out=f('cards/'+c.key),render=path.join(out,'render'),p=profile(c),donor=M.donor(c,D),art=path.join(ROOT,M.artPath(c));validate(c,p);
  if(c.key!=='serya'){const src=f('selected-art/'+c.key+'.png');if(fs.existsSync(art))assert.equal(await hash(art),await hash(src));else fs.copyFileSync(src,art,fs.constants.COPYFILE_EXCL);}
  fs.mkdirSync(render,{recursive:true});write(path.join(out,'profile.json'),p);fs.copyFileSync(art,path.join(out,'illustration.png'));
  const layers=await R.components(donor,{id:p.id,positionsText:true});layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
  await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(out,'preview.png'));
  const native=layers.filter(l=>!l.name.startsWith('POSITION SLOT ')),plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(const [i,l]of native.entries()){const name='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(render,name));plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});}
  write(path.join(render,'composition.json'),plan);await sharp(await R.composite(native)).png().toFile(path.join(render,'expected-components.png'));
  const inputs={};for(const n of ['profile.json','illustration.png','render/composition.json','render/expected-components.png',...plan.layers.map(l=>'render/'+l.file)])inputs[n]=await hash(path.join(out,n));write(path.join(out,'preparation.json'),inputs);
 }
 return {prepared:select(key).map(c=>c.id)};
});}
async function inputs(c){const out=f('cards/'+c.key);for(const [n,h]of Object.entries(read(path.join(out,'preparation.json'))))assert.equal(await hash(path.join(out,n)),h);}
async function render(key){assert.equal(process.env.KALISTAR_ARBORIUM_PS,'2026-10-04');return locked(async()=>{
 await unchanged(true);const cards=select(key);for(const c of cards)await inputs(c);write(f('render-request.json'),{keys:cards.map(c=>c.key)});
 const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',f('render.ps1')],f('photoshop.log'));
 for(const c of cards)await inputs(c);return {output};
});}
async function verify(key){return locked(async()=>{
 const checks=[];await unchanged(true);
 for(const c of select(key)){
  await inputs(c);const out=f('cards/'+c.key),p=read(path.join(out,'profile.json'));validate(c,p);
  const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p),n=read(path.join(out,'render/native.json'));T.verify(n);
  if(p.element==='NONE')proof.none=await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(out,read(path.join(out,'render/composition.json')),read(path.join(bank,'manifest.json')));
  assert(n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4,c.key+' line count');
  write(path.join(out,'verification.json'),{...proof,typography:true,revision:rev});await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
  checks.push({key:c.key,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
 }write(f('native-checks.json'),checks);return checks;
});}
async function game(){
 const before=read(f('before.json')).catalogue,rows=before.cards.filter(c=>c.kind==='created'&&!S.removed.includes(c.id)&&!S.cards.some(p=>p.id===c.id));
 rows.push(...S.cards.map(c=>({id:c.id,profile:profile(c),pngUrl:'/media/created/'+c.id+'.png'})));
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:rows}),E=require('../../site/engine.js').createEngine(data);
 const keys=[['orven','serya','marel','veyr','isvel','torvan','eldra','brund','liorne','eryss'],['aeren','vessa','karrok','neryk','brask','maelka','tilko','velran','saelor','eryss']];
 const cards=require('../../expansions/2026-10-04-city-guards/set.json').cards.concat(S.additions);
 for(const list of keys)assert.deepEqual(E.validatePlayableDeck(list.map(k=>cards.find(c=>c.key===k).id)),[]);
 for(const c of S.cards)validate(c,profile(c));return {cards:data.cards.length,qaDecks:2};
}
async function publish(){assert.equal(process.env.KALISTAR_ARBORIUM_PUBLISH,'2026-10-04');return locked(async()=>{
 await game();
 await unchanged(true);const before=read(f('before.json'));assert.deepEqual(D.catalogue(),before.catalogue,'Catalogue changed since freeze');
 const next=structuredClone(before.catalogue);next.cards=next.cards.filter(c=>!S.removed.includes(c.id));const changes=[];
 async function change(src,target){const p=rel(target),saved=before.backups[p];assert(saved,'Missing backup '+p);changes.push({target,stage:src,backup:path.join(ROOT,saved.backup),beforeHash:saved.sha256,afterHash:await hash(src)});}
 for(const c of S.cards){
  const out=f('cards/'+c.key),p=read(path.join(out,'profile.json')),v=read(path.join(out,'verification.json'));validate(c,p);await inputs(c);
  assert(v.passed&&v.roundtrip.changed===0&&v.components.fixedDifferences===0&&v.barcode.passed);assert.equal(v.profileHash,await hash(path.join(out,'profile.json')));
  for(const n of ['card.png','card.psd'])assert.equal(v.hashes[n],await hash(path.join(out,n)));
  const target=path.join(ROOT,'V4/creations',c.id),old=next.cards.find(p=>p.id===c.id),hashes={};
  for(const n of FILES.filter(n=>n!=='creation.json'))hashes[n]=await hash(path.join(out,n));
  const creation=old?{...read(path.join(target,'creation.json')),hashes,nativeRevision:rev}:{job:L.crypto.randomUUID(),setId:rev,key:c.key,modelId:c.id,hashes,createdAt:new Date().toISOString()};write(path.join(out,'creation.json'),creation);
  if(old){for(const n of FILES)await change(path.join(out,n),path.join(target,n));Object.assign(old,{profile:p,nativeRevision:rev});}
  else {assert(!fs.existsSync(target));fs.mkdirSync(target);for(const n of FILES)fs.copyFileSync(path.join(out,n),path.join(target,n));const base='V4/creations/'+c.id;next.cards.push({id:c.id,kind:'created',creationJob:creation.job,name:p.name,title:p.title,element:p.element,profile:p,png:base+'/card.png',psd:base+'/card.psd',pngUrl:'/media/created/'+c.id+'.png',psdUrl:'/media/created/'+c.id+'.psd',createdAt:creation.createdAt,publicationSource:'V4/revisions/'+rev});}
 }
 write(f('catalogue.next.json'),next);await change(f('catalogue.next.json'),D.CATALOGUE);
 const result=await require('../2026-09-23-nier-art-refinement/transaction.cjs').transactionIO(L,f('publication.json')).commit({changes});await unchanged();return result;
});}
module.exports={freeze,race,prepare,render,verify,publish,unchanged,game};
if(require.main===module){const [action,key]=process.argv.slice(2);assert(Object.hasOwn(module.exports,action));module.exports[action](key).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});}
