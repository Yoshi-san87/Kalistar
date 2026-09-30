'use strict';
const L=require('../../atelier/lib.cjs');
const {FLAG}=require('./prepare.cjs');
const file=n=>L.path.join(__dirname,n);
const ids=Array.from({length:9},(_,i)=>'RE'+(i+1));
async function verify(){
  const entries=L.read(file('factions.json')).factions;
  L.assert.deepEqual(entries.map(f=>f.id),ids);
  const outline=L.path.join(L.ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png');
  const alpha=p=>L.sharp(p).ensureAlpha().extractChannel(3).raw().toBuffer();
  for(const f of entries){
    for(const [name,key] of [[f.flag,'flagHash'],[f.packedFlag,'packedHash'],[f.source,'sourceHash']])L.assert.equal(await L.hash(file(name)),f[key]);
    const meta=await L.sharp(file(f.packedFlag)).metadata();
    L.assert.equal(meta.width,98);L.assert.equal(meta.height,223);
    L.assert.deepEqual(await alpha(file(f.packedFlag)),await alpha(outline));
  }
}
function banner(layers,spec){
  L.assert(ids.includes(spec.faction),'Unknown Resident Evil faction');
  const index=layers.findIndex(l=>l.left===FLAG.left&&l.top===FLAG.top&&l.width===FLAG.width&&l.height===FLAG.height);
  L.assert(index>=0,'Missing packed faction layer');
  layers[index]={...FLAG,name:'FACTION - '+spec.faction,input:file('flag-'+spec.faction+'-packed.png')};
  return layers;
}
const inputs=()=>['factions.json',...ids.flatMap(id=>['flag-'+id+'.png','flag-'+id+'-packed.png'])].map(file);
module.exports={verify,banner,inputs,FLAG};
