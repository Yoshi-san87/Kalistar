'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,n);
async function prepare(){
  assert(!fs.existsSync(file('components/components.json')),'Do not replace frozen assets');
  await L.protectedCheck();await R.verifyAssets();
  const geometry=read(path.join(R.ASSETS,'manifest.json')).factions.Chroma;
  const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
  const texture=await sharp(file('components/source-Gotham.png')).trim().resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:'#111415'}).png().toBuffer();
  const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
  const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
  const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
  assert.deepEqual(await alpha(flag),await alpha(outline));
  assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
  fs.writeFileSync(file('components/flag-Gotham.png'),flag,{flag:'wx'});
  fs.writeFileSync(file('components/flag-Gotham-packed.png'),packed,{flag:'wx'});
  write(file('components/components.json'),{geometry:A.FLAG,sourceHash:await hash(file('components/source-Gotham.png')),packedHash:await hash(file('components/flag-Gotham-packed.png')),fullHash:await hash(file('components/flag-Gotham.png')),alphaMatchesNative:true});
}
async function install(){
  const source=file('components/flag-Gotham.png'),dest=path.join(ROOT,'V4/site/assets/factions/Gotham.png');
  if(fs.existsSync(dest))assert(fs.readFileSync(source).equals(fs.readFileSync(dest)));
  else fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
}
async function replace(layers){
  const spec=read(file('components/components.json')),input=file('components/flag-Gotham-packed.png');
  assert.equal(await hash(input),spec.packedHash);
  const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);
  layers[i]={...A.FLAG,name:'FACTION - Gotham',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(()=>console.log('Gotham assets ready')).catch(e=>{console.error(e);process.exitCode=1;});
