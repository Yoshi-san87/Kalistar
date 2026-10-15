'use strict';
const L=require('../../atelier/lib.cjs'),B=require('../../collaborations/one-piece-assets-01/assets.cjs');
const {path,ROOT,assert,sharp,fs,read,hash}=L,FLAG={left:672,top:829,width:98,height:223};
const file=n=>path.join(__dirname,n);
function inputs(c){return c.faction==='ONEPIECE'?[path.join(ROOT,'V4/collaborations/one-piece-assets-01/flag-ONEPIECE-packed.png')]:[file('flag-WITCHER-packed.png'),file('faction.json')];}
async function replace(layers,c){
 if(c.faction==='ONEPIECE')return require('../2026-10-01-one-piece/banner.cjs').replace(layers,c);
 assert.equal(c.faction,'WITCHER');const spec=read(file('faction.json')),f=file('flag-WITCHER-packed.png');
 assert.equal(await hash(f),spec.packedHash);
 const meta=await sharp(f).metadata();assert.equal(meta.width,98);assert.equal(meta.height,223);
 const alpha=async f=>sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert((await alpha(f)).equals(await alpha(path.join(ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png'))));
 const donor=read(path.join(ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const indexes=layers.map((l,i)=>l.name==='FACTION - Chroma'?i:-1).filter(i=>i>=0);assert.equal(indexes.length,1);
 for(const k of ['left','top','width','height'])assert.equal(layers[indexes[0]][k],donor[k],'Donor geometry changed');
 layers[indexes[0]]={...FLAG,name:'FACTION - WITCHER',input:f};return layers;
}
module.exports={replace,inputs,FLAG};
