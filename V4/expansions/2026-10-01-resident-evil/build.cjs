'use strict';
const assert=require('node:assert/strict');
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const T=require('./typography.cjs'),M=require('./model.cjs');
const {fs,path,ROOT,read,write,sharp}=L,home=__dirname,file=n=>path.join(home,n);
const guard=require('../2026-09-27-metal-gear-mines/preservation.cjs').createGuard(L,D,home);
const B=require('../../collaborations/resident-evil-banners-01/assets.cjs');
const A=require('./banner.cjs');
const set=()=>M.validateSet(read(file('set.json'))),select=k=>{const c=set().cards.filter(c=>!k||c.key===k);assert(c.length);return c;};
const dir=c=>file('cards/'+c.key),digest=files=>Object.fromEntries(files.map(f=>[guard.relative(f),guard.digest(f)]));
const locks=['V4/atelier/data/references.json','V4/atelier/data/regression.json','V4/atelier/designer-assets/manifest.json'].map(f=>path.join(ROOT,f));
const sources=()=>['set.json','model.cjs','model.test.cjs','typography.cjs','typography.test.cjs','build.cjs','banner.cjs','compose.jsx','compose-one.jsx','render.ps1'].concat(fs.readdirSync(file('art-prompts')).filter(n=>n.endsWith('.json')).map(n=>'art-prompts/'+n)).map(file).concat(set().cards.map(c=>path.join(ROOT,M.artPath(c))));
async function stable(){await L.protectedCheck();await R.verifyAssets();guard.assertExisting();return digest(locks);}
async function locked(action){const lock=path.join(L.DATA,'render.lock'),id=L.crypto.randomUUID();let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,kind:M.SET}));return await action();}finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}}
async function game(){
  const profiles=set().cards.map(c=>M.profile(c,D)),published=D.catalogue().cards.filter(c=>c.kind==='created'&&!profiles.some(p=>p.id===c.id));
  published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
  const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});M.validateGame(data,set(),require('../../site/engine.js').createEngine);return data;
}
async function freeze(){
  await L.protectedCheck();await R.verifyAssets();await B.verify();await game();
  for(const c of set().cards){assert(!D.catalogue().cards.some(p=>p.id===c.id));assert(!fs.existsSync(path.join(ROOT,'V4/creations',c.id)));}
  const requests=path.join(L.DATA,'designer/requests');
  if(fs.existsSync(requests))for(const f of fs.readdirSync(requests).filter(f=>f.endsWith('.json')))assert(!set().cards.some(c=>c.id===read(path.join(requests,f)).modelId));
  assert(!fs.existsSync(file('dependencies.json')),'Do not replace an existing freeze.');
  const deps=require('../2026-09-27-metal-gear-mines/freeze.cjs').files.concat([
    'V4/expansions/2026-09-27-metal-gear-mines/model.cjs','V4/expansions/2026-09-27-metal-gear-mines/preservation.cjs',
    'V4/expansions/2026-09-27-metal-gear-mines/publication-core.cjs','V4/expansions/2026-09-27-metal-gear-mines/compose-one.jsx'
  ]).map(f=>path.join(ROOT,f)).concat(B.inputs(),['assets.cjs','prepare.cjs'].map(f=>path.join(ROOT,'V4/collaborations/resident-evil-banners-01',f)));
  write(file('dependencies.json'),digest(deps));write(file('arenas-before.json'),read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')));
  return {preservedCreations:guard.freeze().entries.length,referenceId:L.baseline().id};
}
async function prepare(key){return locked(async()=>{
  const snapshot=await stable(),inputs=digest(sources());
  for(const c of select(key)){
    const out=dir(c),render=path.join(out,'render'),p=M.profile(c,D),donor=M.donor(c,D),art=path.join(ROOT,M.artPath(c));
    fs.mkdirSync(render,{recursive:true});const layers=await R.components(donor,{id:p.id,positionsText:true});
    layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
    await B.verify();A.replace(layers,c);
    write(path.join(out,'profile.json'),p);fs.copyFileSync(art,path.join(out,'illustration.png'));
    await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(out,'preview.png'));
    const native=layers.filter(l=>!l.name.startsWith('POSITION SLOT ')),plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for(const [i,l] of native.entries()){const name='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(render,name));plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});}
    write(path.join(render,'composition.json'),plan);await sharp(await R.composite(native)).png().toFile(path.join(render,'expected-components.png'));
    const generated=['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(f=>path.join(out,f)).concat(plan.layers.map(l=>path.join(render,l.file)));
    assert.deepEqual(digest(sources()),inputs);write(path.join(out,'preparation.json'),{referenceId:L.baseline().id,snapshot,existingSnapshotHash:guard.digest(guard.snapshotFile),inputs:{...inputs,...digest(generated)}});
  }
  assert.deepEqual(await stable(),snapshot);return {prepared:select(key).map(c=>c.id)};
});}
async function render(key){return locked(async()=>{
  const snapshot=await stable(),cards=select(key);for(const c of cards)guard.preparation(c.key);
  write(file('render-request.json'),{keys:cards.map(c=>c.key)});
  const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
  for(const c of cards)guard.preparation(c.key);assert.deepEqual(await stable(),snapshot);return {rendered:cards.map(c=>c.id),output};
});}
async function verify(key){return locked(async()=>{
  const snapshot=await stable(),checks=[];
  for(const c of select(key)){
    guard.preparation(c.key);const out=dir(c),p=read(path.join(out,'profile.json'));M.validateProfile(p,c);
    const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p),n=read(path.join(out,'render/native.json'));
    T.verify(n);assert.equal(n.photoshop,'26.11.7');assert(n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
    assert.deepEqual(n.layers.find(l=>l.name==='FACTION - '+c.faction).bounds,[672,829,770,1052]);
    guard.preparation(c.key);write(path.join(out,'verification.json'),{...proof,preparationHash:guard.digest(path.join(out,'preparation.json')),typography:true});
    checks.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  }
  await game();assert.deepEqual(await stable(),snapshot);return checks;
});}
async function publish(){
  assert.equal(process.env.KALISTAR_RE_PARENT_COORDINATED,'2026-10-01','Publication reserved to parent coordinated release.');
  guard.publication();const guardedL={...L,write(f,v){if(path.resolve(f)===path.resolve(D.CATALOGUE)){guard.publication();guard.assertExisting(undefined,v);}return write(f,v);}};
  const pub=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L:guardedL,D,home,model:M});await pub.preflight();const result=await pub.publish();guard.publication();return result;
}
const actions={freeze,prepare,render,verify,publish,game};module.exports={...actions,guard};
if(require.main===module){const [action,key]=process.argv.slice(2);assert(Object.hasOwn(actions,action));actions[action](key).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});}
