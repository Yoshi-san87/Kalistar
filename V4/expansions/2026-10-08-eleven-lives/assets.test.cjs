'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const path=require('node:path');
test('Okami native motif uses the original enamel and calibrated optical inset',async()=>{
 const L=require('../../atelier/lib.cjs'),A=require('../../collaborations/nier-pilot-01/assets.cjs');
 const spec=require('./components/components.json');
 const pixels=await L.sharp(path.join(__dirname,'components/race-OKAMI.motif.png')).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 const metrics=A.opticalMetrics(pixels);
 assert(metrics.fullAlphaRadius<=39);assert(metrics.opticalError<=.75);
 assert.equal(spec.race.sha256,await L.hash(path.join(L.ROOT,'V4/atelier/designer-assets/extensions/race-OKAMI.png')));
 const alpha=f=>L.sharp(f).ensureAlpha().extractChannel(3).raw().toBuffer();
 assert.deepEqual(await alpha(path.join(__dirname,'components/flag-Grivka-packed.png')),await alpha(path.join(L.ROOT,'V4/collaborations/ff8-set-01/flag-FF8-packed.png')));
 await L.protectedCheck();await require('../../atelier/designer-render.cjs').verifyAssets();
});

