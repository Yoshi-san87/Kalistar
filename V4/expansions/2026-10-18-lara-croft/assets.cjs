'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,n);
async function prepare(){
 assert(!fs.existsSync(file('components/components.json')),'Preserve frozen components');
 await L.protectedCheck();await R.verifyAssets();fs.mkdirSync(file('components'),{recursive:true});
 const geometry=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const texture=await sharp(file('banner-source.png')).trim().resize(geometry.width,geometry.height,{fit:'fill'}).flatten({background:'#102b2b'}).png().toBuffer();
 const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:98,height:223}).png().toBuffer();
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 fs.writeFileSync(file('components/flag-TOMBRAIDER.png'),flag,{flag:'wx'});
 fs.writeFileSync(file('components/flag-TOMBRAIDER-packed.png'),packed,{flag:'wx'});
 write(file('components/components.json'),{faction:{id:'TOMBRAIDER',geometry:A.FLAG,sourceHash:await hash(file('banner-source.png')),outlineHash:await hash(outline),packedHash:await hash(file('components/flag-TOMBRAIDER-packed.png')),fullHash:await hash(file('components/flag-TOMBRAIDER.png'))}});
 return {faction:'TOMBRAIDER',geometry:A.FLAG};
}
async function install(){
 const spec=read(file('components/components.json')),src=file('components/flag-TOMBRAIDER.png'),dest=path.join(ROOT,'V4/site/assets/factions/TOMBRAIDER.png');
 assert.equal(await hash(src),spec.faction.fullHash);
 if(fs.existsSync(dest))assert.equal(await hash(dest),spec.faction.fullHash);else fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);
 await L.protectedCheck();await R.verifyAssets();return {installed:'TOMBRAIDER',previousComponentsPreserved:true};
}
async function replace(layers){
 const spec=read(file('components/components.json')),input=file('components/flag-TOMBRAIDER-packed.png');
 assert.equal(await hash(input),spec.faction.packedHash);
 const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);
 layers[i]={...A.FLAG,name:'FACTION - TOMBRAIDER',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
