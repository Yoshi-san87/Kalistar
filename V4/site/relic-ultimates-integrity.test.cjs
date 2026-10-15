'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {BOX, MATERIA, POD, fixture, reload, step, lock, attack, duel, next, thin,
  advantage, board, unit, row} = require('./fixtures/relic-ultimates.cjs');

function rejected(f, mutate) {
  const snapshot = JSON.parse(JSON.stringify(f.s));
  mutate(snapshot);
  const before = JSON.stringify(snapshot);
  assert.throws(() => f.E.restoreGame(snapshot));
  assert.equal(JSON.stringify(snapshot), before, 'rejection must not repair or mutate the save');
}

async function unequipped() {
  const f = await fixture(BOX), ids = f.selected.map(c => c.id);
  f.s = f.E.newGame(ids, ids, {mode: 'local', kalistel: false, seed: 'LEGACY-INTEGRITY'});
  f.E.autoDeploy(f.s, 0); f.E.autoDeploy(f.s, 1); f.E.start(f.s);
  duel(f);
  return f;
}

test('equipment-free saves reject ultimate metadata in events and both duel snapshots', async () => {
  const f = await unequipped();
  assert.equal(f.s.equipment, undefined);
  const values = {
    relicGrants: [{weaponId: BOX, sourceUid: f.u, recipient: f.ally, kind: 'luck'}],
    relicThreat: {weapon: 30, element: 0, faction: 0, arenaAttack: 0},
    relicStrike: {kind: 'riposte', weaponId: POD, sourceUid: f.u, targetUid: f.enemy},
    relicContext: {sourceUid: f.u, weaponId: BOX, allies: [f.u], enemies: [f.enemy]},
    relicEvents: []
  };
  for (const field of ['duel', 'lastDuel', 'event']) for (const [key, value] of Object.entries(values)) {
    rejected(f, s => { (field === 'event' ? s.match.events[0] : s[field])[key] = value; });
  }
  rejected(f, s => { s.match.events[0].relicGrants = [{sourceUid: 'not-a-unit', kind: 'luck'}]; });
  reload(f);
  assert.equal(row(f, f.u).support, 0);
});

test('equipment-free legacy saves remain byte-equivalent with no new metadata or rating version', async () => {
  const f = await unequipped();
  delete f.s.match.ratingVersion;
  for (const event of f.s.match.events) { delete event.sources; delete event.wardConsumed; }
  reload(f); next(f); duel(f); reload(f);
  assert.equal(f.s.equipment, undefined);
  assert.equal(f.s.match.ratingVersion, undefined);
});

for (const id of [BOX, MATERIA]) for (const side of [0, 1]) {
  test(`${id} side ${side}: exact locked rosters are required through attack, Kalistel and defense`, async () => {
    const f = await fixture(id, {side, kalistel: true});
    thin(f); thin(f, 4, 1 - side); lock(f, f.enemy, f.u);
    const check = () => {
      rejected(f, s => { delete s.duel.relicContext; });
      rejected(f, s => { s.duel.relicContext.enemies.push(s.players[1 - side].reserve[0].uid); });
      rejected(f, s => { s.duel.relicContext.allies.pop(); });
      rejected(f, s => { s.duel.relicContext.allies[1] = s.players[side].reserve[0].uid; });
      reload(f);
    };
    check(); step(f, 'rollAttack', 6); check(); step(f, 'acceptAttack'); check();
    step(f, 'rollDefense', 6);
    assert.equal(row(f, f.u).support, 0);
  });

  test(`${id} side ${side}: fatal result reconstructs the victim and preserves historical rosters after replacements`, async () => {
    const f = await fixture(id, {side});
    thin(f); duel(f, f.enemy, f.u, 2);
    assert(f.s.players[side].dead.some(u => u.uid === f.u));
    for (const field of ['duel', 'lastDuel']) {
      rejected(f, s => { delete s[field].relicContext; });
      rejected(f, s => { s[field].relicContext.allies.pop(); });
    }
    rejected(f, s => {
      const context = s.duel.relicContext;
      context.allies[1] = s.players[side].reserve[0].uid;
      s.lastDuel.relicContext = structuredClone(context);
      s.equipment.ultimates.records[0].context = structuredClone(context);
    });
    if (id === MATERIA) step(f, 'grantEquipment', f.E.aiEquipmentChoice(f.s));
    const context = structuredClone(f.s.lastDuel.relicContext);
    step(f, 'next');
    assert.equal(f.s.phase, 'replace'); reload(f);
    while (f.s.phase === 'replace') step(f, 'autoDeploy', f.s.replacing);
    assert.deepEqual(f.s.lastDuel.relicContext, context);
    duel(f, f.enemy, board(f)[0].uid, 6);
    reload(f);
  });
}

for (const component of ['weapon', 'element', 'faction', 'arenaAttack']) {
  test(`2B rejects forged ${component} in a neutral accepted attack and coherent result copies`, async () => {
    const f = await fixture(POD); lock(f, f.enemy, f.u); attack(f);
    rejected(f, s => { s.duel.relicThreat[component] = 10; });
    rejected(f, s => { delete s.duel.relicThreat; });
    step(f, 'rollDefense', 2);
    assert.equal(f.s.duel.formula, undefined, 'Dodge must not require a numeric formula');
    rejected(f, s => {
      s.duel.relicThreat[component] = 10;
      s.lastDuel.relicThreat[component] = 10;
      s.match.events.at(-1).relicThreat[component] = 10;
    });
    for (const field of ['duel', 'lastDuel', 'event']) rejected(f, s => {
      delete (field === 'event' ? s.match.events.at(-1) : s[field]).relicThreat;
    });
    next(f); duel(f, f.u, f.enemy, 4);
    assert.equal(f.s.duel.formula.equipmentAttack, 0);
  });

  test(`2B keeps accepted ${component} through Dodge, later roster changes and one riposte`, async () => {
    const f = await fixture(POD, {kalistel: true, mutate: advantage(component)});
    lock(f, f.enemy, f.u); step(f, 'rollAttack', 6);
    assert.equal(f.s.duel.relicThreat, undefined, 'unaccepted attack has no threat');
    rejected(f, s => { s.duel.relicThreat = {weapon: 0, element: 0, faction: 0, arenaAttack: 0}; });
    step(f, 'acceptAttack');
    const threat = structuredClone(f.s.duel.relicThreat);
    assert(threat[component] > 0);
    step(f, 'rollDefense', 2); reload(f);
    assert.deepEqual(f.s.match.events.at(-1).relicThreat, threat);
    assert.equal(f.s.match.events.at(-1).attack, 0);
    next(f);
    const companion = board(f, 1).find(u => u.uid !== f.enemy && f.E.card(u).characterId === f.selected[2].characterId);
    duel(f, f.ally, companion.uid, 2); next(f);
    lock(f, f.u, f.enemy); attack(f, 4); step(f, 'rollDefense', 6);
    assert.equal(f.s.duel.formula.equipmentAttack, 60);
    next(f); duel(f, f.u, f.enemy, 4);
    assert.equal(f.s.duel.formula.equipmentAttack, 0);
    reload(f);
  });
}

test('2B discarded numeric attacks and accepted Death/support do not require or retain a threat', async () => {
  const f = await fixture(POD, {kalistel: true, mutate: advantage('weapon')});
  lock(f, f.enemy, f.u); step(f, 'rollAttack', 6); step(f, 'useKalistel', 1);
  assert.equal(f.s.phase, 'clover'); assert.equal(f.s.duel.relicThreat, undefined);
  step(f, 'grantClover', f.enemy); next(f);
  unit(f, f.u).reraise = 1;
  duel(f, f.enemy, f.u, 2);
  assert.equal(f.s.duel.relicThreat, undefined);
  assert.equal(f.s.equipment.ultimates, undefined);
  reload(f);
});

test('Aeris heart and old ally-fall choice remain independently pending across reloads', async () => {
  const f = await fixture(MATERIA);
  const box = f.s.equipment.definitions.find(w => w.id === BOX);
  box.effect = structuredClone(require('./fixtures/equipment-v4.5.64.json').weapons.find(w => w.id === BOX).effect);
  assert.equal(box.effect.trigger, 'ONCE_DEFENSE');
  f.s.equipment.loadouts[0].relic.momo = 'little-joys-box';
  reload(f); thin(f); duel(f, f.enemy, f.u, 2);
  assert.equal(f.E.equipmentChoice(f.s).weaponId, MATERIA);
  step(f, 'grantEquipment', f.E.aiEquipmentChoice(f.s));
  assert.equal(f.E.equipmentChoice(f.s).weaponId, 'little-joys-box');
  assert.throws(() => f.E.next(f.s));
  step(f, 'grantEquipment', f.E.aiEquipmentChoice(f.s)); next(f);
  assert.equal(row(f, f.u).hearts, 1);
});

for (const legacy of [true, false]) for (const id of ['little-joys-flute', BOX, MATERIA, POD]) {
  test(`${legacy ? 'single-slot' : 'frozen old-definition'} ${id} never requires ultimate metadata`, async () => {
    const f = await fixture(id, {legacy, oldDefinitions: !legacy, kalistel: true});
    const definitions = structuredClone(f.s.equipment.definitions);
    thin(f); lock(f, f.enemy, f.u); step(f, 'rollAttack', 6); step(f, 'acceptAttack');
    step(f, 'rollDefense', 2); next(f); duel(f); next(f);
    assert.equal(f.s.lastDuel.relicContext, undefined);
    assert.equal(f.s.lastDuel.relicThreat, undefined);
    assert.equal(f.s.equipment.ultimates, undefined);
    assert.deepEqual(f.s.equipment.definitions, definitions);
    reload(f);
  });
}
