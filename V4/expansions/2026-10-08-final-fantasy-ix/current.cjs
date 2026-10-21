'use strict';
const path=require('node:path'),initial=require('./set.json'),revision=require('../../revisions/2026-10-08-ff9-art-direction/plan.json');
const set=structuredClone(initial);
for(const c of set.cards){
 const row=revision.cards.find(r=>r.id===c.id);
 if(row?.artworkSource){c.art=path.basename(row.artworkSource);c.title=row.title;c.description=row.description;}
}
const elementRevision=require('../2026-10-09-skaern-luxo/set.json').revision;
set.cards.find(c=>c.id===elementRevision.id).element=elementRevision.element;
const M=require('./model.cjs'),crystals=require('../../revisions/2026-10-21-collab-kalistels/plan.json');
for(const change of crystals.cards){const c=set.cards.find(c=>c.id===change.id);if(c)c.element=change.element;}
function validateProfile(p,c){
 const change=crystals.cards.find(s=>s.id===c.id);
 if(!change)return M.validateProfile(p,c);
 const prior=require('../../revisions/2026-10-21-collab-kalistels/before.json').entries.find(e=>e.id===c.id).profile;
 const {color,hue}=require('../../../V3/donnees/elements.json')[change.element];
 require('node:assert/strict').deepEqual(p,{...prior,element:change.element,color,hue});
 M.validateProfile(prior,{...c,element:prior.element});
}
module.exports={...M,set,initial,revision,elementRevision,validateProfile};
