'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const T=require('../../collaborations/nier-pilot-01/typography.cjs'),M=require('./model.cjs'),F=require('./flags.cjs');
const {fs,path,ROOT,read,write,sharp,assert}=L,home=__dirname,file=n=>path.join(home,n);
const guard=require('../2026-09-27-metal-gear-mines/preservation.cjs').createGuard(L,D,home);
const set=()=>M.validateSet(read(file('set.json'))),select=k=>{const keys=k?k.split(','):null,cards=set().cards.filter(c=>!keys||keys.includes(c.key));assert(cards.length);if(keys)assert.equal(cards.length,keys.length);return cards;};
const dir=c=>file('cards/'+c.key),digest=files=>Object.fromEntries(files.map(f=>[guard.relative(f),guard.digest(f)]));
const own=['set.json','model.cjs','model.test.cjs','build.cjs','flags.cjs','compose.jsx','compose-one.jsx','render.ps1','publish.cjs'].map(file);
async function stable(){await L.protectedCheck();await R.verifyAssets();guard.assertExisting();}
async function locked(action){const lock=path.join(L.DATA,'render.lock'),id=L.crypto.randomUUID();let fd;try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,JSON.stringify({id,pid:process.pid,kind:M.SET}));return await action();}finally{if(fd!==undefined){fs.closeSync(fd);if(read(lock).id===id)fs.unlinkSync(lock);}}}
async function freeze(){
 assert(!fs.existsSync(file('dependencies.json')),'Never reset dependencies.');
 await L.protectedCheck();await R.verifyAssets();
 const deps=own.concat(['V4/atelier/data/references.json','V4/atelier/designer-assets/manifest.json','V4/template-stable/icon-layouts.json',
 'V4/expansions/2026-10-01-one-piece/compose-one.jsx','V4/collaborations/nier-pilot-01/typography.jsx','V4/collaborations/nier-pilot-01/typography.cjs',
 'V4/collaborations/one-piece-assets-01/flag-ONEPIECE-packed.png',
 'V4/expansions/2026-10-01-one-piece-witcher/set.json','V4/expansions/2026-10-01-one-piece-witcher/model.cjs',
 'V4/expansions/2026-10-01-one-piece-witcher/flags.cjs','V4/expansions/2026-10-01-one-piece-witcher/faction.json',
 'V4/expansions/2026-10-01-one-piece-witcher/flag-WITCHER-packed.png'].map(f=>path.join(ROOT,f)));
 write(file('dependencies.json'),digest(deps));return {existing:guard.freeze().entries.length};
}
async function game(){
 const profiles=set().cards.map(c=>M.profile(c,D)),published=D.catalogue().cards.filter(c=>c.kind==='created'&&!profiles.some(p=>p.id===c.id));
 published.push(...profiles.map(profile=>({id:profile.id,profile,pngUrl:'/media/created/'+profile.id+'.png'})));
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});return M.validateGame(data,set(),require('../../site/engine.js').createEngine);
}
async function prepare(key){return locked(async()=>{
 await stable();const snapshot=digest([path.join(ROOT,'V4/atelier/data/references.json'),path.join(ROOT,'V4/atelier/designer-assets/manifest.json')]);
 for(const c of select(key)){
  const out=dir(c),render=path.join(out,'render'),p=M.profile(c,D),donor=M.donor(c,D),art=path.join(ROOT,M.artPath(c));
  fs.mkdirSync(render,{recursive:true});const layers=await R.components(donor,{id:p.id,positionsText:true});
  layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover'}).png().toBuffer()};
  await F.replace(layers,c);
  write(path.join(out,'profile.json'),p);fs.copyFileSync(art,path.join(out,'illustration.png'));
  await sharp(await R.composite(layers)).composite(await T.preview(donor,R)).png().toFile(path.join(out,'preview.png'));
  const native=layers.filter(l=>!l.name.startsWith('POSITION SLOT ')),plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(const [i,l]of native.entries()){const name='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(path.join(render,name));plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});}
  write(path.join(render,'composition.json'),plan);await sharp(await R.composite(native)).png().toFile(path.join(render,'expected-components.png'));
  const generated=['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(f=>path.join(out,f)).concat(plan.layers.map(l=>path.join(render,l.file)));
  write(path.join(out,'preparation.json'),{referenceId:L.baseline().id,snapshot,existingSnapshotHash:guard.digest(guard.snapshotFile),inputs:digest(own.concat(art,generated,F.inputs(c)))});
 }
 await stable();return {prepared:select(key).map(c=>c.id)};
});}
async function render(key){
 assert.equal(process.env.KALISTAR_WITCHER_FINISH_PS,'2026-10-02','Explicit Photoshop handshake required.');
 return locked(async()=>{await stable();const cards=select(key);cards.forEach(c=>guard.preparation(c.key));
 write(file('render-request.json'),{keys:cards.map(c=>c.key)});
 const output=await R.command('C:/Windows/System32/WindowsPowerShell/v1.0/powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
 cards.forEach(c=>guard.preparation(c.key));await stable();return {rendered:cards.map(c=>c.id),output};
 });
}
async function verify(key){return locked(async()=>{
 await stable();const checks=[];
 for(const c of select(key)){
  guard.preparation(c.key);const out=dir(c),p=read(path.join(out,'profile.json'));M.validateProfile(p,c);
  const proof=await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(out,p),n=read(path.join(out,'render/native.json'));T.verify(n);
  if(p.element==='NONE')proof.none=await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(out,read(path.join(out,'render/composition.json')),read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')));
  assert.equal(n.photoshop,'26.11.7');assert(n.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4,c.key+' description too long');
  assert.deepEqual(n.layers.find(l=>l.name==='FACTION - '+c.faction).bounds,[672,829,770,1052]);
  write(path.join(out,'verification.json'),{...proof,preparationHash:guard.digest(path.join(out,'preparation.json')),typography:true});
  await sharp(path.join(out,'card.png')).resize({width:300}).png().toFile(path.join(out,'small.png'));
  checks.push({id:c.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
 }
 await game();await stable();return checks;
});}
module.exports={freeze,prepare,render,verify,game,guard};
if(require.main===module){const [action,key]=process.argv.slice(2);assert(Object.hasOwn(module.exports,action));module.exports[action](key).then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});}
