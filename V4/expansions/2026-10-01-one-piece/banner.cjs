'use strict';
const B=require('../../collaborations/one-piece-assets-01/assets.cjs');
const L=require('../../atelier/lib.cjs');
function replace(layers,c){
 L.assert.equal(c.faction,'ONEPIECE');
 const donor=L.read(L.path.join(L.ROOT,'V4/atelier/designer-assets/manifest.json')).factions.Chroma;
 const matches=layers.map((l,i)=>l.name==='FACTION - Chroma'?i:-1).filter(i=>i>=0);L.assert.equal(matches.length,1);
 const index=matches[0];for(const key of ['left','top','width','height'])L.assert.equal(layers[index][key],donor[key],'Donor Chroma geometry changed');
 layers[index]={...B.FLAG,name:'FACTION - ONEPIECE',input:L.path.join(L.ROOT,'V4/collaborations/one-piece-assets-01/flag-ONEPIECE-packed.png')};
 return layers;
}
module.exports={replace};
