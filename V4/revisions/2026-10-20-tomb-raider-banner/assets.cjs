'use strict';
const L=require('../../atelier/lib.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs');
const {fs,path,assert,read,write,hash,sharp,ROOT}=L;
const file=n=>path.join(__dirname,n),WEB='V4/site/assets/factions/TOMBRAIDER-native-v2.png';
async function prepare(){
 assert(!fs.existsSync(file('components.json')),'Preserve frozen components');
 const geometry=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const outline=path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8.png');
 const trimmed=await sharp(file('banner-source.png')).trim().png().toBuffer();
 const source=await sharp(trimmed).metadata(),scale=Math.max(geometry.width/source.width,geometry.height/source.height);
 // Uniform scaling preserves the circular compass; the existing native contour clips only the cloth.
 const texture=await sharp(trimmed).resize(geometry.width,geometry.height,{fit:'cover',position:'north'}).flatten({background:'#103331'}).png().toBuffer();
 const full=await sharp(texture).ensureAlpha().composite([{input:outline,blend:'dest-in'}]).png().toBuffer();
 const packed=await sharp(full).extract({left:A.FLAG.left-geometry.left,top:A.FLAG.top-geometry.top,width:A.FLAG.width,height:A.FLAG.height}).png().toBuffer();
 const alpha=f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(full),await alpha(outline));
 assert.deepEqual(await alpha(packed),await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 fs.writeFileSync(file('flag.png'),full,{flag:'wx'});fs.writeFileSync(file('flag-packed.png'),packed,{flag:'wx'});
 write(file('components.json'),{geometry:A.FLAG,fullGeometry:geometry,web:WEB,sourceHash:await hash(file('banner-source.png')),fullHash:await hash(file('flag.png')),packedHash:await hash(file('flag-packed.png')),transform:{fit:'cover',position:'north',source:{width:source.width,height:source.height},scaleX:scale,scaleY:scale}});
 return read(file('components.json'));
}
module.exports={prepare,WEB};
if(require.main===module)prepare().then(console.log).catch(e=>{console.error(e);process.exitCode=1});
