'use strict';
const assert = require('node:assert/strict');
const KEYS = ['squall', 'zell', 'linoa', 'irvine', 'quistis', 'selphie', 'edea', 'seifer', 'ward', 'kiros', 'laguna', 'ultimecia'];
const PRINTED = ['name', 'title', 'job', 'description', 'race', 'weapon', 'element', 'positions', 'atk', 'defense', 'magic', 'barriers'];
const WEAPON_DONORS = Object.freeze({ Projectile: 'Dague', 'Fl\u00e9au': 'Fouet' });
function validateSet(set) {
  assert.ok(set.id === 'ff8-set-01' && set.faction === 'FF8' && set.officialCollaboration === false, 'Set FF8 prive requis.');
  assert.deepEqual(set.cards.map(c => c.key), KEYS, 'Douze personnages FF8 requis.');
  assert.equal(new Set(set.cards.map(c => c.id)).size, 12, 'Identifiants dupliques.');
  for (const c of set.cards) {
    assert.match(c.id, /^4\d{7}$/); assert.equal(c.race, 'HUMAIN');
    assert.ok(c.title.length <= 35 && c.description.length <= 240, 'Textes trop longs.');
    assert.ok(c.positions.length && new Set(c.positions).size === c.positions.length, 'Positions invalides.');
    if (c.element === 'NONE') { assert.deepEqual(c.magic, []); assert.deepEqual(c.barriers, []); }
  }
  assert.equal(set.presets.length, 2); assert.equal(new Set(set.presets.map(p => p.id)).size, 2);
  for (const p of set.presets) {
    assert.equal(p.characters.length, 10); assert.equal(new Set(p.characters).size, 10);
    assert.ok(p.characters.every(k => KEYS.includes(k)), 'Personnage de preset inconnu.');
  }
  return set;
}
function donor(spec, D) {
  const input = Object.fromEntries(D.FIELDS.filter(k => k in spec).map(k => [k, spec[k]]));
  const p = D.validate({ ...input, faction: 'Chroma', weapon: WEAPON_DONORS[spec.weapon] || spec.weapon }, { final: true });
  p.positions = [...spec.positions]; // Preserve the user's primary position and printed order.
  return p;
}
function profile(spec, D, weapons) {
  assert.ok(Object.hasOwn(weapons, spec.weapon), 'Arme absente de la matrice.');
  return { ...D.profileCard(donor(spec, D), spec.id), faction: 'FF8', characterId: spec.key + '-ff8',
    weapon: spec.weapon, weapon_index: Object.keys(weapons).indexOf(spec.weapon), collaboration: 'FF8', officialCollaboration: false,
    advantage: 30, disadvantage: 30, source: 'Kalistar x FF8 - reinterpretation privee non officielle', visual_revision: 'V4-ff8-set-01' };
}
function validateProfile(p, spec) {
  assert.equal(p.id, spec.id); assert.equal(p.characterId, spec.key + '-ff8');
  assert.equal(p.faction, 'FF8'); assert.equal(p.collaboration, 'FF8'); assert.notEqual(p.testOnly, true);
  for (const field of PRINTED) assert.deepEqual(p[field], spec[field], 'Profil modifie : ' + spec.key + '.' + field);
  assert.ok(p.positions.includes(p.role) && typeof p.sentry === 'boolean');
  assert.equal(p.canGuard, p.atk.includes('guard')); assert.equal(p.canHeal, p.atk.includes('revive'));
}
function validateGame(data, set, createEngine) {
  const engine = createEngine(data), byKey = new Map(set.cards.map(c => [c.key, data.cards.find(p => p.id === c.id)]));
  for (const spec of set.cards) {
    const p = byKey.get(spec.key); assert.ok(p, 'Carte FF8 absente.');
    for (const field of PRINTED) assert.deepEqual(p[field], spec[field], 'Profil moteur different : ' + spec.key + '.' + field);
    assert.equal(p.faction, 'FF8'); assert.equal(p.characterId, spec.key + '-ff8');
  }
  const presets = set.presets.map(p => {
    const cards = p.characters.map(k => byKey.get(k).id);
    assert.deepEqual(engine.validatePlayableDeck(cards), [], 'Deck FF8 non jouable : ' + p.id);
    assert.deepEqual(data.decks.presets.find(d => d.id === p.id)?.cards, cards, 'Preset FF8 absent ou different.');
    return { id: p.id, name: p.name, cards, coverage: engine.deckCoverage(cards) };
  });
  const units = [...byKey.values()].map(c => ({ cardId: c.id }));
  for (const faction of ['FF7', 'Chroma']) {
    const other = data.cards.find(c => c.faction === faction); assert.ok(other, 'Temoin de faction absent : ' + faction);
    for (let n = 1; n <= 5; n++) {
      const board = units.slice(0, n);
      assert.equal(engine.synergy({ board }, board[0], 'faction'), (n - 1) * 10);
      if (n < 5) {
        const u = { cardId: other.id }; board.push(u);
        assert.equal(engine.synergy({ board }, board[0], 'faction'), (n - 1) * 10);
        assert.equal(engine.synergy({ board }, u, 'faction'), 0, 'Factions non isolees.');
      }
    }
  }
  return presets;
}
module.exports = { KEYS, PRINTED, WEAPON_DONORS, validateSet, donor, profile, validateProfile, validateGame };
