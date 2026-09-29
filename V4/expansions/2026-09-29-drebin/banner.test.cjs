'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),L=require('../../atelier/lib.cjs');
const root=L.path.join(L.ROOT,'V4/revisions/2026-09-27-mgs-banner-refinement/art-flags');
for(const c of require('./set.json').cards)test(c.key+' uses the exact calibrated packed banner',async()=>{
  const def=L.read(L.path.join(root,'factions.json')).factions.find(f=>f.id===c.faction);
  const render=L.path.join(__dirname,'cards',c.key,'render');
  const l=L.read(L.path.join(render,'composition.json')).layers.find(l=>l.name==='FACTION - '+c.faction);
  const meta=await L.sharp(L.path.join(root,def.packedFlag)).metadata();
  assert.deepEqual([meta.width,meta.height],[l.width,l.height]);
  const diff=await L.diff(L.path.join(root,def.packedFlag),L.path.join(render,l.file));
  assert.equal(diff.changed,0);
});
