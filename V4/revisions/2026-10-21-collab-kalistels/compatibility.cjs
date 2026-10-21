'use strict';
const assert=require('node:assert/strict'),plan=require('./plan.json'),before=require('./before.json');
const elements=require('../../../V3/donnees/elements.json');
// Validate the entire approved delta before projecting an entry into older tests.
function previousEntry(actual){
 if(actual.nativeRevision?.id!==plan.id)return actual;
 const spec=plan.cards.find(c=>c.id===actual.id),prior=before.entries.find(c=>c.id===actual.id);
 assert(spec&&prior,'Unapproved crystal revision target');
 const expected=structuredClone(prior),{color,hue}=elements[spec.element];
 expected.element=spec.element;Object.assign(expected.profile,{element:spec.element,color,hue});
 expected.nativeRevision={id:plan.id,key:spec.key,proof:'V4/revisions/'+plan.id+'/cards/'+spec.key+'/verification.json',changedFields:plan.changedFields,previous:prior.nativeRevision||null};
 assert.deepEqual(actual,expected,'Only the approved Kalistel fields may change');
 const proof=require('./cards/'+spec.key+'/verification.json');
 assert(proof.passed&&proof.barcode.passed&&proof.numericFacesAndEffectsUnchanged);
 assert.deepEqual(proof.elementChange,{from:'NONE',to:spec.element});
 assert.equal(proof.scope.outside,0);assert.equal(proof.components.fixedDifferences,0);assert.equal(proof.roundtrip.changed,0);
 return structuredClone(prior);
}
function previousCatalogue(catalogue){return {...catalogue,cards:catalogue.cards.map(previousEntry)};}
module.exports={previousEntry,previousCatalogue};
