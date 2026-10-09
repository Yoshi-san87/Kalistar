'use strict';
const assert=require('node:assert/strict'),set=require('./set.json');
const elements=require('../../../V3/donnees/elements.json');
// Old publications remain immutable; only this documented native revision may follow them.
function assertPriorEntry(actual,prior){
  const spec=set.revisions.find(c=>c.id===prior.id);
  if(!spec||actual.nativeRevision?.id!==set.id)return assert.deepEqual(actual,prior);
  assert.equal(actual.profile.element,spec.element);assert.equal(actual.element,spec.element);
  assert.equal(actual.profile.color,elements[spec.element].color);assert.equal(actual.profile.hue,elements[spec.element].hue);assert.equal(actual.profile.sentry,true);
  assert.equal(actual.nativeRevision.key,spec.key);assert.deepEqual(actual.nativeRevision.changedFields,set.changedFields);
  assert.equal(actual.nativeRevision.proof,'V4/expansions/'+set.id+'/cards/'+spec.key+'/verification.json');
  assert.deepEqual(actual.nativeRevision.previous,prior.nativeRevision);
  const restored=structuredClone(actual);restored.element=prior.element;
  for(const key of set.changedFields)restored.profile[key]=prior.profile[key];
  if(prior.nativeRevision)restored.nativeRevision=prior.nativeRevision;else delete restored.nativeRevision;
  assert.deepEqual(restored,prior);
}
module.exports={assertPriorEntry};
