import { TEAMS, ROLE_STATS, ROLES, FORMATION } from '../../data/teams.mjs';
import { canOccupy, distance, isPitch, isOpponentGoal, supercover, inDefense, inOwnHalf } from './geometry.mjs';
import { getAthlete, athleteSnapshot } from '../../data/athletes.mjs';

/**
 * Public API: createMatch/restoreMatch, activeUnit/controllingTeam, getUnit,
 * getInitiative, legalMoves/legalPlacements, canPosition, previewAction,
 * applyCommand, validateState. Browser-native, no DOM/dependencies.
 * Only applyCommand mutates a supplied state. Its rejected commands are atomic.
 * Call validateState on JSON-loaded saves before using them. Query results are
 * fresh except activeUnit/getUnit, which intentionally return live unit records.
 * Ranges are Manhattan. Move paths exclude origin/include destination. Preview
 * cells include both endpoints; intercepted attempts remain legal (chance 0).
 * reason is null or a stable machine-readable error code. Chance is 0..100.
 * Penalties stack to VIT, never delete activations, and expire after their round.
 * Events are plain records, with round, positions and actor IDs for animation.
 * A goal includes reset positions; remaining initiative survives the reset.
 * Placement gates play until both teams confirm, without consuming an activation.
 */

const STAT_KEYS = ['VIT', 'MOB', 'FOR', 'PAS', 'TIR', 'DEF'];
const EVENT_TYPES = new Set(['move', 'pass', 'intercept', 'charge', 'shot', 'goal', 'round', 'end', 'wait', 'placement', 'place', 'ready', 'kickoff']);
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const position = ({ x, y }) => ({ x, y });
const key = ({ x, y }) => `${x},${y}`;
const effectiveSpeed = (unit) => Math.max(0, unit.stats.VIT - unit.penalty);
const copy = (value) => JSON.parse(JSON.stringify(value));

function seedValue(seed) {
  if (Number.isSafeInteger(seed)) return seed >>> 0;
  if (typeof seed !== 'string') throw new TypeError('seed must be a string or safe integer');
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) hash = Math.imul(hash ^ seed.charCodeAt(i), 16777619) >>> 0;
  return hash;
}

// One uint32 LCG draw per charge; clear shots/passes never consume entropy.
function roll(state, chance) {
  state.rng = (Math.imul(state.rng, 1664525) + 1013904223) >>> 0;
  return state.rng / 4294967296 * 100 < chance;
}

function formationPosition(unit) {
  const home = FORMATION[unit.role];
  return { x: unit.team === 0 ? home.x : 12 - home.x, y: home.y };
}

export function createMatch({ seed = 20261025, mode = 'solo', targetScore = 6, maxRounds = 12, teams = TEAMS } = {}) {
  if (!Array.isArray(teams) || teams.length !== 2 || teams.some((team,i) => team.id !== i || !Array.isArray(team.players) || team.players.length !== 5)) throw Error('Invalid teams');
  const units = teams.flatMap((team) => team.players.map((player) => {
    const athlete=player.athleteId===undefined?null:athleteSnapshot(player.athleteId,player.role);
    const unit = {
      id: player.id, name: player.name, role: player.role,
      ...(player.character ? {character: player.character} : {}),
      ...(athlete ? {athlete} : {}),
      team: team.id, stats: { ...(athlete?getAthlete(athlete.id).stats:ROLE_STATS[player.role]) },
      acted: false, penalty: 0, nextPenalty: 0,
    };
    return { ...unit, ...formationPosition(unit) };
  }));
  const kickoff = units.find((unit) => unit.team === 0 && unit.role === 'meneur');
  const state = {
    schema: 2, seed, rng: seedValue(seed), mode, round: 1, score: [0, 0],
    targetScore, maxRounds, status: 'playing', winner: null, units,
    phase: 'placement', placement: { team: 0, kickoffTeam: 0, ready: [false, false], reason: 'opening', resumeMoved: false },
    activeId: null, moved: false,
    ball: { holderId: kickoff.id, ...position(kickoff) }, log: [],
  };
  state.activeId = nextUnit(state)?.id ?? null;
  validateState(state);
  return state;
}

export function getUnit(state, id) {
  return state.units.find((unit) => unit.id === id) ?? null;
}

export function activeUnit(state) {
  return state.status === 'playing' && state.phase !== 'placement' ? getUnit(state, state.activeId) : null;
}

export function controllingTeam(state) {
  return state.status !== 'playing' ? null : state.phase === 'placement' ? state.placement.team : activeUnit(state)?.team ?? null;
}

// Only the defending team's extra player consumes its zone's one support slot.
// Attackers do not consume that slot; a full zone also blocks crossing/pushing in.
export function canPosition(state, unit, x, y) {
  return canOccupy(unit, x, y) && (unit.role === 'pilier' || !inDefense(unit.team, x, y)
    || !state.units.some(other => other.id !== unit.id && other.team === unit.team
      && other.role !== 'pilier' && inDefense(unit.team, other.x, other.y)));
}

export function legalPlacements(state, id) {
  const unit = getUnit(state, id);
  if (state.status !== 'playing' || state.phase !== 'placement' || !unit
    || unit.team !== state.placement.team || state.placement.ready[unit.team]) return [];
  const cells = [];
  for (let y = 0; y < 7; y++) for (let x = 1; x <= 11; x++) {
    if (inOwnHalf(unit.team, x, y) && canPosition(state, unit, x, y) && !at(state, { x, y })) cells.push({ x, y });
  }
  return cells;
}

export function getInitiative(state) {
  const favoredTeam = (state.round - 1) % 2;
  return state.units.map((unit) => ({
    id: unit.id, speed: effectiveSpeed(unit), acted: unit.acted,
    active: state.status === 'playing' && state.phase !== 'placement' && state.activeId === unit.id,
    team: unit.team,
  })).sort((a, b) => b.speed - a.speed
    || Number(b.team === favoredTeam) - Number(a.team === favoredTeam)
    || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map(({ team, ...entry }) => entry);
}

function nextUnit(state) {
  const entry = getInitiative(state).find((unit) => !unit.acted);
  return entry ? getUnit(state, entry.id) : null;
}

/** Breadth-first reachability, at most 77 cells; occupied cells are impassable. */
export function legalMoves(state) {
  const unit = activeUnit(state);
  if (!unit || unit.acted || state.moved) return [];
  const occupied = new Set(state.units.filter((other) => other.id !== unit.id).map(key));
  const seen = new Set([key(unit)]);
  const queue = [{ ...position(unit), path: [] }];
  const forward = unit.team === 0 ? 1 : -1;
  const directions = [[forward, 0], [0, -1], [0, 1], [-forward, 0]];
  for (let i = 0; i < queue.length; i += 1) {
    const current = queue[i];
    if (current.path.length >= unit.stats.MOB) continue;
    for (const [dx, dy] of directions) {
      const cell = { x: current.x + dx, y: current.y + dy };
      const cellKey = key(cell);
      if (seen.has(cellKey) || occupied.has(cellKey) || !canPosition(state, unit, cell.x, cell.y)) continue;
      seen.add(cellKey);
      queue.push({ ...cell, path: [...current.path, cell] });
    }
  }
  return queue.slice(1);
}

function at(state, cell) {
  return state.units.find((unit) => unit.x === cell.x && unit.y === cell.y) ?? null;
}

function lineBlocker(state, unit, cells) {
  for (const cell of cells.slice(1)) {
    const other = at(state, cell);
    if (other && other.team !== unit.team) return other;
  }
  return null;
}

export function previewAction(state, action) {
  const base = { legal: false, reason: null, cells: [], blockerId: null, chance: 0 };
  const invalid = (reason, details = {}) => ({ ...base, ...details, legal: false, reason });
  if (state.status === 'playing' && state.phase === 'placement') return invalid('placement-required');
  const unit = activeUnit(state);
  if (!unit || unit.acted) return invalid('match-finished');
  if (!action || typeof action !== 'object') return invalid('invalid-command');
  const from = position(unit);
  if (action.type === 'wait') return { ...base, legal: true, chance: 100, from, to: from };
  if (action.type === 'charge') {
    const target = getUnit(state, action.targetId);
    if (!target || target.team === unit.team) return invalid('enemy-required');
    const to = position(target);
    const details = { from, to, targetId: target.id, distance: distance(unit, target), range: 1, cells: [from, to] };
    if (details.distance !== 1) return invalid('not-adjacent', details);
    const pushTo = { x: target.x + target.x - unit.x, y: target.y + target.y - unit.y };
    const pushLegal = canPosition(state, target, pushTo.x, pushTo.y) && !at(state, pushTo);
    return {
      ...base, ...details, legal: true,
      chance: clamp(65 + (unit.stats.FOR - target.stats.DEF) * 5, 30, 95),
      pushTo, pushLegal, penaltyRound: target.acted ? state.round + 1 : state.round,
    };
  }
  if (action.type !== 'pass' && action.type !== 'shoot') return invalid('unknown-command');
  if (state.ball.holderId !== unit.id) return invalid('ball-required');
  let target = null;
  let to;
  if (action.type === 'pass') {
    target = getUnit(state, action.targetId);
    if (!target || target.team !== unit.team || target.id === unit.id) return invalid('teammate-required');
    to = position(target);
  } else {
    if (!isOpponentGoal(unit.team, action.x, action.y)) return invalid('opponent-goal-required');
    to = { x: action.x, y: action.y };
  }
  const range = action.type === 'pass' ? 3 + Math.floor(unit.stats.PAS / 2) : 2 + Math.floor(unit.stats.TIR / 2);
  const cells = supercover(from, to);
  const blocker = lineBlocker(state, unit, cells);
  const details = {
    from, to, targetId: target?.id ?? null, range, distance: distance(unit, to),
    cells, blockerId: blocker?.id ?? null, inRange: distance(unit, to) <= range,
  };
  if (!details.inRange) return invalid('out-of-range', details);
  const clearChance = 100;
  return {
    ...base, ...details, legal: true, chance: blocker ? 0 : clearChance,
    clearChance, points: action.type === 'shoot' ? (unit.role === 'scoreur' ? 2 : 1) : 0,
  };
}

function giveBall(state, unit) {
  state.ball.holderId = unit.id;
  Object.assign(state.ball, position(unit));
}

function collectBall(state) {
  if (state.ball.holderId !== null) return null;
  const unit = at(state, state.ball);
  if (unit) giveBall(state, unit);
  return unit?.id ?? null;
}

function dropBall(state, cell) {
  state.ball.holderId = null;
  Object.assign(state.ball, cell);
  return collectBall(state);
}

function finish(state, events, reason) {
  state.status = 'finished';
  state.phase = 'play';
  state.placement = null;
  state.activeId = null;
  state.moved = false;
  state.winner = state.score[0] === state.score[1] ? null : state.score[0] > state.score[1] ? 0 : 1;
  events.push({ type: 'end', round: state.round, winner: state.winner, score: [...state.score], reason });
}

function endActivation(state, unit, events) {
  unit.acted = true;
  state.moved = false;
  if (state.score.some((score) => score >= state.targetScore)) {
    finish(state, events, 'target-score');
    return;
  }
  let next = nextUnit(state);
  if (!next) {
    if (state.round >= state.maxRounds) {
      finish(state, events, 'max-rounds');
      return;
    }
    state.round += 1;
    for (const other of state.units) {
      other.acted = false;
      other.penalty = other.nextPenalty;
      other.nextPenalty = 0;
    }
    next = nextUnit(state);
    events.push({ type: 'round', round: state.round, activeId: next.id });
  }
  state.activeId = next.id;
}

function goal(state, unit, preview, events) {
  state.score[unit.team] += preview.points;
  const reset = state.units.map((other) => {
    const from = position(other);
    Object.assign(other, formationPosition(other));
    return { unitId: other.id, from, to: position(other) };
  });
  const kickoff = state.units.find((other) => other.team !== unit.team && other.role === 'meneur');
  giveBall(state, kickoff);
  events.push({
    type: 'goal', round: state.round, unitId: unit.id, team: unit.team,
    from: preview.from, to: preview.to, success: true, points: preview.points,
    score: [...state.score], kickoffId: kickoff.id, reset,
  });
}

function beginPlacement(state, kickoffTeam, reason, events) {
  const resumeMoved = reason === 'rules-update' && state.moved;
  state.phase = 'placement';
  state.moved = false;
  state.placement = { team: kickoffTeam, kickoffTeam, ready: [false, false], reason, resumeMoved };
  events.push({ type: 'placement', round: state.round, team: kickoffTeam, reason });
}

function placeCommand(state, command) {
  const events = [], team = state.placement.team;
  if (command.type === 'place') {
    const unit = getUnit(state, command.unitId);
    if (!unit || unit.team !== team) return { ok: false, error: 'placement-team', events };
    if (!inOwnHalf(team, command.x, command.y)) return { ok: false, error: 'own-half-required', events };
    if (!canPosition(state, unit, command.x, command.y)) return { ok: false, error: 'defense-capacity', events };
    if (at(state, command)) return { ok: false, error: 'occupied', events };
    const from = position(unit);
    Object.assign(unit, { x: command.x, y: command.y });
    if (state.ball.holderId === unit.id) giveBall(state, unit);
    events.push({ type: 'place', round: state.round, unitId: unit.id, team, from, to: position(unit) });
  } else if (command.type === 'ready') {
    if (command.team !== team) return { ok: false, error: 'placement-team', events };
    state.placement.ready[team] = true;
    events.push({ type: 'ready', round: state.round, team });
    if (state.placement.ready.every(Boolean)) {
      events.push({ type: 'kickoff', round: state.round, team: state.placement.kickoffTeam });
      state.phase = 'play';
      state.moved = state.placement.resumeMoved;
      state.placement = null;
    } else state.placement.team = 1 - team;
  } else return { ok: false, error: 'placement-required', events };
  state.log.push(...copy(events));
  return { ok: true, events };
}

/** Upgrade only unfinished v1 saves: preserve score/RNG/turns, reopen formation. */
export function restoreMatch(value) {
  validateState(value);
  const state = copy(value);
  if (state.schema !== 1 || state.status === 'finished') return state;
  state.schema = 2;
  for (const unit of state.units) Object.assign(unit, formationPosition(unit));
  const team = getUnit(state, state.ball.holderId)?.team ?? (state.round - 1) % 2;
  giveBall(state, state.units.find(unit => unit.team === team && unit.role === 'meneur'));
  beginPlacement(state, team, 'rules-update', state.log);
  validateState(state);
  return state;
}

export function applyCommand(state, command) {
  if (!command || typeof command !== 'object') return { ok: false, error: 'invalid-command', events: [] };
  if (state.status === 'playing' && state.phase === 'placement') return placeCommand(state, command);
  const unit = activeUnit(state);
  if (!unit || unit.acted) return { ok: false, error: 'match-finished', events: [] };
  const events = [];
  const actor = { unitId: unit.id, team: unit.team, round: state.round };
  if (command.type === 'move') {
    if (state.moved) return { ok: false, error: 'already-moved', events };
    const move = legalMoves(state).find((cell) => cell.x === command.x && cell.y === command.y);
    if (!move) return { ok: false, error: 'unreachable', events };
    const from = position(unit);
    let pickup = null;
    for (const cell of move.path) {
      Object.assign(unit, cell);
      if (state.ball.holderId === unit.id) giveBall(state, unit);
      const collector = collectBall(state);
      if (collector) pickup = { unitId: collector, ...cell };
    }
    state.moved = true;
    events.push({ type: 'move', ...actor, from, to: position(unit), path: move.path, success: true, pickup });
  } else {
    const preview = previewAction(state, command);
    if (!preview.legal) return { ok: false, error: preview.reason, events };
    const common = { ...actor, from: preview.from, to: preview.to, targetId: preview.targetId ?? null };
    if (command.type === 'wait') {
      events.push({ type: 'wait', ...common, success: true });
    } else if (command.type === 'charge') {
      const target = getUnit(state, command.targetId);
      const success = roll(state, preview.chance);
      let pickupId = null;
      const dropped = success && state.ball.holderId === target.id;
      if (success) {
        if (preview.pushLegal) Object.assign(target, preview.pushTo);
        const field = target.acted ? 'nextPenalty' : 'penalty';
        target[field] = Math.min(target.stats.VIT, target[field] + 3);
        if (dropped) pickupId = dropBall(state, preview.to);
        else pickupId = collectBall(state);
      }
      events.push({
        type: 'charge', ...common, success, chance: preview.chance,
        pushed: success && preview.pushLegal, pushTo: position(target),
        penalty: target.penalty, nextPenalty: target.nextPenalty,
        penaltyRound: preview.penaltyRound, dropped, pickupId,
      });
    } else if (command.type === 'pass') {
      const receiver = getUnit(state, preview.blockerId ?? command.targetId);
      giveBall(state, receiver);
      events.push({ type: 'pass', ...common, cells: preview.cells, success: !preview.blockerId, blockerId: preview.blockerId });
      if (preview.blockerId) events.push({
        type: 'intercept', round: state.round, unitId: receiver.id, team: receiver.team,
        targetId: unit.id, from: preview.from, to: position(receiver), success: true, action: 'pass',
      });
    } else if (command.type === 'shoot') {
      const success = !preview.blockerId;
      const shot = {
        type: 'shot', ...common, cells: preview.cells, chance: preview.chance,
        success, points: success ? preview.points : 0, blockerId: preview.blockerId,
      };
      events.push(shot);
      if (preview.blockerId) {
        const receiver = getUnit(state, preview.blockerId);
        giveBall(state, receiver);
        events.push({
          type: 'intercept', round: state.round, unitId: receiver.id, team: receiver.team,
          targetId: unit.id, from: preview.from, to: position(receiver), success: true, action: 'shoot',
        });
      } else goal(state, unit, preview, events);
    }
    endActivation(state, unit, events);
    if (state.status === 'playing' && events.some(event => event.type === 'goal')) beginPlacement(state, 1 - unit.team, 'goal', events);
  }
  state.log.push(...copy(events));
  return { ok: true, events };
}

/** Structural/invariant validation, not historical replay or anti-cheat. */
export function validateState(state) {
  const require = (condition, message) => {
    if (!condition) throw new TypeError(`Invalid Astraball state: ${message}`);
  };
  const integer = (n, min, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n >= min && n <= max;
  require(state && typeof state === 'object' && [1, 2].includes(state.schema), 'schema');
  require(typeof state.seed === 'string' || Number.isSafeInteger(state.seed), 'seed');
  require(integer(state.rng, 0, 4294967295), 'rng');
  require(typeof state.mode === 'string' && state.mode.length > 0, 'mode');
  require(integer(state.targetScore, 1) && integer(state.maxRounds, 1), 'limits');
  require(integer(state.round, 1, state.maxRounds), 'round');
  require(Array.isArray(state.score) && state.score.length === 2 && state.score.every((n) => integer(n, 0)), 'score');
  require(['playing', 'finished'].includes(state.status), 'status');
  require(state.winner === null || state.winner === 0 || state.winner === 1, 'winner');
  require(typeof state.moved === 'boolean', 'moved');
  require(Array.isArray(state.units) && state.units.length === 10, 'units');
  const ids = new Set();
  const cells = new Set();
  const roles = [new Set(), new Set()];
  const athletes = [new Set(), new Set()];
  for (const unit of state.units) {
    require(unit && typeof unit === 'object', 'unit');
    require(typeof unit.id === 'string' && unit.id.length > 0 && !ids.has(unit.id), 'unit id');
    ids.add(unit.id);
    require(typeof unit.name === 'string' && unit.name.length > 0, 'name');
    require(unit.team === 0 || unit.team === 1, 'team');
    require(ROLES.includes(unit.role) && !roles[unit.team].has(unit.role), 'role');
    roles[unit.team].add(unit.role);
    require(canOccupy(unit, unit.x, unit.y) && !cells.has(key(unit)), 'unit position');
    cells.add(key(unit));
    require(unit.stats && STAT_KEYS.every((stat) => integer(unit.stats[stat], 0, 99)), 'stats');
    if(unit.athlete!==undefined){
      const a=unit.athlete;
      // Validate the saved snapshot, never recompute an ongoing match from today's catalog.
      require(a&&typeof a.id==='string'&&a.id.length>0&&a.id.length<160&&integer(a.version,1), 'athlete identity');
      if(a.version===1){
        require(!Object.hasOwn(a,'position')&&ROLES.includes(a.primary)&&ROLES.includes(a.secondary)&&a.primary!==a.secondary&&[a.primary,a.secondary].includes(unit.role), 'athlete positions');
      }else{
        require(!Object.hasOwn(a,'primary')&&!Object.hasOwn(a,'secondary')&&ROLES.includes(a.position)&&a.position===unit.role, 'athlete position');
      }
      require(!athletes[unit.team].has(a.id), 'duplicate athlete');athletes[unit.team].add(a.id);
    }
    require(typeof unit.acted === 'boolean', 'acted');
    require(integer(unit.penalty, 0, unit.stats.VIT) && integer(unit.nextPenalty, 0, unit.stats.VIT), 'penalty');
  }
  require(roles.every((team) => team.size === 5), 'team composition');
  if (state.schema === 2) {
    require(['placement', 'play'].includes(state.phase), 'phase');
    for (const team of [0, 1]) require(state.units.filter(unit => unit.team === team && unit.role !== 'pilier' && inDefense(team, unit.x, unit.y)).length <= 1, 'defense capacity');
    if (state.phase === 'placement') {
      const p = state.placement;
      require(state.status === 'playing' && !state.moved && p && [0, 1].includes(p.team) && [0, 1].includes(p.kickoffTeam), 'placement');
      require(['opening', 'goal', 'rules-update'].includes(p.reason), 'placement reason');
      require(typeof p.resumeMoved === 'boolean' && (p.reason === 'rules-update' || !p.resumeMoved), 'placement movement');
      require(Array.isArray(p.ready) && p.ready.length === 2 && p.ready.every(v => typeof v === 'boolean'), 'placement ready');
      require(!p.ready[p.team] && (p.team === p.kickoffTeam ? !p.ready[1 - p.team] : p.ready[p.kickoffTeam]), 'placement order');
      require(state.units.every(unit => inOwnHalf(unit.team, unit.x, unit.y)), 'placement half');
      require(state.ball?.holderId === state.units.find(unit => unit.team === p.kickoffTeam && unit.role === 'meneur').id, 'kickoff holder');
    } else require(state.placement === null, 'inactive placement');
  }
  require(state.ball && isPitch(state.ball.x, state.ball.y), 'ball position');
  require(state.ball.holderId === null || ids.has(state.ball.holderId), 'ball holder');
  if (state.ball.holderId !== null) {
    const holder = getUnit(state, state.ball.holderId);
    require(holder.x === state.ball.x && holder.y === state.ball.y, 'ball must follow holder');
  } else require(!cells.has(key(state.ball)), 'uncollected ball');
  const reachedTarget = state.score.some((score) => score >= state.targetScore);
  require(!state.score.every((score) => score >= state.targetScore), 'two target winners');
  if (state.status === 'playing') {
    require(state.winner === null && !reachedTarget, 'playing result');
    require(nextUnit(state)?.id === state.activeId && ids.has(state.activeId), 'active initiative');
  } else {
    require(state.activeId === null && !state.moved, 'finished activation');
    require(reachedTarget || (state.round === state.maxRounds && state.units.every((unit) => unit.acted)), 'premature finish');
    const winner = state.score[0] === state.score[1] ? null : state.score[0] > state.score[1] ? 0 : 1;
    require(state.winner === winner, 'finished winner');
  }
  require(Array.isArray(state.log), 'log');
  for (const event of state.log) {
    require(event && EVENT_TYPES.has(event.type) && integer(event.round, 1, state.round), 'log event');
  }
  return true;
}
