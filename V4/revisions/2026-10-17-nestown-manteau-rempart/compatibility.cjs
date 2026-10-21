'use strict';
const assert=require('node:assert/strict'),before=require('./before.json'),REV='2026-10-17-nestown-manteau-rempart';
// Historical assertions retain their snapshots after checking the exact approved later art revision.
function previousEntry(actual){
 actual=require('../2026-10-21-collab-kalistels/compatibility.cjs').previousEntry(actual);
 if(actual.nativeRevision?.id!==REV)return actual;
 const c=before.cards.find(c=>c.id===actual.id);assert(c,'Unapproved Nestown target');
 assert.deepEqual(actual.nativeRevision,{id:REV,key:c.key,proof:'V4/revisions/'+REV+'/cards/'+c.key+'/verification.json',changedFields:['artwork'],previous:c.entry.nativeRevision||null});
 assert.equal(actual.profile.artworkSource,'V4/revisions/'+REV+'/cards/'+c.key+'/illustration.png');
 assert.equal(actual.profile.visual_revision,'V4-'+REV);
 const restored=structuredClone(actual);
 restored.profile.artworkSource=c.entry.profile.artworkSource;restored.profile.visual_revision=c.entry.profile.visual_revision;
 if(c.entry.nativeRevision)restored.nativeRevision=c.entry.nativeRevision;else delete restored.nativeRevision;
 assert.deepEqual(restored,c.entry,'No changes beyond the approved illustration provenance');
 const proof=require('./cards/'+c.key+'/verification.json');
 assert(proof.passed&&proof.gameplayUnchanged&&proof.barcode.passed);assert.equal(proof.artOnly.outside,0);
 assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);
 return restored;
}
function previousCatalogue(catalogue){return {...catalogue,cards:catalogue.cards.map(previousEntry)};}
module.exports={previousEntry,previousCatalogue};
