'use strict';
const assert = require('node:assert/strict');
const rules = require('../../../V3/donnees/regles_demo.json');
const weapons = require('../../../V3/donnees/armes.json');
const { PRINTED } = require('../ff8-set-01/model.cjs');
const CONTRACT = {
  emil: ['CYBORG', 'Sceptre', 'HEMATO', [4, 3], 4],
  a2: ['ANDROID', 'Ep\u00e9e longue', 'CRYO', [2, 1], 2],
  pascal: ['ROBOT', 'Tome', 'HERBO', [5], 5],
  adam: ['ROBOT', 'Poing', 'LUXO', [3, 4], 4],
  eve: ['ROBOT', 'Poing', 'PYRO', [1, 2], 1],
  anemone: ['HUMAIN', 'Gun', 'GEO', [4], 4]
};
const KEYS = Object.keys(CONTRACT);
function validateSet(set) {
  assert.equal(set.id, 'nier-set-02'); assert.equal(set.faction, 'NieR'); assert.equal(set.officialCollaboration, false);
  assert.deepEqual(set.cards.map(c => c.key), KEYS);
  assert.deepEqual(set.arenas, []); assert.deepEqual(set.presets, []);
  assert.equal(new Set(set.cards.map(c => c.id)).size, KEYS.length);
  for (const c of set.cards) {
    assert.match(c.id, /^4\d{7}$/);
    assert.deepEqual([c.race, c.weapon, c.element, c.positions, c.role], CONTRACT[c.key], c.key + ' contrat');
    assert.ok(Object.hasOwn(weapons, c.weapon));
    assert.equal(c.job, c.job.toUpperCase(), c.key + ' metier en capitales');
    assert.ok(c.title.length > 0 && c.title.length <= 35);
    assert.ok(c.description.length >= 190 && c.description.length <= 220, c.key + ' recit ' + c.description.length);
    for (const side of ['atk', 'defense']) {
      assert.equal(c[side].length, 6);
      c[side].forEach((v, i) => {
        if (typeof v === 'number') assert.ok(Number.isInteger(v) && v >= 0 && v <= rules.roleBounds[c.role][side][i], c.key + '.' + side + ' D' + (6 - i));
        else assert.ok((side === 'atk' ? ['revive', 'guard', 'retry', 'mana', 'buff_atk'] : ['dodge', 'retry']).includes(v), 'Effet illegal');
      });
    }
    if (c.atk.includes('revive')) assert.ok(rules.reraise.allowedRoles.includes(c.role));
    if (c.atk.includes('guard')) assert.ok(rules.guard.allowedRoles.includes(c.role));
    for (const [mode, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
      assert.equal(new Set(c[mode]).size, c[mode].length);
      assert.ok(c[mode].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6 - d] === 'number'));
    }
    if (c.key !== 'pascal') {
      assert.ok(c.atk.filter(v => typeof v === 'string').length <= 1);
      assert.ok(c.defense.filter(v => typeof v === 'string').length <= 2);
      assert.ok(c.barriers.length <= 2);
    }
  }
  const pascal = set.cards.find(c => c.key === 'pascal');
  assert.deepEqual(pascal.atk.slice(0, 5), ['revive', 'guard', 'retry', 'mana', 'buff_atk']);
  assert.ok(Number.isInteger(pascal.atk[5]) && pascal.atk[5] >= 0 && pascal.atk[5] <= 20);
  assert.ok(pascal.defense.every(v => typeof v === 'number'));
  assert.ok(pascal.defense.reduce((a, b) => a + b, 0) <= 610);
  assert.deepEqual(pascal.magic, []); assert.ok(pascal.barriers.length <= 1);
  return set;
}
function donor(spec, D) {
  const fields = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  const p = D.validate({ ...fields, faction: 'Chroma' }, { final: true });
  p.positions = [...spec.positions];
  return p;
}
function profile(spec, D) {
  return { ...D.profileCard(donor(spec, D), spec.id), role: spec.role, faction: 'NieR',
    weapon_index: Object.keys(weapons).indexOf(spec.weapon), characterId: spec.key + '-nier',
    collaboration: 'NieR', officialCollaboration: false, advantage: 30, disadvantage: 30,
    source: 'Kalistar x NieR - adaptation privee non officielle', visual_revision: 'V4-nier-set-02' };
}
function validateProfile(p, spec) {
  assert.equal(p.id, spec.id); assert.equal(p.characterId, spec.key + '-nier');
  assert.equal(p.faction, 'NieR'); assert.equal(p.collaboration, 'NieR'); assert.equal(p.officialCollaboration, false);
  for (const field of [...PRINTED, 'role']) assert.deepEqual(p[field], spec[field], spec.key + '.' + field);
  assert.equal(p.weapon_index, Object.keys(weapons).indexOf(spec.weapon));
  assert.equal(p.sentry, true); assert.equal(p.canHeal, p.atk.includes('revive')); assert.equal(p.canGuard, p.atk.includes('guard'));
  assert.equal(p.testOnly, undefined); assert.equal(p.advantage, 30); assert.equal(p.disadvantage, 30);
}
function validateGame(data, set, createEngine) {
  const e = createEngine(data);
  for (const spec of set.cards) {
    const p = data.cards.find(c => c.id === spec.id); assert.ok(p, spec.key + ' absent');
    for (const f of [...PRINTED, 'role']) assert.deepEqual(p[f], spec[f]);
    assert.equal(p.characterId, spec.key + '-nier'); assert.equal(p.faction, 'NieR');
  }
  const nier = data.cards.filter(c => c.faction === 'NieR');
  assert.equal(nier.length, 8, 'Seulement le pilote et les six nouvelles cartes.');
  assert.notDeepEqual(e.validatePlayableDeck(nier.map(c => c.id)), []);
  assert.ok(!data.arenas.some(a => a.id.startsWith('nier-')));
  assert.ok(!data.decks.presets.some(p => p.id.startsWith('nier-')));
  for (const id of ['45911726', '42138845']) assert.ok(nier.some(c => c.id === id), 'Pilote approuve absent');
  for (let n = 1; n <= 5; n++) {
    const board = nier.slice(0, n).map(c => ({ cardId: c.id }));
    assert.equal(e.synergy({ board }, board[0], 'faction'), (n - 1) * 10);
  }
  for (const faction of ['FF7', 'FF8', 'Chroma']) {
    const other = data.cards.find(c => c.faction === faction); assert.ok(other);
    const board = [{ cardId: nier[0].id }, { cardId: other.id }];
    assert.equal(e.synergy({ board }, board[0], 'faction'), 0);
  }
  return [];
}
module.exports = { KEYS, PRINTED, CONTRACT, validateSet, donor, profile, validateProfile, validateGame };
