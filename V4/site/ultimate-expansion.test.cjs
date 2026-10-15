'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('./equipment.js');
const definitions = require('./ultimate-definitions.js');
const F = require('./fixtures/ultimate-expansion.cjs');
const {IDS, definition, fixture, unit, board, record, grants, uses, row, reload,
  step, choose, settleChoices, lock, attack, duel, support, next, replacements,
  killAlly, outnumber, twoSupports, assertFormula, magicEnemy, magicCarrier} = F;

test('all 32 approved relics are real compatible catalogue items with validated declarative definitions', async () => {
  assert.equal(IDS.length, 32);
  assert.deepEqual(Object.keys(definitions).sort(), [...IDS].sort());
  for (const id of IDS) {
    const w = definition(id), f = await fixture(id);
    assert.equal(w.effect.trigger, 'ULTIMATE', id);
    assert.equal(w.effect.duration, 'ONCE_MATCH', id);
    assert.equal(Q.validateDefinition(w), w);
    assert(Q.compatible(w, f.E.card(unit(f, f.u))), id);
    assert.equal(grants(f).length + uses(f).length, 0, 'initial deployment cannot spend ' + id);
  }
});

for (const side of [0, 1]) {
  for (const [id, kind, count] of [['exiled-king-seal', 'ward', 2], ['zanarkand-abes-pendant', 'physical', 1]]) {
    test(`${id} side ${side}: outnumbered Block grants other allies once, with real native consumption`, async () => {
      const f = await fixture(id, {side}); outnumber(f);
      duel(f); assert.equal(f.E.equipmentChoice(f.s)?.type, 'ultimate');
      const choices = settleChoices(f, [f.ally, f.ally2]);
      assert.equal(choices.length, count);
      assert.equal(grants(f).length, count);
      assert(grants(f).every(g => g.sourceUid === f.u && g.recipient !== f.u && g.kind === kind));
      assert.equal(row(f).support, count);
      next(f);
      if (kind === 'ward') {
        duel(f, f.enemy, f.ally, 4, [4]);
        assert.equal(f.s.duel.formula.ward, 60);
        assert.equal(f.s.duel.formula.attack, f.s.duel.formula.defense);
      } else {
        duel(f, f.ally, f.enemy);
        assert.equal(f.s.duel.formula.buff, 60);
      }
      assert.equal(unit(f, f.ally)[kind], 0);
      next(f); duel(f); assert.equal(f.E.equipmentChoice(f.s), null);
      assert.equal(grants(f).length, count);
    });
  }

  test(`current-compass side ${side}: offsets only the real elemental penalty, once`, async () => {
    const f = await fixture('current-compass', {side, mutate: (data, selected) => {
      selected[0].element = 'ELECTRO'; selected[4].element = 'RAINBOW';
      data.weapons[selected[0].weapon] = {[selected[4].weapon]: -30};
    }});
    outnumber(f); duel(f, f.u, f.enemy, 4);
    assert.equal(f.s.duel.formula.element, -40); assert.equal(f.s.duel.formula.weapon, -30);
    assertFormula(f, 40); next(f); duel(f, f.u, f.enemy, 4); assertFormula(f);
  });

  test(`last-garden-seed side ${side}: real Reraise support also grants Clover to the same ally`, async () => {
    const f = await fixture('last-garden-seed', {side, supports: ['reraise']});
    support(f, f.u, f.ally, 'reraise');
    assert.equal(unit(f, f.ally).reraise, 1); assert.equal(unit(f, f.ally).luck, 1);
    assert.deepEqual(grants(f).map(g => [g.recipient, g.kind]), [[f.ally, 'luck']]);
    assert.equal(row(f).hearts, 1); assert.equal(row(f).clovers, 1);
    next(f); support(f, f.u, f.ally2, 'reraise');
    assert.equal(unit(f, f.ally2).luck, 0); assert.equal(grants(f).length, 1);
  });

  test(`lost-names-bell side ${side}: two real allied deaths unlock a two-trait single recipient choice`, async () => {
    const f = await fixture('lost-names-bell', {side});
    killAlly(f); assert.equal(f.E.equipmentChoice(f.s), null); next(f);
    killAlly(f); assert.equal(f.E.equipmentChoice(f.s)?.type, 'ultimate');
    choose(f, f.ally); assert.equal(f.E.equipmentChoice(f.s), null);
    assert.equal(unit(f, f.ally).mana, 60); assert.equal(unit(f, f.ally).luck, 1);
    assert.equal(grants(f).length, 2); assert.equal(row(f).potions, 1); assert.equal(row(f).clovers, 1);
    next(f); killAlly(f); assert.equal(f.E.equipmentChoice(f.s), null); assert.equal(grants(f).length, 2);
  });

  test(`kalistar-nerval-lantern side ${side}: only a causally life-saving own Ward grants Clover`, async () => {
    const f = await fixture('kalistar-nerval-lantern', {side, supports: ['ward']});
    support(f, f.u, f.ally, 'ward'); next(f);
    duel(f, f.enemy, f.ally, 6, [6]);
    assert.equal(grants(f).length, 0, 'a gratuitously consumed ward did not save this ally');
    next(f); support(f, f.u, f.ally, 'ward'); next(f);
    duel(f, f.enemy, f.ally, 4, [4]);
    assert.equal(f.s.duel.formula.attack, 160); assert.equal(f.s.duel.formula.defense, 160);
    assert.equal(unit(f, f.ally).luck, 1); assert.equal(grants(f).length, 1);
    assert.equal(grants(f)[0].sourceUid, f.u);
  });

  for (const id of ['kalistar-nestown-beacon', 'ff9-terra-fragment']) {
    test(`${id} side ${side}: losses while active prepare the next distinct reinforcement`, async () => {
      const f = await fixture(id, {side});
      killAlly(f); next(f); killAlly(f);
      assert.equal(record(f)?.status, 'ready');
      assert.equal(grants(f).length + uses(f).length, 0);
      const old = new Set(board(f).map(u => u.uid));
      next(f);
      const recipient = board(f).find(u => !old.has(u.uid)).uid;
      assert.notEqual(recipient, f.u);
      if (id === 'kalistar-nestown-beacon') {
        assert.equal(unit(f, recipient).ward, 60); assert.equal(unit(f, recipient).luck, 1);
        assert.deepEqual(grants(f).map(g => [g.recipient, g.kind]), [[recipient, 'ward'], [recipient, 'luck']]);
        duel(f, f.enemy, recipient, 4, [4]); assert.equal(f.s.duel.formula.ward, 60);
      } else {
        duel(f, recipient, f.enemy); assertFormula(f, 50);
        next(f); duel(f, f.enemy, recipient); assertFormula(f);
      }
      assert.equal(record(f).status, 'spent');
    });
  }

  for (const id of ['griever-pendant', 'ff9-final-act-feather']) {
    test(`${id} side ${side}: numeric last-stand attack is boosted exactly once`, async () => {
      const f = await fixture(id, {side, mutate: id === 'ff9-final-act-feather' ? magicCarrier : undefined});
      outnumber(f, 2, [f.u, f.ally]);
      duel(f, f.u, f.enemy); assertFormula(f, 60);
      assert.equal(uses(f).length, 1); assert(f.s.log.some(l => l.text.includes(definition(id).name) && l.text.includes('60')));
      next(f); duel(f, f.u, f.enemy); assertFormula(f); assert.equal(uses(f).length, 1);
    });
  }

  test(`guardian-jug side ${side}: same-duel Ward provenance and remaining companion`, async () => {
    const f = await fixture('guardian-jug', {side}); outnumber(f, 2, [f.u, f.ally]);
    duel(f, f.enemy, f.u, 4, [4]);
    assert.equal(f.s.duel.formula.ward, 60);
    assert.equal(unit(f, f.u).ward, 0); assert.equal(unit(f, f.ally).ward, 60);
    assert.equal(grants(f).length, 2);
    assert.equal(row(f).guards, 2); assert.equal(row(f).alliedSupport, 1, 'self gift is not allied support');
    next(f); duel(f, f.enemy, f.u); assert.equal(f.s.duel.formula.ward, 0);
  });

  for (const id of ['ff9-garnet-pendant', 'metal-gear-mkii', 'castlevania-hector-ring']) {
    test(`${id} side ${side}: two different native recipients unlock bounded genuine grants`, async () => {
      const kinds = id === 'castlevania-hector-ring' ? ['ward', 'reraise'] : ['luck', 'mana'];
      const f = await fixture(id, {side, supports: kinds});
      support(f, f.u, f.ally, kinds[0]); assert.equal(f.E.equipmentChoice(f.s), null); next(f);
      support(f, f.u, f.ally2, kinds[1]);
      assert.equal(f.E.equipmentChoice(f.s)?.type, 'ultimate');
      settleChoices(f, [f.ally, f.ally2]);
      const expected = id === 'ff9-garnet-pendant' ? 'ward' : id === 'metal-gear-mkii' ? 'ward' : 'reraise';
      assert.equal(unit(f, f.ally)[expected], expected === 'ward' ? 60 : 1);
      assert.equal(record(f).status, 'spent');
      assert(grants(f).length <= 2 && grants(f).length > 0);
      assert(grants(f).every(g => g.recipient !== f.u));
      if (id === 'ff9-garnet-pendant') assert.equal(grants(f).length, 2);
      if (id === 'metal-gear-mkii') assert.equal(grants(f).filter(g => g.kind === 'luck').length, 0, 'already present clover is not duplicated');
    });
  }

  test(`ff9-mog-ribbon side ${side}: consumed Eiko heart grants a new Ward after fatal resolution`, async () => {
    const f = await fixture('ff9-mog-ribbon', {side, supports: ['reraise']});
    support(f, f.u, f.ally, 'reraise'); next(f);
    duel(f, f.enemy, f.ally, 5);
    assert.equal(f.s.duel.reraised, f.ally); assert.equal(unit(f, f.ally).reraise, 0);
    assert.equal(unit(f, f.ally).ward, 60); assert.equal(grants(f).length, 1);
    next(f); duel(f, f.enemy, f.ally, 4, [4]);
    assert.equal(f.s.duel.formula.ward, 60); assert.equal(grants(f).length, 1);
  });

  test(`ff9-tantalus-script side ${side}: physical power passes once to a third companion`, async () => {
    const f = await fixture('ff9-tantalus-script', {side, supports: ['physical']});
    support(f, f.u, f.ally, 'physical'); next(f); duel(f, f.ally, f.enemy);
    const choice = f.E.equipmentChoice(f.s); assert(choice);
    assert(!choice.targets.includes(f.u)); assert(!choice.targets.includes(f.ally));
    choose(f, f.ally2); assert.equal(unit(f, f.ally2).physical, 60);
    next(f); duel(f, f.ally2, f.enemy);
    assert.equal(f.s.duel.formula.buff, 60); assert.equal(grants(f).length, 1);
    assert.equal(f.E.equipmentChoice(f.s), null, 'the relayed gift cannot loop back into its spent source');
  });

  test(`pod-153 side ${side}: two supports remove tactical advantage, never printed ATK`, async () => {
    const f = await fixture('pod-153', {side, supports: ['luck', 'mana'], mutate: (data, selected) => {
      data.weapons[selected[4].weapon] = {[selected[0].weapon]: 80};
    }});
    twoSupports(f); next(f); duel(f);
    assert.equal(f.s.duel.formula.baseAttack, 40); assert.equal(f.s.duel.formula.weapon, 80);
    assertFormula(f, -60); next(f); duel(f); assertFormula(f);
  });

  test(`lunar-tear side ${side}: actual Clover rescue arms a single numeric retaliation`, async () => {
    const f = await fixture('lunar-tear', {side});
    support(f, f.helper, f.u, 'luck'); next(f);
    duel(f, f.enemy, f.u, 4, [3, 6]);
    assert.equal(f.s.duel.luckUsed, f.u); assert.equal(record(f)?.status, 'ready');
    next(f); duel(f, f.u, f.enemy); assertFormula(f, 60);
    next(f); duel(f, f.u, f.enemy); assertFormula(f);
  });

  test(`infiltration-box side ${side}: two consecutive uninvolved exchanges, not mere elapsed time`, async () => {
    const f = await fixture('infiltration-box', {side});
    duel(f, f.enemy, f.ally); next(f); duel(f); next(f);
    duel(f, f.u, f.enemy); assertFormula(f); next(f);
    duel(f, f.enemy, f.ally); next(f); duel(f, f.enemy, f.ally2); next(f);
    duel(f, f.u, f.enemy); assertFormula(f, 40);
    next(f); duel(f, f.u, f.enemy); assertFormula(f);
  });

  test(`jill-lockpicks side ${side}: same-round emergency Clover rerolls once and can still fail`, async () => {
    const f = await fixture('jill-lockpicks', {side}); outnumber(f);
    lock(f); attack(f, 4); step(f, 'rollDefense', 3);
    assert.equal(f.s.phase, 'defense'); assert.equal(f.s.duel.autoDefense, true);
    assert.equal(grants(f).length, 1); assert.equal(unit(f, f.u).luck, 0);
    step(f, 'rollDefense', 6); assert.equal(f.s.phase, 'result');
    assert.equal(row(f).clovers, 1); assert.equal(record(f).status, 'spent');
    next(f); duel(f, f.enemy, f.u, 4, [3]);
    assert(f.s.players[side].dead.some(u => u.uid === f.u)); assert.equal(grants(f).length, 1);
  });

  test(`wolf-medallion side ${side}: incoming advantaged numeric magic grants 60 DEF once`, async () => {
    const f = await fixture('wolf-medallion', {side, mutate: magicEnemy});
    duel(f); assert(f.s.duel.formula.element > 0); assert.equal(f.s.duel.magic, true);
    assertFormula(f, 0, 60); next(f); duel(f); assertFormula(f);
  });

  for (const id of ['obsidian-star', 'castlevania-lisa-memory']) {
    test(`${id} side ${side}: protective ultimate helps the other ally, once`, async () => {
      const f = await fixture(id, {side, mutate: id === 'obsidian-star' ? magicEnemy : undefined});
      outnumber(f); duel(f, f.enemy, f.ally); assertFormula(f, 0, 60);
      assert.equal(uses(f)[0].sourceUid, f.u); assert.equal(uses(f)[0].recipient, f.ally);
      next(f); duel(f, f.enemy, f.ally); assertFormula(f);
    });
  }

  test(`straw-hat side ${side}: only the exact killer UID receives Luffy's retaliation`, async () => {
    const f = await fixture('straw-hat', {side}); killAlly(f); next(f);
    const other = board(f, 1 - side).find(u => u.uid !== f.enemy).uid;
    duel(f, f.u, other); assertFormula(f); next(f);
    duel(f, f.u, f.enemy); assertFormula(f, 60); next(f);
    duel(f, f.u, f.enemy); assertFormula(f);
  });

  test(`log-pose side ${side}: outnumbered legal reinforcement opens a real one-trait choice`, async () => {
    const f = await fixture('log-pose', {side, mutate: (data, selected) => {
      selected.slice(5).forEach(c => { c.positions = [3]; });
    }});
    killAlly(f); next(f); assert.equal(board(f).length, 4);
    duel(f, f.enemy, f.ally, 5); next(f, {deploy: false});
    const recipient = f.s.players[side].reserve[0].uid;
    step(f, 'deploy', side, recipient, 2);
    const choice = f.E.equipmentChoice(f.s); assert.equal(choice?.mode, 'trait');
    assert.deepEqual(choice.options.map(o => o.value).sort(), ['mana', 'physical']);
    assert(choice.targets.every(uid => uid === recipient)); choose(f, 'physical');
    replacements(f); assert.equal(unit(f, recipient).physical, 60); assert.equal(unit(f, recipient).mana, 0);
    duel(f, recipient, f.enemy); assert.equal(f.s.duel.formula.buff, 60);
    assert.equal(grants(f).length, 1);
  });

  for (const role of ['ATK', 'DEF']) {
    test(`rumble-ball side ${side}: first numeric ${role} gets 50, never both roles`, async () => {
      const f = await fixture('rumble-ball', {side, supports: ['luck', 'mana']});
      twoSupports(f); next(f);
      if (role === 'ATK') { duel(f, f.u, f.enemy); assertFormula(f, 50); }
      else { duel(f); assertFormula(f, 0, 50); }
      next(f); duel(f, f.u, f.enemy); assertFormula(f);
      assert.equal(uses(f).length, 1);
    });
  }

  test(`cola-reserve side ${side}: two successful Blocks charge one attack, not one Block`, async () => {
    const f = await fixture('cola-reserve', {side}); duel(f); next(f);
    duel(f, f.u, f.enemy); assertFormula(f); next(f); duel(f); next(f);
    duel(f, f.u, f.enemy); assertFormula(f, 60); next(f);
    duel(f); next(f); duel(f, f.u, f.enemy); assertFormula(f);
  });

  test(`gotham-harvey-coin side ${side}: deterministic retained coin survives reload and grants exactly one branch`, async () => {
    const f = await fixture('gotham-harvey-coin', {side, kalistel: true}); outnumber(f);
    lock(f, f.u, f.enemy); step(f, 'rollAttack', 6);
    const before = structuredClone(f.s), rng = f.s.rng;
    assert.equal(record(f)?.coin, undefined, 'no coin before retaining ATK');
    step(f, 'acceptAttack'); const accepted = structuredClone(f.s);
    assert.notEqual(f.s.rng, rng); assert(['heads', 'tails'].includes(record(f).coin));
    const branch = {...f, s: f.E.restoreGame(before)}; step(branch, 'acceptAttack');
    assert.deepEqual(branch.s, accepted);
    step(f, 'rollDefense', 6);
    const heads = record(f).coin === 'heads';
    assertFormula(f, heads ? 60 : 0);
    assert.equal(unit(f, f.u).ward, heads ? 0 : 60);
    assert.equal(grants(f).length + uses(f).length, 1);
    next(f); duel(f, f.u, f.enemy); assertFormula(f);
  });

  test(`gotham-riddle-box side ${side}: prediction locks before dice and follows the finally retained parity`, async () => {
    const f = await fixture('gotham-riddle-box', {side, supports: ['luck'], kalistel: true});
    support(f, f.u, f.ally, 'luck'); next(f); lock(f);
    const choice = f.E.equipmentChoice(f.s); assert.equal(choice?.mode, 'parity');
    const pending = structuredClone(f.s);
    assert.throws(() => f.E.rollAttack(f.s, 6)); assert.deepEqual(f.s, pending);
    choose(f, 'odd'); step(f, 'rollAttack', 6); step(f, 'useKalistel', 3);
    step(f, 'rollDefense', 6); assertFormula(f, 0, 50);
    next(f); lock(f); assert.equal(f.E.equipmentChoice(f.s), null);
    attack(f); step(f, 'rollDefense', 6); assertFormula(f);
  });

  test(`gotham-ivy-seed side ${side}: enemy choice debuffs one accepted numeric attack by exactly 40`, async () => {
    const f = await fixture('gotham-ivy-seed', {side, supports: ['luck', 'mana']});
    twoSupports(f); const choice = f.E.equipmentChoice(f.s); assert(choice);
    assert(choice.targets.every(uid => uid[0] !== String(side))); choose(f, f.enemy); next(f);
    duel(f, f.enemy, f.u, 4); assertFormula(f, -40);
    assert.equal(f.s.duel.formula.baseAttack, 160); assert.equal(f.s.duel.formula.attack, 120);
    next(f); duel(f, f.enemy, f.u, 4); assertFormula(f);
  });

  test(`gotham-utility-belt side ${side}: survival marks one attacker, unrelated attacks cannot spend it`, async () => {
    const f = await fixture('gotham-utility-belt', {side}); duel(f); next(f);
    const other = board(f, 1 - side).find(u => u.uid !== f.enemy && u.uid.endsWith('-1')).uid;
    duel(f, other, f.u); assertFormula(f); next(f);
    duel(f); assertFormula(f, 0, 60); next(f); duel(f); assertFormula(f);
  });

  test(`gotham-lazarus-vial side ${side}: two definitive allied losses grant one personal heart, never rearm`, async () => {
    const f = await fixture('gotham-lazarus-vial', {side});
    killAlly(f); assert.equal(unit(f, f.u).reraise, 0); next(f);
    killAlly(f); assert.equal(unit(f, f.u).reraise, 1); next(f);
    duel(f, f.enemy, f.u, 5); assert.equal(f.s.duel.reraised, f.u); assert.equal(unit(f, f.u).reraise, 0);
    next(f); killAlly(f); assert.equal(unit(f, f.u).reraise, 0); assert.equal(grants(f).length, 1);
    assert.equal(row(f).alliedSupport, 0, 'personal Reraise must not create allied support');
  });
}

test('Momo Box -> Kaine Lunar Tear is a legal emergent combo with original donor credit', async () => {
  const f = await fixture('lunar-tear', {extras: ['little-joys-box']});
  const momo = f.uids['little-joys-box']; outnumber(f, 4, [f.u, momo, f.helper]);
  duel(f, f.enemy, momo); assert.equal(unit(f, f.u).luck, 1); next(f);
  duel(f, f.enemy, f.u, 4, [3, 6]); assert.equal(record(f)?.status, 'ready');
  assert.equal(row(f, momo).cloversConsumedByRecipients, 1);
  next(f); duel(f, f.u, f.enemy); assertFormula(f, 60);
  assert.equal(uses(f).length, 1); reload(f);
});

for (const id of ['griever-pendant', 'ff9-final-act-feather', 'gotham-harvey-coin', 'current-compass']) {
  test(`${id}: accepted Death has no numeric ultimate and does not spend the numeric charge`, async () => {
    const f = await fixture(id, {mutate: (data, selected) => {
      if (id === 'ff9-final-act-feather') magicCarrier(data, selected);
      if (id === 'current-compass') { selected[0].element = 'ELECTRO'; selected[4].element = 'RAINBOW'; }
    }});
    outnumber(f, 2, [f.u, f.ally]); duel(f, f.u, f.enemy, 2);
    assert.equal(f.s.duel.attackValue, 'death'); assert.equal(f.s.duel.formula, undefined);
    assert.equal(uses(f).length + grants(f).length, 0); assert.notEqual(record(f)?.status, 'spent');
  });
}

test('Kuja physical attack cannot consume a magic-only last-stand ultimate', async () => {
  const f = await fixture('ff9-final-act-feather'); outnumber(f, 2, [f.u, f.ally]);
  duel(f, f.u, f.enemy); assertFormula(f); assert.equal(uses(f).length, 0);
});

test('Jill with an existing Clover cannot acquire a second reroll in that same duel', async () => {
  const f = await fixture('jill-lockpicks');
  support(f, f.helper, f.u, 'luck'); next(f); outnumber(f);
  duel(f, f.enemy, f.u, 4, [3, 3]);
  assert(f.s.players[f.side].dead.some(u => u.uid === f.u));
  assert.equal(grants(f).length, 0); assert.equal(f.s.duel.defenseRolls.length, 2);
});

test('Jill printed Retry before the first inadequate numeric defense still allows her one emergency Clover', async () => {
  const f = await fixture('jill-lockpicks'); outnumber(f);
  lock(f); attack(f, 4); step(f, 'rollDefense', 1);
  assert.equal(f.s.phase, 'defense'); assert.equal(grants(f).length, 0);
  step(f, 'rollDefense', 3);
  assert.equal(f.s.phase, 'defense'); assert.equal(f.s.duel.autoDefense, true);
  assert.equal(grants(f).length, 1); assert.equal(unit(f, f.u).luck, 0);
  step(f, 'rollDefense', 6);
  assert.equal(f.s.phase, 'result'); assert.deepEqual(f.s.duel.defenseRolls, [1, 3, 6]);
  assert.equal(record(f).status, 'spent'); assert.equal(row(f).clovers, 1); reload(f);
});

test('Kaine cannot arm from a failed Clover followed only by Reraise survival', async () => {
  const f = await fixture('lunar-tear');
  support(f, f.helper, f.u, 'luck'); next(f); support(f, f.helper, f.u, 'reraise'); next(f);
  duel(f, f.enemy, f.u, 4, [3, 3]); assert.equal(f.s.duel.reraised, f.u); next(f);
  duel(f, f.u, f.enemy); assertFormula(f); assert.equal(uses(f).length, 0);
});

for (const id of ['ff9-garnet-pendant', 'metal-gear-mkii', 'rumble-ball']) {
  test(`${id}: repeated gifts to the same recipient or refreshed traits are not two distinct supports`, async () => {
    const f = await fixture(id, {supports: ['luck', 'mana']});
    support(f, f.u, f.ally, 'luck'); next(f);
    support(f, f.u, f.ally, 'luck'); assert.equal(f.s.match.events.at(-1).refresh, true); next(f);
    support(f, f.u, f.ally, 'mana');
    assert.equal(f.E.equipmentChoice(f.s), null); assert.notEqual(record(f)?.status, 'ready');
    assert.equal(grants(f).length + uses(f).length, 0);
  });
}

test('already buffed targets neither duplicate grants nor waste Thalie charge', async () => {
  const f = await fixture('last-garden-seed', {supports: ['reraise']});
  support(f, f.helper, f.ally, 'luck'); next(f);
  support(f, f.u, f.ally, 'reraise'); assert.equal(grants(f).length, 0); next(f);
  support(f, f.u, f.ally2, 'reraise'); assert.equal(grants(f).length, 1);
  assert.equal(grants(f)[0].recipient, f.ally2);
});

test('reserve bearer cannot prepare allied-death or uninvolved ultimates', async () => {
  for (const id of ['lost-names-bell', 'gotham-lazarus-vial', 'infiltration-box', 'ff9-terra-fragment']) {
    const f = await fixture(id, {reserve: true});
    assert(f.s.players[f.side].reserve.some(u => u.uid === f.u));
    duel(f, f.enemy, f.ally); next(f); duel(f, f.enemy, f.ally2); next(f);
    assert.equal(record(f), undefined, id + ': reserve is not active participation');
    assert.equal(grants(f).length + uses(f).length, 0);
  }
});

test('Riddle wrong prediction consumes the attempt without DEF bonus', async () => {
  const f = await fixture('gotham-riddle-box', {supports: ['luck']});
  support(f, f.u, f.ally, 'luck'); next(f); lock(f); choose(f, 'odd');
  attack(f, 6); step(f, 'rollDefense', 6); assertFormula(f);
  assert.equal(record(f).status, 'spent'); next(f); lock(f); assert.equal(f.E.equipmentChoice(f.s), null);
});

test('Balmhyr with all other allies already guarded keeps the charge until an actual recipient exists', async () => {
  const f = await fixture('exiled-king-seal'); outnumber(f);
  for (const ally of board(f).filter(u => u.uid !== f.u)) {
    support(f, f.helper, ally.uid, 'ward'); next(f);
  }
  duel(f); assert.equal(f.E.equipmentChoice(f.s), null);
  assert.notEqual(record(f)?.status, 'spent'); assert.equal(grants(f).length, 0); next(f);
  duel(f, f.enemy, f.ally, 4, [4]); assert.equal(unit(f, f.ally).ward, 0); next(f);
  duel(f); assert.deepEqual(f.E.equipmentChoice(f.s).targets, [f.ally]);
  choose(f, f.ally); assert.equal(grants(f).length, 1);
  assert.equal(f.E.equipmentChoice(f.s), null, 'no impossible second choice when only one ally is eligible');
});

test('Hector does not count offensive or chance supports as his two protection donations', async () => {
  const f = await fixture('castlevania-hector-ring', {supports: ['luck', 'mana', 'ward', 'reraise']});
  twoSupports(f); assert.equal(f.E.equipmentChoice(f.s), null); assert.equal(grants(f).length, 0); next(f);
  support(f, f.u, f.ally, 'ward'); next(f); support(f, f.u, f.ally2, 'ward');
  choose(f, f.ally); assert.equal(unit(f, f.ally).reraise, 1); assert.equal(grants(f).length, 1);
});

test('Pod 153 retains its charge through Death and cancels neither printed ATK nor a zero advantage', async () => {
  const f = await fixture('pod-153', {supports: ['luck', 'mana']});
  twoSupports(f); next(f);
  support(f, f.helper, f.u, 'reraise'); next(f);
  duel(f, f.enemy, f.u, 2); assert.equal(f.s.duel.reraised, f.u);
  assert.equal(uses(f).length, 0); assert.equal(record(f).status, 'ready'); next(f);
  duel(f); assertFormula(f); assert.equal(record(f).status, 'ready');
});

test('Lazarus counts definitive losses, never a companion saved by Reraise', async () => {
  const f = await fixture('gotham-lazarus-vial');
  support(f, f.helper, f.ally, 'reraise'); next(f);
  duel(f, f.enemy, f.ally, 5); assert.equal(f.s.duel.reraised, f.ally); next(f);
  killAlly(f); assert.equal(grants(f).length, 0); assert.equal(unit(f, f.u).reraise, 0); next(f);
  killAlly(f); assert.equal(grants(f).length, 1); assert.equal(unit(f, f.u).reraise, 1);
});

for (const id of ['obsidian-star', 'castlevania-lisa-memory']) {
  test(`${id}: protection excludes its own bearer and the wrong incoming damage type`, async () => {
    const f = await fixture(id, {mutate: (data, selected) => {
      selected[4].element = 'ELECTRO'; selected[4].magic = [4];
    }});
    outnumber(f);
    duel(f, f.enemy, f.u, id === 'obsidian-star' ? 4 : 6);
    assertFormula(f); assert.equal(uses(f).length, 0); next(f);
    duel(f, f.enemy, f.ally, id === 'obsidian-star' ? 6 : 4);
    assertFormula(f); assert.equal(uses(f).length, 0);
  });
}

test('Ruby positive offset and enemy Ivy debuff coexist; performance counts the real negative modifier, not the signed net', async () => {
  const f = await fixture('current-compass', {opponentRelics: ['gotham-ivy-seed'], mutate: (data, selected) => {
    selected[0].element = 'ELECTRO'; selected[4].element = 'RAINBOW';
    selected[1].atk[5] = 'retry'; selected[1].atk[4] = 'mana';
  }});
  const ivy = f.uids['gotham-ivy-seed'];
  support(f, ivy, '1-2', 'luck'); next(f);
  support(f, ivy, '1-3', 'mana'); choose(f, f.u); next(f);
  outnumber(f); duel(f, f.u, f.enemy, 4); assertFormula(f);
  assert.deepEqual(f.s.duel.ultimateModifiers.map(m => m.value).sort((a, b) => a - b), [-40, 40]);
  assert.equal(f.s.duel.formula.element, -40);
  assert.equal(f.s.match.events.at(-1).debuff, 80);
  assert.equal(row(f, f.enemy).debuff, 40, 'native crystal reduction stays with the defender');
  assert.equal(row(f, ivy).debuff, 40, 'relic reduction belongs to Ivy, not the protected ally');
});
