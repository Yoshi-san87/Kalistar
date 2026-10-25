import { activeUnit, applyCommand, getUnit, legalMoves, legalPlacements, previewAction } from './game.mjs';
import { distance, GOAL_ROWS } from './geometry.mjs';
import { FORMATION } from '../../data/teams.mjs';

const progress = (unit) => unit.team === 0 ? unit.x : 12 - unit.x;
const goalDistance = (unit) => 12 - progress(unit) + Math.max(2 - unit.y, unit.y - 4, 0);

// Left-side plans, ordered: meneur, scoreur, middle, sentry, pilier.
// Each keeps at most one support in defense and a nearby passing relay.
const SETUP_ROLES = ['meneur', 'scoreur', 'middle', 'sentry', 'pilier'];
const SETUPS = [
  { attack: 0, cells: [[4,3],[5,2],[4,5],[5,5],[1,3]] },
  { attack: 0, cells: [[3,3],[5,1],[4,3],[5,5],[1,3]] },
  { attack: 1, cells: [[4,2],[5,3],[4,4],[5,0],[2,3]] },
  { attack: -1, cells: [[4,3],[5,4],[3,2],[5,1],[1,3]] },
  { attack: -1, cells: [[4,4],[5,1],[3,3],[4,1],[1,2]] },
  { attack: 1, cells: [[5,3],[5,1],[4,4],[5,5],[2,3]] },
].flatMap(plan => [false, true].map(mirror => ({
  attack: plan.attack, cells: plan.cells.map(([x,y]) => ({x, y: mirror ? 6-y : y})),
})));
const sameCell = (a, b) => a.x === b.x && a.y === b.y;

function setupTargets(state) {
  const team = state.placement.team;
  const units = SETUP_ROLES.map(role => state.units.find(u => u.team === team && u.role === role));
  const lastReady = state.log.findLastIndex(e => e.type === 'ready' && e.team === team);
  const previous = units.map(u => ({x: team === 0 ? FORMATION[u.role].x : 12-FORMATION[u.role].x, y: FORMATION[u.role].y}));
  // Ignore this setup's partial moves: a reload must keep the same target plan.
  if (lastReady >= 0) {
    const start = state.log.findLastIndex((e,i) => i < lastReady && e.type === 'placement');
    for (let i = start + 1; i < lastReady; i++) {
      const e = state.log[i], index = units.findIndex(u => u.id === e.unitId);
      if (e.type === 'place' && index >= 0 && e.to) previous[index] = e.to;
    }
  }
  const posture = state.score[team] < state.score[1-team] ? 1
    : state.score[team] > state.score[1-team] ? -1 : state.placement.kickoffTeam === team ? 1 : 0;
  const candidates = SETUPS.map(plan => ({
    weight: 2 + posture * plan.attack,
    cells: plan.cells.map(p => ({x: team === 0 ? p.x : 12-p.x, y: p.y})),
  })).filter(plan => lastReady < 0 || !plan.cells.every((p,i) => sameCell(p, previous[i])));
  const salt = JSON.stringify([state.seed, state.round, state.score, team, state.placement.kickoffTeam, state.placement.reason]);
  let hash = 2166136261;
  for (let i = 0; i < salt.length; i++) hash = Math.imul(hash ^ salt.charCodeAt(i), 16777619) >>> 0;
  let draw = hash % candidates.reduce((sum,p) => sum + p.weight, 0);
  const selected = candidates.find(p => (draw -= p.weight) < 0);
  return units.map((u,i) => ({unitId: u.id, ...selected.cells[i]}));
}

function choosePlacement(state) {
  const targets = setupTargets(state), view = {
    ...state, units: state.units.map(u => ({...u})), ball: {...state.ball}, log: [],
  }, commands = [];
  const place = target => {
    const command = {type: 'place', ...target};
    if (!applyCommand(view, command).ok) throw Error('Invalid AI placement');
    commands.push(command);
  };
  for (let step = 0; step < 10; step++) {
    const pending = targets.filter(t => !sameCell(getUnit(view, t.unitId), t));
    if (!pending.length) break;
    const available = pending.find(t => legalPlacements(view, t.unitId).some(p => sameCell(p,t)));
    if (available) { place(available); continue; }
    // Break a swap cycle or free the defense support slot using a spare cell.
    // Never park on a destination, so each temporary move unlocks progress.
    const parked = pending.filter(t => {
      const u = getUnit(view,t.unitId);
      return targets.some(other => other.unitId !== u.id && sameCell(other,u)) || (u.role !== 'pilier' && progress(u) <= 3);
    }).map(t => ({unitId: t.unitId, cell: legalPlacements(view,t.unitId)
      .find(p => !targets.some(target => sameCell(p,target)) && (getUnit(view,t.unitId).role === 'pilier' || progress({...p,team:state.placement.team}) > 3))}))
      .find(t => t.cell);
    if (!parked) throw Error('No legal AI placement buffer');
    place({unitId: parked.unitId, ...parked.cell});
  }
  if (targets.some(t => !sameCell(getUnit(view,t.unitId),t))) throw Error('AI placement did not converge');
  return [...commands, {type: 'ready', team: state.placement.team}];
}

function movedView(state, unit, move) {
  if (!move) return state;
  const moved = { ...unit, x: move.x, y: move.y };
  const picksUp = state.ball.holderId === null
    && move.path.some((cell) => cell.x === state.ball.x && cell.y === state.ball.y);
  const ball = state.ball.holderId === unit.id || picksUp
    ? { holderId: unit.id, x: move.x, y: move.y } : state.ball;
  return { ...state, units: state.units.map((other) => other.id === unit.id ? moved : other), ball, moved: true };
}

function positioning(state, unit) {
  const holder = getUnit(state, state.ball.holderId);
  const enemies = state.units.filter((other) => other.team !== unit.team);
  if (holder?.id === unit.id) {
    const threats = enemies.filter((other) => !other.acted && distance(unit, other) === 1).length;
    return 35 + progress(unit) * 5 - goalDistance(unit) * 1.5 - threats * 9;
  }
  if (!holder) return 55 - distance(unit, state.ball) * 8;
  const ownGoal = { x: unit.team === 0 ? 1 : 11, y: Math.max(2, Math.min(4, holder.y)) };
  if (unit.role === 'pilier') {
    const homeCover = 26 - distance(unit, ownGoal) * 5;
    return holder.team === unit.team ? homeCover : homeCover + 15 - distance(unit, holder) * 2;
  }
  if (holder.team !== unit.team) {
    const goalSide = unit.team === 0 ? unit.x < holder.x : unit.x > holder.x;
    return 55 - distance(unit, holder) * 7 + (goalSide ? 8 : 0);
  }
  if (unit.role === 'scoreur' || unit.role === 'meneur') {
    const passRange = 3 + Math.floor(holder.stats.PAS / 2);
    const separation = distance(unit, holder);
    return 20 + progress(unit) * (unit.role === 'scoreur' ? 5 : 3)
      - Math.max(0, separation - passRange) * 8 - Math.abs(unit.y - 3);
  }
  // Support the carrier while marking the opponent nearest our own goal.
  const threat = enemies.slice().sort((a, b) => distance(a, ownGoal) - distance(b, ownGoal)
    || (a.id < b.id ? -1 : 1))[0];
  return 28 - distance(unit, threat) * 2 - Math.abs(distance(unit, holder) - 3) * 2
    + progress(unit) * 1.5;
}

/**
 * Read-only, deterministic greedy planner for either team (caller decides AI
 * ownership). Returns legal placements + ready during setup; otherwise
 * [optional {type:'move',x,y}, action], or [] when finished.
 * At most 77 positions x (3 goal cells + 4 teammates + 5 opponents + wait).
 * No recursive search, RNG consumption, DOM, timers, or runtime dependencies.
 * Paths and action legality are always obtained from the public engine API.
 */
export function chooseTurn(state) {
  if (state.status === 'playing' && state.phase === 'placement') return choosePlacement(state);
  const initial = activeUnit(state);
  if (!initial || initial.acted) return [];
  const candidates = [null, ...legalMoves(state)];
  let best = { value: -Infinity, commands: [{ type: 'wait' }] };
  for (const move of candidates) {
    const view = movedView(state, initial, move);
    const unit = activeUnit(view);
    const base = positioning(view, unit);
    const recovery = state.ball.holderId === null && view.ball.holderId === unit.id ? 130 : 0;
    const movementCost = (move?.path.length ?? 0) * 0.15;
    const consider = (action, utility) => {
      const value = base + recovery + utility - movementCost;
      if (value > best.value) best = {
        value,
        commands: [...(move ? [{ type: 'move', x: move.x, y: move.y }] : []), action],
      };
    };
    consider({ type: 'wait' }, 0);
    if (view.ball.holderId === unit.id) {
      for (const y of GOAL_ROWS) {
        const action = { type: 'shoot', x: unit.team === 0 ? 12 : 0, y };
        const preview = previewAction(view, action);
        if (preview.legal && !preview.blockerId) {
          const winning = view.score[unit.team] + preview.points >= view.targetScore ? 180 : 0;
          consider(action, 360 + preview.chance * preview.points * 4 + winning);
        }
      }
      for (const teammate of view.units) {
        if (teammate.team !== unit.team || teammate.id === unit.id) continue;
        const action = { type: 'pass', targetId: teammate.id };
        const preview = previewAction(view, action);
        if (!preview.legal || preview.blockerId) continue;
        const advance = progress(teammate) - progress(unit);
        const available = !teammate.acted;
        if (advance <= 0 && (!available || teammate.role !== 'scoreur')) continue;
        let shootingOpportunity = 0;
        if (available) {
          const receivingView = { ...view, activeId: teammate.id, ball: { holderId: teammate.id, x: teammate.x, y: teammate.y } };
          for (const y of GOAL_ROWS) {
            const shot = previewAction(receivingView, { type: 'shoot', x: teammate.team === 0 ? 12 : 0, y });
            if (shot.legal && !shot.blockerId) shootingOpportunity = Math.max(shootingOpportunity, shot.chance * shot.points * 0.6);
          }
        }
        const threatened = view.units.some((other) => other.team !== unit.team && !other.acted && distance(other, teammate) === 1);
        consider(action, 18 + advance * 8 + (available ? 30 : -65)
          + (teammate.role === 'scoreur' ? 24 : 0) + shootingOpportunity - (threatened ? 25 : 0));
      }
    }
    for (const enemy of view.units) {
      if (enemy.team === unit.team || distance(unit, enemy) !== 1) continue;
      const action = { type: 'charge', targetId: enemy.id };
      const preview = previewAction(view, action);
      if (!preview.legal) continue;
      const carrier = view.ball.holderId === enemy.id;
      // A blocked carrier reclaims its own dropped ball; do not value it as a steal.
      const disruption = carrier ? (preview.pushLegal ? 290 : 18) : 16;
      consider(action, preview.chance / 100 * (disruption + (enemy.acted ? 8 : 22))
        + (preview.pushLegal ? 5 : 0));
    }
  }
  return best.commands;
}
