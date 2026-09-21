'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const M = require('./model.cjs'), set = require('./set.json');
const D = require('../../atelier/designer-core.cjs');
const { buildCatalog } = require('../../atelier/game-catalog.cjs');
const { createEngine } = require('../../site/engine.js');
const { createBuilder, main: buildMain } = require('./build.cjs');
const { main: publishMain } = require('./publish.cjs');
const { fixture, builderFixture, priorPublications: prior, digest, uuid } = require('./test-fixture.cjs');
const weapons = require('../../../V3/donnees/armes.json');
const profiles = () => set.cards.map(c => M.profile(c, D, weapons));
const publications = () => profiles().map(profile => ({ id: profile.id, profile, pngUrl: '/media/created/' + profile.id + '.png' }));
const catalog = extra => buildCatalog({ published: [...prior(), ...extra] });
const realCatalogueBefore = fs.readFileSync(D.CATALOGUE);
test.after(() => assert.deepEqual(fs.readFileSync(D.CATALOGUE), realCatalogueBefore, 'Live catalogue modified by tests.'));

test('exact user weapons, elements and ordered positions; twelve reserved random IDs', () => {
  M.validateSet(set);
  // The refinement transaction alone moves the canonical set from PYRO to ELECTRO.
  const zellElement = set.cards.find(c => c.key === 'zell').element;
  assert.ok(['PYRO', 'ELECTRO'].includes(zellElement), 'Only the authorized Zell element transition is valid.');
  const expected = [
    ['squall', 'Ep\u00e9e longue', [2, 1], 'CRYO'], ['zell', 'Poing', [2], zellElement], ['linoa', 'Projectile', [5], 'LUXO'],
    ['irvine', 'Gun', [3, 4], 'GEO'], ['quistis', 'Fouet', [4], 'HYDRO'], ['selphie', 'Fl\u00e9au', [3, 2], 'AERO'],
    ['edea', 'B\u00e2ton', [4, 5], 'CRYO'], ['seifer', 'Ep\u00e9e longue', [1], 'PYRO'], ['ward', 'Lance', [1], 'NONE'],
    ['kiros', 'Dague', [2], 'NONE'], ['laguna', 'Gun', [3], 'ELECTRO'], ['ultimecia', 'B\u00e2ton', [5], 'NECRO']
  ];
  assert.deepEqual(set.cards.map(c => [c.key, c.weapon, c.positions, c.element]), expected);
  const occupied = new Set(fixture().D.catalogue().cards.map(c => c.id));
  for (const p of profiles()) { M.validateProfile(p, set.cards.find(c => c.id === p.id)); assert.ok(!occupied.has(p.id)); assert.equal(p.race, 'HUMAIN'); }
  assert.equal(profiles().find(p => p.characterId === 'squall-ff8').role, 2);
  assert.equal(profiles().find(p => p.characterId === 'selphie-ff8').role, 3);
  assert.ok(set.narrativeStatus.includes('Reinterpretations')); assert.match(set.cards.find(c => c.key === 'ward').description, /Centra/);
  assert.match(set.cards.find(c => c.key === 'linoa').description, /Angelo/);
});

test('Selphie uses a native Fouet donor but the existing Fleau profile and engine matchups', async () => {
  const spec = set.cards.find(c => c.key === 'selphie'), donor = M.donor(spec, D), profile = M.profile(spec, D, weapons);
  assert.equal(donor.weapon, 'Fouet'); assert.equal(profile.weapon, 'Fl\u00e9au');
  assert.equal(profile.weapon_index, Object.keys(weapons).indexOf('Fl\u00e9au'));
  assert.equal(profile.role, 3); assert.deepEqual(profile.positions, [3, 2]); M.validateProfile(profile, spec);
  const data = await catalog(publications()), engine = createEngine(data), decks = M.validateGame(data, set, createEngine);
  const selphieFirst = [spec.id, ...decks[1].cards.filter(id => id !== spec.id)];
  for (const [key, bonus] of [['squall', 50], ['irvine', -50], ['edea', 0]]) {
    const target = set.cards.find(c => c.key === key), targetFirst = [target.id, ...decks[0].cards.filter(id => id !== target.id)];
    const state = engine.newGame(selphieFirst, targetFirst, { deckCoverage: 2 });
    engine.autoDeploy(state, 0); engine.autoDeploy(state, 1); engine.start(state);
    const attackerSlot = state.players[0].board.findIndex(u => u.cardId === spec.id), targetSlot = state.players[1].board.findIndex(u => u.cardId === target.id);
    assert.ok(attackerSlot >= 0 && targetSlot >= 0);
    engine.lock(state, attackerSlot, targetSlot); engine.rollAttack(state, 6); engine.rollDefense(state, 6);
    assert.equal(state.lastDuel.formula.weapon, bonus);
    assert.equal(bonus, weapons['Fl\u00e9au'][target.weapon]);
  }
});

test('local nunchaku icon is centered, white, within the rim and preserves the native enamel', async () => {
  const { sharp } = require('../../atelier/lib.cjs'), { composeIcon, inspectIcon } = require('./weapon-fleau.cjs');
  const result = await composeIcon(sharp, fs.readFileSync(path.join(__dirname, 'weapon-fleau.svg')),
    path.join(__dirname, '../ff7-set-01/weapon-email-native.png'));
  const raw = async input => sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const icon = await raw(result.icon), email = await raw(result.email), packed = await raw(result.packed);
  assert.ok(result.metrics.radius <= 39);
  assert.deepEqual((await raw(path.join(__dirname, 'weapon-fleau.png'))).data, packed.data);
  for (let i = 0; i < icon.data.length; i += 4) if (!icon.data[i + 3]) {
    assert.deepEqual(packed.data.subarray(i, i + 4), email.data.subarray(i, i + 4));
  }
  const overflow = { info: icon.info, data: Buffer.from(icon.data) }; overflow.data.fill(255, 0, 4);
  assert.throws(() => inspectIcon(overflow), /hors du medaillon/);
  assert.throws(() => inspectIcon({ info: icon.info, data: Buffer.alloc(icon.data.length) }), /vide/);
});

test('twelve anchored fan narratives keep 190 characters minimum and at most four preview lines', async () => {
  const R = require('../../atelier/designer-render.cjs');
  const anchors = {
    squall: [/gunblade sur l'.paule/, /SeeD/, /Linoa/], zell: [/poings/, /sourit/, /caf.t.ria/], linoa: [/fleurs/, /Angelo/, /Timber/],
    irvine: [/vise Edea/, /tir d.cisif/, /Matrone/], quistis: [/centre de combat/, /instructrice/], selphie: [/cole/, /rire/, /jaune/, /nunchakus/, /hanche/],
    edea: [/ciel seul/, /armature/, /Matrone/, /possession/], seifer: [/sourire insolent/, /mauvais gar.on/, /chevalier/], ward: [/Centra/, /Laguna/, /Kiros/],
    kiros: [/Winhill/, /Laguna/], laguna: [/Julia/, /piano/, /journaliste/], ultimecia: [/temps/, /comprimer/]
  };
  for (const spec of set.cards) {
    assert.ok(spec.description.length >= 190 && spec.description.length <= 240, spec.key);
    const seiferClassroom = spec.key === 'seifer' && spec.description.startsWith('\u00c0 Balamb, Seifer pose les pieds sur son pupitre, sourire insolent.');
    if (seiferClassroom) assert.equal(spec.description.length, 210, 'Exact user sentence with unchanged suffix.');
    if (['edea', 'seifer', 'kiros', 'laguna', 'ultimecia'].includes(spec.key)) assert.ok(spec.description.length <= (seiferClassroom ? 210 : 205), spec.key);
    for (const anchor of anchors[spec.key]) assert.match(spec.description, anchor);
    if (spec.key === 'selphie') assert.doesNotMatch(spec.description, /lance|larmes|ruines/i);
    const lines = (await R.previewText(M.donor(spec, D))).filter(layer => layer.top >= 1200);
    assert.ok(lines.length > 0 && lines.length <= 4, spec.key + ': description overflow (' + lines.length + ' lines)');
  }
  const oversized = structuredClone(set); oversized.cards[0].description = 'a'.repeat(241);
  assert.throws(() => M.validateSet(oversized), /Textes trop longs/);
});

test('FF8 arenas gated by publication, two exact ten-card presets gated by the full pool', async () => {
  const base = await catalog([]), partial = await catalog(publications().slice(0, 1)), full = await catalog(publications());
  assert.ok(!base.arenas.some(a => a.id.startsWith('ff8-')));
  assert.equal(partial.arenas.filter(a => a.id.startsWith('ff8-')).length, 2);
  assert.equal(partial.decks.presets.filter(p => p.id.startsWith('ff8-')).length, 0);
  const validated = M.validateGame(full, set, createEngine);
  assert.deepEqual(validated.map(p => Object.values(p.coverage)), [[2, 3, 2, 3, 3], [2, 3, 3, 3, 3]]);
  assert.equal(createEngine(full).validatePlayableDeck(profiles().map(p => p.id)).length > 0, true, 'Deck cap remains ten.');
  const engine = createEngine(full), garden = { arenaId: 'ff8-balamb-garden' }, parade = { arenaId: 'ff8-deling-parade' };
  const bonus = (s, key) => engine.arenaBonuses(s, { cardId: set.cards.find(c => c.key === key).id });
  assert.equal(bonus(garden, 'selphie').attack, 25); assert.equal(bonus(parade, 'edea').attack, 25);
  assert.equal(bonus(garden, 'ward').attack, 0); assert.equal(bonus(garden, 'kiros').element, 0);
  assert.deepEqual(full.arenas.find(a => a.id === garden.arenaId).homeCharacters,
    ['squall', 'zell', 'linoa', 'irvine', 'quistis', 'selphie'].map(k => k + '-ff8'));
});

test('FF7 preset and arena outputs remain byte-equivalent before and after FF8', async () => {
  const select = d => JSON.stringify({ arenas: d.arenas.filter(a => a.id.startsWith('ff7-')), presets: d.decks.presets.filter(p => p.id.startsWith('ff7-')) });
  const before = select(await catalog([])), after = select(await catalog(publications()));
  assert.equal(before, after);
  assert.equal(digest(before), '9d73ba11267c1bd751ad09b17274536716bd9c5534fb82dd1729c376b51348dc');
});

test('both presets deploy, play and restore with the current engine', async () => {
  const data = await catalog(publications()), e = createEngine(data), [a, b] = M.validateGame(data, set, createEngine);
  for (const arenaId of set.arenas) {
    const s = e.newGame(a.cards, b.cards, { seed: arenaId, arenaId, deckCoverage: 2 });
    e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    for (let i = 0; i < 10000 && s.phase !== 'over'; i++) {
      if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
      else if (s.phase === 'attack') e.rollAttack(s);
      else if (s.phase === 'defense') e.rollDefense(s);
      else if (s.phase === 'result') e.next(s);
      else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
      else { const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase]; e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s)); }
    }
    assert.equal(s.phase, 'over'); assert.deepEqual(e.restoreGame(s), s);
  }
});

test('default publisher is read-only and validates both presets including NONE proofs', async () => {
  const f = fixture(), result = await publishMain([], f.publisher);
  const publishedNow = [...prior(), ...publications().map(c => ({ ...c, kind: 'created' }))];
  const snapshot = structuredClone(publishedNow), afterPublication = fixture(publishedNow);
  assert.deepEqual(afterPublication.files, f.initial, 'Published FF8 must not leak into the pre-FF8 fixture.');
  assert.deepEqual(await afterPublication.publisher.preflight(), result);
  assert.deepEqual(publishedNow, snapshot, 'Fixture must not mutate its catalogue input.');
  const detached = prior(); detached[0].profile.name = 'LOCAL TEST MUTATION';
  assert.notEqual(prior()[0].profile.name, 'LOCAL TEST MUTATION', 'Baseline snapshots must not share nested profiles.');
  assert.equal(result.mode, 'preflight'); assert.equal(result.added, 12); assert.equal(result.presets.length, 2);
  assert.equal(result.ids.length, 12); assert.equal(new Set(result.ids).size, 12);
  for (const preset of result.presets) assert.equal(preset.cards.length, 10);
  assert.deepEqual(new Set(result.presets.flatMap(p => p.cards)), new Set(result.ids));
  assert.deepEqual(f.ops, []); assert.deepEqual(f.files, f.initial);
  await assert.rejects(publishMain(['--pubish'], f.publisher), /Usage/); assert.deepEqual(f.ops, []);
});

test('twelve additive entries commit once, preserve FF7 and rerun without writes', async () => {
  const f = fixture(), old = f.D.catalogue().cards;
  const result = await f.publisher.publish(), next = f.D.catalogue().cards;
  assert.equal(result.added, 12); assert.equal(next.length, old.length + 12);
  assert.deepEqual(next.slice(0, old.length), old); f.assertOldFiles();
  assert.deepEqual(f.files.get(result.backup), f.initial.get(f.D.CATALOGUE));
  for (const c of next.slice(old.length)) { assert.match(c.creationJob, f.D.UUID); assert.equal(c.kind, 'created'); }
  const snapshot = new Map(f.files); assert.equal((await f.publisher.publish()).mode, 'unchanged'); assert.deepEqual(f.files, snapshot);
});

test('invalid proof flags, hashes, NONE state, ordered positions and identities never publish', async () => {
  const proof = (key, fn) => f => { const file = path.join(f.source(key), 'verification.json'), v = f.read(file); fn(v); f.put(file, v); };
  for (const mutate of [
    f => f.changeProfile('squall', p => { p.id = set.cards[1].id; }),
    f => f.changeProfile('squall', p => { p.positions.reverse(); }),
    f => f.changeProfile('squall', p => { p.description = 'Ancien recit valide avant la revision des scenes.'; }),
    f => f.changeProfile('zell', p => { p.title = 'UN BONHEUR TOUT SIMPLE'; }),
    f => f.changeProfile('selphie', p => { p.weapon = 'Instrument'; }),
    f => f.changeProfile('selphie', p => { p.weapon = 'Fouet'; }),
    f => f.changeProfile('selphie', p => { p.weapon = 'Lance'; }),
    f => f.changeProfile('zell', p => { p.faction = 'FF7'; }),
    f => f.changeProfile('linoa', p => { p.role = 4; }),
    f => f.changeProfile('zell', p => { p.testOnly = true; }),
    f => f.changeProfile('ward', p => { p.magic = [6]; }),
    f => f.changeProfile('kiros', p => { p.barriers = [6]; }),
    proof('ward', v => { delete v.none; }), proof('kiros', v => { v.none.unlit = false; }),
    proof('ward', v => { v.none.crystalHash = 'changed'; }),
    ...[v => { v.passed = false; }, v => { v.modelId = '40000000'; }, v => { v.referenceId = 'stale'; },
      v => { v.profileHash = 'bad'; }, v => { v.hashes['card.psd'] = 'bad'; }, v => { v.testOnly = true; },
      v => { v.roundtrip.changed = 1; }, v => { v.barcode.passed = false; }, v => { v.components.fixedDifferences = 1; },
      v => { v.components.severePixels = 1; }].map(fn => proof('zell', fn))
  ]) {
    const f = fixture(); mutate(f); const before = new Map(f.files);
    await assert.rejects(f.publisher.preflight()); assert.deepEqual(f.ops, []); assert.deepEqual(f.files, before);
  }
});

test('missing arenas, altered faction grouping or a missing preset reject preflight', async () => {
  for (const mutate of [
    f => f.files.delete(f.arena('ff8-balamb-garden')),
    f => f.put(f.arena('ff8-deling-parade'), { format: 'png', width: 900, height: 1600 }),
    f => f.catalogHook(d => ({ ...d, cards: d.cards.map(c => c.characterId === 'squall-ff8' ? { ...c, faction: 'FF7' } : c) })),
    f => f.catalogHook(d => ({ ...d, decks: { ...d.decks, presets: d.decks.presets.filter(p => p.id !== 'ff8-set-01-b') } }))
  ]) { const f = fixture(); mutate(f); await assert.rejects(f.publisher.preflight()); assert.deepEqual(f.ops, []); }
});

test('collisions, locks and unowned directories fail without replacing any existing data', async () => {
  for (const scenario of ['id', 'lock', 'directory']) {
    const f = fixture();
    if (scenario === 'id') { const cat = f.D.catalogue(); cat.cards.push({ ...cat.cards.find(c => c.kind === 'created'), id: set.cards[0].id }); f.put(f.D.CATALOGUE, cat); }
    if (scenario === 'lock') f.put(f.lock, { id: 'other-owner' });
    if (scenario === 'directory') f.put(path.join(f.target(set.cards[0].id), 'creation.json'), { setId: 'other', job: uuid(9) });
    const before = new Map(f.files); await assert.rejects(f.publisher.publish()); assert.deepEqual(f.files, before);
  }
});

test('copy/install/commit failures preserve the index, retain recoverable orphans, then retry safely', async () => {
  for (const phase of ['copy', 'install', 'commit']) {
    const f = fixture(); let installed = 0;
    f.fault(e => {
      if (phase === 'copy' && e.op === 'copy' && e.from.endsWith('card.psd')) throw Error('INJECTED');
      if (phase === 'install' && e.op === 'rename' && e.from.includes(path.sep + 'staging' + path.sep) && ++installed === 3) throw Error('INJECTED');
      if (phase === 'commit' && e.op === 'rename' && e.to === f.D.CATALOGUE) throw Error('INJECTED');
    });
    await assert.rejects(f.publisher.publish(), /INJECTED/); f.assertOldFiles();
    assert.deepEqual(f.files.get(f.D.CATALOGUE), f.initial.get(f.D.CATALOGUE)); assert.ok(!f.files.has(f.lock));
    const orphans = new Map([...f.files].filter(([p]) => p.startsWith(path.join(f.L.ROOT, 'V4/creations') + path.sep)));
    f.fault(() => {}); assert.equal((await f.publisher.publish()).added, 12);
    for (const [p, bytes] of orphans) assert.deepEqual(f.files.get(p), bytes);
    assert.ok(f.ops.filter(e => e.op === 'unlink').every(e => e.from === f.lock));
  }
});

test('concurrent index changes and tampered published media are never overwritten', async () => {
  const f = fixture(); let once = false;
  f.fault(e => { if (!once && e.op === 'copy') { once = true; const cat = f.D.catalogue(); cat.concurrent = 'keep'; f.put(f.D.CATALOGUE, cat); } });
  await assert.rejects(f.publisher.publish(), /Catalogue modifie/); assert.equal(f.read(f.D.CATALOGUE).concurrent, 'keep');
  const g = fixture(); await g.publisher.publish(); g.seed(path.join(g.target(set.cards[0].id), 'card.png'), 'tamper');
  const before = new Map(g.files); await assert.rejects(g.publisher.publish(), /Empreinte/); assert.deepEqual(g.files, before);
});

test('builder defaults to read-only check; composer parses without Photoshop', async () => {
  const calls = [], b = { check: async key => { calls.push(['check', key]); return 'checked'; } };
  assert.equal(await buildMain([], b), 'checked'); assert.deepEqual(calls, [['check', undefined]]);
  await assert.rejects(buildMain(['publish'], b), /Usage/);
  for (const file of ['compose.jsx', 'compose-one.jsx']) {
    const code = fs.readFileSync(path.join(__dirname, file), 'utf8').replace(/^#.*$/gm, ''); assert.doesNotThrow(() => new vm.Script(code));
  }
});

test('prepare uses existing components, preserves position order and source artwork, and retires stale proofs', async () => {
  const f = builderFixture(), sourceFiles = new Map([...f.files].filter(([p]) => p.includes(path.sep + 'illustrations' + path.sep) || p.startsWith(f.bank)));
  const afterPublication = builderFixture([...prior(), ...publications().map(c => ({ ...c, kind: 'created' }))]);
  assert.deepEqual(afterPublication.files, f.files, 'Published FF8 must not occupy the builder fixture IDs.');
  assert.deepEqual(await afterPublication.builder.check(), await f.builder.check());
  assert.deepEqual((await f.builder.check()).missing, []); assert.deepEqual(f.ops, []);
  assert.equal((await f.builder.prepare()).prepared, 12);
  assert.deepEqual(f.donors[0].positions, [2, 1]); assert.deepEqual(f.donors[5].positions, [3, 2]);
  assert.equal(f.donors[5].weapon, 'Fouet');
  const selphiePlan = f.read(path.join(f.source('selphie'), 'render/composition.json'));
  const fleau = selphiePlan.layers.find(l => l.name === 'ARME - Fl\u00e9au');
  assert.ok(fleau); assert.deepEqual([fleau.left, fleau.top, fleau.width, fleau.height], [89, 1116, 96, 95]);
  assert.ok(!selphiePlan.layers.some(l => /ARME - (Lance|Fouet)/.test(l.name)));
  assert.deepEqual(f.files.get(path.join(f.source('selphie'), 'render', fleau.file)), f.files.get(path.join(f.home, 'weapon-fleau.png')));
  const prep = f.read(path.join(f.source('selphie'), 'preparation.json'));
  for (const name of ['weapon-fleau.svg', 'weapon-fleau.png', 'weapon-fleau.cjs']) assert.ok(prep.inputs[path.join(f.home, name)]);
  for (const key of ['ward', 'kiros']) {
    const dir = f.source(key), prep = f.read(path.join(dir, 'preparation.json'));
    assert.equal(prep.none.unlit, true); assert.ok(!f.files.has(path.join(dir, 'verification.json')));
    const plan = f.read(path.join(dir, 'render/composition.json'));
    assert.ok(plan.layers.some(l => l.name === 'CRISTAL NONE')); assert.ok(!plan.layers.some(l => /HALO MAGIQUE|BARRIERE/.test(l.name)));
    assert.ok(plan.layers.some(l => l.name === 'FACTION - FF8' && l.left === 672 && l.top === 829 && l.width === 98 && l.height === 223));
    for (const name of ['HALO MAGIQUE', 'DEF D6 - BARRIERE']) {
      const broken = structuredClone(plan); broken.layers.push({ name });
      await assert.rejects(f.builder.noneProof(dir, broken, f.read(path.join(f.bank, 'manifest.json'))), /NONE/);
    }
    const wrong = structuredClone(plan); wrong.layers.find(l => l.name === 'CRISTAL NONE').file = plan.layers[1].file;
    await assert.rejects(f.builder.noneProof(dir, wrong, f.read(path.join(f.bank, 'manifest.json'))), /NONE non identique/);
  }
  assert.ok(f.read(path.join(f.source('linoa'), 'render/composition.json')).layers.some(l => l.name === 'ARME - Projectile' && l.left === 89));
  for (const [p, bytes] of sourceFiles) assert.deepEqual(f.files.get(p), bytes);
  assert.ok(!f.files.has(f.lock));
  await assert.rejects(f.builder.verify('squall'), /ENOENT/); // No fabricated native proof.
});

test('banner geometry is exactly 98x223 at 672,829; missing or mismatched inputs never prepare cards', async () => {
  for (const mutate of [
    f => f.files.delete(path.join(f.home, 'flag-FF8-packed.png')),
    f => f.files.delete(path.join(f.home, 'faction.json')),
    f => f.files.delete(path.join(f.home, 'weapon-fleau.png')),
    f => f.put(path.join(f.home, 'weapon-fleau.png'), { format: 'png', width: 97, height: 95 }),
    f => f.put(path.join(f.home, 'faction.json'), { packedGeometry: { left: 671, top: 829, width: 98, height: 223 } }),
    f => f.put(path.join(f.home, 'faction.json'), { packedGeometry: { left: 672, top: 829, width: 99, height: 223 } }),
    f => f.put(path.join(f.home, 'flag-FF8-packed.png'), { format: 'png', width: 98, height: 222 })
  ]) {
    const f = builderFixture(); mutate(f); const before = new Map(f.files);
    await assert.rejects(f.builder.prepare('squall'), /absents|Geometrie|Dimensions/);
    assert.deepEqual(f.files, before); assert.deepEqual(f.donors, []); assert.ok(!f.files.has(f.lock));
  }
});

test('native component gate rejects fixed-frame changes and excessive compositing deltas', async () => {
  const f = builderFixture(), width = 897, height = 1497, pixels = width * height * 4;
  const original = Buffer.alloc(pixels, 100); for (let i = 3; i < pixels; i += 4) original[i] = 255;
  let delta = 0, mutable = false;
  f.L.sharp = file => ({ ensureAlpha() { return this; }, raw() { return this; }, async toBuffer() {
    if (file.endsWith('overlay.png')) return { data: Buffer.from([100, 100, 100, 255]), info: { width: 1, height: 1, channels: 4 } };
    const data = Buffer.from(original); if (file.endsWith('without-text.png')) data[0] += delta;
    return { data, info: { width, height, channels: 4 } };
  } });
  const builder = createBuilder({ L: f.L, D: f.D, R: f.R, home: f.home, buildCatalog, createEngine });
  const plan = () => ({ layers: [{ file: 'art.png' }, { file: 'frame.png' }, ...(mutable ? [{ file: 'overlay.png', left: 0, top: 0 }] : [])] });
  assert.equal((await builder.components(f.source('squall'), plan())).fixedDifferences, 0);
  delta = 1; await assert.rejects(builder.components(f.source('squall'), plan()));
  mutable = true; assert.equal((await builder.components(f.source('squall'), plan())).severePixels, 0);
  delta = 3; await assert.rejects(builder.components(f.source('squall'), plan()));
});
