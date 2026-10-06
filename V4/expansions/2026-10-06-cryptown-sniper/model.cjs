'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const SET = '2026-10-06-cryptown-sniper';
function validateSet(set) {
  assert.equal(set.id, SET); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(set.cards.length, 1);
  const c = set.cards[0];
  for (const [key, value] of Object.entries({key:'nereth',id:'49900601',characterId:'nereth-kalistar',faction:'Cryptown',race:'SKULLZ',element:'NECRO',weapon:'Gun',job:'SOLDAT',role:4})) assert.equal(c[key], value);
  assert.deepEqual(c.positions, [4]);
  assert(c.name.length <= 30 && c.title.length <= 35);
  assert(c.description.length >= 160 && c.description.length <= 190);
  assert.match(c.art, /^[A-Za-z0-9_]+\.png$/);
  for (const side of ['atk','defense']) {
    assert.equal(c[side].length, 6);
    c[side].forEach((v, i) => {
      if (typeof v === 'number') assert(Number.isInteger(v) && v >= (bounds[c.role][side][i+1] || 0) && v <= bounds[c.role][side][i]);
      else assert.equal(side + ':' + i + ':' + v, 'atk:5:death');
    });
  }
  assert.equal(c.atk.filter(v => v === 'death').length, 1);
  for (const [field, side] of [['magic','atk'],['barriers','defense']]) {
    assert.equal(new Set(c[field]).size, c[field].length);
    assert(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
  }
  return set;
}
function profile(c, D) {
  return {...base.profile(c,D),source:'Personnage original Kalistar, demande du 6 octobre 2026',visual_revision:'V4-' + SET};
}
function qaDecks(data) {
  const decks = [
    ['49900501','49900302','49900303','49900601','49900401','49900306','49900305','49900307','49900404','49900312'],
    ['49900313','49900314','49900312','49900403','49900317','49900315','49900316','49900402','49900401','49900301']
  ];
  for (const ids of decks) for (const id of ids) assert(data.cards.some(c => c.id === id), 'Missing QA card ' + id);
  return decks;
}
function validateGame(data, set, createEngine) {
  validateSet(set);
  const c=set.cards[0], p=data.cards.find(p=>p.id===c.id); assert(p);
  for (const f of base.PRINTED) assert.deepEqual(p[f],c[f],f);
  assert.equal(p.characterId,c.characterId); assert.equal(p.role,4);
  assert.equal(p.canGuard,false); assert.equal(p.canHeal,false);
  const E=createEngine(data), decks=qaDecks(data);
  for (const ids of decks) assert.deepEqual(E.validatePlayableDeck(ids),[]);
  return {cards:data.cards.length,added:1,qaDecks:decks,noPresetInstalled:true};
}
module.exports={...base,SET,validateSet,profile,qaDecks,validateGame};
