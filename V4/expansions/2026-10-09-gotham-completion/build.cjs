'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs'),A=require('../2026-10-09-gotham/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname,file=n=>path.join(home,n);
const set=()=>M.validateSet(read(file('set.json'))),card=(key,n='')=>file('cards/'+key+'/'+n);
const rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
async function hashes(files){const out={};for(const f of files)out[rel(f)]=await hash(f);return out;}
async function stable(){
  await L.protectedCheck();await R.verifyAssets();
  if(fs.existsSync(file('before.json'))){
    const b=read(file('before.json'));
    for(const [f,h]of Object.entries(b.inputs))assert.equal(await hash(path.join(ROOT,f)),h,'Frozen input changed: '+f);
    const now=read(D.CATALOGUE);
    for(const c of b.catalogue.cards)assert.deepEqual(now.cards.find(n=>n.id===c.id),c,'Existing entry changed: '+c.id);
  }
}
async function prepare(){return B.locked(async()=>{
  assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();
  const files=['set.json','model.cjs','build.cjs','compose.jsx','render.ps1','input-provenance.json'].map(file);
  for(const spec of set().cards){
    assert(!D.catalogue().cards.some(c=>c.id===spec.id||c.profile.characterId===spec.characterId));
    assert(!fs.existsSync(path.join(ROOT,'V4/creations',spec.id)));
    const p=M.profile(spec),layers=await A.replace(await R.components(M.donor(spec),{id:p.id,positionsText:false}));
    const art=path.join(ROOT,spec.artworkSource);
    layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
    fs.mkdirSync(card(spec.key,'render'),{recursive:true});
    write(card(spec.key,'profile.json'),p);fs.copyFileSync(art,card(spec.key,'illustration.png'),fs.constants.COPYFILE_EXCL);
    const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for(const [i,l]of layers.entries()){
      const name='component-'+String(i).padStart(2,'0')+'.png';
      await sharp(l.input).png().toFile(card(spec.key,'render/'+name));
      plan.layers.push({file:name,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
    }
    write(card(spec.key,'render/composition.json'),plan);
    await sharp(await R.composite(layers)).png().toFile(card(spec.key,'render/expected-components.png'));
    files.push(art,...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(spec.key,n)),...plan.layers.map(l=>card(spec.key,'render/'+l.file)));
  }
  files.push(...['V4/expansions/2026-10-04-city-guards/compose-one.jsx','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/template-stable/icon-layouts.json','V4/site/assets/factions/Gotham.png','V4/expansions/2026-10-09-gotham/model.cjs','V4/expansions/2026-10-09-gotham/assets.cjs','V4/expansions/2026-10-09-gotham/components/components.json','V4/expansions/2026-10-09-gotham/components/flag-Gotham-packed.png'].map(f=>path.join(ROOT,f)));
  write(file('before.json'),{catalogue:read(D.CATALOGUE),inputs:await hashes(files)});await stable();
  return {prepared:set().cards.map(c=>c.id)};
});}
async function render(){
  assert.equal(process.env.KALISTAR_GOTHAM_COMPLETION_PS,'2026-10-09');
  return B.locked(async()=>{
    await stable();for(const c of set().cards)assert(!fs.existsSync(card(c.key,'card.psd')));
    const output=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
    await stable();return output;
  });
}
async function verify(){return B.locked(async()=>{
  await stable();const checks=[];
  for(const c of set().cards){
    const out=card(c.key),p=read(card(c.key,'profile.json'));M.validateProfile(p,c);
    const proof=await B.verifyNative(out,p),native=read(card(c.key,'render/native.json'));
    const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
    if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
    assert.equal(native.photoshop,'26.11.8');assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
    if(p.element==='NONE')proof.none=await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(out,read(card(c.key,'render/composition.json')),read(path.join(R.ASSETS,'manifest.json')));
    write(card(c.key,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json'))});
    await sharp(card(c.key,'card.png')).resize({width:300}).png().toFile(card(c.key,'small.png'));
    checks.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  }
  await stable();write(file('native-checks.json'),checks);return checks;
});}
async function publish(){
  assert.equal(process.env.KALISTAR_GOTHAM_COMPLETION_PUBLISH,'2026-10-09');await stable();
  const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home});
  const result=await publisher.publish();await stable();write(file('published.json'),result);return result;
}
module.exports={prepare,render,verify,publish,stable};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
