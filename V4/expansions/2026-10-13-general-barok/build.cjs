'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs');
const B=require('../../collaborations/nier-pilot-01/build.cjs'),M=require('./model.cjs');
const A=require('../2026-10-12-froz-vaerok/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,home=__dirname;
const file=n=>path.join(home,n),card=(s,n='')=>file('cards/'+s.key+'/'+n),rel=p=>path.relative(ROOT,p).replaceAll('\\','/');
const set=()=>M.validateSet(read(file('set.json')));
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
async function game(){
  const s=set(),published=D.catalogue().cards.filter(c=>c.kind==='created'&&!s.cards.some(v=>v.id===c.id));
  published.push(...s.cards.map(c=>({id:c.id,profile:M.profile(c),pngUrl:'/media/created/'+c.id+'.png'})));
  const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published});
  M.validateGame(data,s,require('../../site/engine.js').createEngine);return data;
}
async function prepare(){return B.locked(async()=>{
  assert(!fs.existsSync(file('before.json')),'Never overwrite frozen production');await stable();await game();
  const files=['set.json','model.cjs','fixtures.cjs','build.cjs','compose.jsx','render.ps1'].map(file);
  files.push(...['assets.cjs','components/components.json','components/flag-Froz-packed.png'].map(n=>path.join(home,'../2026-10-12-froz-vaerok',n)));
  const catalogue=read(D.CATALOGUE);
  for(const s of set().cards){
    assert(!catalogue.cards.some(c=>c.id===s.id||c.profile.characterId===s.characterId));
    assert(!fs.existsSync(path.join(ROOT,'V4/creations',s.id)));
    const p=M.profile(s),layers=await A.replace(await R.components(M.donor(s),{id:p.id,positionsText:false}),p),art=path.join(ROOT,s.artworkSource);
    // Fit the approved image proportionally, retaining the face and raised weapon.
    layers[0]={...layers[0],input:await sharp(art).resize(R.ART.width,R.ART.height,{fit:'cover',position:'north'}).png().toBuffer()};
    fs.mkdirSync(card(s,'render'),{recursive:true});write(card(s,'profile.json'),p);
    fs.copyFileSync(art,card(s,'illustration.png'),fs.constants.COPYFILE_EXCL);
    const plan={textSource:L.baseline().cards.find(c=>c.key==='ruby').psd,layers:[]};
    for(const [i,l]of layers.entries()){
      const f='component-'+String(i).padStart(2,'0')+'.png';await sharp(l.input).png().toFile(card(s,'render/'+f));
      plan.layers.push({file:f,name:l.name,left:l.left,top:l.top,width:l.width,height:l.height});
    }
    write(card(s,'render/composition.json'),plan);await sharp(await R.composite(layers)).png().toFile(card(s,'render/expected-components.png'));
    files.push(art,...['profile.json','illustration.png','render/composition.json','render/expected-components.png'].map(n=>card(s,n)),...plan.layers.map(l=>card(s,'render/'+l.file)));
  }
  for(const f of ['V4/expansions/2026-10-04-city-guards/compose-one.jsx','V4/atelier/designer-core.cjs','V4/atelier/designer-render.cjs','V4/template-stable/icon-layouts.json'])files.push(path.join(ROOT,f));
  write(file('before.json'),{catalogue,inputs:await hashes(files)});await stable();return {prepared:set().cards.map(c=>c.id)};
});}
async function render(){assert.equal(process.env.KALISTAR_BAROK_PS,'2026-10-13');return B.locked(async()=>{
  await stable();for(const s of set().cards)assert(!fs.existsSync(card(s,'card.psd')));
  const result=await R.command('powershell.exe',['-NoProfile','-NonInteractive','-ExecutionPolicy','RemoteSigned','-File',file('render.ps1')],file('photoshop.log'));
  await stable();return result;
});}
async function verify(){return B.locked(async()=>{
  await stable();const results=[];
  for(const s of set().cards){
    const p=read(card(s,'profile.json'));M.validateProfile(p,s);
    const proof=await B.verifyNative(card(s),p),native=read(card(s,'render/native.json'));
    const typographyCheck=require('../2026-10-06-fifteen-faces/accent-typography.cjs').verify(native);
    if(!typographyCheck.accented)require('../../collaborations/nier-pilot-01/typography.cjs').verify(native);
    assert(native.layers.find(l=>l.name==='DESCRIPTION').text.split('\r').length<=4);
    assert.equal(native.photoshop,'26.11.8');
    write(card(s,'verification.json'),{...proof,typographyCheck,inputManifestHash:await hash(file('before.json'))});
    await sharp(card(s,'card.png')).resize({width:300}).png().toFile(card(s,'small.png'));
    results.push({id:p.id,fixed:proof.components.fixedDifferences,reopened:proof.roundtrip.changed,barcode:proof.barcode.passed});
  }
  const thumbs=[];for(const [i,s]of set().cards.entries())thumbs.push({input:await sharp(card(s,'card.png')).resize({width:300}).png().toBuffer(),left:i*312+12,top:12});
  await sharp({create:{width:324,height:526,channels:4,background:'#101918'}}).composite(thumbs).png().toFile(file('cards-overview.png'));
  await game();await stable();return results;
});}
async function publish(){
  assert.equal(process.env.KALISTAR_BAROK_PUBLISH,'2026-10-13');await stable();
  const publisher=require('../2026-09-27-metal-gear-mines/publication-core.cjs').createPublisher({L,D,model:M,home});
  const result=await publisher.publish();await stable();write(file('published.json'),result);return result;
}
module.exports={prepare,render,verify,publish,game};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
