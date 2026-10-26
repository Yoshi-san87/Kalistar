import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeUnit, applyCommand, createMatch, getInitiative, getUnit, legalMoves,
  previewAction, restoreMatch, validateState,
} from '../src/core/game.mjs';
import {
  SENTRY_SKILLS, skillFor, mobilityOf, defenseOf, passRange, shotRange, unitEffects,
} from '../src/core/skills.mjs';
import { chooseTurn } from '../src/core/ai.mjs';
import { magicPose } from '../src/sprites.mjs';
import { actionTargets, skillOptions } from '../src/action-options.mjs';
import { layoutWheel } from '../src/action-wheel.mjs';

const SKILLS = ['relay', 'cover', 'jam', 'charged-pass'];
const AURAS = SKILLS.slice(0, 3);
const ROLES = ['meneur', 'scoreur', 'middle', 'sentry', 'pilier'];
const point = ({ x, y }) => ({ x, y });
const unit = (state, team, role) => state.units.find(u => u.team === team && u.role === role);
const mirror = (team, x) => team === 0 ? x : 12 - x;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const statsOf = state => state.units.map(u => ({ id: u.id, stats: structuredClone(u.stats) }));

function command(state, action) {
  const result = applyCommand(state, action);
  assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.error}`);
  assert.equal(validateState(state), true);
  return result;
}

function ready(state) {
  while (state.phase === 'placement') command(state, { type: 'ready', team: state.placement.team });
  return state;
}

function place(state, who, x, y) {
  Object.assign(who, { x, y });
  if (state.ball.holderId === who.id) Object.assign(state.ball, { x, y });
  return who;
}

function hold(state, who) {
  state.ball = { holderId: who.id, ...point(who) };
}

// Build invariant-valid scenarios from engine roles, never a particular athlete ID.
function activate(state, who) {
  for (const other of state.units) other.acted = false;
  for (const entry of getInitiative(state)) {
    if (entry.id === who.id) break;
    getUnit(state, entry.id).acted = true;
  }
  state.activeId = who.id;
  state.moved = false;
}

function fixture(role = 'sentry', team = 0, options = {}) {
  const state = ready(createMatch({ seed: 1, mode: 'hotseat', ...options }));
  const columns = { meneur: 4, scoreur: 5, middle: 6, sentry: 7, pilier: 1 };
  for (const other of state.units) {
    place(state, other, mirror(other.team, columns[other.role]), other.team === 0 ? 0 : 6);
  }
  const actor = unit(state, team, role);
  place(state, actor, mirror(team, role === 'pilier' ? 3 : 4), 3);
  hold(state, actor);
  activate(state, actor);
  assert.equal(validateState(state), true, 'fixture');
  return state;
}

function targetFor(state, type) {
  const actor = activeUnit(state);
  return place(state, unit(state, type === 'jam' ? 1 - actor.team : actor.team, 'middle'),
    mirror(actor.team, 6), 3);
}

function effect(state, target, id) {
  const source = unit(state, id === 'jam' ? 1 - target.team : target.team, 'sentry');
  target.effects = { ...target.effects, [id]: { sourceId: source.id, appliedRound: state.round } };
  return target.effects[id];
}

function chargeBall(state) {
  const holder = getUnit(state, state.ball.holderId);
  state.ball.charge = { team: holder.team, sourceId: unit(state, holder.team, 'sentry').id };
  return structuredClone(state.ball.charge);
}

function rejectUnchanged(state, action, reason) {
  const before = structuredClone(state);
  const preview = previewAction(state, action);
  assert.equal(preview.legal, false, JSON.stringify(action));
  if (reason) assert.equal(preview.reason, reason);
  assert.deepEqual(state, before, 'preview is read-only');
  const result = applyCommand(state, action);
  assert.equal(result.ok, false, JSON.stringify(action));
  assert.equal(result.error, preview.reason);
  assert.deepEqual(result.events, []);
  assert.deepEqual(state, before, 'rejection preserves position, effects, charge, RNG, turn and log');
}

function waitUntil(state, id) {
  for (let i = 0; i < 25 && activeUnit(state)?.id !== id; i++) {
    assert.equal(state.status, 'playing');
    ready(state);
    command(state, { type: 'wait' });
  }
  assert.equal(activeUnit(state)?.id, id, 'target activation reached');
}

test('skillOptions and actionTargets expose four Sentry-only choices with legal, read-only targets', () => {
  const query = state => {
    const before = structuredClone(state), options = skillOptions(state);
    for (const type of SKILLS) {
      const targets = actionTargets(state, type);
      assert.deepEqual(targets, options.find(o => o.id === type)?.targets ?? []);
      for (const target of targets) {
        assert.deepEqual(target.command, { type, targetId: target.targetId });
        assert.equal(target.label, getUnit(state, target.targetId).name);
        assert.equal(target.preview.legal, true);
        assert.equal(target.preview.skill, type);
        assert.deepEqual(target.preview, previewAction(state, target.command));
      }
    }
    assert.deepEqual(skillOptions(state), options, 'menu queries are deterministic');
    assert.deepEqual(state, before, 'menu queries preserve stats, effects, ball, RNG and initiative');
    return options;
  };
  for (const team of [0, 1]) {
    const state = fixture('sentry', team), actor = activeUnit(state);
    const allies = [
      place(state, unit(state, team, 'middle'), mirror(team, 6), 3),
      place(state, unit(state, team, 'meneur'), mirror(team, 5), 2),
    ];
    place(state, unit(state, team, 'scoreur'), mirror(team, 10), 6);
    const enemies = [
      place(state, unit(state, 1 - team, 'middle'), mirror(team, 5), 4),
      place(state, unit(state, 1 - team, 'scoreur'), mirror(team, 5), 3),
    ];
    assert.equal(validateState(state), true);
    const options = query(state);
    assert.deepEqual(options.map(o => o.id), SKILLS);
    for (const option of options) {
      const definition = skillFor(option.id);
      for (const key of ['label', 'icon', 'description']) assert.equal(option[key], definition[key]);
      assert.equal(option.available, true);
      assert.equal(option.reason, null);
      const expected = option.id === 'jam' ? enemies : allies;
      assert.deepEqual(option.targets.map(t => t.targetId).sort(), expected.map(u => u.id).sort());
    }
    assert.ok(options.find(o => o.id === 'charged-pass').targets.every(t => t.preview.blockerId === enemies[1].id),
      'interceptable passes remain selectable with the real preview');
    hold(state, allies[0]);
    const ballRequired = query(state).find(o => o.id === 'charged-pass');
    assert.equal(ballRequired.available, false);
    assert.equal(ballRequired.reason, 'ball-required');
    assert.deepEqual(ballRequired.targets, []);
    assert.ok(query(state).filter(o => o.id !== 'charged-pass').every(o => o.available));
    hold(state, actor);
    chargeBall(state);
    const alreadyCharged = query(state).find(o => o.id === 'charged-pass');
    assert.equal(alreadyCharged.available, false);
    assert.equal(alreadyCharged.reason, 'effect-active');
    assert.deepEqual(alreadyCharged.targets, []);
    assert.deepEqual(actionTargets(state, 'pass').map(t => t.targetId).sort(),
      [...allies, unit(state, team, 'pilier')].map(u => u.id).sort(),
      'ordinary passes remain available, including the extra range cell');
    for (const role of ROLES.filter(r => r !== 'sentry')) {
      const other = fixture(role, team);
      activeUnit(other).athlete = { id: `legacy-${team}-${role}`, version: 1, primary: role, secondary: 'sentry' };
      assert.deepEqual(query(other), [], 'secondary Sentry metadata does not grant the menu');
    }
  }
  assert.deepEqual(query(createMatch()), [], 'placement has no skills or targets');
  const finished = fixture('sentry', 0, { maxRounds: 1 });
  while (finished.status === 'playing') command(finished, { type: 'wait' });
  assert.deepEqual(query(finished), [], 'finished matches have no skills or targets');
});

test('six-action Sentry wheel stays bounded, separated and deterministic in 3150 layouts', () => {
  let cases = 0;
  for (const width of [240, 280, 320, 360, 412, 645, 1140]) {
    for (const height of [190, 200, 215, 240, 282, 320, 412, 500, 708]) {
      for (const x of [-300, 0, width / 2, width, width + 300]) {
        for (const y of [-300, -100, 0, 22, 64, height / 2, height - 64, height - 22, height, height + 300]) {
          const anchor = Object.freeze({ x, y }), bounds = Object.freeze({ width, height });
          const layout = layoutWheel(anchor, bounds, true, 6);
          const context = JSON.stringify({ width, height, anchor });
          assert.equal(layout.items.length, 6, context);
          assert.deepEqual(layoutWheel(anchor, bounds, true, 6), layout, context);
          const points = [layout.origin, ...layout.items];
          for (const p of points) {
            assert.ok(Number.isFinite(p.x) && Number.isFinite(p.y), context);
            assert.ok(p.x >= 22 && p.x <= width - 22, context);
            assert.ok(p.y >= 22 && p.y <= height - 22, context);
          }
          for (let i = 0; i < points.length; i++) for (const other of points.slice(i + 1)) {
            assert.ok(Math.hypot(points[i].x - other.x, points[i].y - other.y) >= 44, context);
          }
          assert.match(layout.arc, /^M .+ A /, context);
          cases++;
        }
      }
    }
  }
  assert.equal(cases, 3150);
});

test('Sentry definitions are frozen, unique, complete and shared by effect queries', () => {
  assert.ok(Object.isFrozen(SENTRY_SKILLS));
  assert.deepEqual(SENTRY_SKILLS.map(s => s.id).sort(), [...SKILLS].sort());
  for (const definition of SENTRY_SKILLS) {
    assert.ok(Object.isFrozen(definition));
    for (const key of ['id', 'label', 'icon', 'description']) assert.ok(definition[key]?.length, key);
    assert.equal(skillFor(definition.id), definition);
  }
  for (const type of ['pass', 'shoot', 'charge', 'wait', 'constructor', '__proto__', null, undefined]) {
    assert.equal(skillFor(type), null);
  }
  const state = fixture('middle');
  const actor = activeUnit(state);
  for (const id of AURAS) effect(state, actor, id);
  const before = structuredClone(state);
  const effects = unitEffects(actor);
  assert.deepEqual(effects.map(e => e.id).sort(), [...AURAS].sort());
  for (const entry of effects) assert.equal(entry, skillFor(entry.id));
  effects.pop();
  assert.equal(unitEffects(actor).length, 3, 'query arrays are disposable');
  assert.deepEqual(state, before);
});

test('effective helpers preserve base stats and unmodified legacy values', () => {
  const state = fixture('middle');
  const actor = activeUnit(state);
  const before = structuredClone(actor.stats);
  assert.equal(mobilityOf(actor), before.MOB);
  assert.equal(defenseOf(actor), before.DEF);
  assert.equal(passRange(actor), 3 + Math.floor(before.PAS / 2));
  assert.equal(shotRange(state, actor), 2 + Math.floor(before.TIR / 2));
  assert.deepEqual(unitEffects(actor), []);
  for (const id of AURAS) effect(state, actor, id);
  chargeBall(state);
  Object.freeze(actor.stats);
  assert.equal(mobilityOf(actor), Math.max(1, before.MOB - 1));
  assert.equal(defenseOf(actor), before.DEF + 2);
  assert.equal(passRange(actor), 4 + Math.floor(before.PAS / 2));
  assert.equal(shotRange(state, actor), 3 + Math.floor(before.TIR / 2));
  const teammate = unit(state, actor.team, 'scoreur');
  assert.equal(shotRange(state, teammate), 2 + Math.floor(teammate.stats.TIR / 2), 'only the carrier gets the bonus');
  assert.deepEqual(actor.stats, before);
});

test('magicPose falls back on legacy sprites and accepts only supported magic frames', () => {
  const clips = { magic: { frames: [54, 55, 56, 57, 58, 59] } };
  const before = structuredClone(clips);
  assert.equal(magicPose(16), 'guard');
  assert.equal(magicPose(64, clips), 'magic');
  assert.equal(magicPose(16, clips), 'guard');
  for (const frames of [[], [-1], [64], [54.5], ['54']]) {
    assert.equal(magicPose(64, { magic: { frames } }), 'guard');
  }
  assert.deepEqual(clips, before);
});

for (const team of [0, 1]) {
  for (const type of SKILLS) {
    for (const moved of [false, true]) {
      test(`${type}, team ${team}, moved=${moved}: preview, one action, events, no RNG or stat mutation`, () => {
        const state = fixture('sentry', team);
        const actor = activeUnit(state), target = targetFor(state, type);
        if (moved) command(state, { type: 'move', x: mirror(team, 5), y: 3 });
        const before = structuredClone(state), stats = statsOf(state);
        for (const other of state.units) Object.freeze(other.stats);
        const action = { type, targetId: target.id };
        const preview = previewAction(state, action);
        assert.equal(preview.legal, true);
        assert.equal(preview.skill, type);
        assert.equal(preview.chance, 100);
        assert.equal(preview.blockerId, null);
        assert.equal(preview.reason, null);
        assert.equal(preview.targetId, target.id);
        assert.deepEqual(preview.from, point(actor));
        assert.deepEqual(preview.to, point(target));
        assert.ok(Array.isArray(preview.cells));
        assert.deepEqual(state, before);
        const result = command(state, action), cast = result.events[0];
        assert.equal(cast.type, 'skill');
        assert.equal(cast.skill, type);
        assert.equal(cast.unitId, actor.id);
        assert.equal(cast.targetId, target.id);
        assert.equal(cast.team, team);
        assert.equal(cast.round, before.round);
        assert.equal(cast.success, true);
        assert.deepEqual(cast.from, preview.from);
        assert.deepEqual(cast.to, preview.to);
        assert.ok(skillFor(cast.skill).description);
        assert.equal(actor.acted, true);
        assert.notEqual(state.activeId, actor.id);
        assert.equal(state.moved, false);
        assert.equal(state.rng, before.rng);
        assert.deepEqual(statsOf(state), stats);
        if (type === 'charged-pass') {
          assert.deepEqual(result.events.map(e => e.type), ['skill', 'pass']);
          assert.equal(state.ball.holderId, target.id);
          assert.deepEqual(state.ball.charge, { team, sourceId: actor.id });
        } else {
          assert.deepEqual(result.events.map(e => e.type), ['skill']);
          assert.deepEqual(target.effects[type], { sourceId: actor.id, appliedRound: before.round });
          assert.deepEqual(state.ball, before.ball);
        }
        state.activeId = actor.id;
        rejectUnchanged(state, action, 'match-finished');
      });
    }
    for (const role of ROLES.filter(r => r !== 'sentry')) {
      test(`${type} is exclusive to the actual Sentry role: team ${team} ${role}`, () => {
        const state = fixture(role, team);
        const actor = activeUnit(state);
        actor.athlete = { id: `legacy-${team}-${role}`, version: 1, primary: role, secondary: 'sentry' };
        rejectUnchanged(state, { type, targetId: unit(state, type === 'jam' ? 1 - team : team, 'sentry').id }, 'sentry-required');
      });
    }
  }
}

for (const type of SKILLS) {
  test(`${type} rejects placement, a finished match and missing/wrong/self targets atomically`, () => {
    const setup = createMatch({ mode: 'hotseat' });
    rejectUnchanged(setup, { type, targetId: unit(setup, 0, 'middle').id }, 'placement-required');
    const finished = fixture('sentry', 0, { maxRounds: 1 });
    while (finished.status === 'playing') command(finished, { type: 'wait' });
    rejectUnchanged(finished, { type, targetId: unit(finished, 0, 'middle').id }, 'match-finished');
    const state = fixture(), actor = activeUnit(state);
    const wrongTeam = unit(state, type === 'jam' ? actor.team : 1 - actor.team, 'middle');
    for (const targetId of [undefined, null, 'unknown', actor.id, wrongTeam.id, {}, 1]) {
      rejectUnchanged(state, { type, targetId }, type === 'jam' ? 'enemy-required' : 'teammate-required');
    }
  });
}

for (const type of AURAS) {
  for (const team of [0, 1]) {
    test(`${type} team ${team}: two-cell Manhattan aura ignores intervening units and cannot stack`, () => {
      const state = fixture('sentry', team), actor = activeUnit(state), target = targetFor(state, type);
      const blocker = place(state, unit(state, 1 - team, 'scoreur'), mirror(team, 5), 3);
      hold(state, blocker);
      const ball = structuredClone(state.ball);
      assert.equal(distance(actor, target), 2);
      assert.equal(previewAction(state, { type, targetId: target.id }).chance, 100);
      place(state, target, mirror(team, 6), 4);
      rejectUnchanged(state, { type, targetId: target.id }, 'out-of-range');
      place(state, target, mirror(team, 5), 4);
      assert.equal(distance(actor, target), 2, 'diagonal distance uses two orthogonal steps');
      command(state, { type, targetId: target.id });
      assert.deepEqual(state.ball, ball, 'auras do not need or transfer the ball');
      activate(state, actor);
      rejectUnchanged(state, { type, targetId: target.id }, 'effect-active');
    });
  }
}

test('Relais grants exactly one passing cell, not two PAS or extra shooting range', () => {
  const state = fixture(), caster = activeUnit(state), target = targetFor(state, 'relay');
  target.stats.PAS = 5;
  command(state, { type: 'relay', targetId: target.id });
  hold(state, target);
  activate(state, target);
  const receiver = place(state, unit(state, 0, 'scoreur'), 11, 4);
  const action = { type: 'pass', targetId: receiver.id };
  const plain = structuredClone(state);
  delete getUnit(plain, target.id).effects;
  assert.equal(distance(target, receiver), 6);
  assert.equal(previewAction(plain, action).legal, false);
  assert.equal(previewAction(plain, action).range, 5);
  assert.equal(previewAction(state, action).legal, true);
  assert.equal(previewAction(state, action).range, 6);
  assert.equal(shotRange(state, target), shotRange(plain, getUnit(plain, target.id)));
  const stats = statsOf(state);
  command(state, action);
  assert.equal(state.ball.holderId, receiver.id);
  assert.equal(target.effects, undefined);
  assert.deepEqual(statsOf(state), stats);
  assert.equal(caster.acted, true);
});

test('Couverture uses DEF +2 in the displayed charge chance, including both clamps', () => {
  for (const team of [0, 1]) for (const [force, defense] of [[6, 5], [99, 0], [0, 99]]) {
    const state = fixture('middle', team), actor = activeUnit(state);
    const target = place(state, unit(state, 1 - team, 'meneur'), mirror(team, 5), 3);
    actor.stats.FOR = force;
    target.stats.DEF = defense;
    const action = { type: 'charge', targetId: target.id };
    const normal = previewAction(state, action).chance;
    effect(state, target, 'cover');
    const before = statsOf(state), preview = previewAction(state, action);
    assert.equal(preview.chance, Math.max(30, Math.min(95, 65 + (force - defense - 2) * 5)));
    if (force === 6) assert.equal(normal - preview.chance, 10);
    const result = command(state, action);
    assert.equal(result.events[0].chance, preview.chance);
    assert.ok(target.effects.cover, 'being charged does not end the target activation');
    assert.deepEqual(statsOf(state), before);
  }
});

test('Brouillage reduces actual path budget, allows backward detours and does not expire on movement', () => {
  const state = fixture(), target = targetFor(state, 'jam');
  target.stats.MOB = 4;
  command(state, { type: 'jam', targetId: target.id });
  place(state, unit(state, 0, 'meneur'), 7, 3);
  activate(state, target);
  const stats = statsOf(state), blocked = { type: 'move', x: 8, y: 3 };
  const normal = structuredClone(state);
  delete getUnit(normal, target.id).effects;
  const detour = legalMoves(normal).find(p => p.x === blocked.x && p.y === blocked.y);
  assert.equal(detour.path.length, 4, 'nearby destination needs four steps around the occupant');
  assert.equal(mobilityOf(target), 3);
  assert.equal(legalMoves(state).some(p => p.x === blocked.x && p.y === blocked.y), false);
  const before = structuredClone(state);
  assert.equal(applyCommand(state, blocked).ok, false);
  assert.deepEqual(state, before);
  const backward = legalMoves(state).find(p => p.x === 8 && p.y === 2);
  assert.equal(backward.path.length, 3);
  let prior = point(target);
  for (const cell of backward.path) {
    assert.equal(distance(prior, cell), 1);
    assert.equal(state.units.some(u => u.id !== target.id && u.x === cell.x && u.y === cell.y), false);
    prior = cell;
  }
  command(state, { type: 'move', ...point(backward) });
  assert.ok(target.effects.jam);
  assert.equal(mobilityOf(target), 3);
  assert.equal(state.activeId, target.id);
  command(state, { type: 'wait' });
  assert.equal(target.effects, undefined);
  assert.equal(mobilityOf(target), 4);
  assert.deepEqual(statsOf(state), stats);
});

test('Brouillage stops at one MOB and refuses already immobile/minimum-MOB targets', () => {
  for (const mob of [0, 1, 2]) {
    const state = fixture(), target = targetFor(state, 'jam');
    target.stats.MOB = mob;
    if (mob <= 1) rejectUnchanged(state, { type: 'jam', targetId: target.id }, 'no-effect');
    else {
      command(state, { type: 'jam', targetId: target.id });
      activate(state, target);
      assert.equal(mobilityOf(target), 1);
      assert.ok(legalMoves(state).length);
      assert.ok(legalMoves(state).every(p => p.path.length === 1));
    }
    assert.equal(target.stats.MOB, mob);
  }
});

for (const type of AURAS) {
  for (const alreadyActed of [false, true]) {
    test(`${type} expires only after next target activation; alreadyActed=${alreadyActed}`, () => {
      const state = fixture(), target = targetFor(state, type);
      target.acted = alreadyActed;
      const initialRound = state.round;
      command(state, { type, targetId: target.id });
      const applied = structuredClone(target.effects[type]);
      if (alreadyActed) {
        while (state.round === initialRound) {
          assert.deepEqual(target.effects[type], applied);
          command(state, { type: 'wait' });
        }
        assert.deepEqual(target.effects[type], applied, 'round rollover preserves the pending effect');
        assert.equal(target.acted, false);
      }
      waitUntil(state, target.id);
      assert.deepEqual(target.effects[type], applied, 'beginning the activation is not expiry');
      const move = legalMoves(state).find(p => p.path.length === 1);
      command(state, { type: 'move', ...point(move) });
      assert.deepEqual(target.effects[type], applied);
      const saved = JSON.parse(JSON.stringify(state));
      assert.deepEqual(restoreMatch(saved), state);
      command(state, { type: 'wait' });
      assert.equal(target.effects, undefined);
    });
  }
}

test('different effects coexist without altering base stats and expire together', () => {
  const state = fixture('middle'), actor = activeUnit(state), stats = statsOf(state);
  for (const type of AURAS) effect(state, actor, type);
  assert.equal(validateState(state), true);
  assert.equal(unitEffects(actor).length, 3);
  command(state, { type: 'move', x: 5, y: 3 });
  assert.equal(unitEffects(actor).length, 3);
  command(state, { type: 'wait' });
  assert.deepEqual(unitEffects(actor), []);
  assert.deepEqual(statsOf(state), stats);
});

test('a goal and both placement confirmations preserve pending unit effects', () => {
  const state = fixture('scoreur'), scorer = activeUnit(state);
  place(state, scorer, 8, 3);
  const targets = [unit(state, 0, 'middle'), unit(state, 0, 'meneur'), unit(state, 1, 'middle')];
  for (let i = 0; i < AURAS.length; i++) effect(state, targets[i], AURAS[i]);
  const effects = targets.map(t => structuredClone(t.effects)), stats = statsOf(state);
  chargeBall(state);
  command(state, { type: 'shoot', x: 12, y: 3 });
  assert.equal(state.phase, 'placement');
  assert.equal(state.ball.charge, undefined);
  assert.deepEqual(targets.map(t => t.effects), effects);
  assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))), state);
  ready(state);
  assert.deepEqual(targets.map(t => t.effects), effects);
  assert.deepEqual(statsOf(state), stats);
  const target = targets[0];
  waitUntil(state, target.id);
  command(state, { type: 'wait' });
  assert.equal(target.effects, undefined);
});

test('finishing the match clears all unit effects and ball charge', () => {
  for (const reason of ['target', 'rounds']) {
    const state = fixture('scoreur', 0, { maxRounds: 1 });
    const target = unit(state, 0, 'sentry');
    effect(state, target, 'jam');
    assert.equal(target.acted, true);
    chargeBall(state);
    if (reason === 'target') {
      state.score = [4, 0];
      place(state, activeUnit(state), 8, 3);
      command(state, { type: 'shoot', x: 12, y: 3 });
    } else while (state.status === 'playing') command(state, { type: 'wait' });
    assert.equal(state.status, 'finished');
    assert.ok(state.units.every(u => u.effects === undefined));
    assert.equal(state.ball.charge, undefined);
  }
});

for (const team of [0, 1]) {
  test(`charged pass team ${team}: carrier required, range -1 and Relais compose correctly`, () => {
    const state = fixture('sentry', team), actor = activeUnit(state), target = targetFor(state, 'charged-pass');
    actor.stats.PAS = 6;
    place(state, target, mirror(team, 9), 3);
    const action = { type: 'charged-pass', targetId: target.id };
    assert.equal(previewAction(state, action).range, 5);
    assert.equal(previewAction(state, action).legal, true);
    place(state, target, mirror(team, 10), 3);
    assert.equal(previewAction(state, { ...action, type: 'pass' }).legal, true);
    rejectUnchanged(state, action, 'out-of-range');
    // Exercise helper composition independently of the one-Sentry roster restriction.
    const relayed = { ...actor, effects: { relay: { sourceId: 'fixture-source', appliedRound: 1 } } };
    assert.equal(passRange(relayed) - 1, passRange(actor));
    hold(state, target);
    rejectUnchanged(state, action, 'ball-required');
    hold(state, actor);
    state.ball.charge = { team, sourceId: actor.id };
    rejectUnchanged(state, action, 'effect-active');
    assert.equal(previewAction(state, { ...action, type: 'pass' }).legal, true);
    actor.stats.PAS = 0;
    delete state.ball.charge;
    place(state, target, mirror(team, 6), 3);
    assert.equal(previewAction(state, action).range, Math.max(1, passRange(actor) - 1));
    command(state, action);
  });

  test(`charged pass team ${team}: supercover interception produces no buff`, () => {
    const state = fixture('sentry', team), actor = activeUnit(state);
    const target = place(state, unit(state, team, 'middle'), mirror(team, 6), 5);
    const blocker = place(state, unit(state, 1 - team, 'middle'), mirror(team, 5), 3);
    const second = place(state, unit(state, 1 - team, 'meneur'), mirror(team, 6), 4);
    const action = { type: 'charged-pass', targetId: target.id };
    const normal = previewAction(state, { ...action, type: 'pass' });
    const preview = previewAction(state, action), rng = state.rng;
    assert.equal(preview.legal, true);
    assert.equal(preview.chance, 0);
    assert.equal(preview.blockerId, blocker.id);
    assert.notEqual(preview.blockerId, second.id);
    assert.deepEqual(preview.cells, normal.cells, 'corner contacts use the same supercover');
    const result = command(state, action);
    assert.deepEqual(result.events.map(e => e.type), ['skill', 'pass', 'intercept']);
    assert.equal(result.events[1].success, false);
    assert.equal(result.events[2].action, 'pass');
    assert.equal(state.ball.holderId, blocker.id);
    assert.equal(state.ball.charge, undefined);
    assert.equal(target.effects, undefined);
    assert.equal(actor.acted, true);
    assert.equal(state.rng, rng);
  });
}

test('allied passes, movement, waits and round changes retain the one ball charge', () => {
  const state = fixture(), caster = activeUnit(state), first = targetFor(state, 'charged-pass');
  command(state, { type: 'charged-pass', targetId: first.id });
  const charged = structuredClone(state.ball.charge), rng = state.rng;
  waitUntil(state, first.id);
  command(state, { type: 'move', x: 7, y: 3 });
  assert.deepEqual(state.ball.charge, charged);
  command(state, { type: 'pass', targetId: caster.id });
  assert.deepEqual(state.ball.charge, charged);
  const round = state.round;
  waitUntil(state, caster.id);
  assert.equal(state.round, round + 1);
  assert.deepEqual(state.ball.charge, charged);
  rejectUnchanged(state, { type: 'charged-pass', targetId: first.id }, 'effect-active');
  command(state, { type: 'pass', targetId: first.id });
  assert.deepEqual(state.ball.charge, charged);
  assert.equal(state.rng, rng);
  assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))), state);
});

for (const team of [0, 1]) for (const role of ['middle', 'scoreur']) {
  test(`charged shot team ${team} ${role}: one extra cell, unchanged points, consumed once`, () => {
    const state = fixture(role, team), actor = activeUnit(state);
    const baseRange = 2 + Math.floor(actor.stats.TIR / 2);
    place(state, actor, mirror(team, 12 - baseRange - 1), 3);
    const action = { type: 'shoot', x: mirror(team, 12), y: 3 };
    assert.equal(previewAction(state, action).range, baseRange);
    rejectUnchanged(state, action, 'out-of-range');
    chargeBall(state);
    const preview = previewAction(state, action), stats = statsOf(state), rng = state.rng;
    const points = role === 'scoreur' ? 2 : 1;
    assert.equal(preview.legal, true);
    assert.equal(preview.range, baseRange + 1);
    assert.equal(preview.chance, 100);
    assert.equal(preview.points, points);
    const result = command(state, action);
    assert.equal(result.events.find(e => e.type === 'shot').points, points);
    assert.equal(result.events.find(e => e.type === 'goal').points, points);
    assert.equal(state.score[team], points);
    assert.equal(state.ball.charge, undefined);
    assert.equal(state.rng, rng);
    assert.deepEqual(statsOf(state), stats);
  });
}

test('a rejected shot preserves the charge, an intercepted first shot consumes it without scoring', () => {
  const state = fixture('scoreur'), actor = activeUnit(state);
  place(state, actor, 5, 3);
  const blocker = place(state, unit(state, 1, 'middle'), 6, 3);
  chargeBall(state);
  rejectUnchanged(state, { type: 'shoot', x: 12, y: 2 }, 'out-of-range');
  const rng = state.rng, action = { type: 'shoot', x: 12, y: 3 };
  assert.equal(previewAction(state, action).blockerId, blocker.id);
  const result = command(state, action);
  assert.deepEqual(result.events.map(e => e.type), ['shot', 'intercept']);
  assert.equal(result.events[0].success, false);
  assert.equal(result.events[0].points, 0);
  assert.deepEqual(state.score, [0, 0]);
  assert.equal(state.ball.holderId, blocker.id);
  assert.equal(state.ball.charge, undefined);
  assert.equal(state.rng, rng);
});

test('normal pass interception clears an existing ball charge', () => {
  const state = fixture('meneur'), target = unit(state, 0, 'middle');
  place(state, target, 8, 3);
  const blocker = place(state, unit(state, 1, 'middle'), 6, 3);
  chargeBall(state);
  command(state, { type: 'pass', targetId: target.id });
  assert.equal(state.ball.holderId, blocker.id);
  assert.equal(state.ball.charge, undefined);
});

for (const pushed of [false, true]) {
  test(`successful charge clears a charged ball, pushed=${pushed}, even on immediate recollection`, () => {
    const state = fixture('middle', 1), actor = activeUnit(state);
    const holder = place(state, unit(state, 0, 'middle'), 7, 3);
    if (!pushed) place(state, unit(state, 0, 'meneur'), 6, 3);
    hold(state, holder);
    chargeBall(state);
    assert.equal(state.rng, 1, 'seed 1 yields a charge roll below the minimum chance');
    const result = command(state, { type: 'charge', targetId: holder.id });
    const hit = result.events.find(e => e.type === 'charge');
    assert.equal(hit.success, true);
    assert.equal(hit.pushed, pushed);
    assert.equal(hit.dropped, true);
    assert.equal(state.ball.charge, undefined);
    assert.equal(state.ball.holderId, pushed ? null : holder.id);
    if (!pushed) assert.equal(hit.pickupId, holder.id);
    assert.equal(actor.acted, true);
  });
}

test('a failed charge or a charge of a non-carrier does not discard the ball bonus', () => {
  for (const carrierTarget of [false, true]) {
    const source = fixture('middle', 1);
    const target = place(source, unit(source, 0, 'middle'), 7, 3);
    hold(source, carrierTarget ? target : unit(source, 0, 'meneur'));
    const charged = chargeBall(source);
    let found = false;
    for (let seed = 1; seed <= 64; seed++) {
      const state = structuredClone(source);
      state.rng = Math.imul(seed, 2654435761) >>> 0;
      const result = command(state, { type: 'charge', targetId: target.id });
      if (carrierTarget && result.events[0].success) continue;
      assert.deepEqual(state.ball.charge, charged);
      found = true;
      break;
    }
    assert.ok(found, 'deterministic failed-charge branch exercised');
  }
});

test('schemas 1 and 2 without optional effects/charge remain valid and restore without rewriting stats', () => {
  for (const schema of [1, 2]) {
    const state = fixture();
    state.schema = schema;
    if (schema === 1) { delete state.phase; delete state.placement; }
    const before = structuredClone(state), stats = statsOf(state);
    assert.equal(validateState(state), true);
    const restored = restoreMatch(state);
    assert.deepEqual(state, before, 'restore does not mutate its input');
    assert.deepEqual(statsOf(restored), stats);
    assert.equal(restored.rng, state.rng);
    assert.equal(restored.ball.charge, undefined);
    assert.ok(restored.units.every(u => u.effects === undefined));
    assert.equal(validateState(restored), true);
  }
});

test('effects and ball charge JSON round-trip without recomputation', () => {
  const state = fixture('middle'), actor = activeUnit(state);
  for (const type of AURAS) effect(state, actor, type);
  chargeBall(state);
  const saved = JSON.parse(JSON.stringify(state)), before = structuredClone(saved);
  assert.equal(validateState(saved), true);
  assert.deepEqual(restoreMatch(saved), state);
  assert.deepEqual(saved, before);
});

test('previous-round effects are valid before the next activation, including saved movement', () => {
  const state = fixture('middle'), actor = activeUnit(state);
  effect(state, actor, 'relay');
  state.round = 2;
  activate(state, actor);
  assert.equal(validateState(state), true);
  command(state, { type: 'move', x: 5, y: 3 });
  assert.deepEqual(restoreMatch(JSON.parse(JSON.stringify(state))), state);
  command(state, { type: 'wait' });
  assert.equal(actor.effects, undefined);
});

test('save validation forbids ball charge in placement and all transient effects after match end', () => {
  const placement = createMatch();
  chargeBall(placement);
  assert.throws(() => validateState(placement), /Invalid Astraball state/);
  const finished = fixture('sentry', 0, { maxRounds: 1 });
  while (finished.status === 'playing') command(finished, { type: 'wait' });
  const charged = structuredClone(finished);
  chargeBall(charged);
  assert.throws(() => validateState(charged), /Invalid Astraball state/);
  effect(finished, unit(finished, 0, 'middle'), 'cover');
  assert.throws(() => validateState(finished), /Invalid Astraball state/);
});

const EFFECT_FORGERIES = {
  nullMap: (s, u) => { u.effects = null; },
  arrayMap: (s, u) => { u.effects = []; },
  emptyMap: (s, u) => { u.effects = {}; },
  unknownKind: (s, u) => { u.effects.haste = u.effects.relay; },
  ballSkillOnUnit: (s, u) => { u.effects['charged-pass'] = u.effects.relay; },
  nullEffect: (s, u) => { u.effects.relay = null; },
  arrayEffect: (s, u) => { u.effects.relay = []; },
  booleanEffect: (s, u) => { u.effects.relay = true; },
  missingSource: (s, u) => { delete u.effects.relay.sourceId; },
  unknownSource: (s, u) => { u.effects.relay.sourceId = 'missing'; },
  numericSource: (s, u) => { u.effects.relay.sourceId = 1; },
  sourceNotSentry: (s, u) => { u.effects.relay.sourceId = unit(s, 0, 'meneur').id; },
  enemySource: (s, u) => { u.effects.relay.sourceId = unit(s, 1, 'sentry').id; },
  selfSource: (s, u) => { const caster = unit(s, 0, 'sentry'); caster.effects = u.effects; delete u.effects; },
  friendlyJam: (s, u) => { u.effects.jam = u.effects.relay; },
  missingRound: (s, u) => { delete u.effects.relay.appliedRound; },
  zeroRound: (s, u) => { u.effects.relay.appliedRound = 0; },
  negativeRound: (s, u) => { u.effects.relay.appliedRound = -1; },
  fractionRound: (s, u) => { u.effects.relay.appliedRound = 1.5; },
  stringRound: (s, u) => { u.effects.relay.appliedRound = '1'; },
  futureRound: (s, u) => { u.effects.relay.appliedRound = s.round + 1; },
  oldRound: (s, u) => { s.round = 3; activate(s, u); },
  spentPreviousRound: (s, u) => { s.round = 2; activate(s, unit(s, 0, 'pilier')); },
  arbitraryDuration: (s, u) => { u.effects.relay.duration = 999; },
  arbitraryValue: (s, u) => { u.effects.relay.value = 99; },
  jamWithoutEffect: (s, u) => { delete u.effects; effect(s, u, 'jam'); u.stats.MOB = 1; },
};

for (const [name, forge] of Object.entries(EFFECT_FORGERIES)) {
  test(`save validation rejects invalid effect ${name} without mutation`, () => {
    const state = fixture('middle'), actor = activeUnit(state);
    effect(state, actor, 'relay');
    forge(state, actor);
    const before = structuredClone(state);
    assert.throws(() => validateState(state), /Invalid Astraball state/);
    assert.deepEqual(state, before);
    assert.throws(() => restoreMatch(state), /Invalid Astraball state/);
    assert.deepEqual(state, before);
  });
}

const CHARGE_FORGERIES = {
  null: s => { s.ball.charge = null; },
  array: s => { s.ball.charge = []; },
  empty: s => { s.ball.charge = {}; },
  noTeam: s => { delete s.ball.charge.team; },
  noSource: s => { delete s.ball.charge.sourceId; },
  unknownSource: s => { s.ball.charge.sourceId = 'missing'; },
  nonSentrySource: s => { s.ball.charge.sourceId = unit(s, 0, 'middle').id; },
  enemySource: s => { s.ball.charge.sourceId = unit(s, 1, 'sentry').id; },
  enemyTeam: s => { s.ball.charge.team = 1; },
  invalidTeam: s => { s.ball.charge.team = 2; },
  stringTeam: s => { s.ball.charge.team = '0'; },
  extraValue: s => { s.ball.charge.value = 2; },
  extraDuration: s => { s.ball.charge.duration = 1; },
  looseBall: s => { Object.assign(s.ball, { holderId: null, x: 6, y: 3 }); },
};

for (const [name, forge] of Object.entries(CHARGE_FORGERIES)) {
  test(`save validation rejects invalid ball charge ${name} without mutation`, () => {
    const state = fixture();
    chargeBall(state);
    forge(state);
    const before = structuredClone(state);
    assert.throws(() => validateState(state), /Invalid Astraball state/);
    assert.deepEqual(state, before);
    assert.throws(() => restoreMatch(state), /Invalid Astraball state/);
    assert.deepEqual(state, before);
  });
}

test('AI planning with every effect and a charged ball is read-only, deterministic and executable', () => {
  for (const team of [0, 1]) for (const role of ['sentry', 'middle', 'scoreur']) {
    const state = fixture(role, team), actor = activeUnit(state);
    effect(state, actor, 'jam');
    if (role !== 'sentry') for (const type of ['relay', 'cover']) effect(state, actor, type);
    chargeBall(state);
    assert.equal(validateState(state), true);
    const before = structuredClone(state), restored = JSON.parse(JSON.stringify(state));
    const plan = chooseTurn(state);
    assert.deepEqual(state, before, 'planning cannot mutate effects, ball charge or RNG');
    assert.deepEqual(chooseTurn(restored), plan);
    assert.deepEqual(chooseTurn(state), plan);
    assert.deepEqual(restored, before);
    assert.ok(plan.length >= 1 && plan.length <= 2);
    if (plan.length === 2) assert.equal(plan[0].type, 'move');
    for (const action of plan) {
      assert.deepEqual(command(state, action), command(restored, action));
      assert.deepEqual(state, restored);
    }
  }
});
