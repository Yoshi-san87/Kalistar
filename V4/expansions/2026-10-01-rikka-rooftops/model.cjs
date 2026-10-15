'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const rules = require('../../../V3/donnees/regles_demo.json');
const SET = '2026-10-01-rikka-rooftops', ID = '49800201', KEY = 'rikka-rooftops';
const ART = 'Rikka_La_Ville_Sous_Ses_Pas_04.png';
const required = {
  id: ID, key: KEY, characterId: 'rikka', lineage: '40000042', name: 'RIKKA',
  title: 'LA VILLE SOUS SES PAS', job: 'VOLEUSE', race: 'FELINEUS', faction: 'Chroma',
  element: 'ELECTRO', weapon: 'Fouet', weapon_index: 6, role: 2, positions: [2],
  atk: [294,230,184,126,86,36], defense: ['dodge',142,104,74,52,'retry'], magic: [5], barriers: []
};
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []); assert.equal(set.cards.length, 1);
  const c = set.cards[0];
  for (const [field, value] of Object.entries(required)) assert.deepEqual(c[field], value, field);
  assert.equal(c.collaboration, undefined);
  assert(c.description.length >= 190 && c.description.length <= 215);
  assert(/[\u00c0-\u00ff]/.test(c.description));
  assert.equal(c.art,ART,'Only the final image 04 can enter production');
  assert.deepEqual(c.nativePlacement,{x:30,y:0,zoom:1});
  for (const side of ['atk','defense']) c[side].forEach((v,i) => {
    if (typeof v === 'number') {
      const limits=rules.roleBounds[2][side];
      assert(Number.isInteger(v) && v >= (limits[i+1] ?? 0) && v <= limits[i]);
    }
  });
  return set;
}
function artPath(c) {
  assert.equal(c.art,ART,'Only parent-reviewed final image 04 is selected');
  return 'V4/Illustrations/' + c.art;
}
function profile(c, D) {
  artPath(c);
  return { ...base.profile(c,D), source: 'Variante narrative Rikka, demande du 1 octobre 2026',
    previous_model: '40000042', visual_revision: 'V4-' + SET,
    artworkFraming:{translation:[c.nativePlacement.x,c.nativePlacement.y],fit:'cover',zoom:1} };
}
function validateProfile(p,c) {
  base.validateProfile(p,c); assert.equal(p.weapon_index,6);
  assert.equal(p.previous_model,'40000042'); assert.equal(p.canGuard,false); assert.equal(p.canHeal,false);
  assert.equal(p.visual_revision,'V4-' + SET);
  assert.deepEqual(p.artworkFraming,{translation:[30,0],fit:'cover',zoom:1});
}
function validateGame(data,set,createEngine) {
  const c = validateSet(set).cards[0], p = data.cards.find(v=>v.id===ID), original = data.cards.find(v=>v.id===c.lineage);
  assert(p && original); assert.equal(original.characterId,'rikka');
  for (const field of base.PRINTED) assert.deepEqual(p[field],c[field],field);
  assert.equal(p.characterId,'rikka'); assert.equal(p.role,2); assert.equal(p.weapon_index,6);
  const engine = createEngine(data);
  assert(engine.validateDeck([c.lineage,ID]).some(e=>e.includes('personnage')), 'Both Rikka versions must not coexist');
  return { variant: ID, original: c.lineage, characterId: 'rikka', duplicateCharacterRejected: true, positions: [2] };
}
module.exports = { SET,ID,KEY,ART,PRINTED:base.PRINTED,characterId:base.characterId,artPath,validateSet,
  donor:base.donor,profile,validateProfile,validateGame };
