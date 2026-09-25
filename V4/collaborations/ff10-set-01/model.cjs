'use strict';
const assert = require('node:assert/strict');
const rules = require('../../../V3/donnees/regles_demo.json');
const weapons = require('../../../V3/donnees/armes.json');
const KEYS = ['tidus-epee','tidus-blitz','wakka','lulu','auron','yuna','kimahri','rikku','jecht','seymour','yunalesca'];
const PRINTED = ['name','title','job','description','element','race','weapon','positions','atk','defense','magic','barriers'];
const characterId = spec => spec.characterId || spec.key + '-ff10';
const artPath = spec => (['tidus-epee','tidus-blitz','auron','jecht'].includes(spec.key) ? 'art-a/' : ['yuna','lulu','rikku','yunalesca'].includes(spec.key) ? 'art-b/' : 'art-c/') + spec.key + '.png';
function validateSet(set) {
  assert.equal(set.id, 'ff10-set-01'); assert.equal(set.faction, 'FF10'); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.cards.map(c => c.key), KEYS); assert.equal(new Set(set.cards.map(c => c.id)).size, 11);
  assert.equal(new Set(set.cards.map(characterId)).size, 10);
  for (const c of set.cards) {
    assert.match(c.id, /^4\d{7}$/); assert.ok(c.positions.includes(c.role));
    assert.ok(c.title.length <= 35 && c.description.length >= 195 && c.description.length <= 210, 'Texte hors budget : ' + c.key + ' ' + c.description.length);
    assert.ok(Object.hasOwn(weapons, c.weapon), 'Arme inconnue.');
    for (const side of ['atk', 'defense']) {
      assert.equal(c[side].length, 6);
      c[side].forEach((v,i) => {
        if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[c.role][side][i], 'Plafond de role : ' + c.key + '.' + side + '.D' + (6-i));
        else assert.ok((side === 'atk' ? ['guard','revive','retry','mana','buff_atk','death'] : ['retry','dodge']).includes(v));
      });
    }
    if (c.atk.includes('guard')) assert.ok([1,5].includes(c.role));
    if (c.atk.includes('revive')) assert.equal(c.role, 5);
    for (const [field, side] of [['magic','atk'],['barriers','defense']]) {
      assert.equal(new Set(c[field]).size, c[field].length);
      assert.ok(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6-d] === 'number'));
    }
  }
  assert.equal(characterId(set.cards[0]), 'tidus-ff10'); assert.equal(characterId(set.cards[1]), 'tidus-ff10');
  assert.equal(set.presets.length, 2);
  for (const p of set.presets) {
    assert.equal(p.characters.length, 10); assert.equal(new Set(p.characters).size, 10);
    assert.ok(p.characters.every(k => KEYS.includes(k)));
    assert.equal(new Set(p.characters.map(k => characterId(set.cards.find(c => c.key === k)))).size, 10);
  }
  return set;
}
function donor(spec, D) {
  const input = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  const p = D.validate({ ...input, faction: 'Chroma' }, { final: true });
  p.positions = [...spec.positions]; return p;
}
function profile(spec, D) {
  return { ...D.profileCard(donor(spec, D), spec.id), role: spec.role, characterId: characterId(spec), faction: 'FF10', collaboration: 'FF10', officialCollaboration: false,
    canGuard: spec.atk.includes('guard'), canHeal: spec.atk.includes('revive'), sentry: true,
    advantage: 30, disadvantage: 30, source: 'Kalistar x Final Fantasy X - fan crossover non officiel', visual_revision: 'V4-ff10-set-01' };
}
function validateProfile(p, spec) {
  assert.equal(p.id, spec.id); assert.equal(p.characterId, characterId(spec)); assert.equal(p.role, spec.role);
  for (const f of PRINTED) assert.deepEqual(p[f], spec[f], spec.key + '.' + f);
  assert.equal(p.faction, 'FF10'); assert.equal(p.collaboration, 'FF10'); assert.equal(p.officialCollaboration, false);
  assert.notEqual(p.testOnly, true); assert.equal(p.sentry, true);
  assert.equal(p.canGuard, p.atk.includes('guard')); assert.equal(p.canHeal, p.atk.includes('revive'));
}
function validateGame(data, set, createEngine) {
  const engine = createEngine(data), byKey = new Map();
  for (const spec of set.cards) {
    const p = data.cards.find(c => c.id === spec.id); assert.ok(p); byKey.set(spec.key, p);
    for (const f of PRINTED) assert.deepEqual(p[f], spec[f]);
    assert.equal(p.characterId, characterId(spec)); assert.equal(p.role, spec.role); assert.equal(p.faction, 'FF10');
  }
  return set.presets.map(p => {
    const cards = p.characters.map(k => byKey.get(k).id);
    assert.deepEqual(engine.validatePlayableDeck(cards), []);
    assert.deepEqual(data.decks.presets.find(d => d.id === p.id)?.cards, cards);
    return { id: p.id, name: p.name, cards, coverage: engine.deckCoverage(cards) };
  });
}
module.exports = { KEYS, PRINTED, characterId, artPath, validateSet, donor, profile, validateProfile, validateGame };
