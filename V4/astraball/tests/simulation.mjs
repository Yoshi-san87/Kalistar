import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { performance } from 'node:perf_hooks';
import { activeUnit, applyCommand, createMatch, validateState } from '../src/core/game.mjs';
import { chooseTurn } from '../src/core/ai.mjs';

const root = fileURLToPath(new URL('../../../', import.meta.url));
const allowedEvents = new Set(['move', 'pass', 'intercept', 'charge', 'shot', 'goal', 'round', 'end', 'wait', 'placement', 'place', 'ready', 'kickoff']);
const hash = value => createHash('sha256').update(value).digest('hex');

async function engineHashes() {
  const hashes = {};
  for (const file of ['src/core/game.mjs', 'src/core/geometry.mjs', 'src/core/ai.mjs', 'data/teams.mjs']) {
    hashes[file] = hash(await readFile(new URL(`../${file}`, import.meta.url)));
  }
  return hashes;
}

export function assertInvariants(state) {
  assert.equal(validateState(state), true);
  assert.equal(state.units.length, 10);
  const occupied = new Set();
  const ids = new Set();
  for (const u of state.units) {
    assert.ok(Number.isInteger(u.x) && u.x >= 1 && u.x <= 11);
    assert.ok(Number.isInteger(u.y) && u.y >= 0 && u.y <= 6);
    assert.ok(!occupied.has(`${u.x},${u.y}`), 'units overlap');
    assert.ok(!ids.has(u.id), 'duplicate unit id');
    occupied.add(`${u.x},${u.y}`);
    ids.add(u.id);
    if (u.role === 'pilier') assert.ok(u.team === 0 ? u.x <= 3 : u.x >= 9);
    assert.ok(Number.isFinite(u.penalty) && u.penalty >= 0);
    assert.ok(Number.isFinite(u.nextPenalty) && u.nextPenalty >= 0);
  }
  assert.ok(Number.isInteger(state.ball.x) && state.ball.x >= 1 && state.ball.x <= 11);
  assert.ok(Number.isInteger(state.ball.y) && state.ball.y >= 0 && state.ball.y <= 6);
  if (state.ball.holderId === null) {
    assert.ok(!occupied.has(`${state.ball.x},${state.ball.y}`), 'loose ball under occupied unit');
  } else {
    const holder = state.units.find(u => u.id === state.ball.holderId);
    assert.ok(holder, 'unknown holder');
    assert.equal(state.ball.x, holder.x);
    assert.equal(state.ball.y, holder.y);
  }
  assert.ok(state.round >= 1 && state.round <= state.maxRounds);
  assert.ok(state.score.every(v => Number.isInteger(v) && v >= 0));
  if (state.status === 'playing') {
    const actor = activeUnit(state);
    if(state.phase==='placement')assert.equal(actor,null);else assert.ok(actor && !actor.acted);
    assert.equal(state.winner, null);
  }
}

export function simulate(seed) {
  const state = createMatch({ seed, mode: 'solo' });
  const trace = createHash('sha256');
  const seen = new Map();
  const eventCounts = {};
  const pointTotals = [0, 0];
  let turns = 0;
  let commands = 0;
  let maxDecisionMs = 0;
  let planningMs = 0;
  assertInvariants(state);
  while (state.status === 'playing') {
    while(state.phase==='placement'){
      const before=JSON.stringify(state),plan=chooseTurn(state);
      assert.equal(JSON.stringify(state),before);
      assert.deepEqual(plan,[{type:'ready',team:state.placement.team}]);
      const result=applyCommand(state,plan[0]);assert.equal(result.ok,true);assertInvariants(state);
      commands++;for(const e of result.events)eventCounts[e.type]=(eventCounts[e.type]||0)+1;
      trace.update(JSON.stringify({cmd:plan[0],result,state}));
    }
    assert.ok(turns < state.maxRounds * state.units.length, `seed ${seed}: activation cap exceeded`);
    const actor = activeUnit(state);
    const round = state.round;
    if (!seen.has(round)) seen.set(round, new Set());
    assert.ok(!seen.get(round).has(actor.id), `seed ${seed}: ${actor.id} repeated in round ${round}`);
    seen.get(round).add(actor.id);
    const beforePlan = JSON.stringify(state);
    const start = performance.now();
    const plan = chooseTurn(state);
    const elapsed = performance.now() - start;
    planningMs += elapsed;
    maxDecisionMs = Math.max(maxDecisionMs, elapsed);
    assert.equal(JSON.stringify(state), beforePlan, `seed ${seed}: AI changed state`);
    assert.ok(Array.isArray(plan) && plan.length >= 1 && plan.length <= 2, 'AI turn shape');
    if (plan.length === 2) assert.equal(plan[0].type, 'move');
    assert.ok(['pass', 'shoot', 'charge', 'wait'].includes(plan.at(-1).type));
    for (const cmd of plan) {
      const result = applyCommand(state, cmd);
      assert.equal(result.ok, true, `seed ${seed}, turn ${turns}, ${JSON.stringify(cmd)}: ${result.error}`);
      assertInvariants(state);
      commands++;
      for (const e of result.events) {
        assert.ok(allowedEvents.has(e.type), `undocumented event ${e.type}`);
        eventCounts[e.type] = (eventCounts[e.type] || 0) + 1;
        if (e.type === 'goal') {
          assert.ok(e.team === 0 || e.team === 1);
          assert.ok(e.points === 1 || e.points === 2);
          const scorer = state.units.find(u => u.id === e.unitId);
          assert.equal(scorer?.team, e.team);
          assert.equal(e.points, scorer.role === 'scoreur' ? 2 : 1);
          pointTotals[e.team] += e.points;
        }
      }
      assert.deepEqual(state.score, pointTotals, 'score must equal sum of goal events');
      trace.update(JSON.stringify({ cmd, result, state }));
    }
    turns++;
    if (state.round !== round) assert.equal(seen.get(round).size, 10, 'round ended before all units activated');
    if (state.status === 'playing') assert.ok(state.activeId !== actor.id || state.round !== round);
  }
  assert.equal(state.status, 'finished');
  assert.ok(state.score.some(v => v >= state.targetScore) || state.round === state.maxRounds);
  if (!state.score.some(v => v >= state.targetScore)) assert.equal(seen.get(state.round).size, 10);
  assert.equal(state.winner, state.score[0] === state.score[1] ? null : state.score[0] > state.score[1] ? 0 : 1);
  return {
    seed, rounds: state.round, score: [...state.score], winner: state.winner,
    endedBy: state.score.some(v => v >= state.targetScore) ? 'score' : 'round-cap',
    turns, commands, eventCounts, pointTotals, traceHash: trace.digest('hex'),
    planningMs, maxDecisionMs,
  };
}

export async function runSimulation({ games = 120, seedStart = 1 } = {}) {
  assert.ok(Number.isInteger(games) && games >= 100, 'use at least 100 games');
  assert.ok(Number.isSafeInteger(seedStart) && seedStart >= 0);
  assert.ok(Number.isSafeInteger(seedStart + games - 1));
  const sourceHashes = await engineHashes();
  const started = performance.now();
  const results = [];
  for (let i = 0; i < games; i++) results.push(simulate(seedStart + i));
  const replaySeeds = [results[0], results[Math.floor(games / 2)], results.at(-1)];
  for (const original of replaySeeds) {
    const replay = simulate(original.seed);
    assert.equal(replay.traceHash, original.traceHash, `seed ${original.seed} full replay diverged`);
  }
  assert.deepEqual(await engineHashes(), sourceHashes, 'engine sources changed during simulation; rerun for reliable evidence');
  const durations = results.map(r => r.planningMs / r.turns).sort((a, b) => a - b);
  const sum = fn => results.reduce((n, r) => n + fn(r), 0);
  const totalEvents = {};
  for (const type of allowedEvents) totalEvents[type] = sum(r => r.eventCounts[type] || 0);
  return {
    schema: 1, generatedAt: new Date().toISOString(), node: process.version, platform: process.platform,
    sourceHashes, games, seedStart, seedEnd: seedStart + games - 1,
    elapsedMs: performance.now() - started,
    wins: [sum(r => Number(r.winner === 0)), sum(r => Number(r.winner === 1))],
    draws: sum(r => Number(r.winner === null)),
    endings: { score: sum(r => Number(r.endedBy === 'score')), roundCap: sum(r => Number(r.endedBy === 'round-cap')) },
    totalPoints: [sum(r => r.score[0]), sum(r => r.score[1])],
    meanRounds: sum(r => r.rounds) / games,
    totalTurns: sum(r => r.turns), totalCommands: sum(r => r.commands),
    totalEvents,
    meanDecisionMs: sum(r => r.planningMs) / sum(r => r.turns),
    medianGameMeanDecisionMs: durations[Math.floor(durations.length / 2)],
    maxDecisionMs: Math.max(...results.map(r => r.maxDecisionMs)),
    replayedSeeds: replaySeeds.map(r => r.seed),
    assertions: 'legal AI plans; pure planning; invariant checks after each command; one activation/unit/round; bounded termination; exact event/score tally; full seeded replay hashes',
    limitation: 'Deterministic engineering smoke test, not a statistical balance study. No browser, renderer, UX or human-play validation.',
    gamesDetail: results,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const options = {};
  let output;
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    assert.ok(['--games', '--seed-start', '--out'].includes(flag), `unknown argument ${flag}`);
    const value = args[++i];
    assert.ok(value !== undefined, `missing value for ${flag}`);
    if (flag === '--games') options.games = Number(value);
    if (flag === '--seed-start') options.seedStart = Number(value);
    if (flag === '--out') output = value;
  }
  const report = await runSimulation(options);
  if (output) {
    const scratch = resolve(root, 'work/astraball');
    const destination = resolve(root, output);
    const rel = relative(scratch, destination);
    assert.ok(rel && rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel), 'output must be under work/astraball');
    assert.ok(destination.startsWith(`${scratch}${sep}`), 'output must remain inside scratch directory');
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, `${JSON.stringify(report, null, 2)}\n`, { flag: 'w' });
  }
  const { gamesDetail, ...summary } = report;
  console.log(JSON.stringify({ ...summary, ...(output ? { output } : {}) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error(error); process.exitCode = 1; });
}
