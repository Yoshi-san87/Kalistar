'use strict';
const assert = require('node:assert/strict');
const {buildCatalog} = require('../../atelier/game-catalog.cjs');
const {createEngine} = require('../engine.js');
const Q = require('../equipment.js');
const published = require('../../donnees/catalogue.json').cards.filter(c => c.kind === 'created');
const catalogue = buildCatalog({published});

const IDS = Object.freeze([
  'exiled-king-seal', 'current-compass', 'last-garden-seed', 'lost-names-bell',
  'kalistar-nerval-lantern', 'kalistar-nestown-beacon', 'griever-pendant',
  'zanarkand-abes-pendant', 'guardian-jug', 'ff9-garnet-pendant', 'ff9-mog-ribbon',
  'ff9-final-act-feather', 'ff9-terra-fragment', 'ff9-tantalus-script', 'pod-153',
  'lunar-tear', 'infiltration-box', 'metal-gear-mkii', 'jill-lockpicks',
  'wolf-medallion', 'obsidian-star', 'straw-hat', 'log-pose', 'rumble-ball',
  'cola-reserve', 'gotham-harvey-coin', 'gotham-riddle-box', 'gotham-ivy-seed',
  'gotham-utility-belt', 'gotham-lazarus-vial', 'castlevania-hector-ring',
  'castlevania-lisa-memory'
]);
const traitFaces = {luck: 'retry', mana: 'mana', physical: 'buff_atk', ward: 'guard', reraise: 'revive'};
const traitMethods = {luck: 'grantClover', mana: 'grantPotion', physical: 'grantPhysical', ward: 'grantGuard', reraise: 'grantReraise'};
// The exact pre-expansion archive includes Gotham/Castlevania, unlike 4.5.64.
const historical = require('./relic-definitions-v4.6.42.json');
const oldEffects = Object.fromEntries(historical.weapons.map(w => [w.id, w.effect]));
const slots = () => ({weapon: {}, shield: {}, relic: {}});
const all = p => p.board.filter(Boolean).concat(p.reserve, p.dead);
const definition = id => Q.catalogue.weapons.find(w => w.id === id);
const unit = (f, uid) => f.s.players.flatMap(all).find(u => u.uid === (uid?.uid || uid));
const board = (f, side = f.side) => f.s.players[side].board.filter(Boolean);
const record = (f, uid = f.u) => f.s.equipment?.rituals?.records?.[uid];
const grants = (f, id = f.id) => (f.s.match.ultimateGrants || []).filter(g => g.weaponId === id);
const uses = (f, id = f.id) => (f.s.equipment?.rituals?.uses || []).filter(u => u.weaponId === id);
const row = (f, uid = f.u) => f.E.matchStats(f.s).units.find(u => u.uid === uid);

function supportProfile(c, kinds) {
  kinds.forEach((kind, i) => { c.atk[5 - i] = traitFaces[kind]; });
  c.role = 5; c.canGuard = true; c.canHeal = true;
}

// Real catalogue identities and compatibility, deterministic test-only faces.
// Every activation, trait provenance and death is produced through public engine
// actions; never seed a ritual record, match event, modifier or grant ledger.
async function fixture(id, {side = 0, supports = [], extras = [], opponentRelics = [], reserve = false,
  kalistel = false, seed = 'ULTIMATE-' + id, mutate = () => {}, frozen = false} = {}) {
  const data = structuredClone(await catalogue), w = definition(id);
  assert(w, 'Missing relic: ' + id);
  const selected = [], identities = new Set(), equipmentCards = {};
  for (const item of [id, ...extras, ...opponentRelics]) {
    const c = data.cards.find(c => Q.compatible(definition(item), c) && !identities.has(c.characterId));
    assert(c, 'No distinct real compatible carrier: ' + item);
    selected.push(c); identities.add(c.characterId); equipmentCards[item] = c;
  }
  for (const c of data.cards) {
    if (selected.length === 10) break;
    if (!identities.has(c.characterId) && c.element !== 'RAINBOW') {
      selected.push(c); identities.add(c.characterId);
    }
  }
  data.weapons = {};
  data.demo = {...data.demo, synergy: [0, 0, 0, 0, 0, 0]};
  for (const c of data.cards) {
    c.positions = [1, 2, 3, 4, 5];
    c.atk = [40, 900, 160, 20, 'death', 'retry'];
    c.defense = [220, 160, 100, 60, 'dodge', 'retry'];
    c.magic = []; c.barriers = []; c.element = 'NONE';
  }
  for (const arena of data.arenas) {
    arena.elementBonus = 0; arena.homeAttack = 0;
    arena.homeDefense = 0; arena.homeCharacters = [];
  }
  supportProfile(selected[3], Object.keys(traitFaces));
  if (supports.length) supportProfile(selected[0], supports);
  mutate(data, selected, equipmentCards);
  const E = createEngine(data), ids = selected.map(c => c.id), loadouts = [slots(), slots()];
  for (const [item, c] of Object.entries(equipmentCards)) loadouts[opponentRelics.includes(item) ? 1 - side : side].relic[c.characterId] = item;
  const s = E.newGame(ids, ids, {equipment: loadouts, mode: 'local', kalistel, seed});
  if (frozen) {
    // A pre-expansion save cannot contain relics published after its archive.
    s.equipment.definitions = s.equipment.definitions.filter(item => item.slot !== 'relic' || oldEffects[item.id]);
    for (const item of s.equipment.definitions) {
      if (oldEffects[item.id]) item.effect = structuredClone(oldEffects[item.id]);
    }
    // Old saves legitimately have no runtime journal; this is a schema fixture,
    // not a positive activation fixture.
    delete s.equipment.rituals;
  }
  E.autoDeploy(s, 0); E.autoDeploy(s, 1);
  if (reserve) {
    E.recall(s, side, 0);
    E.deploy(s, side, side + '-5', 0);
  }
  E.start(s);
  const f = {E, s, data, selected, id, side, u: side + '-0', ally: side + '-2',
    ally2: side + '-3', helper: side + '-3', enemy: (1 - side) + '-4',
    uids: Object.fromEntries(Object.entries(equipmentCards).map(([key, c]) => [key,
      (opponentRelics.includes(key) ? 1 - side : side) + '-' + selected.indexOf(c)]))};
  return reload(f);
}

function reload(f) {
  f.E.assertState(f.s);
  const before = structuredClone(f.s), stats = f.E.matchStats(f.s);
  f.s = f.E.restoreGame(JSON.parse(JSON.stringify(f.s)));
  assert.deepEqual(f.s, before, 'restoring a valid save must not replay or repair it');
  assert.deepEqual(f.E.matchStats(f.s), stats, 'reload cannot duplicate performance');
  return f;
}
function step(f, method, ...args) {
  f.E[method](f.s, ...args);
  return reload(f);
}
function choose(f, value) {
  const choice = f.E.equipmentChoice(f.s);
  assert(choice, 'Expected an equipment choice');
  if (choice.type === 'ultimate') {
    assert(['target', 'parity', 'trait'].includes(choice.mode));
    assert(choice.options.some(o => o.value === value), 'choice value must be publicly offered');
  }
  return step(f, 'grantEquipment', value);
}
function settleChoices(f, preferred = []) {
  const seen = [];
  for (let guard = 0; f.E.equipmentChoice(f.s); guard++) {
    assert(guard < 12, 'equipment choice chain must terminate');
    const choice = structuredClone(f.E.equipmentChoice(f.s));
    const wanted = preferred.find(v => choice.options?.some(o => o.value === v) || choice.targets?.includes(v));
    const value = wanted ?? f.E.aiEquipmentChoice(f.s);
    assert.notEqual(value, undefined, 'AI must provide a legal bounded choice');
    choose(f, value); seen.push({...choice, value});
  }
  return seen;
}
function lock(f, attacker = f.enemy, target = f.u) {
  assert.equal(f.s.phase, 'choose');
  assert.equal(f.E.equipmentChoice(f.s), null);
  const a = unit(f, attacker), b = unit(f, target), side = Number(a.uid[0]);
  // Like the existing combat fixtures, select the acting side to isolate rules;
  // all other battle state transitions use the public API.
  f.s.turn = side;
  step(f, 'lock', f.s.players[side].board.indexOf(a), f.s.players[1 - side].board.indexOf(b));
}
function attack(f, die = 6) {
  step(f, 'rollAttack', die);
  if (f.s.phase === 'kalistel') step(f, 'acceptAttack');
}
function duel(f, attacker = f.enemy, target = f.u, atk = 6, defense = [6], {choices = true} = {}) {
  lock(f, attacker, target);
  if (choices) settleChoices(f);
  attack(f, atk);
  if (choices) settleChoices(f);
  for (const die of defense) {
    assert.equal(f.s.phase, 'defense', 'each requested defense die must be legal');
    step(f, 'rollDefense', die);
  }
  assert.equal(f.s.phase, 'result');
  return f.s.duel;
}
function support(f, donor, recipient, kind) {
  const c = f.E.card(unit(f, donor)), i = c.atk.indexOf(traitFaces[kind]);
  assert(i >= 0, c.name + ' lacks test face ' + kind);
  lock(f, donor, Number(donor[0]) === f.side ? f.enemy : f.u); settleChoices(f); attack(f, 6 - i);
  step(f, traitMethods[kind], recipient);
  assert.equal(f.s.phase, 'result');
}
function replacements(f, {choices = true} = {}) {
  for (let guard = 0; f.s.phase === 'replace'; guard++) {
    assert(guard < 12, 'replacement sequence must terminate');
    if (f.E.equipmentChoice(f.s)) {
      if (!choices) return;
      settleChoices(f);
    }
    const p = f.s.players[f.s.replacing], slot = p.board.findIndex((u, i) => !u && p.reserve.some(v => f.E.card(v).positions.includes(i + 1)));
    assert(slot >= 0);
    const u = p.reserve.find(v => f.E.card(v).positions.includes(slot + 1));
    step(f, 'deploy', f.s.replacing, u.uid, slot);
    if (choices) settleChoices(f);
  }
  if (choices) settleChoices(f);
}
function next(f, {choices = true, deploy = true} = {}) {
  if (choices) settleChoices(f);
  assert.equal(f.E.equipmentChoice(f.s), null, 'resolve pending choices before advancing');
  step(f, 'next');
  if (deploy) replacements(f, {choices});
}
function killAlly(f, keep = [f.u, f.ally, f.helper]) {
  const victim = board(f).findLast(u => !keep.includes(u.uid));
  assert(victim, 'fixture needs an expendable active ally');
  duel(f, f.enemy, victim.uid, 5);
  assert(f.s.players[f.side].dead.some(u => u.uid === victim.uid), 'real definitive death required');
  return victim.uid;
}
function outnumber(f, count = 4, keep = [f.u, f.ally, f.helper]) {
  while (board(f).length > count) {
    killAlly(f, keep); next(f);
  }
  assert(board(f).length < board(f, 1 - f.side).length);
  return f;
}
function twoSupports(f, kinds = ['luck', 'mana']) {
  support(f, f.u, f.ally, kinds[0]); next(f);
  support(f, f.u, f.ally2, kinds[1]);
}
function assertFormula(f, attackBonus = 0, defenseBonus = 0, formula = f.s.duel.formula) {
  assert(formula, 'real resolved numeric duel required');
  assert.equal(formula.ultimateAttack || 0, attackBonus, 'ultimate ATK component');
  assert.equal(formula.ultimateDefense || 0, defenseBonus, 'ultimate DEF component');
  const atk = ['baseAttack', 'weapon', 'element', 'faction', 'buff', 'barrier', 'arenaAttack', 'equipmentAttack', 'captainAttack', 'ultimateAttack'];
  const def = ['baseDefense', 'race', 'arenaDefense', 'ward', 'equipmentDefense', 'captainDefense', 'ultimateDefense'];
  assert.equal(formula.attack, Math.max(0, atk.reduce((n, k) => n + (formula[k] || 0), 0)));
  assert.equal(formula.defense, Math.max(0, def.reduce((n, k) => n + (formula[k] || 0), 0)));
}
function rejected(f, mutate) {
  const bad = structuredClone(f.s); mutate(bad);
  const before = structuredClone(bad);
  assert.throws(() => f.E.restoreGame(bad));
  assert.deepEqual(bad, before, 'invalid snapshots must not be silently repaired');
}
const magicEnemy = (data, selected) => { selected[4].element = 'ELECTRO'; selected[4].magic = [6, 5, 4, 3]; };
const magicCarrier = (data, selected) => { selected[0].element = 'ELECTRO'; selected[0].magic = [6, 5, 4, 3]; };

async function nativeMatch(id, {equipped = true, seed = 'NATIVE-ULTIMATE-' + id} = {}) {
  const data = await catalogue, E = createEngine(data), w = definition(id);
  const carrier = data.cards.find(c => Q.compatible(w, c)); assert(carrier, id);
  const ids = require('./castlevania-kalistar-combat.cjs').deck(E, [carrier.id]);
  const loadouts = [slots(), slots()];
  if (equipped) for (const l of loadouts) l.relic[carrier.characterId] = id;
  let s = E.newGame(ids, ids, {mode: 'local', seed, kalistel: true, equipment: loadouts});
  for (const side of [0, 1]) {
    E.autoDeploy(s, side);
    const p = s.players[side], u = all(p).find(u => u.cardId === carrier.id);
    if (!p.board.includes(u)) {
      const slot = carrier.positions[0] - 1;
      E.recall(s, side, slot); E.deploy(s, side, u.uid, slot);
    }
  }
  E.start(s);
  let actions = 0, consecutiveDefense = 0;
  const check = () => {
    const before = JSON.stringify(s);
    s = E.restoreGame(JSON.parse(before));
    assert.equal(JSON.stringify(s), before, id + ': native reload is not idempotent');
  };
  check();
  while (s.phase !== 'over') {
    assert(++actions <= 4000, id + ': full match exceeded bounded action budget at ' + s.phase);
    const choice = E.equipmentChoice(s);
    if (choice) {
      const value = E.aiEquipmentChoice(s);
      assert.notEqual(value, undefined, id + ': pending choice has no legal AI resolution');
      E.grantEquipment(s, value);
    } else if (s.phase === 'choose') {
      const pair = E.aiChoice(s); assert(pair, id + ': no legal duel'); E.lock(s, ...pair);
    } else if (s.phase === 'attack') E.rollAttack(s);
    else if (s.phase === 'kalistel') {
      if (E.aiUseKalistel(s)) E.useKalistel(s); else E.acceptAttack(s);
    } else if (s.phase === 'defense') {
      assert(++consecutiveDefense < 80, id + ': possible defense loop'); E.rollDefense(s);
    } else if (s.phase === 'result') E.next(s);
    else if (s.phase === 'replace') {
      const side = s.replacing, p = s.players[side];
      const slot = p.board.findIndex((u, i) => !u && p.reserve.some(v => E.card(v).positions.includes(i + 1)));
      assert(slot >= 0, id + ': no possible replacement');
      E.deploy(s, side, p.reserve.find(u => E.card(u).positions.includes(slot + 1)).uid, slot);
    } else {
      const m = {heart: ['grantReraise', 'aiReraiseChoice'], guard: ['grantGuard', 'aiGuardChoice'],
        clover: ['grantClover', 'aiCloverChoice'], potion: ['grantPotion', 'aiPotionChoice'], physical: ['grantPhysical', 'aiPhysicalChoice']}[s.phase];
      assert(m, id + ': unhandled live phase ' + s.phase); E[m[0]](s, E[m[1]](s));
    }
    if (s.phase !== 'defense') consecutiveDefense = 0;
    check();
  }
  assert.equal(E.equipmentChoice(s), null, id + ': no blocking choice after match end');
  const records = Object.values(s.equipment?.rituals?.records || {}).filter(r => r.weaponId === id);
  for (const p of s.players) for (const u of all(p)) {
    assert(!E.equipmentViews(s, u).some(v => v.weapon?.id === id && v.active), id + ': stale active overlay at match end');
  }
  return {id, equipped, seed, carrierId: carrier.id, actions, exchanges: s.match.events.length,
    winner: s.winner, armed: records.filter(r => r.armedRound || r.spentRound).length,
    spent: records.filter(r => r.status === 'spent').length,
    uses: (s.equipment?.rituals?.uses || []).filter(r => r.weaponId === id).length,
    grants: (s.match.ultimateGrants || []).filter(r => r.weaponId === id).length};
}

module.exports = {IDS, slots, all, definition, unit, board, record, grants, uses, row,
  fixture, reload, step, choose, settleChoices, lock, attack, duel, support,
  replacements, next, killAlly, outnumber, twoSupports, assertFormula, rejected,
  magicEnemy, magicCarrier, nativeMatch};
