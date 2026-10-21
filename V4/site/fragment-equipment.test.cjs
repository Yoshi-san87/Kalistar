'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const Q = require('./equipment.js');
const {definition, fixture, unit, board, record, uses, grants, reload, step,
  lock, duel, support, next, outnumber, assertFormula} = require('./fixtures/ultimate-expansion.cjs');

const RIBBON = 'kaylis-colours-ribbon';
const events = f => (f.s.equipment.rituals?.events || []).filter(e => e.weaponId === RIBBON);

function assertUnarmed(f) {
  assert.equal(record(f)?.armedRound, undefined, 'This exchange must not arm the ribbon');
  assert.equal(uses(f).length, 0);
  assert.equal(grants(f).length, 0);
  assert.deepEqual(events(f), []);
}

// The shared fixture restores after every public action. Inferiority is reached
// through actual eliminations and replacements, never fabricated ritual state.
async function ready(side, options = {}) {
  const f = await fixture(RIBBON, {side, ...options});
  outnumber(f);
  assert.equal(board(f).length, 4);
  assert.equal(board(f, 1 - side).length, 5);
  assertUnarmed(f);
  duel(f);
  assert.equal(typeof f.s.duel.attackValue, 'number');
  assert.equal(typeof f.s.duel.defenseValue, 'number');
  assert.equal(f.s.match.events.at(-1).kill, false);
  assert.equal(f.s.match.events.at(-1).hold, true);
  assertFormula(f);
  assert.equal(record(f)?.status, 'ready');
  assert.equal(record(f).armedRound, f.s.round);
  assert.equal(uses(f).length, 0, 'Survival only prepares the subsequent attack');
  reload(f);
  return f;
}

test('Kaylis ribbon uses the real compatible SURVIVED / outnumbered / ARM ATK40 definition', async () => {
  const w = definition(RIBBON), f = await fixture(RIBBON);
  assert.equal(w.slot, 'relic');
  assert.equal(w.kind, 'relic');
  assert.equal(Q.validateDefinition(w), w);
  assert.deepEqual(w.effect, {trigger: 'ULTIMATE', duration: 'ONCE_MATCH', event: 'SURVIVED',
    when: {outnumbered: true}, action: {kind: 'ARM', stat: 'ATK', value: 40, target: 'self'}});
  const kaylis = f.data.cards.find(c => c.id === '49055457');
  assert(kaylis, 'The Fragment reward model must exist');
  assert(Q.compatible(w, kaylis));
  assert.equal(f.E.card(unit(f, f.u)).characterId, kaylis.characterId);
  assertUnarmed(f);
});

for (const side of [0, 1]) {
  test(`Kaylis side ${side}: numeric survival arms one subsequent ATK40, preserved before and after restoration`, async () => {
    const f = await ready(side, {kalistel: true});
    const armedRound = record(f).armedRound;
    next(f);
    duel(f);
    assertFormula(f, 0, 0, f.s.duel.formula);
    assert.equal(record(f).armedRound, armedRound, 'Repeated survival cannot rearm or stack the charge');
    assert.equal(events(f).filter(e => e.kind === 'ready').length, 1);
    next(f);

    lock(f, f.u, f.enemy);
    step(f, 'rollAttack', 6);
    assert.equal(f.s.phase, 'kalistel');
    assert.equal(record(f).status, 'ready');
    assert.equal(uses(f).length, 0, 'A numeric die is not spent before it is retained');
    const restored = {...f, s: f.E.restoreGame(JSON.parse(JSON.stringify(f.s)))};
    step(f, 'acceptAttack');
    step(restored, 'acceptAttack');
    assert.deepEqual(f.s, restored.s, 'A resumed pending attack must consume exactly the same charge');
    assert.equal(record(f).status, 'spent');
    assert.equal(uses(f).length, 1);
    const use = uses(f)[0];
    assert.equal(use.sourceUid, f.u);
    assert.equal(use.recipient, f.u);
    assert.equal(use.stat, 'ATK');
    assert.equal(use.value, 40);
    step(f, 'rollDefense', 6);
    assertFormula(f, 40);
    assert.equal(f.s.duel.formula.attack, f.s.duel.formula.baseAttack + 40);
    reload(f);

    next(f); duel(f); next(f); duel(f, f.u, f.enemy);
    assertFormula(f);
    assert.equal(record(f).status, 'spent');
    assert.equal(record(f).armedRound, armedRound);
    assert.equal(uses(f).length, 1, 'Another qualifying survival cannot create a second use');
    assert.equal(events(f).filter(e => e.kind === 'ready').length, 1);
    assert.equal(events(f).filter(e => e.kind === 'bonus').length, 1);
  });

  test(`Kaylis side ${side}: support, another ally and discarded numeric ATK do not spend the charge; retained D3 does`, async () => {
    const f = await ready(side, {kalistel: true});
    next(f); support(f, f.u, f.ally, 'luck');
    assert.equal(f.s.match.events.at(-1).support, 'luck');
    assert.equal(record(f).status, 'ready');
    next(f); duel(f, f.ally, f.enemy);
    assertFormula(f);
    assert.equal(uses(f).length, 0, 'The bonus belongs to Kaylis, not an ally');
    next(f);

    lock(f, f.u, f.enemy);
    step(f, 'rollAttack', 6);
    assert.equal(uses(f).length, 0);
    step(f, 'useKalistel', 2);
    assert.equal(f.s.duel.attackValue, 'death');
    step(f, 'rollDefense', 2);
    assert.equal(f.s.duel.formula, undefined);
    assert.equal(record(f).status, 'ready', 'Retained Death cannot consume a numeric charge');
    assert.equal(uses(f).length, 0);
    next(f); duel(f, f.u, f.enemy, 3);
    assert.equal(f.s.duel.attackDie, 3);
    assertFormula(f, 40);
    assert.equal(uses(f).length, 1, 'ARM is not restricted to a retained D6');
    reload(f);
  });

  for (const superior of [false, true]) test(`Kaylis side ${side}: numeric survival at ${superior ? 'superiority' : 'parity'} does not qualify`, async () => {
    const f = await fixture(RIBBON, {side});
    if (superior) {
      while (board(f, 1 - side).length === 5) {
        const victim = board(f, 1 - side).findLast(u => u.uid !== f.enemy);
        duel(f, f.u, victim.uid, 5);
        assert.equal(f.s.match.events.at(-1).kill, true);
        next(f);
      }
    }
    assert.equal(board(f).length, 5);
    assert.equal(board(f, 1 - side).length, superior ? 4 : 5);
    duel(f);
    assert.equal(f.s.match.events.at(-1).hold, true);
    assertFormula(f);
    assertUnarmed(f);
    next(f); duel(f, f.u, f.enemy);
    assertFormula(f);
    assertUnarmed(f);
  });

  for (const [label, attackDie] of [['numeric', 5], ['special Death', 2]]) test(
    `Kaylis side ${side}: definitive death from ${label} cannot arm the ribbon`, async () => {
      const f = await fixture(RIBBON, {side});
      outnumber(f);
      duel(f, f.enemy, f.u, attackDie);
      assert.equal(f.s.match.events.at(-1).kill, true);
      assert.equal(f.s.match.events.at(-1).reraise, false);
      assert(f.s.players[side].dead.some(u => u.uid === f.u));
      assertUnarmed(f);
      reload(f);
    });

  test(`Kaylis side ${side}: receiving support or an ally surviving does not qualify`, async () => {
    const f = await fixture(RIBBON, {side});
    outnumber(f);
    support(f, f.helper, f.u, 'reraise');
    assert.equal(unit(f, f.u).reraise, 1);
    assertUnarmed(f);
    next(f); duel(f, f.enemy, f.ally);
    assert.equal(f.s.match.events.at(-1).kill, false);
    assert.equal(f.s.match.events.at(-1).target, f.ally);
    assertUnarmed(f);
  });

  for (const rescue of ['dodge', 'reraise']) test(
    `Kaylis side ${side}: Death survived via ${rescue} arms a restored charge spent only on the next retained numeric ATK`, async () => {
      const f = await fixture(RIBBON, {side, kalistel: true});
      outnumber(f);
      if (rescue === 'reraise') {
        support(f, f.helper, f.u, 'reraise');
        assert.equal(unit(f, f.u).reraise, 1);
        next(f);
      }
      assertUnarmed(f);
      duel(f, f.enemy, f.u, 2, [rescue === 'dodge' ? 2 : 6]);
      assert.equal(f.s.duel.attackValue, 'death');
      assert.equal(f.s.duel.formula, undefined);
      const event = f.s.match.events.at(-1);
      assert.equal(event.kill, false);
      assert.equal(event[rescue], true);
      assert(board(f).some(u => u.uid === f.u), 'Kaylis really survived the special attack');
      const armedRound = f.s.round;
      assert.equal(record(f)?.status, 'ready');
      assert.equal(record(f).armedRound, armedRound);
      assert.deepEqual(record(f).progress, [{id: armedRound + ':SURVIVED', round: armedRound}]);
      assert.equal(uses(f).length, 0);
      assert.equal(grants(f).length, 0);
      assert.equal(events(f).filter(e => e.kind === 'ready').length, 1);
      const armed = structuredClone(f.s);
      reload(f);
      assert.deepEqual(f.s, armed, 'Restoration preserves Death survival without replaying its activation');

      next(f); support(f, f.u, f.ally, 'luck');
      assert.equal(record(f).status, 'ready');
      assert.equal(uses(f).length, 0, 'A support face cannot consume the charge');
      next(f); duel(f, f.u, f.enemy, 2, [2]);
      assert.equal(f.s.duel.attackValue, 'death');
      assert.equal(f.s.duel.formula, undefined);
      assert.equal(record(f).status, 'ready');
      assert.equal(uses(f).length, 0, 'An outgoing Death cannot consume the charge');
      next(f); lock(f, f.u, f.enemy);
      step(f, 'rollAttack', 3);
      assert.equal(f.s.phase, 'kalistel');
      assert.equal(record(f).status, 'ready');
      assert.equal(uses(f).length, 0, 'The numerical face must be retained first');
      const resumed = {...f, s: f.E.restoreGame(JSON.parse(JSON.stringify(f.s)))};
      step(f, 'acceptAttack');
      step(resumed, 'acceptAttack');
      assert.deepEqual(f.s, resumed.s, 'Resuming the pending attack spends the same single charge');
      assert.equal(record(f).status, 'spent');
      assert.equal(uses(f).length, 1);
      assert.equal(uses(f)[0].sourceUid, f.u);
      assert.equal(uses(f)[0].recipient, f.u);
      assert.equal(uses(f)[0].stat, 'ATK');
      assert.equal(uses(f)[0].value, 40);
      step(f, 'rollDefense', 6);
      assertFormula(f, 40);
      assert.equal(f.s.duel.formula.attack, f.s.duel.formula.baseAttack + 40);
      reload(f);

      next(f); duel(f, f.enemy, f.u, 2, [2]);
      assert.equal(f.s.match.events.at(-1).dodge, true);
      assert.equal(record(f).status, 'spent', 'Another survived Death cannot rearm the ribbon');
      next(f); duel(f, f.u, f.enemy, 3);
      assertFormula(f);
      assert.equal(record(f).armedRound, armedRound);
      assert.equal(uses(f).length, 1);
      assert.equal(events(f).filter(e => e.kind === 'ready').length, 1);
      assert.equal(events(f).filter(e => e.kind === 'bonus').length, 1);
    });
}
