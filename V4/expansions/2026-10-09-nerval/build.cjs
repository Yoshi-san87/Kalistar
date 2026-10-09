'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname;
const file=n=>path.join(home,n),card=n=>file('cards/nerval/'+n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const spec=require('./set.json').cards[0];
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function stable(){
  await L.protectedCheck();await R.verifyAssets();
  if(fs.existsSync(file('before.json'))){
    const b=read(file('before.json'));
    for(const [f,h]of Object.entries(b.inputs))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);
    const now=read(D.CATALOGUE);
    for(const c of b.catalogue.cards)assert.deepEqual(now.cards.find(n=>n.id===c.id),c,'Existing catalogue entry changed: '+c.id);
  }
}
async function prepare(){return B.locked(async()=>{
  assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();M.validateSet(require('./set.json'));
  assert(!D.catalogue().cards.some(c=>c.id===spec.id||c.profile.characterId===spec.characterId));
  assert(!fs.existsSync(path.join(ROOT,'V4/creations',spec.id)));
  const p=M.profile(spec),layers=await R.components(M.donor(spec),{id:p.id,positionsText:false}),art=path.join(ROOT,spec.artworkSource);
  // Keep the approved face and upper staff in the native illustration window.
  layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
  fs.mkdirSync(card('render'),{recursive:true});write(card('profile.json'),p);fs.copyFileSync(art,card('illustration.png'),fs.constants.COPYFILE_EXCL);
  const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
  for(const [i,l]of layers.entries()){
    const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(card('render/'+f));
    plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
  }
  write(card('render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(card('render/expected-components.png'));
  const files=['set.json','model.cjs','fixtures.cjs','build.cjs','compose.jsx','render.ps1'].map(file);
  files.push(art,...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(card),...plan.layers.map(l=>card('render/'+l.file)));
  for(const f of ['V4/expansions/2026-10-04-city-guards/compose-one.jsx','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/template-stable/icon-layouts.json'])files.push(path.join(ROOT,f));
  write(file('before.json'),{catalogue:read(D.CATALOGUE),inputs:await hashes(files)});await stable();return {prepared:p.id};
});}
async function render(){assert.equal(process.env.KALISTAR_NERVAL_PS,'2026-10-09');return B.locked(async()=>{
  await stable();assert(!fs.existsSync(card('card.psd')));
  const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
  await stable();return result;
});}
async function verify(){return B.locked(async()=>{
  await stable();const p=read(card('profile.json'));M.validateProfile(p,spec);
  const proof=await B.verifyNative(card(''),p),native=read(card('render/native.json'));
  const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
  if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
  assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
  assert.equal(native.photoshop,'26.11.8');
  write(card('verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json'))});
  await sharp(card('card.png')).resize({width:300}).png().toFile(card('small.png'));await stable();
  return {id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed};
});}
async function publish(){
  assert.equal(process.env.KALISTAR_NERVAL_PUBLISH,'2026-10-09');await stable();
  const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home});
  const result=await publisher.publish();await stable();write(file('published.json'),result);return result;
}
module.exports={prepare,render,verify,publish};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
