'use strict';
const L=require('../../atelier/lib.cjs');
function inputs(c){
 L.assert(['Draevenheim','Durane','Nestown','Crabazar'].includes(c.faction));
 const bank=L.path.join(L.ROOT,'V4/atelier/designer-assets'),m=L.read(L.path.join(bank,'manifest.json'));
 return ['manifest.json',m.factions[c.faction].file,'race-extensions.json',...(c.race==='CRUSTOS'?['extensions/race-CRUSTOS.png']:[])].map(f=>L.path.join(bank,f));
}
async function replace(layers,c){L.assert.equal(layers.filter(l=>l.name==='FACTION - '+c.faction).length,1);return layers;}
module.exports={inputs,replace};
