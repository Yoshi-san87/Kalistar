'use strict';
const assert=require('node:assert/strict'),before=require('./before.json');
function previousEntry(actual){
 if(actual.nativeRevision?.id!=='2026-10-09-homme-mystere')return actual;
 assert.equal(actual.id,'49901503');assert.equal(actual.name,"L'HOMME MYSTÈRE");
 assert.equal(actual.profile.name,actual.name);assert.equal(actual.profile.characterId,'sphinx-batman');
 assert.deepEqual(actual.nativeRevision,{id:'2026-10-09-homme-mystere',key:'sphinx',proof:'V4/revisions/2026-10-09-homme-mystere/work/verification.json',changedFields:['name'],previous:before.entry.nativeRevision});
 const restored=structuredClone(actual);restored.name=before.entry.name;restored.profile.name=before.entry.profile.name;restored.nativeRevision=actual.nativeRevision.previous;
 assert.deepEqual(restored,before.entry,'No change beyond the documented rename');
 return restored;
}
module.exports={previousEntry};
