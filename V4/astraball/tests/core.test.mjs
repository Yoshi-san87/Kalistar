import assert from 'node:assert/strict';
import test from 'node:test';
import {
  activeUnit, applyCommand, createMatch as createSetup, getInitiative, getUnit,
  legalMoves, previewAction, validateState,
} from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';

const ROLES = ['meneur', 'scoreur', 'middle', 'sentry', 'pilier'];
const STATS = {
  sentry: [9, 4, 4, 6, 5, 5], meneur: [8, 3, 4, 9, 6, 5],
  scoreur: [7, 3, 5, 6, 9, 4], middle: [6, 3, 7, 7, 7, 7],
  pilier: [4, 2, 9, 5, 4, 9],
};
const STAT_KEYS = ['VIT', 'MOB', 'FOR', 'PAS', 'TIR', 'DEF'];
const point = ({ x, y }) => ({ x, y });
const key = ({ x, y }) => `${x},${y}`;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
const unit = (state, team, role) => state.units.find(u => u.team === team && u.role === role);

function ready(state) {
  while (state.phase === 'placement') command(state, { type: 'ready', team: state.placement.team });
  return state;
}
const createMatch = options => ready(createSetup(options));

function place(state, who, x, y) {
  Object.assign(who, { x, y });
  if (state.ball.holderId === who.id) Object.assign(state.ball, { x, y });
  return who;
}

function hold(state, who) {
  state.ball = { holderId: who.id, ...point(who) };
}

function activate(state, who) {
  for (const u of state.units) u.acted = false;
  for (const entry of getInitiative(state)) {
    if (entry.id === who.id) break;
    getUnit(state, entry.id).acted = true;
  }
  state.activeId = who.id;
  state.moved = false;
}

function fixture(role = 'sentry', team = 0, options = {}) {
  const state = createMatch({ seed: 23, ...options });
  const xs = { meneur: 4, scoreur: 5, middle: 6, sentry: 7, pilier: 1 };
  for (const u of state.units) {
    place(state, u, u.team === 0 ? xs[u.role] : 12 - xs[u.role], u.team === 0 ? 0 : 6);
  }
  const actor = unit(state, team, role);
  place(state, actor, role === 'pilier' ? (team === 0 ? 3 : 9) : (team === 0 ? 4 : 8), 3);
  hold(state, actor);
  activate(state, actor);
  assert.equal(validateState(state), true, 'fixture must itself be valid');
  return state;
}

function command(state, cmd) {
  const result = applyCommand(state, cmd);
  assert.equal(result.ok, true, `${JSON.stringify(cmd)}: ${result.error}`);
  assert.ok(Array.isArray(result.events));
  assert.equal(validateState(state), true);
  return result;
}

function rejectUnchanged(state, cmd) {
  const before = structuredClone(state);
  const result = applyCommand(state, cmd);
  assert.equal(result.ok, false, JSON.stringify(cmd));
  assert.ok(result.error);
  assert.deepEqual(state, before, 'rejected commands must not consume RNG or a turn');
}

// Select a deterministic branch through the public seed/RNG state, without mocking the engine.
function outcome(source, cmd, type, success) {
  for (let i = 1; i <= 512; i++) {
    const seed = Math.imul(i, 2654435761) >>> 0;
    const state = structuredClone(source);
    const seeded = createMatch({ seed });
    state.seed = seeded.seed;
    state.rng = seeded.rng;
    const result = command(state, cmd);
    const event = result.events.find(e => e.type === type && e.success === success);
    if (event) return { state, result, event, seed };
  }
  assert.fail(`No ${type} success=${success} found in 512 deterministic seeds`);
}

function drainRound(state) {
  ready(state);
  const round = state.round;
  const ids = [];
  while (state.status === 'playing' && state.round === round) {
    assert.ok(ids.length < 10, 'round must not repeat activations');
    ids.push(activeUnit(state).id);
    command(state, { type: 'wait' });
  }
  return ids;
}

// Independent geometric oracle: clip the segment against every closed cell square.
function touchedCells(from, to) {
  const cells = [];
  for (let x = 1; x <= 11; x++) for (let y = 0; y <= 6; y++) {
    let enter = 0;
    let leave = 1;
    for (const [axis, center] of [['x', x], ['y', y]]) {
      const delta = to[axis] - from[axis];
      if (delta === 0) {
        if (Math.abs(from[axis] - center) > 0.5) leave = -1;
      } else {
        const a = (center - 0.5 - from[axis]) / delta;
        const b = (center + 0.5 - from[axis]) / delta;
        enter = Math.max(enter, Math.min(a, b));
        leave = Math.min(leave, Math.max(a, b));
      }
    }
    if (enter <= leave + 1e-10) cells.push({ x, y });
  }
  return cells;
}

test('public initial state, canonical symmetric roles/stats, kickoff and isolation', () => {
  const state = createMatch({ seed: 42 });
  assert.equal(state.schema, 2);
  assert.equal(state.round, 1);
  assert.equal(state.maxRounds, 12);
  assert.equal(state.targetScore, 6);
  assert.equal(state.status, 'playing');
  assert.equal(state.winner, null);
  assert.deepEqual(state.score, [0, 0]);
  assert.equal(state.units.length, 10);
  for (const team of [0, 1]) {
    assert.deepEqual(state.units.filter(u => u.team === team).map(u => u.role).sort(), [...ROLES].sort());
    for (const role of ROLES) {
      assert.deepEqual(STAT_KEYS.map(k => unit(state, team, role).stats[k]), STATS[role]);
    }
  }
  assert.deepEqual(ROLES.map(r => unit(state, 0, r).name), ['Momo', 'Kaylis', 'Taulio', 'Cana', 'Balmhyr']);
  assert.equal(state.ball.holderId, unit(state, 0, 'meneur').id);
  assert.equal(validateState(state), true);
  const other = createMatch({ seed: 42 });
  assert.deepEqual(state, other);
  state.units[0].stats.VIT = 0;
  assert.notDeepEqual(state, other, 'matches must not share mutable stats');
});

test('all five roles can move, pass, charge and wait without role-only restrictions', () => {
  for (const team of [0, 1]) for (const role of ROLES) {
    const state = fixture(role, team);
    const actor = activeUnit(state);
    const direction = team === 0 ? 1 : -1;
    const friend = unit(state, team, role === 'meneur' ? 'scoreur' : 'meneur');
    const enemy = unit(state, 1 - team, 'middle');
    place(state, friend, actor.x, 2);
    place(state, enemy, actor.x + direction, 3);
    assert.ok(legalMoves(state).length > 0, role);
    assert.equal(previewAction(state, { type: 'pass', targetId: friend.id }).legal, true, role);
    assert.equal(previewAction(state, { type: 'charge', targetId: enemy.id }).legal, true, role);
    assert.equal(previewAction(state, { type: 'wait' }).legal, true, role);
    command(structuredClone(state), { type: 'pass', targetId: friend.id });
    command(structuredClone(state), { type: 'charge', targetId: enemy.id });
    command(state, { type: 'wait' });
  }
});

test('movement is one orthogonal collision-free path, bounded by MOB and pitch', () => {
  const state = fixture();
  const actor = activeUnit(state);
  place(state, unit(state, 0, 'middle'), 5, 3);
  const moves = legalMoves(state);
  assert.equal(new Set(moves.map(key)).size, moves.length);
  assert.ok(!moves.some(m => m.x === 5 && m.y === 3));
  for (const move of moves) {
    assert.ok(move.x >= 1 && move.x <= 11 && move.y >= 0 && move.y <= 6);
    const path = move.path[0] && key(move.path[0]) === key(actor) ? move.path.slice(1) : move.path;
    assert.ok(path.length > 0 && path.length <= actor.stats.MOB);
    let previous = actor;
    for (const p of path) {
      assert.equal(distance(previous, p), 1);
      assert.ok(!state.units.some(u => u.id !== actor.id && key(u) === key(p)));
      previous = p;
    }
    assert.deepEqual(point(previous), point(move));
  }
  const around = moves.find(m => m.x === 6 && m.y === 3);
  assert.ok(around, 'MOB4 can take the four-step detour around an occupant');
  rejectUnchanged(state, { type: 'move', x: 5, y: 3 });
  rejectUnchanged(state, { type: 'move', x: 0, y: 3 });
  rejectUnchanged(state, { type: 'move', x: 10, y: 3 });
  const result = command(state, { type: 'move', x: around.x, y: around.y });
  assert.ok(result.events.some(e => e.type === 'move' && e.unitId === actor.id));
  assert.equal(state.activeId, actor.id);
  assert.equal(state.moved, true);
  assert.deepEqual(legalMoves(state), []);
  rejectUnchanged(state, { type: 'move', x: 6, y: 4 });
  command(state, { type: 'wait' });
  assert.notEqual(state.activeId, actor.id);
});

test('loose ball is collected while crossing, not only at the destination', () => {
  const state = fixture();
  const id = state.activeId;
  state.ball = { holderId: null, x: 5, y: 3 };
  command(state, { type: 'move', x: 6, y: 3 });
  assert.deepEqual(state.ball, { holderId: id, x: 6, y: 3 });
});

test('both Piliers stay in their own three-column zone, including path cells', () => {
  for (const team of [0, 1]) {
    const state = fixture('pilier', team);
    const inside = p => team === 0 ? p.x >= 1 && p.x <= 3 : p.x >= 9 && p.x <= 11;
    for (const m of legalMoves(state)) assert.ok(inside(m) && m.path.every(inside));
    rejectUnchanged(state, { type: 'move', x: team === 0 ? 4 : 8, y: 3 });
  }
});

test('initiative follows speed, permits adjacent teammates and alternates tie advantage', () => {
  const state = createMatch();
  const initial = getInitiative(state);
  assert.equal(initial.length, 10);
  for (let i = 1; i < initial.length; i++) assert.ok(initial[i - 1].speed >= initial[i].speed);
  assert.equal(initial.filter(e => e.active).length, 1);
  assert.equal(initial.find(e => e.active).id, state.activeId);
  const slowed = structuredClone(state);
  unit(slowed, 1, 'sentry').penalty = 3;
  assert.equal(validateState(slowed), true);
  assert.equal(activeUnit(slowed).team, 0);
  command(slowed, { type: 'wait' });
  assert.equal(activeUnit(slowed).team, 0, 'speed wins over forced team alternation');
  assert.equal(activeUnit(slowed).role, 'meneur');
  const firstTeam = activeUnit(state).team;
  const ids = drainRound(state);
  assert.equal(ids.length, 10);
  assert.equal(new Set(ids).size, 10);
  assert.equal(state.round, 2);
  assert.equal(activeUnit(state).team, 1 - firstTeam);
  assert.equal(drainRound(state).length, 10);
});

test('zero-speed units keep their turn; equal speed uses favored team then stable ID', () => {
  const state = createMatch();
  for (const u of state.units) u.penalty = u.stats.VIT;
  const expected = state.units.slice().sort((a, b) => a.team - b.team || (a.id < b.id ? -1 : 1)).map(u => u.id);
  state.activeId = expected[0];
  assert.equal(validateState(state), true);
  assert.deepEqual(getInitiative(state).map(e => e.speed), Array(10).fill(0));
  assert.deepEqual(drainRound(state), expected);
});

test('passes reject self, enemy, missing target and distance beyond PAS range atomically', () => {
  const state = fixture('meneur');
  const actor = activeUnit(state);
  const friend = unit(state, 0, 'scoreur');
  place(state, actor, 2, 3);
  place(state, friend, 9, 3);
  const preview = previewAction(state, { type: 'pass', targetId: friend.id });
  assert.equal(preview.legal, true);
  assert.equal(preview.range, 3 + Math.floor(actor.stats.PAS / 2));
  const result = command(structuredClone(state), { type: 'pass', targetId: friend.id });
  assert.ok(result.events.some(e => e.type === 'pass' && e.unitId === actor.id));
  place(state, friend, 10, 3);
  for (const targetId of [actor.id, unit(state, 1, 'meneur').id, 'missing', friend.id]) {
    assert.equal(previewAction(state, { type: 'pass', targetId }).legal, false);
    rejectUnchanged(state, { type: 'pass', targetId });
  }
});

for (const [name, from, to, cells] of [
  ['horizontal', [3, 3], [7, 3], [[4, 3], [5, 3], [6, 3], [7, 3]]],
  ['vertical', [4, 1], [4, 5], [[4, 2], [4, 3], [4, 4], [4, 5]]],
  ['diagonal corner', [3, 2], [5, 4], [[4, 2], [3, 3], [4, 3], [5, 3], [4, 4], [5, 4]]],
]) {
  test(`supercover ${name}: conservative cells, pure preview and automatic first interception`, () => {
    const state = fixture('meneur');
    const actor = activeUnit(state);
    const friend = unit(state, 0, 'scoreur');
    place(state, actor, ...from);
    place(state, friend, ...to);
    const cmd = { type: 'pass', targetId: friend.id };
    const before = structuredClone(state);
    const preview = previewAction(state, cmd);
    assert.equal(preview.legal, true);
    const actual = preview.cells.filter(p => key(p) !== key(actor)).map(key);
    assert.deepEqual([...actual].sort(), cells.map(([x, y]) => key({ x, y })).sort());
    assert.deepEqual(actual, cells.map(([x, y]) => key({ x, y })), 'documented x-first corner tie order');
    assert.equal(new Set(actual).size, actual.length);
    assert.deepEqual(state, before, 'preview is read-only');
    assert.deepEqual(previewAction(state, cmd), preview, 'corner order is deterministic');
    const candidates = preview.cells.filter(p => key(p) !== key(actor) && key(p) !== key(friend));
    const first = place(state, unit(state, 1, 'middle'), candidates[0].x, candidates[0].y);
    const later = place(state, unit(state, 1, 'sentry'), candidates.at(-1).x, candidates.at(-1).y);
    assert.notEqual(key(first), key(later));
    const intercepted = previewAction(state, cmd);
    assert.equal(intercepted.blockerId, first.id);
    const rng = state.rng;
    const result = command(state, cmd);
    assert.equal(state.ball.holderId, first.id);
    assert.deepEqual(point(state.ball), point(first));
    assert.equal(state.rng, rng, 'automatic interception must not roll RNG');
    assert.ok(result.events.some(e => e.type === 'intercept'));
  });
}

test('1,890 valid directed trajectories match an independent closed-cell intersection oracle', () => {
  const state = fixture('meneur');
  const actor = activeUnit(state);
  const receiver = unit(state, 0, 'scoreur');
  const points = [];
  for (let x = 2; x <= 10; x++) for (let y = 1; y <= 5; y++) points.push({ x, y });
  let checked = 0;
  for (const from of points) for (const to of points) {
    if (key(from) === key(to)) continue;
    if (from.x <= 3 && to.x <= 3) continue;
    place(state, actor, from.x, from.y);
    place(state, receiver, to.x, to.y);
    assert.equal(validateState(state), true);
    const preview = previewAction(state, { type: 'pass', targetId: receiver.id });
    assert.deepEqual(preview.cells.map(key).sort(), touchedCells(from, to).map(key).sort(), `${key(from)} -> ${key(to)}`);
    checked++;
  }
  assert.equal(checked, 1890);
});

test('corner-touch defenders intercept in all four diagonal directions, x-neighbor first', () => {
  for (const dx of [-1, 1]) for (const dy of [-1, 1]) {
    const state = fixture('meneur');
    const actor = place(state, activeUnit(state), 6, 3);
    const friend = place(state, unit(state, 0, 'scoreur'), 6 + dx * 2, 3 + dy * 2);
    const xNeighbor = place(state, unit(state, 1, 'middle'), actor.x + dx, actor.y);
    place(state, unit(state, 1, 'sentry'), actor.x, actor.y + dy);
    const cmd = { type: 'pass', targetId: friend.id };
    assert.equal(previewAction(state, cmd).blockerId, xNeighbor.id);
    command(state, cmd);
    assert.equal(state.ball.holderId, xNeighbor.id);
  }
});

test('teammates traversed by a pass do not intercept it', () => {
  const state = fixture('meneur');
  place(state, unit(state, 0, 'middle'), 5, 3);
  const friend = place(state, unit(state, 0, 'scoreur'), 7, 3);
  const rng = state.rng;
  command(state, { type: 'pass', targetId: friend.id });
  assert.equal(state.ball.holderId, friend.id);
  assert.equal(state.rng, rng);
});

test('each opponent U-cell is targetable for either team; range and own goal are rejected', () => {
  for (const team of [0, 1]) {
    const state = fixture('scoreur', team);
    const actor = activeUnit(state);
    place(state, actor, team === 0 ? 9 : 3, 3);
    for (const y of [2, 3, 4]) {
      const cmd = { type: 'shoot', x: team === 0 ? 12 : 0, y };
      const preview = previewAction(state, cmd);
      assert.equal(preview.legal, true);
      assert.equal(preview.blockerId, null);
      assert.equal(preview.range, 2 + Math.floor(actor.stats.TIR / 2));
      assert.equal(preview.chance, Math.max(30, Math.min(95, 25 + actor.stats.TIR * 9 - distance(actor, cmd) * 5)));
    }
    for (const cmd of [{ type: 'shoot', x: team === 0 ? 0 : 12, y: 3 }, { type: 'shoot', x: 12, y: 1 }]) {
      assert.equal(previewAction(state, cmd).legal, false);
      rejectUnchanged(state, cmd);
    }
    place(state, actor, 6, 3);
    assert.equal(previewAction(state, { type: 'shoot', x: team === 0 ? 12 : 0, y: 3 }).legal, true);
    place(state, actor, team === 0 ? 5 : 7, 3);
    rejectUnchanged(state, { type: 'shoot', x: team === 0 ? 12 : 0, y: 3 });
  }
});

test('Pilier blocks only traversed shot cells; moving to an open angle changes interception', () => {
  const state = fixture('scoreur');
  const shooter = activeUnit(state);
  place(state, shooter, 9, 3);
  const pilier = place(state, unit(state, 1, 'pilier'), 11, 3);
  const cmd = { type: 'shoot', x: 12, y: 3 };
  assert.equal(previewAction(state, cmd).blockerId, pilier.id);
  const blocked = structuredClone(state);
  const rng = blocked.rng;
  const result = command(blocked, cmd);
  assert.equal(blocked.ball.holderId, pilier.id);
  assert.equal(blocked.rng, rng);
  assert.deepEqual(blocked.score, [0, 0]);
  assert.ok(result.events.some(e => e.type === 'intercept'));
  place(state, shooter, 10, 1);
  assert.equal(previewAction(state, { type: 'shoot', x: 12, y: 2 }).blockerId, null);
});

test('scorer scores two, every other reachable shooter scores one; goal keeps acted flags', () => {
  for (const role of ['scoreur', 'meneur', 'middle', 'sentry']) {
    const state = fixture(role);
    const actor = activeUnit(state);
    place(state, actor, 10, 3);
    const slowed = unit(state, 1, 'pilier');
    slowed.penalty = 3;
    slowed.nextPenalty = 2;
    const beforeActed = new Set(state.units.filter(u => u.acted).map(u => u.id));
    const { state: after, result } = outcome(state, { type: 'shoot', x: 12, y: 3 }, 'shot', true);
    const points = role === 'scoreur' ? 2 : 1;
    assert.deepEqual(after.score, [points, 0]);
    assert.equal(after.round, state.round);
    for (const u of after.units) assert.equal(u.acted, beforeActed.has(u.id) || u.id === actor.id);
    assert.equal(getUnit(after, slowed.id).penalty, 3, 'goal does not clear current slowdown');
    assert.equal(getUnit(after, slowed.id).nextPenalty, 2, 'goal does not clear deferred slowdown');
    assert.equal(after.ball.holderId, unit(after, 1, 'meneur').id);
    const reset = createMatch();
    for (const u of after.units) assert.deepEqual(point(u), point(getUnit(reset, u.id)));
    assert.ok(result.events.some(e => e.type === 'goal' && e.points === points && e.team === 0));
    const remaining = drainRound(after);
    assert.equal(remaining.length, 9 - beforeActed.size);
    assert.ok(!remaining.includes(actor.id));
  }
});

test('goal on the final activation advances exactly one round and preserves kickoff', () => {
  const state = fixture('scoreur');
  const actor = place(state, activeUnit(state), 10, 3);
  actor.penalty = actor.stats.VIT;
  activate(state, actor);
  assert.equal(state.units.filter(u => u.acted).length, 9);
  const { state: after, result } = outcome(state, { type: 'shoot', x: 12, y: 3 }, 'shot', true);
  assert.equal(after.round, 2);
  assert.equal(after.ball.holderId, unit(after, 1, 'meneur').id);
  assert.equal(result.events.filter(e => e.type === 'round').length, 1);
  assert.equal(after.units.filter(u => u.acted).length, 0);
  assert.equal(new Set(drainRound(after)).size, 10);
});

test('missed shot stays inside pitch and picks up immediately if landing cell is occupied', () => {
  const state = fixture('scoreur');
  place(state, activeUnit(state), 9, 3);
  const cmd = { type: 'shoot', x: 12, y: 3 };
  const missed = outcome(state, cmd, 'shot', false);
  assert.deepEqual(missed.state.score, [0, 0]);
  assert.ok(missed.state.ball.x >= 1 && missed.state.ball.x <= 11);
  assert.ok(missed.state.ball.y >= 0 && missed.state.ball.y <= 6);
  assert.ok(distance(missed.state.ball, cmd) <= 3, 'failed shot rebounds near the goal');
  const occupied = structuredClone(state);
  const friend = place(occupied, unit(occupied, 0, 'middle'), missed.state.ball.x, missed.state.ball.y);
  const seeded = createMatch({ seed: missed.seed });
  occupied.seed = seeded.seed;
  occupied.rng = seeded.rng;
  command(occupied, cmd);
  assert.equal(occupied.ball.holderId, friend.id);
  assert.deepEqual(point(occupied.ball), point(friend));
});

test('first six points finishes immediately and finished matches reject all commands', () => {
  const state = fixture('scoreur');
  state.score[0] = 4;
  place(state, activeUnit(state), 10, 3);
  const { state: after, result } = outcome(state, { type: 'shoot', x: 12, y: 3 }, 'shot', true);
  assert.equal(after.status, 'finished');
  assert.equal(after.winner, 0);
  assert.deepEqual(after.score, [6, 0]);
  assert.ok(result.events.some(e => e.type === 'end'));
  rejectUnchanged(after, { type: 'wait' });
  assert.deepEqual(legalMoves(after), []);
});

test('charge requires an adjacent enemy and uses the specified FOR/DEF chance', () => {
  const state = fixture();
  const actor = activeUnit(state);
  const enemy = place(state, unit(state, 1, 'middle'), 5, 3);
  const cmd = { type: 'charge', targetId: enemy.id };
  assert.equal(previewAction(state, cmd).chance, Math.max(30, Math.min(95, 65 + (actor.stats.FOR - enemy.stats.DEF) * 5)));
  place(state, enemy, 5, 4);
  rejectUnchanged(state, cmd);
  rejectUnchanged(state, { type: 'charge', targetId: unit(state, 0, 'meneur').id });
});

test('successful charge pushes, drops ball and slows an unacted target without cancelling its turn', () => {
  const state = fixture();
  const target = place(state, unit(state, 1, 'middle'), 5, 3);
  hold(state, target);
  const { state: after } = outcome(state, { type: 'charge', targetId: target.id }, 'charge', true);
  assert.deepEqual(point(getUnit(after, target.id)), { x: 6, y: 3 });
  assert.equal(getUnit(after, target.id).penalty, 3);
  assert.equal(getUnit(after, target.id).nextPenalty, 0);
  assert.equal(getUnit(after, target.id).acted, false);
  assert.deepEqual(after.ball, { holderId: null, x: 5, y: 3 });
  const entry = getInitiative(after).find(e => e.id === target.id);
  assert.equal(entry.speed, Math.max(0, target.stats.VIT - 3));
  assert.ok(drainRound(after).includes(target.id), 'slowed unit still activates this round');
  assert.equal(getUnit(after, target.id).penalty, 0);
});

test('charge on an acted target applies slowdown next round, never an extra activation', () => {
  const state = fixture('middle');
  const target = place(state, unit(state, 1, 'sentry'), 5, 3);
  assert.equal(target.acted, true);
  const { state: after } = outcome(state, { type: 'charge', targetId: target.id }, 'charge', true);
  assert.equal(getUnit(after, target.id).penalty, 0);
  assert.equal(getUnit(after, target.id).nextPenalty, 3);
  assert.ok(!drainRound(after).includes(target.id));
  assert.equal(getUnit(after, target.id).penalty, 3);
  assert.equal(getUnit(after, target.id).nextPenalty, 0);
  assert.ok(drainRound(after).includes(target.id));
  assert.equal(getUnit(after, target.id).penalty, 0);
});

test('cumulative current and deferred slowdown caps at VIT and never makes speed negative', () => {
  for (const alreadyActed of [false, true]) {
    const state = fixture(alreadyActed ? 'middle' : 'sentry');
    const target = place(state, unit(state, 1, alreadyActed ? 'sentry' : 'middle'), 5, 3);
    const field = alreadyActed ? 'nextPenalty' : 'penalty';
    target[field] = target.stats.VIT - 1;
    const { state: after } = outcome(state, { type: 'charge', targetId: target.id }, 'charge', true);
    assert.equal(getUnit(after, target.id)[field], target.stats.VIT);
    if (alreadyActed) drainRound(after);
    const entry = getInitiative(after).find(e => e.id === target.id);
    assert.equal(entry.speed, 0);
    assert.ok(drainRound(after).includes(target.id), 'zero speed does not cancel the activation');
  }
});

test('blocked pushes still slow/drop, immediately recollect on occupied old cell, and cannot push Pilier outside zone', () => {
  for (const mode of ['occupied', 'pitch', 'pilier']) {
    const state = fixture();
    const actor = activeUnit(state);
    const target = unit(state, 1, mode === 'pilier' ? 'pilier' : 'middle');
    if (mode === 'pitch') {
      place(state, actor, 10, 3);
      place(state, target, 11, 3);
    } else if (mode === 'pilier') {
      place(state, actor, 10, 3);
      place(state, target, 9, 3);
    } else {
      place(state, target, 5, 3);
      place(state, unit(state, 1, 'scoreur'), 6, 3);
    }
    hold(state, target);
    const { state: after } = outcome(state, { type: 'charge', targetId: target.id }, 'charge', true);
    assert.deepEqual(point(getUnit(after, target.id)), point(target), mode);
    assert.equal(getUnit(after, target.id).penalty, 3, mode);
    assert.equal(after.ball.holderId, target.id, 'ball at occupied old tile is immediately collected');
    assert.deepEqual(point(after.ball), point(target));
  }
});

test('failed charge consumes the activation but does not push, slow or drop possession', () => {
  const state = fixture();
  const target = place(state, unit(state, 1, 'middle'), 5, 3);
  hold(state, target);
  const { state: after } = outcome(state, { type: 'charge', targetId: target.id }, 'charge', false);
  assert.deepEqual(point(getUnit(after, target.id)), point(target));
  assert.equal(getUnit(after, target.id).penalty, 0);
  assert.equal(getUnit(after, state.activeId).acted, true);
  assert.equal(after.ball.holderId, target.id);
});

test('wait-only game activates each unit exactly once for twelve rounds and allows a draw', () => {
  const state = createMatch();
  for (let round = 1; round <= 12; round++) {
    assert.equal(state.round, round);
    const ids = drainRound(state);
    assert.equal(ids.length, 10);
    assert.equal(new Set(ids).size, 10);
  }
  assert.equal(state.status, 'finished');
  assert.equal(state.round, 12);
  assert.equal(state.winner, null);
  assert.deepEqual(state.score, [0, 0]);
});

test('round-cap winner is determined by score; custom maxRounds and targetScore work', () => {
  const state = createMatch({ maxRounds: 1, targetScore: 20 });
  state.score = [1, 2];
  drainRound(state);
  assert.equal(state.status, 'finished');
  assert.equal(state.winner, 1);
  assert.equal(state.round, 1);
});

const FORGERIES = {
  schema: s => { s.schema = 999; },
  overlap: s => { Object.assign(s.units[1], point(s.units[0])); },
  duplicateId: s => { s.units[1].id = s.units[0].id; },
  goalOccupancy: s => { s.units[0].x = 0; },
  fractionalPosition: s => { s.units[0].y = 1.5; },
  pilierZone: s => { unit(s, 0, 'pilier').x = 4; },
  unknownHolder: s => { s.ball.holderId = 'forged'; },
  detachedBall: s => { s.ball.y = (s.ball.y + 1) % 7; },
  looseUnderUnit: s => { s.ball = { holderId: null, ...point(s.units[0]) }; },
  goalBall: s => { s.ball = { holderId: null, x: 12, y: 3 }; },
  missingActive: s => { s.activeId = 'forged'; },
  actedActive: s => { activeUnit(s).acted = true; },
  negativePenalty: s => { s.units[0].penalty = -3; },
  invalidNextPenalty: s => { s.units[0].nextPenalty = NaN; },
  invalidStat: s => { s.units[0].stats.VIT = NaN; },
  negativeScore: s => { s.score[0] = -1; },
  invalidRng: s => { s.rng = NaN; },
  roundOverflow: s => { s.round = 13; },
  playingWinner: s => { s.winner = 0; },
  invalidMode: s => { s.mode = ''; },
  invalidSeed: s => { s.seed = {}; },
  invalidStatus: s => { s.status = 'paused'; },
  invalidMoved: s => { s.moved = 'yes'; },
  invalidTarget: s => { s.targetScore = 0; },
  invalidRounds: s => { s.maxRounds = 0; },
  invalidTeam: s => { s.units[0].team = 2; },
  missingUnit: s => { s.units.pop(); },
  duplicateRole: s => { unit(s, 0, 'middle').role = 'scoreur'; },
  negativeStat: s => { s.units[0].stats.TIR = -1; },
  excessivePenalty: s => { s.units[0].penalty = s.units[0].stats.VIT + 1; },
  fractionalScore: s => { s.score[0] = 0.5; },
  playingAtTarget: s => { s.score[0] = s.targetScore; },
  wrongInitiative: s => { s.activeId = unit(s, 0, 'pilier').id; },
  invalidLog: s => { s.log = {}; },
  unknownLogEvent: s => { s.log.push({ type: 'forged', round: 1 }); },
  prematureFinish: s => { s.status = 'finished'; s.activeId = null; },
};

for (const [name, forge] of Object.entries(FORGERIES)) {
  test(`save validation rejects forged ${name}`, () => {
    const state = createMatch();
    forge(state);
    assert.throws(() => validateState(state));
  });
}

test('invalid commands and ball-less actions reject atomically', () => {
  const state = fixture();
  for (const cmd of [null, {}, { type: 'teleport', x: 5, y: 3 }, { type: 'move', x: 4.5, y: 3 }, { type: 'move', x: 4, y: NaN }]) {
    rejectUnchanged(state, cmd);
  }
  hold(state, unit(state, 0, 'meneur'));
  rejectUnchanged(state, { type: 'pass', targetId: unit(state, 0, 'scoreur').id });
  rejectUnchanged(state, { type: 'shoot', x: 12, y: 3 });
});

test('AI prefers a clear shot and executes its optional move/action plan legally', () => {
  const state = fixture('scoreur');
  place(state, activeUnit(state), 9, 3);
  const plan = chooseTurn(state);
  assert.equal(plan.at(-1).type, 'shoot');
  for (const cmd of plan) {
    if (cmd.type === 'shoot') {
      const preview = previewAction(state, cmd);
      assert.equal(preview.blockerId, null);
      assert.ok(preview.chance >= 90);
    }
    command(state, cmd);
  }
});

test('AI chooses an available advancing scorer, recovers a loose ball and disrupts a carrier', () => {
  const passing = fixture('meneur');
  place(passing, activeUnit(passing), 2, 3);
  const scorer = place(passing, unit(passing, 0, 'scoreur'), 7, 3);
  passing.moved = true;
  assert.deepEqual(chooseTurn(passing), [{ type: 'pass', targetId: scorer.id }]);

  const recovery = fixture();
  const actorId = recovery.activeId;
  recovery.ball = { holderId: null, x: 6, y: 3 };
  const plan = chooseTurn(recovery);
  assert.equal(plan[0].type, 'move');
  command(recovery, plan[0]);
  assert.equal(recovery.ball.holderId, actorId);
  command(recovery, plan[1]);

  const disruption = fixture('meneur');
  const carrier = place(disruption, unit(disruption, 1, 'middle'), 5, 3);
  hold(disruption, carrier);
  disruption.moved = true;
  assert.deepEqual(chooseTurn(disruption), [{ type: 'charge', targetId: carrier.id }]);
});

test('AI returns no commands when the game has finished', () => {
  const state = createMatch({ maxRounds: 1 });
  drainRound(state);
  assert.deepEqual(chooseTurn(state), []);
});

test('JSON round-trip resumes identically and AI planning is pure and deterministic', () => {
  const a = createMatch({ seed: 20261025 });
  let b = JSON.parse(JSON.stringify(a));
  for (let i = 0; i < 35 && a.status === 'playing'; i++) {
    const before = structuredClone(a);
    const plan = chooseTurn(a);
    assert.deepEqual(a, before, 'AI must not change state or RNG');
    assert.deepEqual(plan, chooseTurn(b));
    assert.ok(plan.length >= 1 && plan.length <= 2);
    if (plan.length === 2) assert.equal(plan[0].type, 'move');
    assert.ok(['pass', 'shoot', 'charge', 'wait', 'ready'].includes(plan.at(-1).type));
    for (const cmd of plan) {
      assert.deepEqual(command(a, cmd), command(b, cmd));
      assert.deepEqual(a, b);
    }
    b = JSON.parse(JSON.stringify(b));
    assert.equal(validateState(b), true);
  }
});
