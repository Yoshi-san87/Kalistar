'use strict';
const assert = require('node:assert/strict');
const {buildCatalog} = require('../../atelier/game-catalog.cjs');
const {createEngine} = require('../engine.js');
const Q = require('../equipment.js');
const {deck: nativeDeck} = require('./castlevania-kalistar-combat.cjs');
const archive = require('./equipment-v4.5.64.json');
const catalogue = buildCatalog({published: require('../../donnees/catalogue.json').cards.filter(c => c.kind === 'created')});

const BOX = 'little-joys-box', MATERIA = 'white-materia', POD = 'pod-042';
const effects = {
  [BOX]: {trigger: 'OUTNUMBERED_GIFT', event: 'TARGETED', trait: 'luck', recipient: 'allies', duration: 'ONCE_MATCH'},
  [MATERIA]: {trigger: 'OUTNUMBERED_GIFT', event: 'ELIMINATED', trait: 'reraise', recipient: 'choice', duration: 'ONCE_MATCH'},
  [POD]: {trigger: 'TACTICAL_REPRISAL', stat: 'ATK', value: 60, duration: 'NEXT_TARGET_ATTACK', advantages: ['weapon', 'element', 'faction', 'arenaAttack']}
};
const slots = () => ({weapon: {}, shield: {}, relic: {}});
const all = p => p.board.filter(Boolean).concat(p.reserve, p.dead);
const definition = id => Q.catalogue.weapons.find(w => w.id === id);
const historical = id => archive.weapons.find(w => w.id === id);
const unit = (f, ref) => f.s.players.flatMap(all).find(u => u.uid === (typeof ref === 'string' ? ref : ref.uid));
const board = (f, side = f.side) => f.s.players[side].board.filter(Boolean);
const grants = (f, id = f.id) => f.s.match.events.flatMap(e => e.relicGrants || []).filter(g => g.weaponId === id);
const row = (f, ref) => f.E.matchStats(f.s).units.find(r => r.uid === (typeof ref === 'string' ? ref : ref.uid));

// Follow the defensive/performance fixtures: real published identities, isolated
// profiles and deterministic faces. No ultimate state is injected into the match.
async function fixture(id, {side = 0, kalistel = false, legacy = false, oldDefinitions = false, weapon = false, mutate = () => {}} = {}) {
  const data = structuredClone(await catalogue), w = definition(id);
  assert(w, id);
  const arm = weapon && definition('virtuous-contract');
  const carrier = data.cards.find(c => Q.compatible(w, c) && (!arm || Q.compatible(arm, c)));
  assert(carrier, id);
  const selected = [carrier], identities = new Set([carrier.characterId]);
  for (const c of data.cards) {
    if (selected.length === 10) break;
    if (!identities.has(c.characterId) && c.element !== 'RAINBOW') {
      selected.push(c);
      identities.add(c.characterId);
    }
  }
  data.weapons = {};
  for (const c of data.cards) {
    c.positions = [1, 2, 3, 4, 5];
    c.atk = [40, 900, 30, 20, 'death', 'retry'];
    c.defense = [200, 160, 100, 60, 'dodge', 'retry'];
    c.magic = []; c.barriers = []; c.element = 'NONE';
    c.faction = c.characterId; c.race = c.characterId;
  }
  for (const a of data.arenas) {
    a.elementBonus = 0; a.homeAttack = 0; a.homeDefense = 0; a.homeCharacters = [];
  }
  mutate(data, selected);
  const E = createEngine(data), ids = selected.map(c => c.id);
  assert.deepEqual(E.validatePlayableDeck(ids), []);
  const loadouts = legacy ? [{}, {}] : [slots(), slots()];
  if (legacy) loadouts[side][carrier.characterId] = id;
  else {
    loadouts[side][w.slot][carrier.characterId] = id;
    if (arm) loadouts[side].weapon[carrier.characterId] = arm.id;
  }
  const s = E.newGame(ids, ids, {equipment: loadouts, mode: 'local', kalistel, seed: 'RELIC-' + id});
  // A three-slot save can predate these ultimates and the flute's weapon correction.
  if (oldDefinitions) for (const item of s.equipment.definitions) {
    if (effects[item.id] || item.id === 'little-joys-flute') {
      item.effect = structuredClone(historical(item.id).effect);
      if (item.id === 'little-joys-flute') {
        item.kind = item.slot = 'relic';
        if (!legacy && id === item.id) {
          delete s.equipment.loadouts[side].weapon[carrier.characterId];
          s.equipment.loadouts[side].relic[carrier.characterId] = item.id;
        }
      }
    }
  }
  const f = {E, s, data, selected, id, side, arm};
  reload(f);
  E.autoDeploy(f.s, 0); E.autoDeploy(f.s, 1); E.start(f.s);
  f.u = board(f)[0].uid;
  f.ally = board(f)[1].uid;
  f.enemy = board(f, 1 - side)[1].uid;
  reload(f);
  return f;
}

function reload(f) {
  f.E.assertState(f.s);
  const snapshot = JSON.parse(JSON.stringify(f.s));
  const stats = f.E.matchStats(f.s);
  f.s = f.E.restoreGame(snapshot);
  assert.deepEqual(f.s, snapshot);
  assert.deepEqual(f.E.matchStats(f.s), stats);
  return f;
}
function step(f, method, ...args) {
  f.E[method](f.s, ...args);
  reload(f);
}
function lock(f, attacker, target) {
  const a = unit(f, attacker), b = unit(f, target), side = Number(a.uid[0]);
  assert.equal(f.s.phase, 'choose');
  f.s.turn = side;
  step(f, 'lock', f.s.players[side].board.indexOf(a), f.s.players[1 - side].board.indexOf(b));
}
function attack(f, die = 6) {
  step(f, 'rollAttack', die);
  if (f.s.phase === 'kalistel') step(f, 'acceptAttack');
}
function duel(f, attacker = f.enemy, target = f.u, atk = 6, def = [6]) {
  lock(f, attacker, target); attack(f, atk);
  for (const die of def) { assert.equal(f.s.phase, 'defense'); step(f, 'rollDefense', die); }
  assert.equal(f.s.phase, 'result');
  return f.s.duel;
}
function next(f) {
  assert.equal(f.E.equipmentChoice(f.s), null);
  step(f, 'next');
  while (f.s.phase === 'replace') step(f, 'autoDeploy', f.s.replacing);
}
function thin(f, count = 4, side = f.side) {
  const p = f.s.players[side];
  while (p.board.filter(Boolean).length > count) {
    const slot = p.board.findLastIndex(u => u && u.uid !== f.u);
    p.reserve.push(p.board[slot]); p.board[slot] = null;
  }
  reload(f);
}
function advantage(kind) {
  return (data, selected) => {
    const [carrier, enemy, companion] = selected;
    if (kind === 'weapon') data.weapons[enemy.weapon] = {[carrier.weapon]: 30};
    if (kind === 'element') enemy.element = 'ELECTRO';
    if (kind === 'faction') companion.faction = enemy.faction;
    if (kind === 'arenaAttack') for (const a of data.arenas) { a.homeCharacters = [enemy.characterId]; a.homeAttack = 10; }
  };
}

const scenarios = Object.freeze(['pre-momo-attack', 'pod-ready', 'pod-riposte', 'aeris-sacrifice-choice']);

// Reach an outnumbered board through definitive kills and legal replacements.
// Browser fixtures never invent an ultimate record, grant, or performance event.
function outnumberWithCombat(f) {
  while (board(f).length >= board(f, 1 - f.side).length) {
    const victim = board(f).at(-1).uid;
    assert.notEqual(victim, f.u);
    duel(f, f.enemy, victim, 2); next(f);
  }
}
async function createScenario(name, {side = 0} = {}) {
  if (!scenarios.includes(name)) throw new Error('Unknown relic scenario: ' + name);
  const id = name === 'pre-momo-attack' ? BOX : name === 'aeris-sacrifice-choice' ? MATERIA : POD;
  const f = await fixture(id, {side, kalistel: true, weapon: id === POD, mutate: id === POD ? advantage('weapon') : undefined});
  if (id === POD) {
    duel(f); next(f);
    if (name === 'pod-riposte') { lock(f, f.u, f.enemy); attack(f); }
  } else {
    outnumberWithCombat(f);
    if (id === BOX) lock(f, f.enemy, f.u);
    else duel(f, f.enemy, f.u, 2);
  }
  return reload(f);
}

// Pass this plain JSON payload to the isolated browser; rebuild its engine from
// data and call restoreGame(s). Importing this helper never registers node tests.
async function browserState(name, options) {
  const f = await createScenario(name, options);
  return JSON.parse(JSON.stringify({name, data: f.data, s: f.s, side: f.side, sourceUid: f.u, allyUid: f.ally, enemyUid: f.enemy}));
}

function numericDice(c, field, descending = false) {
  return c[field].map((value, index) => ({value, die: 6 - index})).filter(face => typeof face.value === 'number')
    .sort((a, b) => (descending ? b.value - a.value : a.value - b.value) || b.die - a.die).map(face => face.die);
}

function publishedSetup(E, carrier, enemy, id, side) {
  const ids = nativeDeck(E, [carrier.id, enemy.id]), loadouts = [slots(), slots()];
  assert.deepEqual(E.validatePlayableDeck(ids), []);
  loadouts[side].relic[carrier.characterId] = id;
  if (id === POD) loadouts[side].weapon[carrier.characterId] = 'virtuous-contract';
  const s = E.newGame(ids, ids, {mode: 'local', deckCoverage: 2, kalistel: true, seed: 'PUBLISHED-' + id + '-' + side, equipment: loadouts});
  E.autoDeploy(s, 0); E.autoDeploy(s, 1);
  const place = (cardId, team) => {
    const p = s.players[team], u = all(p).find(v => v.cardId === cardId);
    assert(u, cardId);
    if (!p.board.includes(u)) {
      const slot = E.card(u).positions[0] - 1;
      E.recall(s, team, slot); E.deploy(s, team, u.uid, slot);
    }
    return u.uid;
  };
  const u = place(carrier.id, side), enemyUid = place(enemy.id, 1 - side);
  E.start(s);
  const f = {E, s, data: E.data, id, side, u, enemy: enemyUid};
  // Structural QA staging only: preserve all ten identities and native profiles.
  // The missing starter remains in reserve; no death or relic event is invented.
  if (id !== POD) thin(f);
  return reload(f);
}

// Separate from the synthetic fixture above: the supplied live catalogue is used
// verbatim, including its faces, positions, matrices, arenas and card identities.
function createPublishedScenarios(data) {
  const E = createEngine(data), result = [];
  const snapshot = s => {
    E.assertState(s);
    return E.restoreGame(JSON.parse(JSON.stringify(s)));
  };
  for (const id of [BOX, MATERIA, POD]) for (const side of [0, 1]) {
    const w = definition(id), arm = definition('virtuous-contract');
    const carrier = data.cards.find(c => Q.compatible(w, c) && (id !== POD || Q.compatible(arm, c)));
    assert(carrier, id + ': native carrier missing');
    const opponents = data.cards.filter(c => c.characterId !== carrier.characterId && numericDice(c, 'atk').length && numericDice(c, 'defense').length);
    if (id === POD) {
      const advantaged = c => Number((data.weapons[c.weapon]?.[carrier.weapon] || 0) > 0 || E.elementModifier(c, carrier) > 0);
      opponents.sort((a, b) => advantaged(b) - advantaged(a));
    }
    let found;
    search: for (const enemy of opponents) {
      const f = publishedSetup(E, carrier, enemy, id, side);
      for (const attackDie of numericDice(enemy, 'atk', id === MATERIA)) {
        for (const defenseDie of numericDice(carrier, 'defense', id !== MATERIA)) {
          const trial = {...f, s: E.clone(f.s)};
          lock(trial, trial.enemy, trial.u);
          const before = snapshot(trial.s);
          attack(trial, attackDie);
          const accepted = snapshot(trial.s);
          step(trial, 'rollDefense', defenseDie);
          const event = trial.s.match.events.at(-1);
          if (id === BOX) {
            if (!event?.relicGrants?.some(g => g.weaponId === id) || event.kill) continue;
            found = {id, side, uid: f.u, enemyUid: f.enemy, attackDie, defenseDie, before, accepted, after: snapshot(trial.s)};
          } else if (id === MATERIA) {
            const choice = E.equipmentChoice(trial.s);
            if (!event?.kill || choice?.sourceUid !== f.u || !choice.targets.length) continue;
            const pending = snapshot(trial.s), recipientUid = choice.targets[0];
            step(trial, 'grantEquipment', recipientUid);
            found = {id, side, uid: f.u, enemyUid: f.enemy, recipientUid, attackDie, defenseDie,
              before, accepted, choice: pending, after: snapshot(trial.s)};
          } else {
            const view = E.equipmentView(trial.s, unit(trial, f.u));
            if (event?.kill || !trial.s.duel.formula || !effects[POD].advantages.some(key => trial.s.duel.formula[key] > 0) || !view.ready || view.targetUid !== f.enemy) continue;
            next(trial);
            const ready = snapshot(trial.s), riposteAttackDie = numericDice(carrier, 'atk', true)[0], riposteDefenseDie = numericDice(enemy, 'defense', true)[0];
            lock(trial, trial.u, trial.enemy); attack(trial, riposteAttackDie);
            const riposte = snapshot(trial.s);
            step(trial, 'rollDefense', riposteDefenseDie);
            assert.equal(trial.s.duel.formula.equipmentAttack, 60 + (trial.s.duel.formula.equipmentWeapon || 0));
            found = {id, side, uid: f.u, enemyUid: f.enemy, attackDie, defenseDie, riposteAttackDie, riposteDefenseDie,
              before, accepted, ready, riposte, after: snapshot(trial.s)};
          }
          break search;
        }
      }
    }
    assert(found, id + ': no qualifying duel with the unmodified published catalogue');
    result.push(found);
  }
  return result;
}

module.exports = {BOX, MATERIA, POD, effects, slots, all, definition, historical, unit, board, grants, row,
  fixture, reload, step, lock, attack, duel, next, thin, advantage, scenarios, createScenario, browserState, createPublishedScenarios};
