'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createEngine} = require('./engine.js');
const Q = require('./equipment.js');
const archive = require('./fixtures/equipment-v4.5.64.json');
const {BOX, MATERIA, POD, effects, all, definition, historical, unit, board, grants, row,
  fixture, reload, step, lock, attack, duel, next, thin, advantage, scenarios, browserState, createPublishedScenarios} = require('./fixtures/relic-ultimates.cjs');

function assertBonus(f, expected, formula = f.s.duel.formula) {
  assert(formula, 'a real numeric formula is required');
  assert.equal(formula.equipmentAttack, expected);
  assert.equal(formula.attack, Math.max(0, formula.baseAttack + formula.weapon + formula.element + formula.faction + formula.buff + formula.barrier + formula.arenaAttack + (formula.captainAttack || 0) + expected));
}
function assertReadyReprisal(f, target = f.enemy) {
  // Observe a ready mark through an independent playable branch, not its schema.
  const branch = {...f, s: f.E.restoreGame(JSON.parse(JSON.stringify(f.s)))};
  if (branch.s.phase === 'result') next(branch);
  duel(branch, branch.u, target, 4); assertBonus(branch, 60);
}
function visualEvent(f, id = f.id) {
  assert(Array.isArray(f.s.duel.relicEvents), 'the resolved transition exposes visual relic events');
  assert(f.s.duel.relicEvents.some(e => e.weaponId === id), id);
}
function rejected(f, mutate, message) {
  const bad = JSON.parse(JSON.stringify(f.s));
  mutate(bad);
  assert.throws(() => f.E.restoreGame(bad), message);
}

test('ultimate definitions are exact, validated, and leave the historical catalogue untouched', () => {
  assert.deepEqual(Q.catalogue.legacyWeapons, archive.weapons);
  for (const [id, effect] of Object.entries(effects)) {
    const current = definition(id);
    assert.equal(current.rulesVersion, 2); assert.equal(current.slot, 'relic');
    assert.deepEqual(current.effect, effect);
    assert.equal(Q.validateDefinition(current), current);
    assert.deepEqual(current.restrictions, historical(id).restrictions);
    assert.notDeepEqual(current.effect, historical(id).effect);
  }
});

test('ultimate definition validation rejects impossible gifts, reprisal values and advantage names', () => {
  const cases = [
    [BOX, {stat: 'DEF'}], [BOX, {value: 30}], [BOX, {trait: 'mana'}],
    [BOX, {event: 'BLOCK'}], [BOX, {recipient: 'enemy'}], [BOX, {duration: 'DUEL'}],
    [POD, {stat: 'DEF'}], [POD, {value: 61}], [POD, {duration: 'NEXT_DEFENSE'}],
    [POD, {advantages: ['buff']}], [POD, {advantages: []}]
  ];
  for (const [id, change] of cases) {
    const w = structuredClone(definition(id)); w.effect = {...effects[id], ...change};
    assert.throws(() => Q.validateDefinition(w), id + ': ' + JSON.stringify(change));
  }
});

for (const side of [0, 1]) for (const die of [5, 2]) {
  test(`Momo side ${side}: accepted ${die === 2 ? 'Death' : 'numeric'} targeting grants only eligible active allies before lethal resolution`, async () => {
    const f = await fixture(BOX, {side, kalistel: true});
    thin(f); unit(f, f.ally).luck = 1;
    const recipients = board(f).filter(u => u.uid !== f.u && !u.luck).map(u => u.uid);
    const reserve = f.s.players[side].reserve.map(u => u.uid);
    assert.equal(board(f).length, 4); assert.equal(board(f, 1 - side).length, 5);
    assert.equal(all(f.s.players[side]).length, all(f.s.players[1 - side]).length, 'reserves must not cancel being outnumbered');
    lock(f, f.enemy, f.u); step(f, 'rollAttack', die);
    assert.equal(f.s.phase, 'kalistel');
    for (const uid of recipients) assert.equal(unit(f, uid).luck, 0, 'unaccepted attack cannot grant a trait');
    assert.equal(grants(f).length, 0);
    step(f, 'acceptAttack');
    assert.equal(f.s.phase, 'defense'); assert.equal(unit(f, f.u).luck, 0, 'Momo excludes himself');
    for (const uid of recipients) assert.equal(unit(f, uid).luck, 1);
    for (const uid of reserve) assert.equal(unit(f, uid).luck, 0);
    step(f, 'rollDefense', 6);
    assert(f.s.players[side].dead.some(u => u.uid === f.u));
    assert.deepEqual(grants(f), recipients.map(recipient => ({weaponId: BOX, sourceUid: f.u, recipient, kind: 'luck'})));
    assert.equal(row(f, f.u).clovers, recipients.length);
    assert.equal(row(f, f.u).support, recipients.length);
    assert.equal(row(f, f.enemy).support, 0);
    visualEvent(f);
    const stats = f.E.matchStats(f.s); reload(f); reload(f);
    assert.deepEqual(f.E.matchStats(f.s), stats);
  });
}

test('Momo requires fewer active allies and an accepted hostile attack, not his own attack or enemy support', async () => {
  const f = await fixture(BOX, {kalistel: true});
  duel(f); assert.equal(grants(f).length, 0); next(f);
  thin(f); duel(f, f.u, f.enemy); assert.equal(grants(f).length, 0); next(f); thin(f);
  lock(f, f.enemy, f.u); step(f, 'rollAttack', 6); step(f, 'useKalistel', 1);
  assert.equal(f.s.phase, 'clover');
  assert(board(f).every(u => u.luck === 0));
  step(f, 'grantClover', f.enemy); assert.equal(grants(f).length, 0);
  next(f); thin(f); duel(f);
  assert.equal(grants(f).length, 3, 'the discarded attack did not spend the ultimate');
});

test('Momo grants once: actual Clover consumption credits its source, and a later targeting never refills it', async () => {
  const f = await fixture(BOX); thin(f); unit(f, f.ally).reraise = 1;
  duel(f); assert.equal(grants(f).length, 3); next(f);
  lock(f, f.enemy, f.ally); attack(f, 5); step(f, 'rollDefense', 6);
  assert.equal(f.s.phase, 'defense'); assert.equal(unit(f, f.ally).luck, 0);
  assert.equal(row(f, f.u).cloversConsumedByRecipients, 0, 'no duplicate provisional performance event');
  step(f, 'rollDefense', 6);
  assert.equal(row(f, f.u).cloversConsumedByRecipients, 1);
  assert.equal(unit(f, f.ally).reraise, 0); next(f); thin(f);
  duel(f); assert.equal(unit(f, f.ally).luck, 0);
  assert.equal(grants(f).length, 3); assert.equal(row(f, f.u).support, 3);
  assert.equal(row(f, f.u).cloversConsumedByRecipients, 1);
  assert.equal(f.E.equipmentView(f.s, unit(f, f.u)).active, false);
});

test('modern Momo native support no longer creates the historical +30 DEF relay', async () => {
  const f = await fixture(BOX);
  lock(f, f.u, f.enemy); attack(f, 1); step(f, 'grantClover', f.ally);
  assert.equal(row(f, f.u).clovers, 1); assert.equal(grants(f).length, 0);
  next(f); duel(f, f.enemy, f.ally);
  assert.equal(f.s.duel.formula.equipmentDefense, 0);
  next(f); thin(f); duel(f);
  assert.equal(grants(f).length, 2, 'native support does not spend the ultimate or duplicate the existing clover');
});

test('Momo remains the donor when a granted Clover is consumed after his definitive death', async () => {
  const f = await fixture(BOX); thin(f); unit(f, f.ally).reraise = 1;
  duel(f, f.enemy, f.u, 2); assert.equal(grants(f).length, 3); next(f);
  duel(f, f.enemy, f.ally, 5, [6, 6]);
  assert(f.s.players[f.side].dead.some(u => u.uid === f.u));
  assert.equal(row(f, f.u).cloversConsumedByRecipients, 1);
  assert.equal(row(f, f.u).clovers, 3);
  assert.equal(row(f, f.s.players[f.side].board[0]).cloversConsumedByRecipients, 0);
  reload(f); assert.equal(row(f, f.u).cloversConsumedByRecipients, 1);
});

for (const side of [0, 1]) for (const die of [5, 2]) {
  test(`Aeris side ${side}: definitive ${die === 2 ? 'Death' : 'numeric'} elimination opens a non-bypassable dead-source Reraise choice`, async () => {
    const f = await fixture(MATERIA, {side, kalistel: true});
    thin(f); unit(f, f.ally).reraise = 1;
    const eligible = board(f).filter(u => u.uid !== f.u && !u.reraise).map(u => u.uid);
    lock(f, f.enemy, f.u); attack(f, die);
    assert.equal(f.E.equipmentChoice(f.s), null, 'Aeris must be definitively eliminated first');
    step(f, 'rollDefense', 6);
    assert(f.s.players[side].dead.some(u => u.uid === f.u));
    const choice = f.E.equipmentChoice(f.s);
    assert(choice); assert.equal(choice.weapon.id, MATERIA); assert.equal(choice.sourceUid, f.u);
    assert.equal(choice.trait, 'reraise'); assert.deepEqual(choice.targets.slice().sort(), eligible.slice().sort());
    assert.equal(grants(f).length, 0, 'a pending choice is not a granted heart');
    const pending = JSON.stringify(f.s);
    assert.throws(() => f.E.next(f.s)); assert.equal(JSON.stringify(f.s), pending);
    for (const uid of [f.u, f.enemy, f.ally, f.s.players[side].reserve[0].uid]) {
      assert.throws(() => f.E.grantEquipment(f.s, uid), 'invalid recipient ' + uid);
      assert.equal(JSON.stringify(f.s), pending);
    }
    assert(eligible.includes(f.E.aiEquipmentChoice(f.s)));
    step(f, 'grantEquipment', eligible[0]);
    assert.equal(unit(f, eligible[0]).reraise, 1); assert.equal(f.E.equipmentChoice(f.s), null);
    assert.deepEqual(grants(f), [{weaponId: MATERIA, sourceUid: f.u, recipient: eligible[0], kind: 'reraise'}]);
    assert.equal(row(f, f.u).hearts, 1); assert.equal(row(f, f.u).support, 1);
    assert.equal(row(f, f.u).alliedSupport, 1); assert.equal(row(f, f.enemy).support, 0);
    assert.throws(() => f.E.grantEquipment(f.s, eligible[1]));
    visualEvent(f); next(f);
    const replacement = f.s.players[side].board[0].uid;
    assert.notEqual(replacement, f.u);
    duel(f, f.enemy, eligible[0], 2);
    assert.equal(unit(f, eligible[0]).reraise, 0); assert.equal(f.s.duel.reraised, eligible[0]);
    assert.equal(row(f, f.u).reraisesConsumedByRecipients, 1);
    assert.equal(row(f, replacement).support, 0);
    assert.equal(row(f, replacement).reraisesConsumedByRecipients, 0);
    reload(f); assert.equal(grants(f).length, 1); assert.equal(row(f, f.u).hearts, 1);
  });
}

test('Aeris own Reraise prevents the ultimate until a later definitive elimination', async () => {
  const f = await fixture(MATERIA); thin(f); unit(f, f.u).reraise = 1;
  duel(f, f.enemy, f.u, 2);
  assert.equal(f.s.duel.reraised, f.u); assert.equal(f.E.equipmentChoice(f.s), null);
  assert.equal(grants(f).length, 0); next(f); thin(f);
  duel(f, f.enemy, f.u, 2); assert.equal(f.E.equipmentChoice(f.s)?.sourceUid, f.u);
  step(f, 'grantEquipment', f.ally); assert.equal(grants(f).length, 1);
});

test('Aeris killed from an equal board does not become eligible merely because her death reduced its count', async () => {
  const f = await fixture(MATERIA);
  assert.equal(board(f).length, board(f, 1).length);
  duel(f, f.enemy, f.u, 2);
  assert.equal(board(f).length, 4); assert.equal(board(f, 1).length, 5);
  assert.equal(f.E.equipmentChoice(f.s), null); assert.equal(grants(f).length, 0);
  next(f);
});

test('Aeris with no eligible living board ally creates no blocking choice or fabricated grant', async () => {
  const f = await fixture(MATERIA); thin(f);
  for (const u of board(f)) if (u.uid !== f.u) u.reraise = 1;
  duel(f, f.enemy, f.u, 2);
  assert.equal(f.E.equipmentChoice(f.s), null); assert.equal(grants(f).length, 0);
  assert.equal(row(f, f.u).hearts, 0); next(f);
});

test('modern Aeris native Reraise support does not create the historical +20 DEF gift', async () => {
  const f = await fixture(MATERIA, {mutate: (data, selected) => {
    selected[0].atk[5] = 'revive'; selected[0].role = 5; selected[0].canHeal = true;
  }});
  lock(f, f.u, f.enemy); attack(f, 1); step(f, 'grantReraise', f.ally);
  assert.equal(row(f, f.u).hearts, 1); assert.equal(grants(f).length, 0);
  next(f); duel(f, f.enemy, f.ally); assert.equal(f.s.duel.formula.equipmentDefense, 0);
  next(f); thin(f); duel(f, f.enemy, f.u, 2);
  const choice = f.E.equipmentChoice(f.s); assert(choice);
  assert(!choice.targets.includes(f.ally)); step(f, 'grantEquipment', choice.targets[0]);
  assert.equal(row(f, f.u).hearts, 2); assert.equal(grants(f).length, 1);
});

for (const side of [0, 1]) for (const component of effects[POD].advantages) {
  test(`2B side ${side}: surviving an applied positive ${component} marks the exact enemy for +60 ATK`, async () => {
    const f = await fixture(POD, {side, mutate: advantage(component)});
    const d = duel(f);
    for (const key of effects[POD].advantages) assert.equal(d.formula[key] > 0, key === component, 'isolated ' + key);
    assert.equal(d.formula.equipmentDefense, 0, 'modern Pod does not retain its historical DEF charge');
    next(f); duel(f, f.u, f.enemy, 4);
    assertBonus(f, 60); visualEvent(f);
    assert.equal(grants(f).length, 0, 'reprisal is numeric equipment, not a native trait grant');
    next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 0);
  });
}

test('2B requires a positive applied advantage; raw ATK, native buffs and a disadvantage do not qualify', async () => {
  for (const scenario of ['neutral', 'native-buff', 'negative-weapon']) {
    const f = await fixture(POD, {mutate: (data, selected) => {
      if (scenario === 'negative-weapon') data.weapons[selected[1].weapon] = {[selected[0].weapon]: -30};
    }});
    if (scenario === 'native-buff') unit(f, f.enemy).physical = 60;
    duel(f); assert(effects[POD].advantages.every(key => f.s.duel.formula[key] <= 0));
    next(f); duel(f, f.u, f.enemy); assertBonus(f, 0);
  }
});

test('2B retained-six enemy equipment alone is not one of the four qualifying advantages', async () => {
  const f = await fixture(POD, {weapon: true}), enemy = board(f, 1)[0].uid;
  f.s.equipment.loadouts[1].weapon[f.E.card(unit(f, enemy)).characterId] = f.arm.id;
  reload(f); duel(f, enemy, f.u);
  assert.equal(f.s.duel.formula.equipmentWeapon, f.arm.effect.value);
  assert(effects[POD].advantages.every(key => f.s.duel.formula[key] === 0));
  next(f); duel(f, f.u, enemy, 4); assertBonus(f, 0);
});

test('2B only prepares after final numeric survival, including a failed Clover attempt and native retry', async () => {
  const f = await fixture(POD, {mutate: advantage('weapon')}); unit(f, f.u).luck = 1;
  lock(f, f.enemy, f.u); attack(f); step(f, 'rollDefense', 3);
  assert.equal(f.s.phase, 'defense'); assert.equal(f.s.match.events.length, 0);
  step(f, 'rollDefense', 1); assert.equal(f.s.phase, 'defense');
  step(f, 'rollDefense', 6); assert.equal(f.s.phase, 'result');
  assert.deepEqual(f.s.duel.defenseRolls, [3, 1, 6]);
  next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

test('2B captures the numeric threat on acceptance even when Dodge avoids a numeric defense formula', async () => {
  const f = await fixture(POD, {kalistel: true, mutate: advantage('weapon')});
  duel(f, f.enemy, f.u, 6, [2]);
  assert.equal(f.s.duel.defenseValue, 'dodge'); assert.equal(f.s.duel.formula, undefined);
  assert.equal(f.s.match.events.at(-1).dodge, true);
  next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

test('2B survives via Reraise on a numeric advantaged attack, but surviving special Death does not qualify', async () => {
  for (const die of [5, 2]) {
    const f = await fixture(POD, {mutate: advantage('weapon')}); unit(f, f.u).reraise = 1;
    duel(f, f.enemy, f.u, die); assert.equal(f.s.duel.reraised, f.u);
    next(f); duel(f, f.u, f.enemy); assertBonus(f, die === 5 ? 60 : 0);
  }
});

test('2B first enemy UID remains marked after a later advantaged attack from another enemy', async () => {
  const f = await fixture(POD, {mutate: (data, selected) => {
    for (const c of selected) data.weapons[c.weapon] = {[selected[0].weapon]: 30};
  }});
  const other = board(f, 1)[2].uid;
  duel(f); next(f); duel(f, other, f.u); next(f);
  duel(f, f.u, other, 4); assertBonus(f, 0); next(f);
  duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

test('2B ignores other targets and special support; discarded Kalistel numeric attack does not consume the mark', async () => {
  const f = await fixture(POD, {kalistel: true, mutate: advantage('weapon')});
  const other = board(f, 1)[2].uid;
  duel(f); next(f);
  duel(f, f.u, other, 4); assertBonus(f, 0); next(f);
  lock(f, f.u, f.enemy); step(f, 'rollAttack', 6);
  assert.equal(f.s.phase, 'kalistel'); step(f, 'useKalistel', 1);
  assert.equal(f.s.phase, 'clover'); step(f, 'grantClover', f.u); next(f);
  duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

test('2B special Death does not spend the mark if the exact enemy survives via Reraise', async () => {
  const f = await fixture(POD, {mutate: advantage('weapon')}); unit(f, f.enemy).reraise = 1;
  duel(f); next(f); duel(f, f.u, f.enemy, 2);
  assert.equal(f.s.duel.formula, undefined); assert.equal(f.s.duel.reraised, f.enemy);
  next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

test('2B accepted numeric reprisal is spent even when the marked enemy ends the duel with Dodge', async () => {
  const f = await fixture(POD, {mutate: advantage('weapon')});
  duel(f); assertReadyReprisal(f); next(f);
  duel(f, f.u, f.enemy, 4, [2]);
  assert.equal(f.s.duel.defenseValue, 'dodge'); assert.equal(f.s.duel.formula, undefined);
  next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 0);
});

test('2B reprisal adds to retained ATK6 weapon and native buff for every defense retry, then is spent permanently', async () => {
  const f = await fixture(POD, {weapon: true, kalistel: true, mutate: advantage('weapon')});
  unit(f, f.enemy).luck = 1; unit(f, f.u).physical = 60;
  duel(f); next(f);
  lock(f, f.u, f.enemy); step(f, 'rollAttack', 6);
  assert.equal(f.s.phase, 'kalistel'); assert.equal(f.s.duel.equipment.weapon, null);
  step(f, 'acceptAttack'); step(f, 'rollDefense', 3);
  assert.equal(f.s.phase, 'defense');
  const expected = 60 + f.arm.effect.value;
  assertBonus(f, expected); assertBonus(f, expected, f.s.duel.failedDefense);
  assert.equal(f.s.duel.formula.equipmentWeapon, f.arm.effect.value); assert.equal(f.s.duel.formula.buff, 60);
  step(f, 'rollDefense', 1); assert.equal(f.s.phase, 'defense');
  step(f, 'rollDefense', 6); assert.equal(f.s.phase, 'result');
  assert.deepEqual(f.s.duel.defenseRolls, [3, 1, 6]); assertBonus(f, expected);
  assertBonus(f, expected, f.s.duel.failedDefense); assert.equal(f.s.match.events.length, 2);
  assert.equal(row(f, f.u).attack, f.s.duel.formula.attack, 'one ATK total, not one per defense attempt');
  next(f); duel(f); next(f); duel(f, f.u, f.enemy, 4); assertBonus(f, 0);
  assert.equal(f.E.equipmentView(f.s, unit(f, f.u)).active, false);
});

test('2B loses a definitively eliminated mark without transferring it to a replacement or new attacker', async () => {
  const f = await fixture(POD, {mutate: (data, selected) => {
    for (const c of selected) data.weapons[c.weapon] = {[selected[0].weapon]: 30};
  }});
  const slot = f.s.players[1].board.findIndex(u => u?.uid === f.enemy);
  duel(f); assertReadyReprisal(f); next(f); duel(f, f.ally, f.enemy, 2);
  assert(f.s.players[1].dead.some(u => u.uid === f.enemy)); next(f);
  const replacement = f.s.players[1].board[slot].uid; assert.notEqual(replacement, f.enemy);
  duel(f, replacement, f.u); next(f);
  duel(f, f.u, replacement, 4); assertBonus(f, 0);
  assert.equal(f.E.equipmentView(f.s, unit(f, f.u)).active, false);
});

test('2B keeps the mark when another ally only consumes the marked enemy Reraise', async () => {
  const f = await fixture(POD, {mutate: advantage('weapon')}); unit(f, f.enemy).reraise = 1;
  duel(f); next(f); duel(f, f.ally, f.enemy, 2);
  assert.equal(f.s.duel.reraised, f.enemy); next(f);
  duel(f, f.u, f.enemy, 4); assertBonus(f, 60);
});

for (const id of [BOX, MATERIA]) {
  test(`${id}: forged recipients, donors, kinds and duplicate actual grants are rejected on JSON restore`, async () => {
    const f = await fixture(id); thin(f); duel(f, f.enemy, f.u, id === MATERIA ? 2 : 6);
    if (id === MATERIA) step(f, 'grantEquipment', f.ally);
    assert(grants(f).length > 0);
    const grant = s => s.match.events.find(e => e.relicGrants?.length).relicGrants;
    for (const mutate of [
      s => { grant(s)[0].sourceUid = f.enemy; },
      s => { grant(s)[0].recipient = f.enemy; },
      s => { grant(s)[0].recipient = f.u; },
      s => { grant(s)[0].recipient = s.players[f.side].reserve[0].uid; },
      s => { grant(s)[0].kind = 'mana'; },
      s => { grant(s)[0].weaponId = POD; },
      s => { grant(s).push(structuredClone(grant(s)[0])); }
    ]) rejected(f, mutate, 'forged relic grant');
    reload(f);
  });
}

test('2B forged +60 totals and failed-defense bonus cannot be accepted as a legitimate saved formula', async () => {
  const f = await fixture(POD, {weapon: true, mutate: advantage('weapon')}); unit(f, f.enemy).luck = 1;
  duel(f); next(f); duel(f, f.u, f.enemy, 6, [3, 6]); assertBonus(f, 60 + f.arm.effect.value);
  for (const mutate of [
    s => { s.duel.formula.equipmentAttack++; },
    s => { s.lastDuel.formula.equipmentAttack = f.arm.effect.value; },
    s => { s.duel.failedDefense.equipmentAttack = f.arm.effect.value; },
    s => { s.duel.formula.equipmentWeapon += 60; },
    s => { s.duel.formula.attack += 60; }
  ]) rejected(f, mutate, 'forged reprisal formula');
  rejected(f, s => {
    for (const d of [s.duel, s.lastDuel]) for (const fm of [d.formula, d.failedDefense]) {
      fm.equipmentAttack += 60; fm.attack += 60;
    }
    const event = s.match.events.at(-1); event.attack += 60;
    event.breakthrough = Math.max(0, event.attack - event.defense);
  }, 'internally consistent arithmetic cannot invent a second reprisal charge');
  reload(f);
});

test('a spent relic grant cannot be replayed in a later legitimate performance event', async () => {
  const f = await fixture(BOX); thin(f); duel(f);
  const first = structuredClone(grants(f)); assert.equal(first.length, 3);
  next(f); duel(f);
  assert.equal(grants(f).length, 3);
  rejected(f, s => { s.match.events.at(-1).relicGrants = first; }, 'duplicate grant in a different round');
  assert.equal(row(f, f.u).clovers, 3);
});

for (const legacy of [true, false]) for (const id of ['little-joys-flute', BOX, MATERIA, POD]) {
  test(`${legacy ? 'historical single-slot' : 'modern frozen old-definition'} ${id} retains its former effect after reload`, async () => {
    const f = await fixture(id, {legacy, oldDefinitions: !legacy, mutate: (data, selected) => {
      if (id === MATERIA) { selected[0].atk[5] = 'revive'; selected[0].role = 5; selected[0].canHeal = true; }
      if (id === POD) advantage('weapon')(data, selected);
    }});
    const frozen = structuredClone(f.s.equipment.definitions);
    assert.equal(f.s.equipment.version, legacy ? 1 : 2);
    if (legacy) assert.deepEqual(frozen, archive.weapons);
    if (id === POD) {
      duel(f); assert.equal(f.s.duel.formula.equipmentDefense, 0); next(f);
      duel(f); assert.equal(f.s.duel.formula.equipmentDefense, 20); next(f);
      duel(f); assert.equal(f.s.duel.formula.equipmentDefense, 0);
    } else {
      if (id === BOX) {
        assert.equal(frozen.find(w => w.id === BOX).effect.trigger, 'ONCE_DEFENSE');
        duel(f, f.enemy, board(f).at(-1).uid, 2);
        assert.equal(f.E.equipmentChoice(f.s).weaponId, BOX);
        step(f, 'grantEquipment', f.ally);
      } else {
        if (id === 'little-joys-flute') assert.equal(frozen.find(w => w.id === id).effect.trigger, 'AFTER_SUPPORT');
        lock(f, f.u, f.enemy); attack(f, 1);
        step(f, id === 'little-joys-flute' ? 'grantClover' : 'grantReraise', f.ally);
      }
      next(f); duel(f, f.enemy, f.ally);
      assert.equal(f.s.duel.formula.equipmentDefense, id === 'little-joys-flute' ? 30 : 20);
      next(f); duel(f, f.enemy, f.ally); assert.equal(f.s.duel.formula.equipmentDefense, 0);
    }
    next(f);
    if (id === POD) {
      duel(f, f.u, f.enemy, 4); assertBonus(f, 0, f.s.duel.formula);
    } else {
      thin(f);
      const before = board(f).filter(u => u.uid !== f.u).map(u => ({uid: u.uid, luck: u.luck, reraise: u.reraise}));
      duel(f, f.enemy, f.u, id === MATERIA ? 2 : 6);
      assert.equal(f.E.equipmentChoice(f.s), null);
      for (const old of before) {
        assert.equal(unit(f, old.uid).luck, old.luck);
        assert.equal(unit(f, old.uid).reraise, old.reraise);
      }
    }
    assert.equal(grants(f).length, 0);
    assert.deepEqual(f.s.equipment.definitions, frozen); reload(f);
  });
}

for (const id of [BOX, MATERIA, POD]) {
  test(`${id}: real engine match finishes, restores phase over, and exposes no active equipment or pending choice`, async () => {
    const f = await fixture(id, {kalistel: true, mutate: id === POD ? advantage('weapon') : undefined});
    for (let n = 0; f.s.phase !== 'over' && n < 1500; n++) {
      if (f.s.phase === 'choose') step(f, 'lock', ...f.E.aiChoice(f.s));
      else if (f.s.phase === 'attack') step(f, 'rollAttack', 5);
      else if (f.s.phase === 'kalistel') step(f, 'acceptAttack');
      else if (f.s.phase === 'defense') step(f, 'rollDefense', 6);
      else if (f.s.phase === 'replace') step(f, 'autoDeploy', f.s.replacing);
      else if (f.s.phase === 'result') {
        if (f.E.equipmentChoice(f.s)) step(f, 'grantEquipment', f.E.aiEquipmentChoice(f.s));
        else step(f, 'next');
      } else assert.fail('Unexpected deterministic phase ' + f.s.phase);
    }
    assert.equal(f.s.phase, 'over'); assert.equal(f.E.equipmentChoice(f.s), null);
    for (const p of f.s.players) for (const u of all(p)) {
      assert(f.E.equipmentViews(f.s, u).every(v => !v.active));
    }
    const before = f.E.matchStats(f.s); reload(f); reload(f);
    assert.deepEqual(f.E.matchStats(f.s), before);
    assert.equal(new Set(f.s.match.events.map(e => e.round)).size, f.s.match.events.length);
  });
}

for (const name of scenarios) for (const side of [0, 1]) {
  test(`browser fixture ${name}, side ${side}: JSON-only state resumes through the public engine`, async () => {
    const payload = await browserState(name, {side});
    assert.deepEqual(JSON.parse(JSON.stringify(payload)), payload);
    const E = createEngine(payload.data), f = {E, data: payload.data, s: E.restoreGame(payload.s), side,
      u: payload.sourceUid, ally: payload.allyUid, enemy: payload.enemyUid};
    assert(f.s.match.events.length > 0, 'scenario comes from actual prior combat');
    if (name === 'pre-momo-attack') {
      assert.equal(f.s.phase, 'attack'); assert.equal(f.s.duel.target, f.u);
      assert.equal(board(f).length, 4); assert.equal(board(f, 1 - side).length, 5);
      assert.equal(grants(f, BOX).length, 0);
      attack(f); assert(board(f).filter(u => u.uid !== f.u).every(u => u.luck === 1));
      step(f, 'rollDefense', 6); assert.equal(grants(f, BOX).length, 3);
    } else if (name === 'aeris-sacrifice-choice') {
      assert.equal(f.s.phase, 'result'); assert(f.s.players[side].dead.some(u => u.uid === f.u));
      const choice = E.equipmentChoice(f.s); assert.equal(choice.sourceUid, f.u);
      assert.equal(choice.trait, 'reraise'); assert.throws(() => E.next(f.s));
      step(f, 'grantEquipment', choice.targets[0]);
      assert.equal(grants(f, MATERIA).length, 1);
    } else {
      if (name === 'pod-ready') { assert.equal(f.s.phase, 'choose'); lock(f, f.u, f.enemy); attack(f); }
      assert.equal(f.s.phase, 'defense'); assert.equal(f.s.duel.attacker, f.u);
      step(f, 'rollDefense', 6); assertBonus(f, 60 + definition('virtuous-contract').effect.value);
    }
    reload(f);
  });
}

test('published browser scenarios preserve the live catalogue and replay against a separate unmodified engine', async t => {
  const {buildCatalog} = require('../atelier/game-catalog.cjs');
  const data = await buildCatalog({published: require('../donnees/catalogue.json').cards.filter(c => c.kind === 'created')});
  const original = structuredClone(data), published = createPublishedScenarios(data);
  assert.deepEqual(data, original, 'no changes to any faces, positions, elements, matrices, arenas or other catalogue fields');
  assert.deepEqual(published.map(f => [f.id, f.side]), [BOX, MATERIA, POD].flatMap(id => [0, 1].map(side => [id, side])));
  const E = createEngine(original);
  for (const f of published) await t.test(f.id + ', side ' + f.side, () => {
    assert.deepEqual(JSON.parse(JSON.stringify(f)), f, 'browser output contains only serializable state and replay metadata');
    for (const key of ['before', 'accepted', 'after', 'choice', 'ready', 'riposte']) {
      if (!f[key]) continue;
      E.assertState(f[key]); assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(f[key]))), f[key]);
      for (const p of f[key].players) assert.deepEqual(E.validatePlayableDeck(all(p).map(u => u.cardId)), []);
    }
    assert.equal(f.before.phase, 'attack'); assert.equal(f.before.duel.target, f.uid);
    assert.equal(f.before.duel.attacker, f.enemyUid);
    assert.equal(f.before.match.events.length, 0, 'preparation did not inject fake combat or relic events');
    assert(f.before.players.every(p => p.dead.length === 0));
    const source = all(f.before.players[f.side]).find(u => u.uid === f.uid);
    assert.equal(f.before.equipment.loadouts[f.side].relic[E.card(source).characterId], f.id);
    assert.equal(f.before.players[f.side].board.filter(Boolean).length, f.id === POD ? 5 : 4);
    assert.equal(f.before.players[1 - f.side].board.filter(Boolean).length, 5);
    if (f.id !== POD) assert.equal(f.before.players[f.side].reserve.length, 6, 'staged starter remains in the legal deck');

    const s = E.restoreGame(f.before);
    E.rollAttack(s, f.attackDie); assert.equal(s.phase, 'kalistel'); E.acceptAttack(s);
    assert.deepEqual(s, f.accepted);
    E.rollDefense(s, f.defenseDie); assert.equal(s.phase, 'result');
    if (f.id === MATERIA) {
      assert.deepEqual(s, f.choice);
      assert(s.players[f.side].dead.some(u => u.uid === f.uid));
      const choice = E.equipmentChoice(s);
      assert.equal(choice.sourceUid, f.uid); assert.equal(choice.trait, 'reraise');
      assert(choice.targets.includes(f.recipientUid)); assert.throws(() => E.next(s));
      E.grantEquipment(s, f.recipientUid);
      assert.equal(E.matchStats(s).units.find(u => u.uid === f.uid).hearts, 1);
    } else if (f.id === POD) {
      assert(effects[POD].advantages.some(key => s.duel.formula[key] > 0));
      assert(s.players[f.side].board.some(u => u?.uid === f.uid));
      E.next(s); assert.deepEqual(s, f.ready);
      assert.equal(s.turn, f.side); assert.equal(s.phase, 'choose');
      E.lock(s, s.players[f.side].board.findIndex(u => u?.uid === f.uid), s.players[1 - f.side].board.findIndex(u => u?.uid === f.enemyUid));
      E.rollAttack(s, f.riposteAttackDie); if (s.phase === 'kalistel') E.acceptAttack(s);
      assert.deepEqual(s, f.riposte);
      E.rollDefense(s, f.riposteDefenseDie);
      assert.equal(s.duel.formula.equipmentAttack, 60 + s.duel.formula.equipmentWeapon);
    } else {
      assert.equal(s.match.events.at(-1).relicGrants.length, 3);
      assert.equal(E.matchStats(s).units.find(u => u.uid === f.uid).clovers, 3);
    }
    assert.deepEqual(s, f.after);
    E.assertState(s);
  });
  assert.deepEqual(data, original);
});
