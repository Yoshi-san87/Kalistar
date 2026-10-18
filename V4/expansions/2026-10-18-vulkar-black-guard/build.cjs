'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs'),W=require('../../scripts/stable/white-weapon-component.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname,scratch=path.join(ROOT,'work/vulkar-black-guard-native');
const file=n=>path.join(home,n),card=(c,n='')=>file('cards/'+c.key+'/'+n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const set=()=>M.validateSet(read(file('set.json')));
function selected(keys){const all=set().cards;if(!keys)return all;const wanted=keys.split(',');assert(wanted.every(k=>all.some(c=>c.key===k)));return all.filter(c=>wanted.includes(c.key));}
async function hashes(files){const out={};for(const f of new Set(files))out[rel(f)]=await hash(f);return out;}
async function stable(){
 await L.protectedCheck();await R.verifyAssets();
 if(fs.existsSync(file('before.json'))){
  const b=read(file('before.json'));
  for(const [f,h]of Object.entries(b.inputs))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);
  const now=read(D.CATALOGUE);for(const c of b.catalogue.cards)assert.deepEqual(now.cards.find(n=>n.id===c.id),c,'Previous entry changed: '+c.id);
 }
}
async function game(){
 const s=set(),published=D.catalogue().cards.filter(c=>c.kind==='created'&&!s.cards.some(n=>n.id===c.id));
 published.push(...s.cards.map(c=>({id:c.id,profile:M.profile(c),pngUrl:'/media/created/'+c.id+'.png'})));
 const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
 M.validateGame(data,s,require('../../site/engine.js').createEngine);return data;
}
async function prepare(){return B.locked(async()=>{
 assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();await game();
 const files=['set.json','model.cjs','build.cjs','compose.jsx','render.ps1'].map(file),catalogue=read(D.CATALOGUE),weapons=[];
 for(const c of set().cards){
  assert(!catalogue.cards.some(n=>n.id===c.id||n.profile.characterId===c.characterId));assert(!fs.existsSync(path.join(ROOT,'V4/creations',c.id)));
  const p=M.profile(c),layers=await R.components(M.donor(c),{id:p.id,positionsText:false}),art=path.join(ROOT,c.artworkSource);
  layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
  for(const layer of layers.filter(l=>l.name.startsWith('ARME'))){
   const glyph=await W.component(p.weapon,layer.input,layer);layer.input=glyph.input;
   weapons.push({id:p.id,source:glyph.source,sourceHash:glyph.sourceHash,enamelHash:glyph.enamelHash});files.push(path.join(ROOT,glyph.source));
  }
  fs.mkdirSync(card(c,'render'),{recursive:true});write(card(c,'profile.json'),p);fs.copyFileSync(art,card(c,'illustration.png'),fs.constants.COPYFILE_EXCL);
  const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(const [i,l]of layers.entries()){
   const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(card(c,'render/'+f));
   plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
  }
  write(card(c,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(card(c,'render/expected-components.png'));
  files.push(art,...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(c,n)),...plan.layers.map(l=>card(c,'render/'+l.file)));
  console.log('Prepared '+c.id+' '+c.name);
 }
 write(file('weapon-components.json'),weapons);files.push(file('weapon-components.json'));
 for(const f of ['V4/expansions/2026-10-04-city-guards/compose-one.jsx','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/template-stable/icon-layouts.json','V4/atelier/designer-assets/race-extensions.json','V4/scripts/stable/white-weapon-component.cjs','V4/site/base-weapons.js','V4/site/assets/base-weapons/enamel.png'])files.push(path.join(ROOT,f));
 write(file('before.json'),{catalogue,inputs:await hashes(files)});await stable();return {prepared:set().cards.map(c=>c.id)};
});}
async function render(keys){assert.equal(process.env.KALISTAR_VULKAR_PS,'2026-10-18');return B.locked(async()=>{
 await stable();const cards=selected(keys);for(const c of cards)assert(!fs.existsSync(card(c,'card.psd')));
 fs.mkdirSync(scratch,{recursive:true});write(path.join(scratch,'render-request.json'),{keys:cards.map(c=>c.key)});
 const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],path.join(scratch,'photoshop-'+cards[0].key+'.log'));
 await stable();return result;
});}
async function verify(keys){return B.locked(async()=>{
 await stable();const results=[];
 for(const c of selected(keys)){
  const p=read(card(c,'profile.json'));M.validateProfile(p,c);
  const proof=await B.verifyNative(card(c),p),native=read(card(c,'render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  write(card(c,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json'))});
  await sharp(card(c,'card.png')).resize({width:300}).png().toFile(card(c,'small.png'));
  results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  console.log('Verified '+p.id+' '+p.name);
 }
 await game();await stable();if(!keys)write(file('native-summary.json'),results);return results;
});}
async function publish(){
 assert.equal(process.env.KALISTAR_VULKAR_PUBLISH,'2026-10-18');await stable();
 const result=await require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home}).publish();
 await stable();write(file('published.json'),result);return result;
}
module.exports={prepare,render,verify,publish,game,stable};
if(require.main===module)module.exports[process.argv[2]](process.argv[3]).then(r=>console.log(JSON.stringify(process.argv[2]==='game'?{cards:r.cards.length}:r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
