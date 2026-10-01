'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), M = require('./model.cjs'), set = require('./set.json');
test('exact requested Rikka profile and final image 04',()=>M.validateSet(set));
test('reject identity, gameplay and superseded-art drift',()=>{
  for (const change of [c=>c.id='40000042',c=>c.characterId='rikka-rooftops',c=>c.positions=[2,3],
    c=>c.weapon_index=7,c=>c.atk[0]=295,c=>c.defense[0]=160,c=>c.magic=[6],c=>c.barriers=[2],
    c=>c.art='Rikka_La_Ville_Sous_Ses_Pas_01.png',c=>c.art='Rikka_La_Ville_Sous_Ses_Pas_02.png',
    c=>c.art='Rikka_La_Ville_Sous_Ses_Pas_03_Cyberpunk.png',c=>c.nativePlacement.zoom=1.1]) {
    const s = structuredClone(set); change(s.cards[0]); assert.throws(()=>M.validateSet(s));
  }
});
test('final art must be selected before generating a native profile',()=>{
  assert.throws(()=>M.artPath({...set.cards[0],art:null}));
  assert.equal(M.artPath(set.cards[0]),'V4/Illustrations/Rikka_La_Ville_Sous_Ses_Pas_04.png');
});
test('real engine rejects the two Rikka versions in one deck',()=>{
  const c = set.cards[0], data = {version:4,edition:'V4',cards:[{...c,edition:'V4',sentry:true,canGuard:false,canHeal:false},
    {...c,id:c.lineage,edition:'V4',sentry:true,canGuard:false,canHeal:false}],
    elements:require('../../../V3/donnees/elements.json'),weapons:require('../../../V3/donnees/armes.json'),
    rules:require('../../../V3/donnees/regles.json'),demo:require('../../../V3/donnees/regles_demo.json')};
  assert(M.validateGame(data,set,require('../../site/engine.js').createEngine).duplicateCharacterRejected);
});
