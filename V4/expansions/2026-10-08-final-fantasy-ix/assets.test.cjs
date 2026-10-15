'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
test('Four race motifs fit the native enamel; FF9 keeps the original flag alpha',async()=>{
 const L=require('../../atelier/lib.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs'),spec=require('./components/components.json');
 for(const race of ['MICE','BATRA','RATZ','MACAKO']){
  const pixels=await L.sharp(path.join(__dirname,'components/race-'+race+'.motif.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const metrics=A.opticalMetrics(pixels);assert(metrics.fullAlphaRadius<=39);assert(metrics.opticalError<=.75);
  assert.equal(spec.races[race].sha256,await L.hash(path.join(__dirname,'components/race-'+race+'.png')));
  const revision=path.join(L.ROOT,'V4/revisions/2026-10-08-ff9-art-direction');
  const current=L.read(path.join(revision,'components/components.json'))[race];
  const revised=await L.sharp(path.join(revision,'components/race-'+race+'.motif.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  const updated=A.opticalMetrics(revised);assert(updated.fullAlphaRadius<=39);assert(updated.opticalError<=.75);
  assert.equal(current.sha256,await L.hash(path.join(L.ROOT,'V4/atelier/designer-assets/extensions/race-'+race+'.png')));
  assert.equal(current.sha256,await L.hash(path.join(revision,'components/race-'+race+'.png')));
 }
 const alpha=f=>L.sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(path.join(__dirname,'components/flag-FF9-packed.png')),await alpha(path.join(L.ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
});
