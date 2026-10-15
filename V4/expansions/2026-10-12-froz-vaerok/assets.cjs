'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const {FLAG}=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,'components',n);
async function prepare(){
 await L.protectedCheck();await R.verifyAssets();
 assert(!fs.existsSync(file('components.json')),'Do not replace frozen faction components');
 const geometry=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const source=file('source-Froz.png');
 const texture=await sharp(source).resize(geometry.width,geometry.height,{fit:'fill'}).png().toBuffer();
 const flag=await sharp(texture).composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:FLAG.left-geometry.left,top:FLAG.top-geometry.top,width:FLAG.width,height:FLAG.height}).png().toBuffer();
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 fs.writeFileSync(file('flag-Froz.png'),flag,{flag:'wx'});fs.writeFileSync(file('flag-Froz-packed.png'),packed,{flag:'wx'});
 write(file('components.json'),{faction:{id:'Froz',geometry:FLAG,sourceHash:await hash(source),fullHash:await hash(file('flag-Froz.png')),packedHash:await hash(file('flag-Froz-packed.png'))},outline:path.relative(ROOT,outline),outlineHash:await hash(outline)});
 return {faction:'Froz',geometry:FLAG};
}
async function install(){
 const s=read(file('components.json')).faction,source=file('flag-Froz.png'),dest=path.join(ROOT,'V4/site/assets/factions/Froz.png');
 assert.equal(await hash(source),s.fullHash);
 if(fs.existsSync(dest))assert.equal(await hash(dest),s.fullHash);else fs.copyFileSync(source,dest,fs.constants.COPYFILE_EXCL);
 await L.protectedCheck();await R.verifyAssets();return {faction:'Froz',installed:true};
}
async function replace(layers,c){
 assert.equal(c.faction,'Froz');
 const spec=read(file('components.json')).faction,input=file('flag-Froz-packed.png');
 assert.equal(await hash(input),spec.packedHash);
 const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);
 layers[i]={...FLAG,name:'FACTION - Froz',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
