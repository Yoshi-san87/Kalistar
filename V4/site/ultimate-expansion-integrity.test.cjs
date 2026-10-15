'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {IDS, fixture, record, grants, uses, unit, board, reload, step, lock, attack,
  duel, next, choose, settleChoices, support, killAlly, outnumber, twoSupports,
  replacements, assertFormula, rejected, nativeMatch} = require('./fixtures/ultimate-expansion.cjs');

async function targetChoice(id = 'lost-names-bell') {
  const f = await fixture(id);
  killAlly(f); next(f); killAlly(f);
  assert.equal(f.E.equipmentChoice(f.s)?.mode, 'target');
  return f;
}
async function parityChoice() {
  const f = await fixture('gotham-riddle-box', {supports: ['luck'], kalistel: true});
  support(f, f.u, f.ally, 'luck'); next(f); lock(f);
  assert.equal(f.E.equipmentChoice(f.s)?.mode, 'parity');
  return f;
}
async function traitChoice() {
  const f = await fixture('log-pose', {mutate: (data, selected) => {
    selected.slice(5).forEach(c => { c.positions = [3]; });
  }});
  killAlly(f); next(f); duel(f, f.enemy, f.ally, 5); next(f, {deploy: false});
  step(f, 'deploy', f.side, f.s.players[f.side].reserve[0].uid, 2);
  assert.equal(f.E.equipmentChoice(f.s)?.mode, 'trait');
  return f;
}

for (const [mode, setup] of [['target', targetChoice], ['parity', parityChoice], ['trait', traitChoice]]) {
  test(`${mode} pending choice round-trips exactly and rejects illegal values without partial mutation`, async () => {
    const f = await setup(), choice = structuredClone(f.E.equipmentChoice(f.s));
    reload(f); reload(f); assert.deepEqual(f.E.equipmentChoice(f.s), choice);
    const before = structuredClone(f.s);
    for (const value of ['missing', '__proto__', -1, null, f.s.players[f.side].reserve[0]?.uid]) {
      if (choice.options.some(o => o.value === value)) continue;
      assert.throws(() => f.E.grantEquipment(f.s, value)); assert.deepEqual(f.s, before);
    }
    assert(choice.options.some(o => o.value === f.E.aiEquipmentChoice(f.s)));
    choose(f, choice.options[0].value); assert.equal(f.E.equipmentChoice(f.s), null);
    assert.equal(record(f).status, 'spent');
  });
}

test('pending target choice blocks advancing the result; partial multi-target choice survives reload', async () => {
  const f = await fixture('exiled-king-seal'); outnumber(f); duel(f);
  const pending = structuredClone(f.s);
  assert.throws(() => f.E.next(f.s)); assert.deepEqual(f.s, pending);
  choose(f, f.ally); assert.equal(grants(f).length, 1);
  const choice = f.E.equipmentChoice(f.s); assert.equal(choice.remaining, 1);
  assert(!choice.targets.includes(f.ally)); reload(f);
  assert.throws(() => f.E.next(f.s)); choose(f, f.ally2);
  assert.equal(grants(f).length, 2); assert.equal(record(f).status, 'spent');
  next(f);
});

test('pending prediction blocks both the attack die and a second prediction after choosing', async () => {
  const f = await parityChoice(), before = structuredClone(f.s);
  assert.throws(() => f.E.rollAttack(f.s, 6)); assert.deepEqual(f.s, before);
  choose(f, 'even'); const fixed = structuredClone(f.s);
  assert.throws(() => f.E.grantEquipment(f.s, 'odd')); assert.deepEqual(f.s, fixed);
  step(f, 'rollAttack', 6); reload(f); step(f, 'acceptAttack'); step(f, 'rollDefense', 6);
  assertFormula(f, 0, 50);
});

test('pending deployment trait choice blocks starting a new duel before attribution', async () => {
  const f = await traitChoice(), before = structuredClone(f.s);
  assert.throws(() => f.E.lock(f.s, 0, 0)); assert.deepEqual(f.s, before);
  choose(f, 'mana'); replacements(f); reload(f);
  assert.equal(grants(f).length, 1);
});

for (const id of IDS) {
  test(`${id}: frozen pre-expansion definition keeps its old rules without new ritual journal`, async () => {
    const f = await fixture(id, {frozen: true});
    const definitions = structuredClone(f.s.equipment.definitions);
    duel(f); settleChoices(f); next(f); duel(f, f.u, f.enemy);
    assert.deepEqual(f.s.equipment.definitions, definitions);
    assert.equal(f.s.equipment.rituals, undefined);
    assert.equal(f.s.match.ultimateGrants, undefined);
    assert.equal(f.s.duel.ultimateModifiers, undefined);
    reload(f);
  });
}

test('same-round Eiko Ward can replace a consumed Ward after Reraise without refreshing that heart', async () => {
  const f = await fixture('ff9-mog-ribbon', {supports: ['reraise']});
  support(f, f.u, f.ally, 'reraise'); next(f);
  support(f, f.helper, f.ally, 'ward'); next(f);
  duel(f, f.enemy, f.ally, 5);
  assert.equal(f.s.duel.ward, 60); assert.equal(f.s.duel.reraised, f.ally);
  assert.equal(unit(f, f.ally).ward, 60); assert.equal(unit(f, f.ally).reraise, 0);
  assert.equal(unit(f, f.ally).traitSources.ward.donor, f.u);
  assert.equal(grants(f).length, 1); reload(f); next(f);
  duel(f, f.enemy, f.ally, 4, [4]);
  assert.equal(f.s.duel.formula.ward, 60); assert.equal(unit(f, f.ally).ward, 0);
  assert.equal(grants(f).length, 1);
});

test('Auron Ward and Eiko replacement Ward in one round are distinct charges', async () => {
  const f = await fixture('ff9-mog-ribbon', {supports: ['reraise'], extras: ['guardian-jug']});
  const auron = f.uids['guardian-jug'];
  support(f, f.u, auron, 'reraise'); next(f);
  outnumber(f, 2, [f.u, auron]);
  duel(f, f.enemy, auron, 5);
  assert.equal(f.s.duel.ward, 60);
  assert.equal(f.s.duel.reraised, auron);
  assert.equal(unit(f, auron).ward, 60);
  assert.equal(unit(f, auron).traitSources.ward.donor, f.u);
  assert.equal(f.s.duel.nativeSources.ward.donor, auron);
  reload(f); next(f); duel(f, f.enemy, auron, 4, [4]);
  assert.equal(f.s.duel.formula.ward, 60);
  assert.equal(unit(f, auron).ward, 0);
  reload(f);
});

test('a stale post-consumption Ward without an actual new grant is rejected', async () => {
  const f = await fixture('ff9-mog-ribbon', {supports: ['reraise']});
  support(f, f.helper, f.ally, 'ward'); next(f); duel(f, f.enemy, f.ally);
  assert.equal(f.s.duel.ward, 60); assert.equal(grants(f).length, 0);
  rejected(f, s => { s.players[f.side].board.find(u => u.uid === f.ally).ward = 60; });
});

for (const id of ['straw-hat', 'gotham-utility-belt', 'gotham-ivy-seed']) {
  test(`${id}: exact UID mark survives its target's Reraise but never moves to a replacement`, async () => {
    const f = await fixture(id, {supports: id === 'gotham-ivy-seed' ? ['luck', 'mana'] : []});
    support(f, (1 - f.side) + '-3', f.enemy, 'reraise'); next(f);
    if (id === 'straw-hat') { killAlly(f); next(f); }
    else if (id === 'gotham-utility-belt') { duel(f); next(f); }
    else { twoSupports(f); choose(f, f.enemy); next(f); }
    assert.equal(record(f).targetUid, f.enemy);
    duel(f, f.ally, f.enemy, 5); assert.equal(f.s.duel.reraised, f.enemy);
    assert.equal(record(f).status, 'ready'); next(f);
    duel(f, f.ally, f.enemy, 5); assert(f.s.players[1 - f.side].dead.some(u => u.uid === f.enemy));
    assert.equal(record(f).status, 'lost'); const oldUid = f.enemy;
    next(f); const replacement = board(f, 1 - f.side).find(u => !u.uid.endsWith('-0') && !u.uid.endsWith('-1') && Number(u.uid.split('-')[1]) >= 5);
    assert(replacement); assert.notEqual(replacement.uid, oldUid);
    if (id === 'straw-hat') duel(f, f.u, replacement.uid);
    else duel(f, replacement.uid, f.u);
    assertFormula(f); assert.equal(uses(f).length, 0);
  });
}

test('Ivy reduction is credited to its actual source when another ally defends', async () => {
  const f = await fixture('gotham-ivy-seed', {supports: ['luck', 'mana']});
  twoSupports(f); choose(f, f.enemy); next(f);
  duel(f, f.enemy, f.ally, 4, [6]);
  assertFormula(f, -40);
  const stats = f.E.matchStats(f.s).units;
  assert.equal(stats.find(u => u.uid === f.u).debuff, 40);
  assert.equal(stats.find(u => u.uid === f.ally).debuff, 0);
  reload(f);
});

test('an Ivy-marked attack ending in Dodge gives no fabricated or negative debuff score', async () => {
  const f = await fixture('gotham-ivy-seed', {supports: ['luck', 'mana']});
  twoSupports(f); choose(f, f.enemy); next(f);
  duel(f, f.enemy, f.ally, 4, [2]);
  assert.equal(record(f).status, 'spent');
  assert(f.E.matchStats(f.s).units.every(u => u.debuff === 0));
  reload(f);
});

test('restore rejects cross-camp or unknown progress, record owners and frozen weapon IDs', async () => {
  const f = await targetChoice();
  for (const change of [
    r => { r.sourceUid = f.enemy; }, r => { r.weaponId = 'griever-pendant'; },
    r => { r.status = 'charged'; }, r => { r.seen.push(r.seen[0]); },
    r => { r.progress[0].round = f.s.round + 1; }, r => { r.progress[0].recipient = f.enemy; },
    r => { r.progress[0].id = 'invented'; }, r => { r.progress[1] = structuredClone(r.progress[0]); }
  ]) rejected(f, s => change(s.equipment.rituals.records[f.u]));
  rejected(f, s => { s.equipment.rituals.records[f.enemy] = s.equipment.rituals.records[f.u]; });
  rejected(f, s => { s.equipment.rituals.version = 9; });
});

test('one Block cannot be restored as a charged two-Block ultimate', async () => {
  const f = await fixture('cola-reserve'); duel(f);
  assert.equal(record(f).status, 'tracking'); assert.equal(record(f).progress.length, 1);
  rejected(f, s => {
    const r = s.equipment.rituals.records[f.u]; r.status = 'ready'; r.armedRound = s.round;
  });
});

test('spent ultimate cannot be restored as ready or tracking while keeping its consumed ledger', async () => {
  const f = await fixture('cola-reserve'); duel(f); next(f); duel(f); next(f);
  duel(f, f.u, f.enemy); assertFormula(f, 60);
  for (const status of ['ready', 'tracking']) rejected(f, s => { s.equipment.rituals.records[f.u].status = status; });
  rejected(f, s => { delete s.equipment.rituals.records[f.u].spentRound; });
  rejected(f, s => { s.equipment.rituals.uses.push({...s.equipment.rituals.uses[0], id: 'm1'}); });
});

test('forged direct modifier amount, recipient, sign and detached duel copies are rejected', async () => {
  const f = await fixture('cola-reserve'); duel(f); next(f); duel(f); next(f); duel(f, f.u, f.enemy);
  const mutations = [m => { m.value = 61; }, m => { m.value = 59; }, m => { m.value = -60; },
    m => { m.recipient = f.enemy; }, m => { m.weaponId = 'straw-hat'; }, m => { m.round = 1; }];
  for (const change of mutations) rejected(f, s => change(s.equipment.rituals.uses[0]));
  for (const field of ['duel', 'lastDuel']) {
    rejected(f, s => { s[field].ultimateModifiers[0].value = 59; });
    rejected(f, s => { s[field].formula.ultimateAttack = 59; });
  }
});

test('grants cannot be duplicated, moved to the other camp or reattributed to a replacement', async () => {
  const f = await targetChoice(); choose(f, f.ally);
  for (const change of [g => { g.sourceUid = f.enemy; }, g => { g.recipient = f.enemy; },
    g => { g.kind = 'reraise'; }, g => { g.weaponId = 'white-materia'; }, g => { g.round = 1; }]) {
    rejected(f, s => change(s.match.ultimateGrants[0]));
  }
  rejected(f, s => { s.match.ultimateGrants.push({...s.match.ultimateGrants[0], id: 'g2'}); });
  rejected(f, s => { delete s.equipment.rituals.records[f.u]; });
});

test('forged deployment history cannot prepare Nami for a reserve unit that never entered', async () => {
  const f = await traitChoice();
  assert(f.s.equipment.rituals.deployments.length);
  rejected(f, s => { s.equipment.rituals.deployments[0].uid = f.enemy; });
  rejected(f, s => { s.equipment.rituals.deployments[0].rosters[f.side] = []; });
  rejected(f, s => { s.equipment.rituals.deployments.push(structuredClone(s.equipment.rituals.deployments[0])); });
});

test('old frozen saves reject new journals or ultimate formula injections', async () => {
  const f = await fixture('griever-pendant', {frozen: true}); duel(f);
  rejected(f, s => { s.equipment.rituals = {version: 1, records: {}, events: [], uses: [], deployments: []}; });
  rejected(f, s => { s.match.ultimateGrants = []; });
  for (const field of ['duel', 'lastDuel']) rejected(f, s => { s[field].ultimateModifiers = []; });
  rejected(f, s => {
    for (const field of ['duel', 'lastDuel']) {
      s[field].formula.ultimateAttack = 60; s[field].formula.attack += 60;
    }
    s.match.events.at(-1).attack += 60;
  });
});

test('current catalogue without any ritual record rejects coherent numeric ultimate injection', async () => {
  const f = await fixture('exiled-king-seal'); duel(f);
  assert.equal(Object.keys(f.s.equipment.rituals?.records || {}).length, 0);
  assert.equal(uses(f).length + grants(f).length, 0);
  rejected(f, s => {
    for (const field of ['duel', 'lastDuel']) {
      s[field].formula.ultimateAttack = 60; s[field].formula.attack += 60;
    }
    s.match.events.at(-1).attack += 60;
  });
});

test('seeded coin produces both outcomes in bounded seeds and never rerolls on restore', async () => {
  const outcomes = new Set();
  for (let seed = 0; seed < 16 && outcomes.size < 2; seed++) {
    const f = await fixture('gotham-harvey-coin', {seed: 'COIN-COVERAGE-' + seed});
    outnumber(f); duel(f, f.u, f.enemy);
    const coin = record(f).coin, rng = f.s.rng; outcomes.add(coin);
    reload(f); reload(f); assert.equal(record(f).coin, coin); assert.equal(f.s.rng, rng);
    assert.equal(uses(f).length + grants(f).length, 1);
  }
  assert.deepEqual([...outcomes].sort(), ['heads', 'tails']);
});

// These are native-profile, same-seed smoke comparisons, not balance estimates.
// Both opponents carry the relic in the equipped branch. Every state is restored
// and validated after every action, including pre-roll and deployment choices.
test('32 native same-seed full matches with and without equipped opponents terminate and restore', {timeout: 240000}, async t => {
  const summaries = [];
  for (const id of IDS) {
    await t.test(id, async () => {
      const baseline = await nativeMatch(id, {equipped: false});
      const equipped = await nativeMatch(id, {equipped: true});
      assert(baseline.exchanges <= 200 && equipped.exchanges <= 200);
      assert.equal(baseline.spent + baseline.uses + baseline.grants, 0);
      assert(equipped.spent <= 2 && equipped.uses <= 2 && equipped.grants <= 8);
      summaries.push({id, nativeCarrier: equipped.carrierId,
        exchanges: [baseline.exchanges, equipped.exchanges], winners: [baseline.winner, equipped.winner],
        spent: equipped.spent, uses: equipped.uses, grants: equipped.grants});
    });
  }
  t.diagnostic(JSON.stringify({kind: 'native-smoke-not-balance', matches: summaries.length * 2,
    carriersEquipped: summaries.length * 2, spent: summaries.reduce((n, r) => n + r.spent, 0), summaries}));
});
