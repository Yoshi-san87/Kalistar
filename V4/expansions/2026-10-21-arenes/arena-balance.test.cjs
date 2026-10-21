'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const {createEngine, createArchiveEngine, clone} = require('../../site/engine.js');
const F = require('../../site/fixtures/ultimate-expansion.cjs');
const {context, specifications, play, aggregate, NEUTRAL} = require('./simulation.cjs');
const ready = context({requireIntegrated: process.env.KALISTAR_REQUIRE_INTEGRATED === '1'});
const expected = [
  ['ff9-alexandria', 'LUXO', 'ff9', ['grenat-ff9', 'steiner-ff9', 'beate-ff9', 'branet-ff9']],
  ['witcher-kaer-morhen', 'MINERO', 'witcher', ['geralt-witcher', 'vesemir-witcher', 'ciri-witcher']],
  ['batman-gotham-rooftops', 'NECRO', 'batman', ['batman-batman', 'catwoman-batman', 'robin-batman']],
  ['re2-rpd', null, 're2', ['leon-kennedy-re', 'claire-redfield-re', 'ada-wong-re', 'tyrant-t103-re']],
  ['chrono-leene-square', 'ELECTRO', 'chrono-trigger', ['crono-chrono-trigger', 'marle-chrono-trigger', 'lucca-chrono-trigger']],
  ['one-piece-water-seven', 'HYDRO', 'one-piece', ['franky-op', 'usopp-op', 'nico-robin-op', 'nami-op']],
  ['grivka-refuge', 'CRYO', undefined, ['vaelrik-kalistar', 'neriska-kalistar', 'skaern-kalistar']],
  ['froz-bastion', 'HEMATO', undefined, ['vaerok-kalistar', 'general-barok-kalistar', 'drogan-kalistar']]
];
const bonus = (arena, card) => {
  const element = card.element !== 'NONE' && card.element === arena.element ? arena.elementBonus : 0;
  const home = arena.homeCharacters.includes(card.characterId) ? 10 : 0;
  return {attack: element + home, defense: home, element, homeAttack: home, homeDefense: home};
};
const traits = u => Object.fromEntries(['luck', 'mana', 'physical', 'ward', 'reraise'].map(k => [k, u[k]]));
const clean = s => { const c = clone(s); delete c.matchId; delete c.arenaId; return c; };

// Isolated numeric faces, no equipment or synergies. Public engine actions and
// the established fixture helpers create all grants, consumption and events.
function fixture(ctx, arena, side = 0, neutral = false, kalistel = false, {element = arena.element || 'ELECTRO'} = {}) {
  const data = clone(ctx.data), template = data.cards[0];
  data.cards = Array.from({length: 10}, (_, i) => ({...clone(template), id: String(49090000 + i),
    characterId: arena.homeCharacters[i] || 'qa-arena-' + i, name: 'Arena fixture ' + i,
    positions: [1, 2, 3, 4, 5], role: 5, canGuard: true, canHeal: true,
    element, magic: i === 0 || element === 'NONE' ? [] : [5], barriers: [],
    atk: i === 0 ? [160, 'retry', 'mana', 'buff_atk', 'guard', 'revive'] : [160, 160, 160, 160, 160, 'death'],
    defense: [900, 0, 0, 0, 0, 'dodge']}));
  data.weapons = {}; data.demo = {...data.demo, synergy: [0, 0, 0, 0, 0, 0]};
  const E = createEngine(data), ids = data.cards.map(c => c.id);
  const s = E.newGame(ids, ids, {seed: 'ARENA-UNIT', mode: 'local', deckCoverage: 2,
    arenaId: neutral ? NEUTRAL.id : arena.id, kalistel});
  assert.deepEqual(E.restoreGame(JSON.parse(JSON.stringify(s))), s, 'Setup save must restore unchanged');
  E.autoDeploy(s, 0); E.autoDeploy(s, 1); E.start(s);
  return F.reload({E, s, data, side, u: side + '-0', helper: side + '-0', ally: side + '-1', enemy: (1 - side) + '-4'});
}

function grants(f) {
  for (const kind of ['luck', 'mana', 'physical', 'ward', 'reraise']) {
    F.support(f, f.u, f.ally, kind); F.next(f);
  }
  assert.deepEqual(traits(F.unit(f, f.ally)), {luck: 1, mana: 60, physical: 60, ward: 60, reraise: 1});
}

test('manifest is exact; integration is inspected and never silently overwritten', async t => {
  const ctx = await ready;
  assert.deepEqual(ctx.additions.map(a => [a.id, a.element, a.collaboration, a.homeCharacters]), expected);
  for (const a of ctx.additions) {
    assert.deepEqual([a.elementBonus, a.homeAttack, a.homeDefense], [a.element === null ? 0 : 15, 10, 10]);
    assert.equal(a.image, '/jeu/assets/arenes/' + a.id + '.webp');
    for (const key of ['name', 'subtitle', 'source']) assert.equal(typeof a[key], 'string');
    assert.equal(new Set(a.homeCharacters).size, a.homeCharacters.length);
    for (const id of a.homeCharacters) assert(ctx.data.cards.some(c => c.characterId === id), 'Unknown home: ' + id);
  }
  const withoutAdditions = data => data.arenas.filter(a => !ctx.additions.some(n => n.id === a.id) && a.id !== NEUTRAL.id);
  assert.deepEqual(withoutAdditions(ctx.data), withoutAdditions(ctx.active));
  assert.deepEqual({...ctx.data, arenas: []}, {...ctx.active, arenas: []}, 'Only in-memory arenas may change');
  t.diagnostic(ctx.missing.length ? 'LOCAL CATALOGUE ONLY, pending integration: ' + ctx.missing.join(', ') : 'All eight arenas verified in the active catalogue');
});

for (const [arenaId] of expected) {
  test(arenaId + ': every published version has exact symmetric bonuses on both sides', async () => {
    const {data, E} = await ready, arena = data.arenas.find(a => a.id === arenaId);
    for (const c of data.cards) for (const side of [0, 1]) {
      const actual = E.arenaBonuses({arenaId}, {uid: side + '-0', cardId: c.id});
      assert.deepEqual(actual, bonus(arena, c), arenaId + '/' + c.id + '/side' + side);
      assert(actual.attack <= 25 && actual.defense <= 10);
      if (c.element === 'NONE') assert.equal(actual.element, 0);
      if (arenaId === 're2-rpd') assert.equal(actual.element, 0);
    }
  });

  test(arenaId + ': identity, crystal and cap are independent of model, name, faction and role', async () => {
    const ctx = await ready, arena = ctx.data.arenas.find(a => a.id === arenaId);
    const data = clone(ctx.data), probes = [];
    for (const home of arena.homeCharacters) for (const element of ['NONE', ...Object.keys(data.elements)]) {
      const original = data.cards.find(c => c.characterId === home);
      for (const sameIdentity of [true, false]) {
        const c = {...clone(original), id: String(49100000 + probes.length), characterId: sameIdentity ? home : 'qa-not-' + home,
          faction: 'QA other faction', role: 2, positions: [1, 2, 3, 4, 5], canGuard: false, canHeal: false,
          atk: Array(6).fill(100), defense: Array(6).fill(100), element, magic: [], barriers: []};
        assert(!ctx.E.byId[c.id], 'Fixture ID collision'); probes.push(c);
      }
    }
    data.cards.push(...probes);
    const E = createEngine(data);
    for (const c of probes) assert.deepEqual(E.arenaBonuses({arenaId}, {cardId: c.id}), bonus(arena, c));
    assert.equal(Math.max(...probes.map(c => E.arenaBonuses({arenaId}, {cardId: c.id}).attack)), arena.element === null ? 10 : 25);
    assert.equal(Math.max(...probes.map(c => E.arenaBonuses({arenaId}, {cardId: c.id}).defense)), 10);
  });

  test(arenaId + ': five support types and refreshes are identical to neutral, including saves', async () => {
    const ctx = await ready, arena = ctx.additions.find(a => a.id === arenaId);
    for (const side of [0, 1]) {
      const pair = [true, false].map(neutral => fixture(ctx, arena, side, neutral));
      for (const f of pair) {
        grants(f);
        for (const kind of ['luck', 'mana', 'physical', 'ward', 'reraise']) {
          F.support(f, f.u, f.ally, kind);
          const event = f.s.match.events.at(-1);
          assert.equal(event.refresh, true);
          for (const key of ['attack', 'defense', 'arenaAttack', 'arenaDefense', 'ward', 'defenseRolls']) assert.equal(event[key], 0);
          assert(!f.s.duel.formula); F.next(f);
        }
        assert.deepEqual(traits(F.unit(f, f.ally)), {luck: 1, mana: 60, physical: 60, ward: 60, reraise: 1});
        F.lock(f, f.u, f.enemy); F.attack(f, 5);
        assert.throws(() => f.E.grantClover(f.s, f.enemy), /plateau/);
        assert.throws(() => f.E.grantClover(f.s, side + '-5'), /plateau/);
        F.step(f, 'grantClover', f.u);
      }
      assert.deepEqual(clean(pair[0].s), clean(pair[1].s), 'Arena cannot change support state or event accounting');
    }
  });

  test(arenaId + ': numeric bonuses do not alter charges, reroll ward, Mort or dodge rules', async () => {
    const ctx = await ready, arena = ctx.additions.find(a => a.id === arenaId);
    for (const side of [0, 1]) for (const neutral of [true, false]) {
      const f = fixture(ctx, arena, side, neutral); grants(f);
      F.duel(f, f.ally, f.enemy, 6, [6]);
      assert.equal(f.s.duel.formula.buff, 60); assert.equal(F.unit(f, f.ally).physical, 0);
      assert.equal(F.unit(f, f.ally).mana, 60);
      const b = neutral ? {attack: 0, defense: 0} : bonus(arena, f.E.card(F.unit(f, f.ally)));
      assert.equal(f.s.duel.formula.arenaAttack, b.attack);
      assert.equal(f.s.duel.formula.attack, 160 + 60 + b.attack); F.next(f);
      F.duel(f, f.ally, f.enemy, 5, [6]);
      assert.equal(f.s.duel.formula.buff, 60); assert.equal(F.unit(f, f.ally).mana, 0); F.next(f);
      F.lock(f, f.enemy, f.ally); F.attack(f, 6); F.step(f, 'rollDefense', 5);
      assert.equal(f.s.phase, 'defense'); assert.equal(F.unit(f, f.ally).luck, 0);
      assert.equal(F.unit(f, f.ally).ward, 0); assert.equal(f.s.duel.formula.ward, 60);
      assert.equal(f.s.duel.formula.arenaDefense, b.defense);
      F.step(f, 'rollDefense', 6); assert.equal(f.s.duel.formula.ward, 60);
      assert.equal(f.s.duel.formula.defense, 900 + 60 + b.defense); F.next(f);
      F.duel(f, f.enemy, f.ally, 1, [5]);
      assert(!f.s.duel.formula); assert.equal(F.unit(f, f.ally).reraise, 0);
      assert.equal(f.s.match.events.at(-1).arenaAttack, 0); assert.equal(f.s.match.events.at(-1).arenaDefense, 0);
      const fresh = fixture(ctx, arena, side, neutral); grants(fresh);
      F.duel(fresh, fresh.enemy, fresh.ally, 1, [1]);
      assert(!fresh.s.duel.formula);
      assert.deepEqual(traits(F.unit(fresh, fresh.ally)), {luck: 1, mana: 60, physical: 60, ward: 60, reraise: 1});
      F.next(fresh); F.duel(fresh, fresh.enemy, fresh.ally, 1, [5]);
      assert.deepEqual(traits(F.unit(fresh, fresh.ally)), {luck: 1, mana: 60, physical: 60, ward: 60, reraise: 0});
    }
  });

  test(arenaId + ': Kalistel discards support without granting it and stays capped at two per side', async () => {
    const ctx = await ready, arena = ctx.additions.find(a => a.id === arenaId);
    for (const side of [0, 1]) for (const neutral of [true, false]) {
      const f = fixture(ctx, arena, side, neutral, true);
      for (let i = 0; i < 2; i++) {
        F.lock(f, f.u, f.enemy); F.step(f, 'rollAttack', 2);
        assert.equal(f.s.phase, 'kalistel'); assert.equal(f.s.duel.attackValue, 'guard');
        F.step(f, 'useKalistel', 6); assert.equal(f.s.phase, 'defense');
        assert(f.s.players[side].board.every(u => u.ward === 0));
        assert.equal(f.E.kalistelRemaining(f.s, side), 1 - i);
        assert.equal(f.E.kalistelRemaining(f.s, 1 - side), 2);
        F.step(f, 'rollDefense', 6); F.next(f);
      }
      F.lock(f, f.u, f.enemy); F.step(f, 'rollAttack', 2);
      assert.equal(f.s.phase, 'guard'); assert.throws(() => f.E.useKalistel(f.s, 6), /Kalistel/);
      F.step(f, 'grantGuard', f.ally); assert.equal(F.unit(f, f.ally).ward, 60);
    }
  });
}

test('NONE never receives an elemental bonus even with an adversarial NONE/15 arena', async () => {
  const ctx = await ready, data = clone(ctx.data), arena = {...NEUTRAL, element: 'NONE', elementBonus: 15};
  data.arenas = [arena];
  const E = createEngine(data), cards = data.cards.filter(c => c.element === 'NONE');
  assert(cards.length > 0);
  for (const c of cards) assert.deepEqual(E.arenaBonuses({arenaId: arena.id}, {cardId: c.id}), {attack: 0, defense: 0, element: 0, homeAttack: 0, homeDefense: 0});
});

test('NONE real numeric duels retain only home +10 ATK/+10 DEF on either side of every arena', async () => {
  const ctx = await ready;
  for (const arena of ctx.additions) for (const side of [0, 1]) {
    const f = fixture(ctx, arena, side, false, false, {element: 'NONE'});
    F.duel(f, f.ally, f.enemy, 6, [6]);
    assert.equal(f.s.duel.formula.arenaAttack, 10);
    assert.equal(f.s.duel.formula.arenaDefense, 0);
    assert.equal(f.s.duel.formula.attack, 170); assert.equal(f.s.duel.formula.defense, 900);
    F.next(f); F.duel(f, f.enemy, f.ally, 6, [6]);
    assert.equal(f.s.duel.formula.arenaAttack, 0);
    assert.equal(f.s.duel.formula.arenaDefense, 10);
    assert.equal(f.s.duel.formula.attack, 160); assert.equal(f.s.duel.formula.defense, 910);
  }
});

test('invalid arena caps are rejected, not clamped, for every new arena', async () => {
  const {data, additions} = await ready;
  for (const arena of additions) for (const [field, max] of [['elementBonus', 15], ['homeAttack', 10], ['homeDefense', 10]]) {
    for (const invalid of [-1, max + 1, .5, String(max), null, NaN, Infinity]) {
      assert.throws(() => createEngine({...data, arenas: [{...arena, [field]: invalid}]}), /Bonus maximum/);
    }
  }
});

test('old and new arena saves restore unchanged; historical snapshots override future arena definitions', async () => {
  const ctx = await ready, ids = new Set(ctx.additions.map(a => a.id));
  const before = {...ctx.active, arenas: ctx.active.arenas.filter(a => !ids.has(a.id))}, old = createEngine(before);
  for (const arena of before.arenas) {
    const s = old.newGame(before.decks.player, before.decks.enemy, {seed: 'OLD-' + arena.id, arenaId: arena.id, deckCoverage: 2});
    assert.deepEqual(ctx.E.restoreGame(clone(s)), s);
    old.autoDeploy(s, 0); old.autoDeploy(s, 1); old.start(s);
    old.lock(s, ...old.aiChoice(s)); old.rollAttack(s);
    assert.deepEqual(ctx.E.restoreGame(clone(s)), s);
  }
  for (const arena of ctx.additions) {
    const f = fixture(ctx, arena); grants(f);
    F.lock(f, f.ally, f.enemy); F.attack(f, 6);
    const archive = clone({profiles: f.data.cards, rules: f.E.rules, arenas: f.data.arenas});
    const future = clone(f.data);
    future.arenas = future.arenas.map(a => a.id === arena.id ? {...a, homeCharacters: [], homeAttack: 0, homeDefense: 0, elementBonus: 0} : a);
    const historical = createArchiveEngine(future, JSON.parse(JSON.stringify(archive)));
    const restored = historical.restoreGame(JSON.parse(JSON.stringify(f.s)));
    assert.deepEqual(restored, f.s);
    assert.deepEqual(historical.arenaBonuses(restored, F.unit(f, f.ally)), f.E.arenaBonuses(f.s, F.unit(f, f.ally)));
    assert.notDeepEqual(createEngine(future).arenaBonuses(restored, F.unit(f, f.ally)), historical.arenaBonuses(restored, F.unit(f, f.ally)));
    f.E.rollDefense(f.s, 6); historical.rollDefense(restored, 6);
    assert.deepEqual(restored, f.s, 'Identical continuation after archived restore');
    assert.deepEqual(historical.matchStats(restored), f.E.matchStats(f.s));
    assert.throws(() => historical.setArena(restored, NEUTRAL.id), /verrouill/);
    assert.throws(() => historical.restoreGame({...restored, arenaId: 'qa-unknown-arena'}), /Ar.ne/);
  }
});

test('paired simulation is reproducible, side-swapped and has a genuinely neutral control', async () => {
  const ctx = await ready, specs = specifications(ctx, 2);
  assert.deepEqual(specifications(ctx, 2), specs);
  assert.equal(specs.length, 16);
  const spec = specs[0], rows = [];
  for (const mirror of [false, true]) for (const neutral of [true, false]) rows.push(play(ctx, spec, {mirror, neutral}));
  assert.deepEqual(play(ctx, spec, {neutral: true}), rows[0]);
  assert.deepEqual(play(ctx, spec, {}), rows[1]);
  const summary = aggregate([spec], rows);
  assert.equal(summary.matches, 4); assert.equal(summary.groups[0].pairs, 1);
  for (const c of ctx.data.cards) assert.deepEqual(ctx.E.arenaBonuses({arenaId: NEUTRAL.id}, {cardId: c.id}),
    {attack: 0, defense: 0, element: 0, homeAttack: 0, homeDefense: 0});
});

test('aggregation counts draws as half a point and clusters the four games by deck/seed pair', () => {
  const specs = [{index: 0, arenaId: 'qa', stratum: 'broad'}, {index: 1, arenaId: 'qa', stratum: 'home-vs-away'}];
  const rows = specs.flatMap(spec => [false, true].flatMap(mirror => [true, false].map(neutral => {
    const focalScore = spec.index === 0 ? Number(!neutral) : neutral ? 1 : .5;
    const focalSide = Number(mirror), winner = focalScore === .5 ? 'draw' : focalScore === 1 ? focalSide : 1 - focalSide;
    return {...spec, mirror, neutral, focalScore, winner, exchanges: 10, support: 2, reloads: 3, formulas: 4};
  })));
  const result = aggregate(specs, rows), all = result.groups[0];
  assert.equal(result.matches, 8); assert.equal(result.pairs, 2);
  assert.equal(all.neutralFocalScorePct, 50); assert.equal(all.arenaFocalScorePct, 75);
  assert.equal(all.pairedDeltaPp, 25); assert.equal(all.pairedSePp, 75);
  assert.equal(all.changedOutcomes, 4); assert.equal(all.arenaDraws, 2);
  assert.deepEqual([all.arenaSide0Wins, all.arenaSide1Wins], [1, 1]);
});
