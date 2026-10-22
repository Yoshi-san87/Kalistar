'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const Q = require('./equipment.js'), Composition = require('./team-composition.js');
const {buildCatalog} = require('../atelier/game-catalog.cjs');
const {createEngine} = require('./engine.js');
const {definition, fixture, unit, board, record, uses, grants, reload, step, lock, duel,
  support, next, outnumber, assertFormula, rejected, nativeMatch} = require('./fixtures/ultimate-expansion.cjs');
const GANT = 'mythic-iron-gauntlet', AXE = 'fallen-king-axe', SHIELD = 'durane-rampart', SEAL = 'exiled-king-seal';
const catalogue = buildCatalog({published: require('../donnees/catalogue.json').cards.filter(c => c.kind === 'created')});
const events = f => (f.s.equipment.rituals?.events || []).filter(e => e.weaponId === GANT);
const unarmed = f => {assert.equal(record(f)?.armedRound, undefined); assert.equal(uses(f).length, 0); assert.deepEqual(events(f), []);};
async function ready(side = 0, options = {}) {
  const f = await fixture(GANT, {side, ...options});
  outnumber(f); duel(f);
  assert.equal(f.s.match.events.at(-1).hold, true);
  assert.equal(record(f).status, 'ready'); assert.equal(uses(f).length, 0);
  assertFormula(f); return f;
}

test('Gant de Fer is a character-bound ATK40 ultimate; axe family, protection and all legacy definitions stay exact', async () => {
  const w = definition(GANT), data = await catalogue;
  assert.equal(w.name, 'Gant de Fer'); assert.equal(w.slot, 'relic'); assert.equal(w.kind, 'relic');
  assert.equal(w.collectible.number, 'REL-039'); assert.equal(w.art, 'mythic-iron-gauntlet-v1');
  assert.equal(Q.validateDefinition(w), w);
  assert.deepEqual(w.effect, {trigger: 'ULTIMATE', duration: 'ONCE_MATCH', event: 'SURVIVED', when: {outnumbered: true}, action: {kind: 'ARM', stat: 'ATK', value: 40, target: 'self'}});
  assert.deepEqual(w.restrictions, {characterIds: ['balmhyr']});
  for (const c of data.cards) assert.equal(Q.compatible(w, c), c.characterId === 'balmhyr');
  assert.deepEqual(definition(AXE).restrictions.families, ['Hache']);
  const reward = data.cards.find(c => c.id === '49900802');
  assert.equal(reward.weapon, 'Poing'); assert.equal(Q.compatible(definition(AXE), reward), false);
  assert(Q.compatible(w, reward)); assert(Q.compatible(definition(SHIELD), reward));
  assert.deepEqual(Q.catalogue.legacyWeapons, require('./fixtures/equipment-v4.5.64.json').weapons);
  assert.equal(new Set(Q.catalogue.weapons.map(w => w.id)).size, Q.catalogue.weapons.length);
  assert.equal(new Set(Q.catalogue.weapons.filter(w => w.collectible).map(w => w.collectible.number)).size, Q.catalogue.weapons.filter(w => w.collectible).length);
});

test('legacy flat and v2 gauntlet loadouts migrate once, purely, without touching inventory or other slots', async () => {
  const {cards} = await catalogue;
  for (const old of [
    {id: 'qa', version: 1, slots: {weapon: {balmhyr: GANT}}},
    Q.profile('qa', {weapon: {balmhyr: GANT}, shield: {balmhyr: SHIELD}, relic: {momo: 'little-joys-box'}})
  ]) {
    const before = structuredClone(old), inventory = Object.freeze([GANT, AXE, SHIELD, SEAL]);
    const next = Q.reconcileProfile(old, cards);
    assert.equal(next.slots.relic.balmhyr, GANT); assert.equal(next.slots.weapon.balmhyr, undefined);
    assert.deepEqual(next.slots.shield, old.slots.shield || {});
    assert.equal(next.slots.relic.momo, old.slots.relic?.momo);
    assert.deepEqual(Q.reconcileProfile(next, cards), next); assert.deepEqual(old, before);
    assert.deepEqual(inventory, [GANT, AXE, SHIELD, SEAL], 'Loadout reconciliation never consumes inventory');
  }
});

test('an existing relic wins a migration conflict; the gant can be explicitly equipped later, not silently lost or duplicated', async () => {
  const {cards} = await catalogue;
  const old = Q.profile('qa', {weapon: {balmhyr: GANT}, shield: {balmhyr: SHIELD}, relic: {balmhyr: SEAL}});
  const before = structuredClone(old), migrated = Q.reconcileProfile(old, cards);
  assert.deepEqual(migrated.slots, {weapon: {}, shield: {balmhyr: SHIELD}, relic: {balmhyr: SEAL}});
  assert.deepEqual(Q.reconcileProfile(migrated, cards), migrated); assert.deepEqual(old, before);
  assert.throws(() => Q.equipProfile(migrated, 'balmhyr', GANT, cards));
  const changed = Q.equipProfile(migrated, 'balmhyr', GANT, cards, {expected: SEAL, expectedProfile: migrated});
  assert.equal(changed.slots.relic.balmhyr, GANT); assert.equal(changed.slots.shield.balmhyr, SHIELD);
});

test('reconciliation rejects corrupt assignments but accepts the historical pre-family-lock Balmhyr Hache profile', async () => {
  const {cards} = await catalogue;
  const invalid = [
    Q.profile('qa', {weapon: {momo: GANT}}), Q.profile('qa', {shield: {balmhyr: GANT}}),
    Q.profile('qa', {weapon: {balmhyr: GANT}, relic: {balmhyr: GANT}}),
    Q.profile('qa', {weapon: {balmhyr: GANT}, relic: {balmhyr: 'missing'}})
  ];
  for (const p of invalid) {const before = structuredClone(p); assert.throws(() => Q.reconcileProfile(p, cards)); assert.deepEqual(p, before);}
  const old = Q.profile('qa', {weapon: {balmhyr: GANT}});
  const modern = Q.profile('qa', {relic: {balmhyr: GANT}});
  const hache = cards.filter(c => c.id === '30000007'); assert.equal(hache[0].weapon, 'Hache');
  assert.deepEqual(Q.reconcileProfile(old, hache), modern);
  assert.deepEqual(Q.reconcileProfile(Q.reconcileProfile(old, hache), hache), modern);
  assert.throws(() => Q.validateLoadout(old.slots, hache), 'New gauntlet assignments to weapon are still rejected');
  const conflict = Q.profile('qa', {weapon: {balmhyr: GANT}, relic: {balmhyr: SEAL}});
  assert.deepEqual(Q.reconcileProfile(conflict, hache).slots, {weapon: {}, shield: {}, relic: {balmhyr: SEAL}});
  assert.deepEqual(Q.reconcileProfile(modern, cards.filter(c => c.id === '30000007')), modern);
});

test('saved deck normalization migrates the gant but preserves cards, captain and formation', async () => {
  const data = await catalogue, E = createEngine(data), T = Composition.create(E);
  const ids = require('./fixtures/castlevania-kalistar-combat.cjs').deck(E, ['49900802']);
  const old = T.fromPreset({name: 'Gant historique', cards: ids});
  old.equipment = {weapon: {balmhyr: GANT}, shield: {balmhyr: SHIELD}, relic: {}};
  const before = structuredClone(old), migrated = T.normalize(old);
  assert.deepEqual(migrated, {...old, equipment: {weapon: {}, shield: {balmhyr: SHIELD}, relic: {balmhyr: GANT}}});
  assert.deepEqual(old, before); assert.deepEqual(T.normalize(migrated), migrated);
  const game = E.newGame(migrated, migrated, {mode: 'local', seed: 'new-gant'});
  assert.equal(game.equipment.definitions.find(w => w.id === GANT).slot, 'relic');
  assert.deepEqual(E.restoreGame(game), game);
});

for (const side of [0, 1]) {
  test(`Gant side ${side}: repeated survival prepares one charge; D6, protection and ATK40 stack once and survive reload`, async () => {
    const f = await fixture(GANT, {side, kalistel: true});
    // These fixture loadouts are set before the first public action, never a ritual ledger.
    assert.equal(f.E.card(unit(f, f.u)).weapon, 'Hache');
    f.s.equipment.loadouts[side].weapon.balmhyr = AXE;
    f.s.equipment.loadouts[side].shield.balmhyr = SHIELD;
    reload(f); outnumber(f); duel(f);
    assert.equal(f.s.duel.formula.equipmentDefense, 30);
    assert.equal(record(f).status, 'ready'); const armedRound = record(f).armedRound;
    next(f); duel(f); assert.equal(record(f).armedRound, armedRound);
    assert.equal(events(f).filter(e => e.kind === 'ready').length, 1);
    assert.equal(f.s.duel.formula.equipmentDefense, 30); assert.equal(uses(f).length, 0);
    next(f); lock(f, f.u, f.enemy); step(f, 'rollAttack', 6);
    assert.equal(f.s.phase, 'kalistel'); assert.equal(record(f).status, 'ready');
    const restored = {...f, s: f.E.restoreGame(structuredClone(f.s))};
    step(f, 'acceptAttack'); step(restored, 'acceptAttack'); assert.deepEqual(f.s, restored.s);
    assert.equal(record(f).status, 'spent'); step(f, 'rollDefense', 6);
    assertFormula(f, 40); assert.equal(f.s.duel.formula.equipmentAttack, 30);
    assert.equal(f.s.duel.formula.attack, f.s.duel.formula.baseAttack + 30 + 40);
    assert.equal(uses(f).length, 1); assert.equal(uses(f)[0].sourceUid, f.u); assert.equal(uses(f)[0].value, 40);
    next(f); duel(f); next(f); duel(f, f.u, f.enemy, 3);
    assertFormula(f); assert.equal(record(f).armedRound, armedRound); assert.equal(uses(f).length, 1);
    assert.equal(events(f).filter(e => e.kind === 'bonus').length, 1); assert.equal(grants(f).length, 0);
  });

  test(`Gant side ${side}: support, an ally's attack, discarded D6 and Death preserve charge; retained D3 consumes it`, async () => {
    const f = await ready(side, {kalistel: true}); next(f);
    support(f, f.u, f.ally, 'luck'); assert.equal(uses(f).length, 0);
    next(f); duel(f, f.ally, f.enemy); assertFormula(f); assert.equal(uses(f).length, 0);
    next(f); lock(f, f.u, f.enemy); step(f, 'rollAttack', 6); step(f, 'useKalistel', 2); step(f, 'rollDefense', 2);
    assert.equal(f.s.duel.attackValue, 'death'); assert.equal(record(f).status, 'ready'); assert.equal(uses(f).length, 0);
    next(f); duel(f, f.u, f.enemy, 3); assertFormula(f, 40); assert.equal(uses(f).length, 1);
    reload(f);
  });

  for (const superior of [false, true]) test(`Gant side ${side}: ${superior ? 'superiority' : 'parity'} survival grants nothing`, async () => {
    const f = await fixture(GANT, {side});
    if (superior) while (board(f, 1 - side).length === 5) {
      duel(f, f.u, board(f, 1 - side).findLast(u => u.uid !== f.enemy).uid, 5); next(f);
    }
    duel(f); assert.equal(f.s.match.events.at(-1).hold, true); unarmed(f);
  });

  for (const die of [5, 2]) test(`Gant side ${side}: eliminated carrier from D${die} gains no charge`, async () => {
    const f = await fixture(GANT, {side}); outnumber(f); duel(f, f.enemy, f.u, die);
    assert.equal(f.s.match.events.at(-1).kill, true); unarmed(f); reload(f);
  });

  test(`Gant side ${side}: another ally's survival does not qualify, but surviving Death via dodge does`, async () => {
    const f = await fixture(GANT, {side}); outnumber(f); duel(f, f.enemy, f.ally); unarmed(f);
    next(f); duel(f, f.enemy, f.u, 2, [2]); assert.equal(f.s.match.events.at(-1).dodge, true);
    assert.equal(record(f).status, 'ready'); reload(f);
    next(f); duel(f, f.u, f.enemy, 3); assertFormula(f, 40); assert.equal(uses(f).length, 1);
  });
}

test('forged charge history, double spending, value, source and formula changes are rejected without repair', async () => {
  const f = await ready();
  rejected(f, s => {s.equipment.rituals.records[f.u].armedRound = 0;});
  rejected(f, s => {s.equipment.rituals.records[f.u].progress.push({...s.equipment.rituals.records[f.u].progress[0]});});
  next(f); duel(f, f.u, f.enemy, 3);
  for (const mutate of [
    s => {s.equipment.rituals.uses[0].value = 300;},
    s => {s.equipment.rituals.uses[0].sourceUid = f.ally;},
    s => {s.equipment.rituals.uses.push({...s.equipment.rituals.uses[0]});},
    s => {s.equipment.rituals.records[f.u].status = 'ready';},
    s => {s.duel.formula.ultimateAttack += 30;},
    s => {s.equipment.loadouts[f.side].weapon.balmhyr = GANT;}
  ]) rejected(f, mutate);
});

test('native full matches terminate, restore every action and never consume more than one Gant charge per carrier', async () => {
  for (const seed of ['GANT-NATIVE-1', 'GANT-NATIVE-2', 'GANT-NATIVE-3']) {
    const result = await nativeMatch(GANT, {seed});
    assert(result.actions > 0); assert(result.spent <= 2); assert(result.uses <= 2);
  }
});
