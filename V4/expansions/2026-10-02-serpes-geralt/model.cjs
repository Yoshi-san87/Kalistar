'use strict';
const assert = require('node:assert/strict');
const base = require('../2026-09-27-metal-gear-mines/model.cjs');
const historical = require('../2026-10-01-one-piece-witcher/set.json');
const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const weapons = require('../../../V3/donnees/armes.json');
const SET = '2026-10-02-serpes-geralt';
function validateSet(set) {
  assert.equal(set.id,SET); assert.equal(set.officialCollaboration,false);
  assert.deepEqual(set.arenas,[]); assert.deepEqual(set.presets,[]);
  assert.deepEqual(set.cards.map(c => [c.key,c.id]),[['geralt-witcher','49900101'],['ssilas','49900201']]);
  for (const c of set.cards) {
    assert.match(c.characterId,/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert(c.positions.includes(c.role));
    assert.equal(new Set(c.positions).size,c.positions.length);
    assert(c.positions.every(p => Number.isInteger(p) && p >= 1 && p <= 5));
    assert(c.name.length <= 30 && c.title.length <= 35 && c.description.length >= 160 && c.description.length <= 190);
    assert(Object.hasOwn(weapons,c.weapon));
    assert.match(c.art,/^[A-Za-z0-9_]+\.png$/);
    for (const side of ['atk','defense']) {
      assert.equal(c[side].length,6);
      c[side].forEach((v,i) => {
        if (typeof v === 'number') assert(Number.isInteger(v) && v >= (bounds[c.role][side][i+1] ?? 0) && v <= bounds[c.role][side][i]);
        else assert((side === 'atk' ? ['guard','revive','retry','mana','buff_atk','death'] : ['retry','dodge']).includes(v));
      });
    }
    if (c.atk.includes('guard')) assert([1,5].includes(c.role));
    if (c.atk.includes('revive')) assert.equal(c.role,5);
    for (const [field,side] of [['magic','atk'],['barriers','defense']]) {
      assert.equal(new Set(c[field]).size,c[field].length);
      assert(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
    }
    if (c.element === 'NONE') assert.equal(c.magic.length+c.barriers.length,0);
  }
  const [geralt,ssilas] = set.cards;
  const previous = historical.cards.find(c => c.key === geralt.key);
  for (const field of ['id','characterId','name','title','job','race','weapon','element','role','positions','atk','defense','magic','barriers','art','faction','collaboration','crop'])
    assert.deepEqual(geralt[field],previous[field],field);
  assert.equal(ssilas.characterId,'ssilas'); assert.equal(ssilas.race,'SERPES');
  assert.equal(ssilas.faction,'Arborium'); assert.equal(ssilas.element,'HERBO');
  assert.equal(ssilas.weapon,'Arc'); assert.equal(ssilas.role,3);
  assert.deepEqual(ssilas.positions,[2,3]); assert.equal(ssilas.collaboration,undefined);
  assert.equal(ssilas.atk.filter(v => v === 'buff_atk').length,1);
  assert.equal(ssilas.defense.filter(v => v === 'dodge').length,1);
  return set;
}
function profile(c,D) {
  return { ...base.profile(c,D),
    source:c.collaboration ? 'Kalistar x The Witcher - fan crossover non officiel' : 'Personnage original propose pour Kalistar, demande du 2 octobre 2026',
    visual_revision:'V4-'+SET };
}
function validateGame(data,set,createEngine) {
  validateSet(set);
  for (const c of set.cards) {
    const p = data.cards.find(p => p.id === c.id); assert(p);
    for (const f of base.PRINTED) assert.deepEqual(p[f],c[f],c.key+'.'+f);
    assert.equal(p.characterId,c.characterId); assert.equal(p.role,c.role);
    assert.equal(p.collaboration,c.collaboration);
    assert.equal(p.canGuard,c.atk.includes('guard')); assert.equal(p.canHeal,c.atk.includes('revive'));
  }
  const engine = createEngine(data);
  assert(!engine.validateDeck(set.cards.map(c => c.id)).some(e => /inconnue|personnage/.test(e)));
  return { cards:2,characters:2,noPresetInstalled:true };
}
module.exports = { ...base,SET,validateSet,profile,validateGame };
