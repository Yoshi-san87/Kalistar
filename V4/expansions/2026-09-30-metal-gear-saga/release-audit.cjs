'use strict';
const L=require('../../atelier/lib.cjs'),D=require('../../atelier/designer-core.cjs'),R=require('../../atelier/designer-render.cjs'),M=require('./model.cjs');
const {fs,path,assert,read,write,hash,ROOT}=L,home=__dirname,file=n=>path.join(home,n);
async function main(){
 await L.protectedCheck();await R.verifyAssets();
 const set=M.validateSet(read(file('set.json'))),cat=D.catalogue(),data=await require('../../atelier/game-catalog.cjs').buildCatalog({published:cat.cards.filter(c=>c.kind==='created')});
 M.validateGame(data,set,require('../../site/engine.js').createEngine);
 assert.equal(data.cards.length,138);assert.equal(data.arenas.length,28);
 assert.deepEqual(read(path.join(ROOT,'V4/donnees/arenes-collaborations.json')),read(file('arenas-before.json')));
 for(const c of set.cards){
  const folder=path.join(ROOT,'V4/creations',c.id),v=read(path.join(folder,'verification.json')),meta=read(path.join(folder,'creation.json'));
  M.validateProfile(read(path.join(folder,'profile.json')),c);
  assert(v.passed&&v.roundtrip.changed===0&&v.components.fixedDifferences===0&&v.barcode.passed&&v.typography);
  for(const [name,h] of Object.entries(meta.hashes))assert.equal(await hash(path.join(folder,name)),h,c.key+' '+name);
  require('./build.cjs').guard.preparation(c.key,true);
 }
 const revRoot=path.join(ROOT,'V4/revisions',M.SET),rev=require(path.join(revRoot,'revise.cjs')),published=read(path.join(revRoot,'published.json'));
 const initial=read(file('existing-created.snapshot.json'));
 for(const [f,h] of Object.entries(initial.files))if(!published.changed.includes(f))assert.equal(await hash(path.join(ROOT,f)),h,f);
 for(const entry of initial.entries)if(!rev.cards.some(c=>c.id===entry.id))assert.deepEqual(cat.cards.find(c=>c.id===entry.id),entry);
 for(const c of rev.cards){
  const p=read(path.join(ROOT,'V4/creations',c.id,'profile.json'));rev.profileCheck(c,p);
  const proof=read(path.join(revRoot,'work',c.key,'verification.json'));assert(proof.passed&&proof.scope.outside===0);
 }
 const before=read(file('race-extensions-before.json')),now=read(path.join(ROOT,'V4/atelier/designer-assets/race-extensions.json'));
 for(const [race,spec] of Object.entries(before.races)){assert.deepEqual(now.races[race],spec);assert.equal(await hash(path.join(ROOT,'V4/atelier/designer-assets',spec.file)),spec.sha256);}
 const races=read(file('race-components.json'));for(const spec of Object.values(races.races)){assert(spec.metrics.fullAlphaRadius<39);assert(spec.metrics.opticalError<1);}
 const summary={passed:true,cards:data.cards.length,arenas:data.arenas.length,added:set.cards.length,revised:rev.cards.length,untouchedCreatedCards:initial.entries.length-rev.cards.length,approvedReferencesUnchanged:true,existingRaceComponentsUnchanged:true,profileRanges:true,identities:true};
 write(file('release-audit.json'),summary);return summary;
}
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e);process.exitCode=1;});
module.exports={main};
