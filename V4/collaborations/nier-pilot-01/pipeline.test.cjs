'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const M = require('./model.cjs'), set = require('./set.json'), D = require('../../atelier/designer-core.cjs');
const { buildCatalog } = require('../../atelier/game-catalog.cjs'), { createEngine } = require('../../site/engine.js');
const { fixture } = require('../ff8-set-01/test-fixture.cjs');
const profiles = () => set.cards.map(s => M.profile(s, D));
const published = profiles().map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' }));
const prior = () => D.catalogue().cards.filter(c => c.kind === 'created' && !set.cards.some(s => s.id === c.id));
async function game() { return buildCatalog({ published: [...prior(), ...published] }); }
test('exact user contract, bounded stats, short French texts and Support P5', () => {
  M.validateSet(set); const p = profiles(); p.forEach((c, i) => M.validateProfile(c, set.cards[i]));
  assert.deepEqual(p.map(c => [c.weapon, c.element, c.positions, c.role, c.canHeal]), [['Katana', 'LUXO', [2], 2, false], ['Lance', 'ELECTRO', [3, 5], 5, true]]);
  assert.deepEqual(p[0].atk, [294, 244, 194, 144, 94, 44]); assert.deepEqual(p[0].defense, [170, 140, 'dodge', 80, 'retry', 20]);
  assert.deepEqual(p[1].atk, [174, 144, 'revive', 'buff_atk', 'mana', 24]); assert.deepEqual(p[1].defense, [200, 165, 130, 95, 60, 25]);
  assert.deepEqual(p.map(c => [c.magic, c.barriers]), [[[], [6]], [[6], [5, 3]]]);
  const invalid = structuredClone(set); invalid.cards[1].atk[0] = 181; assert.throws(() => M.validateSet(invalid));
  invalid.cards[1].atk[0] = 174; invalid.cards[1].role = 3; assert.throws(() => M.validateSet(invalid));
});
test('NieR faction and Android race are isolated; no arena or full deck invented', async () => {
  const data = await game(); M.validateGame(data, set, createEngine);
  assert.ok(!data.arenas.some(a => a.id.startsWith('nier-'))); assert.ok(!data.decks.presets.some(p => p.id.startsWith('nier-')));
});
test('mixed playable decks finish with Kalistel decisions and valid restored states', async () => {
  const data = await game(), e = createEngine(data); let deck;
  for (let a = 0; a < 10 && !deck; a++) for (let b = 0; b < 10 && !deck; b++) if (a !== b) {
    const candidate = [...data.decks.player]; candidate[a] = set.cards[0].id; candidate[b] = set.cards[1].id;
    if (!e.validatePlayableDeck(candidate).length) deck = candidate;
  }
  assert.ok(deck, 'Deck mixte avec les deux cartes requis.');
  let decisions = 0;
  for (let seed = 0; seed < 3; seed++) {
    let s = e.newGame(deck, deck, { seed: 'NIER-' + seed, deckCoverage: 2 }); e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    for (let n = 0; n < 5000 && s.phase !== 'over'; n++) {
      if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
      else if (s.phase === 'attack') e.rollAttack(s);
      else if (s.phase === 'kalistel') { decisions++; if (e.aiUseKalistel(s)) e.useKalistel(s); else e.acceptAttack(s); }
      else if (s.phase === 'defense') e.rollDefense(s);
      else if (s.phase === 'result') e.next(s);
      else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
      else { const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase]; assert.ok(suffix, s.phase); e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s)); }
      s = e.restoreGame(s);
    }
    assert.equal(s.phase, 'over'); assert.ok(s.kalistel.spent.length <= 4);
  }
  assert.ok(decisions > 0);
});
function publicationFixture() {
  const f = fixture(prior()), home = path.join(f.L.ROOT, 'V4/collaborations/nier-pilot-01');
  f.put(path.join(home, 'set.json'), set);
  for (const [i, spec] of set.cards.entries()) {
    const dir = path.join(home, 'cards', spec.key), profile = profiles()[i];
    f.put(path.join(dir, 'profile.json'), profile); f.put(path.join(dir, 'card.png'), { format: 'png', width: 897, height: 1497 });
    f.seed(path.join(dir, 'card.psd'), 'IN-MEMORY NIER PSD'); f.put(path.join(dir, 'illustration.png'), { format: 'png', width: 1474, height: 1842 });
    f.put(path.join(dir, 'verification.json'), { passed: true, modelId: spec.id, referenceId: f.L.baseline().id,
      profileHash: require('../ff8-set-01/test-fixture.cjs').digest(f.mem.readFileSync(path.join(dir, 'profile.json'))),
      hashes: Object.fromEntries(['card.png', 'card.psd'].map(n => [n, require('../ff8-set-01/test-fixture.cjs').digest(f.mem.readFileSync(path.join(dir, n)))])),
      components: { fixedDifferences: 0, severePixels: 0 }, roundtrip: { changed: 0 }, barcode: { passed: true, expected: spec.id } });
  }
  const publisher = require('./publish.cjs').createPublisher({ L: f.L, D: f.D, home, buildCatalog, createEngine });
  return { ...f, home, publisher };
}
test('publication uses existing transactional factory and is additive/idempotent in memory only', async () => {
  const f = publicationFixture(), old = f.mem.readFileSync(f.D.CATALOGUE);
  assert.equal((await f.publisher.preflight()).added, 2); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), old);
  const result = await f.publisher.publish(); assert.equal(result.added, 2); assert.deepEqual(result.arenas, []); assert.deepEqual(result.presets, []);
  const prior = JSON.parse(old), next = f.read(f.D.CATALOGUE);
  for (const c of prior.cards) assert.deepEqual(next.cards.find(n => n.id === c.id), c);
  const jobs = next.cards.filter(c => c.profile.collaboration === 'NieR').map(c => c.creationJob); assert.equal(new Set(jobs).size, 2);
  assert.equal((await f.publisher.publish()).mode, 'unchanged');
});
test('publication rejects stale profile/native proofs and preserves the catalogue', async () => {
  const f = publicationFixture(), old = f.mem.readFileSync(f.D.CATALOGUE), proof = path.join(f.home, 'cards/9s/verification.json');
  const v = f.read(proof); v.roundtrip.changed = 1; f.put(proof, v);
  await assert.rejects(() => f.publisher.publish(), /Preuves natives/); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), old);
  assert.equal(f.mem.existsSync(f.lock), false);
});
test('Barret revision permits exactly race, retaining ID, stats, illustration metadata and UUID', () => {
  const { raceOnly } = require('../../revisions/2026-09-23-barret-cyborg/revise.cjs');
  const p = { ...require('../ff7-set-01/cards/barret/profile.json'), race: 'HUMAIN' }; raceOnly(p, { ...p, race: 'CYBORG' });
  for (const field of ['id', 'faction', 'name', 'atk', 'characterId']) assert.throws(() => raceOnly(p, { ...p, race: 'CYBORG', [field]: null }));
});
