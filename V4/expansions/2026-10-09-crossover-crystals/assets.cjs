'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,n);
const FLAG={left:672,top:829,width:98,height:223};
async function prepare(){
  assert(!fs.existsSync(file('components/components.json')),'Assets already frozen');
  await L.protectedCheck();await R.verifyAssets();
  fs.mkdirSync(file('components'),{recursive:true});
  const geometry=read(path.join(R.ASSETS,'manifest.json')).factions.Chroma;
  const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const source=file('art/xmen-banner-approved.png');
  const texture=await sharp(source).trim().resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:'#102334'}).png().toBuffer();
  const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
  const packed=await sharp(flag).extract({left:FLAG.left-geometry.left,top:FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
  const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
  assert.deepEqual(await alpha(flag),await alpha(outline));
  assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
  fs.writeFileSync(file('components/flag-XMEN.png'),flag,{flag:'wx'});
  fs.writeFileSync(file('components/flag-XMEN-packed.png'),packed,{flag:'wx'});
  write(file('components/components.json'),{geometry:FLAG,source:'../art/xmen-banner-approved.png',sourceHash:await hash(source),packedHash:await hash(file('components/flag-XMEN-packed.png')),fullHash:await hash(file('components/flag-XMEN.png')),alphaMatchesNative:true,reusedApprovedBanner:true});
}
async function install(){
  const source=file('components/flag-XMEN.png'),dest=path.join(ROOT,'V4/site/assets/factions/XMEN.png');
  if(fs.existsSync(dest))assert.equal(await hash(source),await hash(dest));
  else fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
}
async function replace(layers,p){
  if(p.faction==='Gotham')return require('../2026-10-09-gotham/assets.cjs').replace(layers);
  if(p.faction==='WITCHER')return require('../2026-10-01-one-piece-witcher/flags.cjs').replace(layers,p);
  assert.equal(p.faction,'XMEN');
  const spec=read(file('components/components.json')),input=file('components/flag-XMEN-packed.png');
  assert.equal(await hash(input),spec.packedHash);
  const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);
  layers[i]={...FLAG,name:'FACTION - XMEN',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(()=>console.log('Assets ready')).catch(e=>{console.error(e);process.exitCode=1;});
