'use strict';
const path=require('node:path'),initial=require('./set.json'),revision=require('../../revisions/2026-10-08-ff9-art-direction/plan.json');
const set=structuredClone(initial);
for(const c of set.cards){
 const row=revision.cards.find(r=>r.id===c.id);
 if(row?.artworkSource){c.art=path.basename(row.artworkSource);c.title=row.title;c.description=row.description;}
}
module.exports={set,initial,revision};
