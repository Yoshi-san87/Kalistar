'use strict';
const assert=require('node:assert/strict'),S=require('./rules.cjs'),before=require('./before.json'),plan=require('./plan.json');
// Older artwork audits compare their original cohort, after verifying this explicit later revision.
function entryBeforeRevision(entry){
 const row=plan.cards.find(r=>r.id===entry.id);
 if(!row||entry.nativeRevision?.id!==S.REV)return entry;
 const original=before.cards.find(c=>c.id===entry.id).catalogueEntry;
 assert.deepEqual(entry.profile,S.after(original.profile,row));
 assert.deepEqual(entry.nativeRevision.previous,original.nativeRevision||null);
 assert.deepEqual(entry.nativeRevision.changedFields,S.FIELDS);
 const projected={...entry,profile:original.profile,nativeRevision:entry.nativeRevision.previous};
 if(!original.nativeRevision)delete projected.nativeRevision;
 assert.deepEqual(projected,original,'Non-combat catalogue metadata changed');
 const proof=require('./work/'+entry.id+'/verification.json');
 assert(proof.passed&&proof.preservedArtworkAndIdentity&&proof.barcode.passed);
 assert.equal(proof.scope.outside,0);assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);
 return projected;
}
module.exports={entryBeforeRevision};
