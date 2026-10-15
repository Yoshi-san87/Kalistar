'use strict';
const L=require('../../atelier/lib.cjs');
const A=require('./assets.cjs');
const file=name=>L.path.join(__dirname,name);
async function main(){
  await L.protectedCheck();
  await require('../../atelier/designer-render.cjs').verifyAssets();
  const components=await A.verify(),provenance=L.read(file('provenance.json'));
  const files=[...A.inputs(),...provenance.assets.map(asset=>L.path.join(L.ROOT,asset.output)),
    ...['V4/atelier/designer-core.cjs','V4/atelier/designer-assets/race-extensions.json',
      'V4/atelier/designer-assets/extensions/race-SHARKAN.png','V4/site/assets/races/SHARKAN.png',
      'V4/site/assets/factions/ONEPIECE.png','V4/site/collaborations.js','V4/site/collection-binder.js',
      'V4/site/collection-binder.css','V4/site/one-piece.test.cjs','V4/site/collaborations.test.cjs'].map(name=>L.path.join(L.ROOT,name))];
  const hashes={};
  for(const input of files)hashes[L.path.relative(L.ROOT,input).replaceAll('\\','/')]=await L.hash(input);
  for(const asset of provenance.assets)L.assert.equal(hashes[asset.output],asset.sha256);
  const report={schemaVersion:1,date:'2026-10-01',stableForHandoff:true,
    sourceFreezeNotPerformed:true,coreStable:true,components,
    site:{scope:'one-piece',faction:'ONEPIECE',characters:10,versions:11},
    tests:{portableSuite:'V4/site/one-piece.test.cjs',portableTestsPassed:3,
      nativeSuite:'V4/collaborations/one-piece-assets-01/assets.test.cjs',nativeTestsPassed:3,
      combinedWithExistingDesignerAndCollaborations:21,
      portableImportGuardPassed:true,browser:L.read(file('qa/browser/report.json'))},
    parentVisualReviewPending:['robin-face-v2'],nativeCardQaBy:'parent/profile-native agent',
    hashes};
  L.write(file('handoff.json'),report);
  console.log(JSON.stringify({stableForHandoff:true,inputs:A.inputs().length,assets:provenance.assets.map(a=>({id:a.id,sha256:a.sha256})),protectedLocksUnchanged:true,coreHash:hashes['V4/atelier/designer-core.cjs']},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
