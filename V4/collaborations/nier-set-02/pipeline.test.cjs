'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const M = require('./model.cjs'), set = require('./set.json');
const { buildCatalog } = require('../../atelier/game-catalog.cjs'), { createEngine } = require('../../site/engine.js');
const { publicationFixture } = require('./test-fixture.cjs');
const profiles = () => set.cards.map(s => M.profile(s, D));
async function game() {
  return buildCatalog({ published: [...D.catalogue().cards.filter(c => c.kind === 'created' && !set.cards.some(s => s.id === c.id)),
    ...profiles().map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' }))] });
}
test('six unique reserved IDs, exact keys, role bounds, native bank and ordered positions', () => {
  M.validateSet(set); profiles().forEach((p, i) => M.validateProfile(p, set.cards[i]));
  const bank = L.read(path.join(L.ROOT, 'V4/atelier/designer-assets/manifest.json')), opts = D.options();
  for (const c of set.cards) {
    assert.ok(opts.elements.some(e => e.value === c.element)); assert.ok(bank.weapons[c.weapon]);
    assert.ok(bank.races[c.race] || D.raceComponents()[c.race]);
    const prior = D.catalogue().cards.find(p => p.id === c.id);
    if (prior) assert.equal(prior.profile.visual_revision, 'V4-nier-set-02');
  }
  assert.deepEqual(profiles().map(c => c.positions), [[4, 3], [2, 1], [5], [3, 4], [1, 2], [4]]);
  for (const [i, c] of set.cards.entries()) for (const side of ['atk', 'defense']) for (let face = 0; face < 6; face++) {
    const bad = structuredClone(set); bad.cards[i][side][face] = require('../../../V3/donnees/regles_demo.json').roleBounds[c.role][side][face] + 1;
    assert.throws(() => M.validateSet(bad));
  }
});
test('effect restrictions, modes and modest Pascal support budget fail closed', () => {
  const mutations = [s => s.cards[2].atk[0] = 180, s => s.cards[2].atk[5] = 21, s => s.cards[2].defense[1] = 'dodge',
    s => s.cards[2].barriers = [6, 5], s => s.cards[2].magic = [6], s => s.cards[2].role = 3,
    s => s.cards[0].atk[2] = 'guard', s => s.cards[3].atk[2] = 'revive', s => s.cards[0].defense[2] = 'shield_magic',
    s => s.cards[0].magic = [0], s => s.cards[0].barriers = [4], s => s.cards[0].magic = [6, 6],
    s => s.cards[1].atk[3] = 'death', s => s.cards[0].element = 'SANGO', s => s.cards[2].weapon = 'Grimoire',
    s => s.cards[1].positions = [1, 2], s => s.cards[1].id = s.cards[0].id];
  for (const mutate of mutations) { const bad = structuredClone(set); mutate(bad); assert.throws(() => M.validateSet(bad)); }
  const pascal = profiles()[2]; assert.equal(pascal.canHeal, true); assert.equal(pascal.canGuard, true);
  assert.equal(pascal.atk.filter(Number.isFinite).reduce((a, b) => a + b, 0) / 6, 3);
  assert.deepEqual(set.cards[1].magic, []); assert.deepEqual(set.cards[4].magic, []);
});
test('approved 2B/9S outputs and corrected typography dependencies remain byte-identical', () => {
  require('./preservation.cjs').createGuard(L, D, __dirname).dependencies();
  for (const id of ['45911726', '42138845']) {
    const entry = D.catalogue().cards.find(c => c.id === id);
    assert.deepEqual(entry.profile, L.read(path.join(L.ROOT, 'V4/creations', id, 'profile.json')));
  }
});
test('exact packed NieR banner and installed Android/Cyborg components, no regenerated asset', async () => {
  const a = require('./assets.cjs').createAssets(L, D); await a.verify();
  const layers = [{ name: 'FACTION - Chroma' }, { name: 'ARME - Tome' }, { name: 'RACE - ROBOT' }];
  const prior = structuredClone(layers.slice(1)); a.banner(layers);
  assert.deepEqual(layers.slice(1), prior); assert.equal(layers[0].input, a.flag);
  assert.deepEqual(Object.fromEntries(['left', 'top', 'width', 'height'].map(k => [k, layers[0][k]])), require('./assets.cjs').FLAG);
  assert.ok(a.inputs(set).some(f => f.endsWith('race-CYBORG.png')));
  assert.ok(a.inputs(set).some(f => f.endsWith('race-ANDROID.png')));
});
test('native typography verifier rejects old fonts and TITLE rescaling', () => {
  const T = require('../nier-pilot-01/typography.cjs');
  const n = { typography: {}, layers: [] };
  for (const [name, size, capitalization] of [['NOM', 10, 'TextCase.NORMAL'], ['TITLE', 7.68, 'TextCase.ALLCAPS']]) {
    n.typography[name] = { font: 'TimesNewRomanPSMT', sizePt: size, capitalization, tracking: 0, fauxBold: false, fauxItalic: false };
    n.layers.push({ name, font: 'TimesNewRomanPSMT', sizePt: size, ink: [0, 0, 150, 30] });
  }
  T.verify(n);
  for (const mutate of [n => n.typography.NOM.font = 'Augustus', n => n.typography.TITLE.sizePt = 10, n => n.typography.TITLE.capitalization = 'TextCase.NORMAL']) {
    const bad = structuredClone(n); mutate(bad); assert.throws(() => T.verify(bad));
  }
});
test('all six real text previews fit the inherited native description layout in memory', async () => {
  const T = require('../nier-pilot-01/typography.cjs'), R = require('../../atelier/designer-render.cjs');
  for (const p of profiles()) {
    const layers = await T.preview(p, R); assert.ok(layers.length > 4);
    for (const layer of layers) {
      const size = await L.sharp(layer.input).metadata();
      assert.ok(layer.left >= 0 && layer.top >= 0 && layer.left + size.width <= 897 && layer.top + size.height <= 1497);
    }
  }
});
test('in-memory game preserves pilot gameplay, shared NieR faction and independent races', async () => {
  const data = await game(); M.validateGame(data, set, createEngine);
  for (const spec of require('../nier-pilot-01/set.json').cards) {
    const c = data.cards.find(c => c.id === spec.id);
    for (const field of [...M.PRINTED, 'role']) assert.deepEqual(c[field], spec[field]);
  }
  const e = createEngine(data), units = set.cards.map(c => ({ cardId: c.id }));
  const board = [units[2], units[3], units[4], units[0], units[1]];
  assert.equal(e.synergy({ board }, units[2], 'race'), 20);
  assert.equal(e.synergy({ board }, units[0], 'race'), 0);
  assert.equal(e.synergy({ board }, units[1], 'race'), 0);
});
function testDeck(data, e) {
  const ids = [...set.cards.map(c => c.id), '45911726', '42138845'];
  const extra = data.decks.player.filter(id => !ids.includes(id));
  for (let i = 0; i < extra.length; i++) for (let j = i + 1; j < extra.length; j++) {
    const deck = [...ids, extra[i], extra[j]]; if (!e.validatePlayableDeck(deck).length) return deck;
  }
  assert.fail('Deck mixte de test introuvable');
}
function step(e, s) {
  if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
  else if (s.phase === 'attack') e.rollAttack(s);
  else if (s.phase === 'kalistel') { if (e.aiUseKalistel(s)) e.useKalistel(s); else e.acceptAttack(s); }
  else if (s.phase === 'defense') e.rollDefense(s);
  else if (s.phase === 'result') e.next(s);
  else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
  else { const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase]; assert.ok(suffix, s.phase); e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s)); }
}
test('actual engine completes mixed matches and restores every transition with all six newcomers', async () => {
  const data = await game(), e = createEngine(data), deck = testDeck(data, e), seen = new Set(); let decisions = 0;
  for (let seed = 0; seed < 6; seed++) {
    const ordered = [set.cards[seed].id, ...deck.filter(id => id !== set.cards[seed].id)];
    let s = e.newGame(ordered, [...ordered].reverse(), { seed: 'NIER-SET02-' + seed, deckCoverage: 2 });
    e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    for (let i = 0; i < 5000 && s.phase !== 'over'; i++) {
      s.players.forEach(p => p.board.filter(Boolean).forEach(u => seen.add(u.cardId)));
      if (s.phase === 'kalistel') decisions++;
      step(e, s); s = e.restoreGame(JSON.parse(JSON.stringify(s)));
    }
    assert.equal(s.phase, 'over'); assert.ok(s.kalistel.spent.length <= 4); assert.equal(e.matchStats(s).complete, true);
  }
  assert.ok(decisions > 0); set.cards.forEach(c => assert.ok(seen.has(c.id), c.key + ' jamais deploye'));
});
test('Pascal D6 grants preventive Reraise; five support faces target allies, no extra attack or stacking', async () => {
  const data = await game(), e = createEngine(data), deck = testDeck(data, e);
  for (const [die, phase, suffix, token, value] of [[6, 'heart', 'Reraise', 'reraise', 1], [5, 'guard', 'Guard', 'ward', 60],
    [4, 'clover', 'Clover', 'luck', 1], [3, 'potion', 'Potion', 'mana', 60], [2, 'physical', 'Physical', 'physical', 60]]) {
    let s = e.newGame(deck, deck, { seed: 'PASCAL', deckCoverage: 2 }); e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    const slot = s.players[0].board.findIndex(u => u.cardId === set.cards[2].id), recipient = s.players[0].board[0];
    e.lock(s, slot, 0); e.rollAttack(s, die); assert.equal(s.phase, 'kalistel');
    assert.equal(recipient[token], 0); e.acceptAttack(s); assert.equal(s.phase, phase); s = e.restoreGame(s);
    assert.throws(() => e['grant' + suffix](s, s.players[0].reserve[0].uid));
    assert.throws(() => e['grant' + suffix](s, s.players[1].board[0].uid));
    // Existing charge is renewed, never doubled, without displacing another category.
    const ally = s.players[0].board[0]; ally[token] = value;
    const other = token === 'reraise' ? 'luck' : 'reraise'; ally[other] = 1;
    e['grant' + suffix](s, ally.uid); s = e.restoreGame(s);
    assert.equal(s.phase, 'result'); assert.equal(s.players[0].board[0][token], value); assert.equal(s.players[0].board[0][other], 1);
    const event = s.match.events.at(-1); assert.equal(event.attack, 0); assert.equal(event.defense, 0); assert.equal(event.kill, false);
    assert.equal(event.support, token); assert.equal(event.refresh, true);
  }
});
test('Pascal grants and renews a consumed heart, preventing one elimination without a kill', async () => {
  const data = await game(), e = createEngine(data), deck = testDeck(data, e);
  let s = e.newGame(deck, deck, { seed: 'PASCAL-HEART', deckCoverage: 2 }); e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
  const pascalSlot = s.players[0].board.findIndex(u => u.cardId === set.cards[2].id);
  const targetSlot = s.players[0].board.findIndex(u => u.cardId === set.cards[1].id), uid = s.players[0].board[targetSlot].uid;
  function grant() {
    e.lock(s, pascalSlot, 0); e.rollAttack(s, 6); if (s.phase === 'kalistel') e.acceptAttack(s);
    e.grantReraise(s, uid); s = e.restoreGame(s);
  }
  grant(); assert.equal(s.players[0].board[targetSlot].reraise, 1); assert.equal(s.match.events.at(-1).refresh, false);
  e.next(s);
  const attacker = s.players[1].board.findIndex(u => u.cardId === set.cards[1].id);
  e.lock(s, attacker, targetSlot); e.rollAttack(s, 6); if (s.phase === 'kalistel') e.acceptAttack(s);
  e.rollDefense(s, 1); s = e.restoreGame(s);
  assert.equal(s.phase, 'result'); assert.equal(s.match.events.at(-1).reraise, true); assert.equal(s.match.events.at(-1).kill, false);
  assert.equal(s.players[0].board[targetSlot].uid, uid); assert.equal(s.players[0].board[targetSlot].reraise, 0);
  e.next(s); grant(); assert.equal(s.players[0].board[targetSlot].reraise, 1);
  assert.equal(e.matchStats(s).units.find(u => u.uid === s.players[0].board[pascalSlot].uid).hearts, 2);
});
test('publication is additive, idempotent and entirely memory-only', async () => {
  const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE), frozen = f.mem.readFileSync(f.guard.snapshotFile);
  assert.equal((await f.publisher.preflight()).added, 6); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
  const result = await f.publisher.publish(); assert.equal(result.added, 6); assert.deepEqual(result.arenas, []); assert.deepEqual(result.presets, []);
  for (const c of f.old) assert.deepEqual(f.read(f.D.CATALOGUE).cards.find(n => n.id === c.id), c);
  f.guard.assertExisting(); assert.deepEqual(f.mem.readFileSync(f.guard.snapshotFile), frozen);
  const published = f.mem.readFileSync(f.D.CATALOGUE);
  assert.equal((await f.publisher.publish()).mode, 'unchanged'); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), published);
  assert.equal(f.mem.existsSync(f.lock), false);
});
test('publication refuses changes to previous profiles, output bytes, inventory and approved pilot', async () => {
  for (const mutate of [
    f => { const c = f.read(f.D.CATALOGUE); c.cards.find(c => c.kind === 'created').profile.name = 'MUTATED'; f.put(f.D.CATALOGUE, c); },
    f => f.seed(path.join(f.L.ROOT, 'V4/creations', f.old[0].id, 'card.psd'), 'MUTATED'),
    f => f.seed(path.join(f.L.ROOT, 'V4/creations', f.old[0].id, 'extra.png'), 'UNEXPECTED'),
    f => f.seed(path.join(f.L.ROOT, 'V4/creations/45911726/card.png'), 'MUTATED PILOT')]) {
    const f = publicationFixture(); mutate(f); const before = f.mem.readFileSync(f.D.CATALOGUE);
    await assert.rejects(() => f.publisher.publish()); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
    assert.equal(f.mem.existsSync(f.lock), false);
    assert.throws(() => f.guard.freeze(), 'Un nouveau prepare ne masque jamais la mutation.');
  }
});
test('stale art, preparation, profile, proofs and busy lock never commit a catalogue', async () => {
  for (const mutate of [
    f => f.seed(path.join(f.home, 'art/emil.png'), 'CHANGED ART'),
    f => { const file = path.join(f.source('emil'), 'preparation.json'), p = f.read(file); p.extra = true; f.put(file, p); },
    f => { const file = path.join(f.source('emil'), 'profile.json'), p = f.read(file); p.atk[0]++; f.put(file, p); },
    f => { const file = path.join(f.source('emil'), 'verification.json'), p = f.read(file); p.roundtrip.changed = 1; f.put(file, p); },
    f => f.seed(f.lock, 'ANOTHER OWNER')]) {
    const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE); mutate(f);
    await assert.rejects(() => f.publisher.publish()); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
  }
});
test('mid-staging preservation conflict aborts before commit and retains external change', async () => {
  const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE); let changed = false;
  const oldFile = path.join(f.L.ROOT, 'V4/creations', f.old[0].id, 'card.png');
  f.fault(op => { if (!changed && op.op === 'copy') { changed = true; f.seed(oldFile, 'EXTERNAL CHANGE'); } });
  await assert.rejects(() => f.publisher.publish(), /Creation existante modifiee/);
  assert.ok(changed); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
  assert.equal(f.mem.readFileSync(oldFile, 'utf8'), 'EXTERNAL CHANGE'); assert.equal(f.mem.existsSync(f.lock), false);
});
test('factory recovers its compatible orphan directories after interrupted commit', async () => {
  const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE); let failed = false;
  f.fault(op => { if (!failed && op.op === 'rename' && op.to === f.D.CATALOGUE) { failed = true; throw Error('SIMULATED COMMIT FAILURE'); } });
  await assert.rejects(() => f.publisher.publish(), /SIMULATED COMMIT FAILURE/);
  assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before); f.fault(() => {});
  assert.equal((await f.publisher.publish()).added, 6); f.guard.assertExisting();
});
