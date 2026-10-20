'use strict';
const L=require('../../atelier/lib.cjs'),R=require('../../atelier/designer-render.cjs');
const A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L,file=n=>path.join(__dirname,n);
async function prepare(){
 assert(!fs.existsSync(file('components.json')),'Preserve frozen components');
 await L.protectedCheck();await R.verifyAssets();
 const geometry=read(path.join(R.ASSETS,'manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const source=await sharp(file('banner-source.png')).metadata(),scale=Math.max(geometry.width/source.width,geometry.height/source.height);
 // One uniform scale preserves the circular compass in the narrow native pennant.
 const texture=await sharp(file('banner-source.png')).resize(geometry.width,geometry.height,{fit:'cover',position:'north'}).flatten({background:'#102c2d'}).png().toBuffer();
 const flag=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(flag).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:A.FLAG.width,height:A.FLAG.height}).png().toBuffer();
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(flag),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 fs.writeFileSync(file('flag.png'),flag,{flag:'wx'});fs.writeFileSync(file('flag-packed.png'),packed,{flag:'wx'});
 write(file('components.json'),{geometry:A.FLAG,fullGeometry:geometry,sourceHash:await hash(file('banner-source.png')),outlineHash:await hash(outline),packedHash:await hash(file('flag-packed.png')),fullHash:await hash(file('flag.png')),transform:{fit:'cover',position:'north',source:{width:source.width,height:source.height},scaleX:scale,scaleY:scale}});
 return read(file('components.json'));
}
async function install(){
 const spec=read(file('components.json')),src=file('flag.png'),dest=path.join(ROOT,'V4/site/assets/factions/OCTOPATH.png');
 assert.equal(await hash(src),spec.fullHash);
 if(fs.existsSync(dest))assert.equal(await hash(dest),spec.fullHash);else fs.copyFileSync(src,dest,fs.constants.COPYFILE_EXCL);
 await L.protectedCheck();await R.verifyAssets();return {installed:'OCTOPATH'};
}
async function replace(layers){
 const spec=read(file('components.json')),input=file('flag-packed.png');assert.equal(await hash(input),spec.packedHash);
 const i=layers.findIndex(l=>l.name==='FACTION - Chroma');assert(i>=0);layers[i]={...A.FLAG,name:'FACTION - OCTOPATH',input};return layers;
}
module.exports={prepare,install,replace};
if(require.main===module)module.exports[process.argv[2]]().then(console.log).catch(e=>{console.error(e);process.exitCode=1;});
