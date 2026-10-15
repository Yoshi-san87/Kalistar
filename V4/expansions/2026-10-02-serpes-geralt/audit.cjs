'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs');
const B=require('./build.cjs'),M=require('./model.cjs');
async function main(){
  const set=M.validateSet(require('./set.json'));
  await L.protectedCheck(); await require('../../atelier/designer-render.cjs').verifyAssets();
  const snapshot=B.guard.assertExisting(); B.guard.publication();
  const data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:D.catalogue().cards.filter(c=>c.kind==='created')});
  const game=M.validateGame(data,set,require('../../site/engine.js').createEngine);
  L.assert.equal(data.cards.length,192); L.assert.equal(data.arenas.length,28);
  const cards=[];
  for(const spec of set.cards){
    const dir=L.path.join(L.ROOT,'V4/creations',spec.id),p=L.read(L.path.join(dir,'profile.json'));
    M.validateProfile(p,spec);
    const proof=L.read(L.path.join(dir,'verification.json'));
    L.assert.equal(proof.passed,true); L.assert.equal(proof.roundtrip.changed,0);
    L.assert.equal(proof.components.fixedDifferences,0); L.assert.equal(proof.barcode.passed,true);
    cards.push({id:spec.id,name:spec.name,pngHash:await L.hash(L.path.join(dir,'card.png')),psdHash:await L.hash(L.path.join(dir,'card.psd')),native:proof.passed,barcode:proof.barcode.passed,reopenedDifferences:proof.roundtrip.changed,fixedFrameDifferences:proof.components.fixedDifferences});
  }
  const report={passed:true,cards:data.cards.length,arenas:data.arenas.length,game,protectedReferencesUnchanged:true,existingCreatedPreserved:snapshot.entries.length,existingFilesPreserved:Object.keys(snapshot.files).length,added:cards,geraltWhiteStillPending:!data.cards.some(c=>c.id==='49900102')};
  L.write(L.path.join(__dirname,'audit.json'),report);return report;
}
module.exports={main};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
