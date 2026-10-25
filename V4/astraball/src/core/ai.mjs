import { activeUnit, getUnit, legalMoves, previewAction } from './game.mjs';
import { distance, GOAL_ROWS } from './geometry.mjs';

const progress = (unit) => unit.team === 0 ? unit.x : 12 - unit.x;
const goalDistance = (unit) => 12 - progress(unit) + Math.max(2 - unit.y, unit.y - 4, 0);

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
 * ownership). Returns [optional {type:'move',x,y}, action], or [] when finished.
 * At most 77 positions x (3 goal cells + 4 teammates + 5 opponents + wait).
 * No recursive search, RNG consumption, DOM, timers, or runtime dependencies.
 * Paths and action legality are always obtained from the public engine API.
 */
export function chooseTurn(state) {
  if (state.status === 'playing' && state.phase === 'placement') return [{ type: 'ready', team: state.placement.team }];
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
