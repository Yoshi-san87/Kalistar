'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict'),path=require('node:path');
test('Yeti silhouette stays within enamel; four banners preserve the native alpha',async()=>{
 const L=require('../../atelier/lib.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs'),spec=require('./components/components.json');
 const pixels=await L.sharp(path.join(__dirname,'components/race-YETI.motif.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const metrics=A.opticalMetrics(pixels);assert(metrics.fullAlphaRadius<=39);assert(metrics.opticalError<=.75);
 assert.equal(spec.races.YETI.sha256,await L.hash(path.join(__dirname,'components/race-YETI.png')));
 const alpha=f=>L.sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 for(const id of ['FF6','FF9','FF13','FF15']){
  const packed=path.join(__dirname,'components/flag-'+id+'-packed.png');
  assert.equal(await L.hash(packed),spec.factions[id].packedHash);
  assert.equal(await L.hash(path.join(L.ROOT,'V4/site/assets/factions/'+id+'.png')),spec.factions[id].fullHash);
  assert.deepEqual(await alpha(packed),await alpha(path.join(L.ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 }
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
});

