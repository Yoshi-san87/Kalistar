'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const rules = require('../../../V3/donnees/regles_demo.json');
const weapons = require('../../../V3/donnees/armes.json');
const elements = require('../../../V3/donnees/elements.json');
const SET = '2026-09-24-royal-training';
const INPUTS = Object.freeze({ 'profiles-a.json': 4, 'profiles-b.json': 5 });
const PRINTED = ['name', 'title', 'job', 'description', 'element', 'race', 'faction', 'weapon', 'positions', 'atk', 'defense', 'magic', 'barriers'];
const FIELDS = [...PRINTED, 'key', 'id', 'characterId', 'role', 'art', 'crop'];
const WEAPON_DONORS = Object.freeze({ Katana: 'Dague', Projectile: 'Dague', 'Fl\u00e9au': 'Fouet' });
const idFor = key => '4' + String(crypto.createHash('sha256').update(SET + ':' + key).digest().readUInt32BE(0) % 10000000).padStart(7, '0');
function validateCrop(crop) {
  assert.ok(crop && !Array.isArray(crop));
  assert.deepEqual(Object.keys(crop).sort(), ['x', 'y', 'zoom']);
  for (const [key, min, max] of [['zoom', 1, 3], ['x', -1, 1], ['y', -1, 1]])
    assert.ok(Number.isFinite(crop[key]) && crop[key] >= min && crop[key] <= max, 'Crop invalide : ' + key);
  return crop;
}
function normalize(input) {
  assert.ok(input && typeof input === 'object' && !Array.isArray(input));
  assert.ok(Object.keys(input).every(k => FIELDS.includes(k)), 'Champ non prevu au contrat.');
  const prefix = 'V4/expansions/' + SET + '/';
  const c = structuredClone({ ...input, id: idFor(input.key), art: input.art?.startsWith(prefix) ? input.art.slice(prefix.length) : input.art,
    crop: input.crop || { zoom: 1, x: 0, y: 0 } });
  if (input.id !== undefined) assert.equal(input.id, c.id, 'ID non deterministe.');
  return validateCard(c);
}
function validateCard(c) {
  assert.match(c.key, /^[a-z][a-z0-9-]{0,63}$/);
  assert.equal(c.id, idFor(c.key)); assert.match(c.characterId, /^[a-z0-9][a-z0-9-]{0,79}$/);
  assert.match(c.art, /^art-[ab]\/[a-zA-Z0-9_-]+\.png$/);
  for (const [f, max] of [['name', 30], ['title', 40], ['job', 22], ['description', 240], ['faction', 40], ['race', 30]]) {
    assert.ok(typeof c[f] === 'string' && c[f] === c[f].trim() && c[f].length > 0 && c[f].length <= max, c.key + '.' + f);
    assert.ok(!/[<>\x00-\x1f\x7f\u2028\u2029]/.test(c[f]));
  }
  assert.ok(c.element === 'NONE' || Object.hasOwn(elements, c.element), 'Cristal inconnu.');
  assert.ok(Object.hasOwn(weapons, c.weapon), 'Arme inconnue.');
  assert.ok(Array.isArray(c.positions) && c.positions.length >= 1 && c.positions.length <= 5);
  assert.equal(new Set(c.positions).size, c.positions.length);
  assert.deepEqual(c.positions, [...c.positions].sort());
  assert.ok(c.positions.every(p => Number.isInteger(p) && p >= 1 && p <= 5) && c.positions.includes(c.role));
  for (const side of ['atk', 'defense']) {
    assert.equal(c[side]?.length, 6);
    c[side].forEach((value, i) => {
      if (typeof value === 'number') assert.ok(Number.isInteger(value) && value >= 0 && value <= rules.roleBounds[c.role][side][i], c.key + '.' + side + ' D' + (6 - i) + ' hors plafond');
      else assert.ok((side === 'atk' ? ['retry', 'mana', 'guard', 'revive', 'buff_atk', 'death'] : ['retry', 'dodge']).includes(value));
    });
  }
  if (c.atk.includes('guard')) assert.ok(rules.guard.allowedRoles.includes(c.role));
  if (c.atk.includes('revive')) assert.ok(rules.reraise.allowedRoles.includes(c.role));
  for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
    assert.ok(Array.isArray(c[field]) && new Set(c[field]).size === c[field].length);
    assert.ok(c[field].every(d => Number.isInteger(d) && d >= 1 && d <= 6 && typeof c[side][6 - d] === 'number'));
  }
  if (c.element === 'NONE') { assert.deepEqual(c.magic, []); assert.deepEqual(c.barriers, []); }
  validateCrop(c.crop);
  if (c.key === 'aelis-veille') {
    assert.equal(c.characterId, 'aelis'); assert.equal(c.title, 'LA PRIERE SANS REPONSE');
    assert.deepEqual(c.positions, [3, 5]); assert.equal(c.role, 5); assert.ok(c.atk.includes('revive'));
  }
  if (c.key === 'kaylis-entrainement') {
    assert.equal(c.characterId, 'kaylis'); assert.equal(c.element, 'RAINBOW');
    assert.equal(c.weapon, 'Katana'); assert.deepEqual(c.positions, [1, 2, 3]);
  }
  if (c.key === 'baptiste') { assert.equal(c.race, 'VAMP'); assert.equal(c.weapon, 'Instrument'); assert.deepEqual(c.positions, [3]); }
  if (c.key === 'sapphire') { assert.equal(c.race, 'SIRENA'); assert.equal(c.weapon, 'Poing'); assert.deepEqual(c.positions, [1]); }
  return c;
}
function validateSet(set, existingIds = []) {
  assert.equal(set.id, SET); assert.equal(set.schemaVersion, 1); assert.equal(set.cards.length, 9);
  assert.equal(new Set(set.cards.map(c => c.id)).size, 9); assert.equal(new Set(set.cards.map(c => c.key)).size, 9);
  const used = new Set(existingIds);
  set.cards.forEach(c => { validateCard(c); assert.ok(!used.has(c.id), 'ID deja publie : ' + c.id); });
  const a = set.cards.filter(c => c.art.startsWith('art-a/')), b = set.cards.filter(c => c.art.startsWith('art-b/'));
  assert.deepEqual(a.map(c => c.key).sort(), ['aelis-veille', 'baptiste', 'kaylis-entrainement', 'sapphire']);
  assert.deepEqual(b.map(c => c.race).sort(), ['AURELION', 'CARNIVERT', 'CERELF', 'FELINEUS', 'KORBOW']);
  assert.deepEqual(set.arenas, []); return set;
}
function donor(c, D) {
  const fields = Object.fromEntries(D.FIELDS.filter(k => k in c).map(k => [k, c[k]]));
  const p = D.validate({ ...fields, weapon: WEAPON_DONORS[c.weapon] || c.weapon }, { final: true });
  p.magic = [...c.magic]; p.barriers = [...c.barriers]; return p;
}
function profile(c, D) {
  const p = { ...D.profileCard(donor(c, D), c.id), role: c.role, characterId: c.characterId,
    weapon: c.weapon, weapon_index: Object.keys(weapons).indexOf(c.weapon), edition: 'new',
    sentry: c.element !== 'NONE', source: 'Kalistar V4 - expansion ' + SET, visual_revision: 'V4-' + SET,
    ...(c.key === 'aelis-veille' ? { historicalScene: { source: 'V2/donnees/cartes.json', id: '00000017', gameplay: 'V4 role 5 - reequilibrage utilisateur approuve 2026-09-24' } } : {}) };
  for (const f of [...PRINTED, 'id', 'role', 'characterId']) assert.deepEqual(p[f], c[f]);
  return p;
}
function gameplay(profile) {
  return Object.fromEntries(['id', 'characterId', 'name', 'title', 'job', 'description', 'text', 'element', 'race', 'faction', 'weapon', 'weapon_index', 'positions', 'role', 'atk', 'defense', 'magic', 'barriers', 'sentry', 'canHeal', 'canGuard', 'advantage', 'disadvantage'].filter(k => k in profile).map(k => [k, profile[k]]));
}
module.exports = { SET, INPUTS, PRINTED, idFor, validateCrop, normalize, validateCard, validateSet, donor, profile, gameplay };
