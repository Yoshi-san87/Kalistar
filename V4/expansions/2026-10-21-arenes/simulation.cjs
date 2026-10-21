'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {buildCatalog} = require('../../atelier/game-catalog.cjs');
const {createEngine, clone} = require('../../site/engine.js');
const Teams = require('../../site/team-composition.js');
const Matchmaking = require('../../site/matchmaking.js');
const Audit = require('../../revisions/2026-10-13-ultimate-audit-1000/simulate.cjs');

const MANIFEST = path.join(__dirname, 'arenas.json');
const NEUTRAL = {id: 'qa-arenas-neutral', name: 'QA NEUTRAL', subtitle: 'Test only',
  image: '/jeu/assets/arenes/qa-neutral.webp', source: 'In-memory test control',
  element: null, elementBonus: 0, homeCharacters: [], homeAttack: 0, homeDefense: 0};
const SEED = 'KALISTAR-ARENAS-20261021';
const runtimeArena = ({collaboration, ...arena}) => clone(arena);

async function context({requireIntegrated = false} = {}) {
  const additions = JSON.parse(fs.readFileSync(MANIFEST, 'utf8').replace(/^\uFEFF/, ''));
  assert(Array.isArray(additions) && additions.length === 8, 'Eight source arenas required');
  assert.equal(new Set(additions.map(a => a.id)).size, 8, 'Duplicate source arena');
  const published = JSON.parse(fs.readFileSync(path.join(__dirname, '../../donnees/catalogue.json'), 'utf8'))
    .cards.filter(c => c.kind === 'created');
  const active = await buildCatalog({published}), data = clone(active), missing = [];
  for (const source of additions) {
    const expected = runtimeArena(source), existing = data.arenas.find(a => a.id === source.id);
    if (existing) assert.deepEqual(existing, expected, 'Integrated arena differs from source: ' + source.id);
    else { missing.push(source.id); data.arenas.push(expected); }
  }
  if (requireIntegrated) assert.deepEqual(missing, [], 'Integration still pending');
  assert(!data.arenas.some(a => a.id === NEUTRAL.id), 'QA control must never enter production');
  data.arenas.push(clone(NEUTRAL));
  const E = createEngine(data);
  return {active, data, additions, missing, E, T: Teams.create(E)};
}

function homeTeam(ctx, arena, index, generator) {
  const characterId = arena.homeCharacters[index % arena.homeCharacters.length];
  const versions = ctx.data.cards.filter(c => c.characterId === characterId);
  assert(versions.length, 'Missing home character: ' + characterId);
  const preferred = versions[index % versions.length];
  for (let attempt = 0; attempt < 100; attempt++) {
    const team = generator.generate({seed: `${SEED}/${arena.id}/${index}/home/${attempt}`, difficulty: 'balanced'});
    const onBoard = team.formation.find(id => ctx.E.byId[id].characterId === characterId);
    if (onBoard) return team;
    if (team.cards.some(id => ctx.E.byId[id].characterId === characterId)) continue;
    for (let slot = 0; slot < 5; slot++) {
      if (!preferred.positions.includes(slot + 1)) continue;
      const next = clone(team), replaced = team.formation[slot];
      next.cards[next.cards.indexOf(replaced)] = preferred.id;
      next.formation[slot] = preferred.id;
      if (next.captain === replaced) next.captain = preferred.id;
      if (!ctx.E.validateComposition(next).length) return next;
    }
  }
  throw Error('Cannot form legal home team for ' + characterId);
}

function specifications(ctx, pairsPerArena = 40) {
  assert(Number.isInteger(pairsPerArena) && pairsPerArena >= 2 && pairsPerArena <= 200);
  const generator = Matchmaking.create(ctx.E, ctx.T), specs = [];
  for (const arena of ctx.additions) {
    const awayPool = ctx.data.cards.filter(c => !arena.homeCharacters.includes(c.characterId));
    const away = Matchmaking.create(ctx.E, ctx.T, awayPool);
    for (let index = 0; index < pairsPerArena; index++) {
      const seed = `${SEED}/${arena.id}/${index}`, focused = index % 2 === 1;
      const teams = focused
        ? [homeTeam(ctx, arena, Math.floor(index / 2), generator), away.generate({seed: seed + '/B'})]
        : ['A', 'B'].map(side => generator.generate({seed: seed + '/' + side}));
      for (const team of teams) assert.deepEqual(ctx.E.validateComposition(team), []);
      const homeStarters = teams.map(t => t.formation.filter(id => arena.homeCharacters.includes(ctx.E.byId[id].characterId)).length);
      if (focused) { assert(homeStarters[0] > 0); assert.equal(homeStarters[1], 0); }
      specs.push({index: specs.length, seed, arenaId: arena.id, teams, homeStarters,
        stratum: focused ? 'home-vs-away' : 'broad', policy: 'native-ai', density: 0, combo: false});
    }
  }
  return specs;
}

function play(ctx, spec, {mirror = false, neutral = false} = {}) {
  // Existing runner uses the live engine, ABBA, seeded dice, public AI actions,
  // legal support choices, and JSON restore + formula checks after every action.
  const result = Audit.run(ctx, {...spec, arenaId: neutral ? NEUTRAL.id : spec.arenaId}, {mirror});
  assert(!result.failed, `${spec.seed} mirror=${mirror} neutral=${neutral}: ${result.error}\n${result.stack || ''}`);
  const focalSide = mirror ? 1 : 0;
  return {index: spec.index, arenaId: spec.arenaId, stratum: spec.stratum, mirror, neutral,
    winner: result.winner, first: result.first, focalScore: result.winner === 'draw' ? .5 : Number(result.winner === focalSide),
    exchanges: result.exchanges, support: result.support, kills: result.kills,
    reloads: result.reloads, formulas: result.formulas, actions: result.actions, digest: result.digest};
}

function aggregate(specs, matches) {
  const groups = [];
  for (const arenaId of [...new Set(specs.map(s => s.arenaId))]) {
    for (const stratum of ['all', 'broad', 'home-vs-away']) {
      const cases = specs.filter(s => s.arenaId === arenaId && (stratum === 'all' || s.stratum === stratum));
      if (!cases.length) continue;
      const selected = matches.filter(m => cases.some(s => s.index === m.index));
      const control = selected.filter(m => m.neutral), treatment = selected.filter(m => !m.neutral);
      const average = (rows, field) => rows.reduce((n, r) => n + r[field], 0) / rows.length;
      // The independent unit is the deck/seed pair, not its four correlated games.
      const deltas = cases.map(s => {
        const rows = selected.filter(m => m.index === s.index);
        assert.equal(rows.length, 4);
        return average(rows.filter(m => !m.neutral), 'focalScore') - average(rows.filter(m => m.neutral), 'focalScore');
      });
      const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
      const se = deltas.length > 1 ? Math.sqrt(deltas.reduce((n, v) => n + (v - mean) ** 2, 0) / (deltas.length - 1) / deltas.length) : null;
      const changed = treatment.filter(m => control.find(c => c.index === m.index && c.mirror === m.mirror).winner !== m.winner).length;
      groups.push({arenaId, stratum, pairs: cases.length, matches: selected.length,
        neutralFocalScorePct: average(control, 'focalScore') * 100, arenaFocalScorePct: average(treatment, 'focalScore') * 100,
        pairedDeltaPp: mean * 100, pairedSePp: se === null ? null : se * 100, changedOutcomes: changed,
        neutralDraws: control.filter(m => m.winner === 'draw').length, arenaDraws: treatment.filter(m => m.winner === 'draw').length,
        neutralMeanExchanges: average(control, 'exchanges'), arenaMeanExchanges: average(treatment, 'exchanges'),
        arenaSide0Wins: treatment.filter(m => m.winner === 0).length, arenaSide1Wins: treatment.filter(m => m.winner === 1).length});
    }
  }
  return {matches: matches.length, pairs: specs.length, groups,
    reloads: matches.reduce((n, m) => n + m.reloads, 0), formulas: matches.reduce((n, m) => n + m.formulas, 0),
    supportEvents: matches.reduce((n, m) => n + m.support, 0), maxExchanges: Math.max(...matches.map(m => m.exchanges))};
}

function sourceHashes() {
  const v4 = path.resolve(__dirname, '../..');
  return Object.fromEntries(Object.keys(require.cache).filter(file => file.startsWith(v4 + path.sep) && /\.(?:cjs|js)$/.test(file))
    .sort().map(file => [path.relative(v4, file).replaceAll('\\', '/'), Audit.hash(fs.readFileSync(file))]));
}

async function main() {
  const args = process.argv.slice(2), index = args.indexOf('--pairs');
  assert(args.every((arg, i) => arg === '--require-integrated' || arg === '--pairs' || i === index + 1 && index >= 0), 'Unknown option');
  const count = index < 0 ? 40 : Number(args[index + 1]);
  const manifestHash = Audit.hash(fs.readFileSync(MANIFEST));
  const ctx = await context({requireIntegrated: args.includes('--require-integrated')}), sources = sourceHashes();
  const specs = specifications(ctx, count), matches = [], began = Date.now();
  for (const spec of specs) {
    for (const mirror of [false, true]) for (const neutral of [true, false]) matches.push(play(ctx, spec, {mirror, neutral}));
    if ((spec.index + 1) % count === 0) console.error(JSON.stringify({arena: spec.arenaId, matches: matches.length, total: specs.length * 4, seconds: (Date.now() - began) / 1000}));
  }
  const replay = play(ctx, specs[0], {neutral: true});
  assert.deepEqual(replay, matches[0], 'Seeded replay must be byte-stable apart from match UUID');
  const after = sourceHashes();
  for (const [file, hash] of Object.entries(sources)) {
    // The catalogue owner may integrate concurrently; this run keeps its own
    // immutable data snapshot. Runtime gameplay changes require a fresh run.
    if (file !== 'atelier/game-catalog.cjs') assert.equal(after[file], hash, 'Runtime changed during campaign: ' + file);
  }
  assert.equal(Audit.hash(fs.readFileSync(MANIFEST)), manifestHash, 'Source arena manifest changed during campaign');
  const report = {seed: SEED, node: process.version, seconds: (Date.now() - began) / 1000,
    sourceManifestHash: manifestHash, catalogueHash: Audit.hash(ctx.data), specsHash: Audit.hash(specs), resultsHash: Audit.hash(matches),
    sources, activeCards: ctx.data.cards.length, pendingIntegration: ctx.missing, replayVerified: true,
    method: 'Same teams, seed and policy in neutral/new arena, direct/swapped. ABBA and two Kalistels per side. Half broad matchmaking, half one guaranteed home starter against no home identity. Empty equipment slots. Existing native heuristic AI without named advanced profile. All actions use current engine; no forced dice. Draw=0.5 for focal score.',
    limits: 'Descriptive paired sensitivity study, not global balance evidence or a guarantee of 50% wins. 40 independent pairs per arena by default; each contributes four correlated matches. Deck construction is not uniform across characters. No advanced AI, equipment interactions, browser storage or visual QA covered.',
    ...aggregate(specs, matches)};
  console.log(JSON.stringify(report, null, 2));
}

module.exports = {context, specifications, play, aggregate, runtimeArena, NEUTRAL, SEED};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
