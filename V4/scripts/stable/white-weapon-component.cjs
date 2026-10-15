'use strict';
const L=require('../../atelier/lib.cjs'),W=require('../../site/base-weapons.js');
const {assert,fs,path,ROOT,sharp,hash}=L;
// Native exports reuse the screen glyph, retaining the approved enamel alpha edge.
async function component(family,previous,layout=W.native){
 const code=W.code(family);assert.notEqual(code,null,'Unknown weapon family');
 const svg=path.join(ROOT,'V4/site',W.asset(code).split('?')[0]);
 const enamel=path.join(ROOT,'V4/site/assets/base-weapons/enamel.png');
 const meta=await sharp(previous).metadata(),{width,height}=meta;
 assert.equal(width,96);assert([95,97].includes(height));
 const left=W.native.left-layout.left,top=W.native.top-layout.top;
 assert.equal(left,0);assert.equal(top,(height-95)/2);
 const alpha=await sharp(previous).ensureAlpha().extractChannel(3).raw().toBuffer();
 const rgb=await sharp({create:{width,height,channels:4,background:'#0c2030'}}).composite([{input:enamel,left,top},{input:fs.readFileSync(svg),left,top}]).removeAlpha().raw().toBuffer();
 const input=await sharp(rgb,{raw:{width,height,channels:3}}).joinChannel(alpha,{raw:{width,height,channels:1}}).png().toBuffer();
 return {input,source:path.relative(ROOT,svg).replaceAll('\\','/'),sourceHash:await hash(svg),enamelHash:await hash(enamel)};
}
module.exports={component,native:W.native};
