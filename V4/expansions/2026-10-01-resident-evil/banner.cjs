'use strict';
const L=require('../../atelier/lib.cjs'),B=require('../../collaborations/resident-evil-banners-01/assets.cjs');
function replace(layers,c){
 const donor=L.read(L.path.join(L.ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const matches=layers.map((l,i)=>l.name==='FACTION - Chroma'?i:-1).filter(i=>i>=0);L.assert.equal(matches.length,1);
 const index=matches[0];for(const k of ['left','top','width','height'])L.assert.equal(layers[index][k],donor[k],'Original Chroma geometry changed');
 const registry=L.read(L.path.join(L.ROOT,'V4/collaborations/resident-evil-banners-01/factions.json')),flag=registry.factions.find(f=>f.id===c.faction);L.assert(flag);
 L.assert.deepEqual(flag.packedGeometry,B.FLAG);layers[index]={...B.FLAG,name:'FACTION - '+c.faction,input:L.path.join(L.ROOT,'V4/collaborations/resident-evil-banners-01',flag.packedFlag)};
 return layers;
}
module.exports={replace};
