'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs'),W=require('../../scripts/stable/white-weapon-component.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname,scratch=path.join(ROOT,'work/collab-scenes-45');
const file=n=>path.join(home,n),card=(s,n='')=>file('cards/'+s.key+'/'+n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const set=()=>M.validateSet(read(file('set.json')));
function select(keys){const all=set().cards;if(!keys)return all;const wanted=keys.split(',');assert(wanted.every(k=>all.some(c=>c.key===k)));return all.filter(c=>wanted.includes(c.key));}
async function hashes(files){const out={};for(const f of new Set(files))out[rel(f)]=await hash(f);return out;}
async function stable(){
 await L.protectedCheck();await R.verifyAssets();
 if(fs.existsSync(file('before.json'))){
  const b=read(file('before.json'));
  const inputs={...b.inputs},revision=file('revisions/01-dagga-text/revision.json');
  if(fs.existsSync(revision)){
   const fix=read(revision);
   assert.equal(fix.reason,'Dagga description exceeded the native cartouche before saving any PSD.');
   assert.deepEqual(fix.files.map(f=>f.relative),['build.cjs','choices.cjs','set.json','cards/dagga-renouveau/profile.json']);
   for(const entry of fix.files){
    const current=rel(file(entry.relative)),previous=file('revisions/01-dagga-text/previous/'+entry.relative);
    assert.equal(entry.before,b.inputs[current]);assert.equal(await hash(previous),entry.before);
    inputs[current]=entry.after;
   }
   const oldSet=read(file('revisions/01-dagga-text/previous/set.json')),newSet=set();
   oldSet.cards.find(c=>c.key==='dagga-renouveau').description=newSet.cards.find(c=>c.key==='dagga-renouveau').description;
   assert.deepEqual(newSet,oldSet,'Only the rejected Dagga lore may change');
  }
  for(const [f,h]of Object.entries(inputs))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);
  const now=read(D.CATALOGUE);
  for(const c of b.catalogue.cards)assert.deepEqual(now.cards.find(n=>n.id===c.id),c,'Existing catalogue entry changed: '+c.id);
 }
}
async function game(){
 const s=set(),published=D.catalogue().cards.filter(c=>c.kind==='created'&&!s.cards.some(v=>v.id===c.id));
 published.push(...s.cards.map(c=>({id:c.id,profile:M.profile(c),pngUrl:'/media/created/'+c.id+'.png'})));
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
 M.validateGame(data,s,require('../../site/engine.js').createEngine);return data;
}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();await game();
 const files=['set.json','choices.cjs','model.cjs','fixtures.cjs','build.cjs','compose.jsx','render.ps1'].map(file),catalogue=read(D.CATALOGUE),weapons=[],flags=[];
 for(const s of set().cards){
  assert(!catalogue.cards.some(c=>c.id===s.id));assert(!fs.existsSync(path.join(ROOT,'V4/creations',s.id)));
  const prior=D.catalogue().cards.find(c=>c.id===s.baseId);assert.equal(prior.profile.characterId,s.characterId);
  const p=M.profile(s),layers=await R.components(M.donor(s),{id:p.id,positionsText:false}),art=path.join(ROOT,s.artworkSource);
  assert.equal(await hash(art),s.artworkSha256,'Approved illustration changed');
  const flagSource=path.join(ROOT,'V4/site/assets/factions',p.faction+'.png'),flagMeta=await sharp(flagSource).metadata();
  let flagBytes;
  if(flagMeta.width===109&&flagMeta.height===230)flagBytes=await sharp(flagSource).extract({left:5,top:0,width:98,height:223}).png().toBuffer();
  else {assert.deepEqual([flagMeta.width,flagMeta.height],[98,223]);flagBytes=fs.readFileSync(flagSource);}
  const alpha=input=>sharp(input).ensureAlpha().extractChannel(3).raw().toBuffer();
  assert.deepEqual(await alpha(flagBytes),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')),'Native flag silhouette');
  layers[layers.findIndex(l=>l.name==='FACTION - Chroma')]={input:flagBytes,name:'FACTION - '+p.faction,left:672,top:829,width:98,height:223};
  files.push(flagSource);flags.push({id:p.id,faction:p.faction,source:rel(flagSource),sourceHash:await hash(flagSource)});
  layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
  for(const layer of layers.filter(l=>l.name.startsWith('ARME'))){
   const glyph=await W.component(p.weapon,layer.input,layer);layer.input=glyph.input;
   weapons.push({id:p.id,source:glyph.source,sourceHash:glyph.sourceHash,enamelHash:glyph.enamelHash});files.push(path.join(ROOT,glyph.source));
  }
  fs.mkdirSync(card(s,'render'),{recursive:true});write(card(s,'profile.json'),p);
  fs.copyFileSync(art,card(s,'illustration.png'),fs.constants.COPYFILE_EXCL);
  const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(const [i,l]of layers.entries()){
   const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(card(s,'render/'+f));
   plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
  }
  write(card(s,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(card(s,'render/expected-components.png'));
  files.push(art,...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(s,n)),...plan.layers.map(l=>card(s,'render/'+l.file)));
  console.log('Prepared '+p.id+' '+p.name);
 }
 write(file('weapon-components.json'),weapons);files.push(file('weapon-components.json'));
 write(file('faction-components.json'),flags);files.push(file('faction-components.json'));
 for(const f of ['V4/expansions/2026-10-04-city-guards/compose-one.jsx','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/template-stable/icon-layouts.json','V4/atelier/designer-assets/race-extensions.json','V4/scripts/stable/white-weapon-component.cjs','V4/site/base-weapons.js','V4/site/assets/base-weapons/enamel.png'])files.push(path.join(ROOT,f));
 write(file('before.json'),{catalogue,inputs:await hashes(files)});await stable();return {prepared:set().cards.map(c=>c.id)};
});}
async function render(keys){assert.equal(process.env.KALISTAR_COLLAB_SCENES_PS,'2026-10-15');return B.locked(async()=>{
 await stable();const selected=select(keys);for(const s of selected)assert(!fs.existsSync(card(s,'card.psd')));
 fs.mkdirSync(scratch,{recursive:true});write(path.join(scratch,'render-request.json'),{keys:selected.map(c=>c.key)});
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],path.join(scratch,'photoshop.log'));
 await stable();return result;
});}
async function verify(keys){return B.locked(async()=>{
 await stable();const results=[];
 for(const s of select(keys)){
  const p=read(card(s,'profile.json'));M.validateProfile(p,s);
  const proof=await B.verifyNative(card(s),p),native=read(card(s,'render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  write(card(s,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json')),revisionManifestHash:fs.existsSync(file('revisions/01-dagga-text/revision.json'))?await hash(file('revisions/01-dagga-text/revision.json')):null});
  await sharp(card(s,'card.png')).resize({width:300}).png().toFile(card(s,'small.png'));
  results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  console.log('Verified '+p.id+' '+p.name);
 }
 await game();await stable();if(!keys)write(file('native-summary.json'),results);return results;
});}
async function publish(){
 assert.equal(process.env.KALISTAR_COLLAB_SCENES_PUBLISH,'2026-10-15');await stable();
 const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home});
 const result=await publisher.publish();await stable();write(file('published.json'),result);return result;
}
module.exports={prepare,render,verify,publish,game,stable};
if(require.main===module)module.exports[process.argv[2]](process.argv[3]).then(r=>console.log(JSON.stringify(process.argv[2]==='game'?{cards:r.cards.length}:r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
