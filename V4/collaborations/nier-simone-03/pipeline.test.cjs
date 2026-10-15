'use strict';
const { test } = require('node:test'), assert = require('node:assert/strict'), path = require('node:path');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const M = require('./model.cjs'), set = require('./set.json');
const { publicationFixture, builderFixture } = require('./test-fixture.cjs');

test('Simone has the exact Robot/Instrument/P4/Hemato identity and bounded magical profile', () => {
  M.validateSet(set); const p = M.profile(set.cards[0], D); M.validateProfile(p, set.cards[0]);
  assert.deepEqual(p.positions, [4]); assert.deepEqual(p.magic, [6, 5, 4, 2]); assert.deepEqual(p.barriers, [5, 3]);
  assert.equal(p.canHeal, false); assert.equal(p.canGuard, false);
  const bank = L.read(path.join(L.ROOT, 'V4/atelier/designer-assets/manifest.json'));
  assert.ok(bank.races.ROBOT && bank.weapons.Instrument && bank.elements.HEMATO);
  const bounds = require('../../../V3/donnees/regles_demo.json').roleBounds[4];
  for (const side of ['atk', 'defense']) for (let i = 0; i < 6; i++) {
    const bad = structuredClone(set); bad.cards[0][side][i] = bounds[side][i] + 1;
    assert.throws(() => M.validateSet(bad));
  }
});

test('role, support, numerical modes and generation budget reject invalid changes', () => {
  for (const mutate of [c => c.role = 5, c => c.positions = [4, 5], c => c.weapon = 'Tome', c => c.race = 'ANDROID',
    c => c.atk[3] = 'revive', c => c.atk[3] = 'guard', c => c.atk[3] = 'death', c => c.atk[5] = 'retry',
    c => c.magic = [6, 5, 3], c => c.magic = [6, 6, 5], c => c.magic = [7, 6, 5],
    c => c.barriers = [6, 5, 4], c => c.barriers = [], c => c.defense[3] = 'dodge', c => c.id = '45911726']) {
    const bad = structuredClone(set); mutate(bad.cards[0]); assert.throws(() => M.validateSet(bad));
  }
});

test('in-memory catalogue retains existing NieR profiles and allows parent-owned arenas', async () => {
  const { buildCatalog } = require('../../atelier/game-catalog.cjs'), { createEngine } = require('../../site/engine.js');
  const old = D.catalogue().cards.filter(c => c.kind === 'created' && c.id !== M.ID);
  const p = M.profile(set.cards[0], D), data = await buildCatalog({ published: [...old, { id: p.id, profile: p, pngUrl: '/media/created/' + p.id + '.png' }] });
  M.validateGame(data, set, createEngine);
  for (const c of old.filter(c => c.profile.collaboration === 'NieR')) {
    const after = data.cards.find(p => p.id === c.id);
    for (const field of [...M.PRINTED, 'role']) assert.deepEqual(after[field], c.profile[field]);
  }
  assert.equal(data.cards.filter(c => c.characterId === 'simone-nier').length, 1);
});

test('actual P4 profile completes matches and restores every transition without special rule changes', async () => {
  const builder = require('./build.cjs').createBuilder(), data = await builder.game();
  const e = require('../../site/engine.js').createEngine(data);
  let deck;
  for (let i = 0; i < data.decks.player.length; i++) {
    const candidate = [M.ID, ...data.decks.player.filter((id, index) => index !== i)];
    if (!e.validatePlayableDeck(candidate).length) { deck = candidate; break; }
  }
  assert.ok(deck, 'Deck mixte P1-P5 introuvable.');
  let deployed = false, attacks = 0;
  for (let seed = 0; seed < 3; seed++) {
    let state = e.newGame(deck, [...deck].reverse(), { seed: 'SIMONE-03-' + seed, deckCoverage: 2 });
    e.autoDeploy(state, 0); e.autoDeploy(state, 1); e.start(state);
    for (let i = 0; i < 5000 && state.phase !== 'over'; i++) {
      if (state.players.some(p => p.board.some(u => u?.cardId === M.ID))) deployed = true;
      if (state.phase === 'choose') e.lock(state, ...e.aiChoice(state));
      else if (state.phase === 'attack') { e.rollAttack(state); attacks++; }
      else if (state.phase === 'kalistel') { if (e.aiUseKalistel(state)) e.useKalistel(state); else e.acceptAttack(state); }
      else if (state.phase === 'defense') e.rollDefense(state);
      else if (state.phase === 'result') e.next(state);
      else if (state.phase === 'replace') e.autoDeploy(state, state.replacing);
      else {
        const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[state.phase];
        assert.ok(suffix, state.phase); e['grant' + suffix](state, e['ai' + suffix + 'Choice'](state));
      }
      state = e.restoreGame(JSON.parse(JSON.stringify(state)));
    }
    assert.equal(state.phase, 'over'); assert.equal(e.matchStats(state).complete, true);
    assert.ok(state.kalistel.spent.length <= 4);
  }
  assert.ok(deployed && attacks > 0);
});

test('text fits and uses the exact inherited NieR typography, components and flag', async () => {
  const R = require('../../atelier/designer-render.cjs'), T = require('../nier-pilot-01/typography.cjs');
  const layers = await T.preview(M.donor(set.cards[0], D), R);
  for (const l of layers) {
    const meta = await L.sharp(l.input).metadata();
    assert.ok(l.left >= 0 && l.top >= 0 && l.left + meta.width <= 897 && l.top + meta.height <= 1497);
  }
  await require('./assets.cjs').createAssets(L, D).verify();
  assert.equal(require('./assets.cjs').createAssets, require('../nier-set-02/assets.cjs').createAssets);
  assert.equal(require('./preservation.cjs').createGuard, require('../nier-set-02/preservation.cjs').createGuard);
});

test('captured current dependencies and all existing creations remain intact', () => {
  const guard = require('./preservation.cjs').createGuard(L, D, __dirname);
  const snapshot = guard.assertExisting(); assert.ok(snapshot.entries.some(c => c.id === '42650442'));
  assert.ok(snapshot.files['V4/creations/42650442/card.psd']);
  assert.ok(!snapshot.entries.some(c => c.id === M.ID));
});

test('preparation is memory-only, preserves prior proof and binds the exact art and all sources', async () => {
  const f = builderFixture(), before = f.mem.readFileSync(f.D.CATALOGUE);
  assert.ok(!f.D.catalogue().cards.some(c => c.id === M.ID), 'La fixture doit simuler le catalogue avant Simone, meme apres publication.');
  assert.ok(!f.builder.sources().some(file => /(?:pipeline\.test|test-fixture)\.cjs$/.test(file)));
  const result = await f.builder.prepare(); assert.deepEqual(result.prepared, ['simone']);
  assert.equal(result.photoshopRun, false); assert.deepEqual(f.commands, []);
  assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before); f.guard.assertExisting();
  assert.ok(f.mem.readdirSync(f.source()).some(n => n.startsWith('verification.stale-')));
  const prep = await f.builder.prepared(); assert.ok(prep.inputs['V4/collaborations/nier-simone-03/art/simone.png']);
  f.seed(path.join(f.home, 'art/simone.png'), 'OTHER ART');
  await assert.rejects(() => f.builder.prepared(), /Preparation obsolete/);
  await assert.rejects(() => f.publisher.publish()); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
});

test('missing image, conflicting model ID and foreign lock fail without native calls', async () => {
  const missing = builderFixture(); missing.mem.unlinkSync(path.join(missing.home, 'art/simone.png'));
  await assert.rejects(() => missing.builder.prepare(), /Illustration parent manquante/);
  assert.deepEqual(missing.commands, []); assert.equal(missing.mem.existsSync(missing.lock), false);
  const f = builderFixture(); f.seed(f.lock, 'ANOTHER OWNER');
  await assert.rejects(() => f.builder.prepare()); assert.equal(f.mem.readFileSync(f.lock, 'utf8'), 'ANOTHER OWNER');
  const collision = builderFixture(); collision.mem.mkdirSync(collision.target(M.ID));
  await assert.rejects(() => collision.builder.check(), /ID deja utilise/);
});

test('single-card publisher is additive and idempotent in isolated memory', async () => {
  const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE);
  assert.equal((await f.publisher.preflight()).added, 1); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
  const result = await f.publisher.publish(); assert.equal(result.added, 1); assert.deepEqual(result.arenas, []);
  assert.deepEqual(result.presets, []); f.guard.assertExisting();
  assert.equal(f.read(f.D.CATALOGUE).cards.find(c => c.id === M.ID).publicationSource, 'V4/collaborations/nier-simone-03');
  assert.equal((await f.publisher.publish()).mode, 'unchanged');
  assert.equal(f.mem.existsSync(f.lock), false);
});

test('changed existing bytes, preparation, art or verification can never authorize publication', async () => {
  for (const mutate of [
    f => f.seed(path.join(f.L.ROOT, 'V4/creations/42650442/card.png'), 'OTHER PASCAL'),
    f => f.seed(path.join(f.home, 'art/simone.png'), 'OTHER ART'),
    f => { const p = f.read(path.join(f.source(), 'profile.json')); p.atk[0]++; f.put(path.join(f.source(), 'profile.json'), p); },
    f => { const v = f.read(path.join(f.source(), 'verification.json')); v.roundtrip.changed = 1; f.put(path.join(f.source(), 'verification.json'), v); },
    f => f.put(path.join(f.source(), 'preparation.json'), { replaced: true })]) {
    const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE); mutate(f);
    await assert.rejects(() => f.publisher.publish()); assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
    assert.equal(f.mem.existsSync(f.lock), false);
  }
});

test('publication detects mid-staging preservation conflicts and recovers compatible orphan output', async () => {
  const f = publicationFixture(), before = f.mem.readFileSync(f.D.CATALOGUE); let injected = false;
  f.fault(op => {
    if (!injected && op.op === 'copy') { injected = true; f.seed(path.join(f.L.ROOT, 'V4/creations/42650442/card.png'), 'EXTERNAL EDIT'); }
  });
  await assert.rejects(() => f.publisher.publish(), /Creation existante modifiee/);
  assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), before);
  const retry = publicationFixture(); let failed = false;
  retry.fault(op => { if (!failed && op.op === 'rename' && op.to === retry.D.CATALOGUE) { failed = true; throw Error('INTERRUPTED COMMIT'); } });
  await assert.rejects(() => retry.publisher.publish(), /INTERRUPTED COMMIT/);
  retry.fault(() => {}); assert.equal((await retry.publisher.publish()).added, 1); retry.guard.assertExisting();
});

test('CLI rejects every key outside this independent lot', async () => {
  const main = require('./build.cjs').main;
  await assert.rejects(() => main(['prepare', 'pascal']));
  await assert.rejects(() => main(['publish']));
  assert.equal(await main(['check', 'simone'], { check: async () => 'CHECK ONLY' }), 'CHECK ONLY');
});
