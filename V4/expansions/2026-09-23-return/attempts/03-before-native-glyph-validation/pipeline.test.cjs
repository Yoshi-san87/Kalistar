'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const M = require('./model.cjs');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const legacy = require('../../../V3/donnees/cartes.json');
function cards() {
  const ids = { 'zviri-tueuse': '30000010', 'zviri-chasse': '30000010', julienne: '30000003',
    'verminia-bureau': '30000009', 'verminia-portail': '30000009', polux: '30000031', nazar: '30000011',
    'capitaine-skully': '30000035', xiaomi: '30000027', 'gen-reparation': '30000023', 'gen-electro': '30000023',
    'lanio-astraball': '30000021', 'lanio-mines': '30000021', reevus: '30000026', kognus: '30000025' };
  const out = Object.entries(M.EDITIONS).map(([key, edition]) => {
    const c = legacy.find(c => c.id === ids[key]);
    return M.normalize({ ...Object.fromEntries(M.PRINTED.filter(k => k !== 'description').map(k => [k, c[k]])),
      key, legacyId: c.id, characterId: c.characterId, edition, role: c.role, art: 'art-a/' + key + '.png',
      description: 'Un instant de son histoire dans Kalistar, conserve pour verifier la composition native et les regles de sa position.' });
  });
  const keys = ['commander', 'nier', 'kaine', 'devola-automata', 'popola-automata', 'devola-replicant', 'popola-replicant'];
  for (const key of keys) out.push(M.normalize({ key, characterId: key.startsWith('devola') ? 'devola-nier' : key.startsWith('popola') ? 'popola-nier' : key + '-replicant',
    name: key.toUpperCase(), title: 'Un instant suspendu', job: 'GARDIEN', description: 'Une scene narrative au sein de son univers, sans modifier les limites de statistiques ni le cadre de la carte.',
    element: 'LUXO', race: 'HUMAIN', faction: key.endsWith('automata') || key === 'commander' ? 'NieR' : 'Replicant',
    weapon: 'Tome', positions: [3], role: 3, atk: [230, 190, 150, 110, 70, 30], defense: [230, 190, 150, 110, 70, 30], magic: [6], barriers: [4], art: 'art-c/' + key + '.png' }));
  return out;
}
const makeSet = () => M.validateSet({ schemaVersion: 1, id: M.SET, cards: cards(), arenas: [], presets: [] });

test('22 cards split into 11 original identities, four variants and seven crossovers', () => {
  const set = makeSet(); assert.equal(set.cards.filter(c => c.edition === 'canonical').length, 11);
  assert.equal(set.cards.filter(c => c.edition === 'variant').length, 4);
  for (const c of set.cards) assert.equal(c.id, c.edition === 'canonical' ? c.legacyId : M.idFor(c.key));
  assert.equal(new Set(set.cards.map(c => c.id)).size, 22);
});
test('legacy edition mapping and shared identity cannot drift', () => {
  const original = cards().find(c => c.key === 'zviri-tueuse');
  assert.throws(() => M.validateCard({ ...original, edition: 'variant', id: M.idFor(original.key) }), /Edition differente/);
  assert.throws(() => M.validateCard({ ...original, characterId: 'new-zviri' }), /personnage/);
});
test('role ceilings and support permissions are enforced on each face', () => {
  const c = cards().find(c => c.key === 'commander');
  assert.throws(() => M.validateCard({ ...c, atk: [241, ...c.atk.slice(1)] }), /plafond/);
  assert.throws(() => M.validateCard({ ...c, atk: ['revive', ...c.atk.slice(1)], magic: [] }), /Reraise/);
  assert.throws(() => M.validateCard({ ...c, atk: ['guard', ...c.atk.slice(1)], magic: [] }), /Garde/);
});
test('NONE and modes on special effects are rejected', () => {
  const c = cards().find(c => c.key === 'commander');
  assert.throws(() => M.validateCard({ ...c, element: 'NONE' }));
  assert.throws(() => M.validateCard({ ...c, atk: ['retry', ...c.atk.slice(1)] }));
});
test('art paths accept exact root prefix but reject escape and conflicting copy', () => {
  const c = cards().find(c => c.key === 'commander');
  assert.equal(M.normalize({ ...c, art: 'V4/expansions/2026-09-23-return/art-c/commander.png' }).art, c.art);
  assert.throws(() => M.normalize({ ...c, art: '../outside.png' }));
  assert.throws(() => M.normalize({ ...c, text: 'Other story' }), /text\/description/);
});
test('all profile donors resolve calibrated native banks and retain printed fields', () => {
  for (const c of cards()) { const p = M.profile(c, D); M.validateProfile(p, c); assert.equal(p.characterId, c.characterId); }
});
test('prospective catalogue executes unchanged builder without writing real registry', async () => {
  const registryFile = path.join(L.DATA, 'references.json'), before = fs.readFileSync(registryFile), set = makeSet();
  const references = L.baseline(), published = D.catalogue().cards.filter(c => c.kind === 'created');
  for (const c of set.cards) {
    const p = M.profile(c, D);
    if (c.edition === 'canonical') references.cards.push({ key: c.key, card: p });
    else published.push({ id: c.id, profile: p, pngUrl: '/media/created/' + c.id + '.png' });
  }
  const data = await require('./catalogue.cjs').prospective(L, references, published);
  M.validateGame(data, set, require('../../site/engine.js').createEngine);
  assert.deepEqual(fs.readFileSync(registryFile), before);
  assert.equal(data.cards.length, L.baseline().cards.length + D.catalogue().cards.filter(c => c.kind === 'created').length + 22);
});
test('prospective ordinary catalogue matches the real builder exactly', async () => {
  const published = D.catalogue().cards.filter(c => c.kind === 'created');
  const actual = await require('./catalogue.cjs').prospective(L, L.baseline(), published);
  const expected = await require('../../atelier/game-catalog.cjs').buildCatalog({ published });
  assert.deepEqual(actual, expected);
});
test('publisher target allowlist cannot overwrite unrelated sources', () => {
  const publisher = require('./publish.cjs').createPublisher();
  assert.throws(() => publisher.safeTarget('V3/donnees/cartes.json'));
  assert.throws(() => publisher.safeTarget('V4/templates/MOMO_V4_01.psd'));
  assert.throws(() => publisher.safeTarget('V4/creations/../../AGENTS.md'));
  assert.ok(publisher.safeTarget('V4/templates/KALISTAR_V4_30000010.psd'));
});

function fixture(t) {
  const root = fs.mkdtempSync(path.join(__dirname, '.fixture-')), data = path.join(root, 'V4/atelier/data'), home = path.join(root, 'V4/expansions/2026-09-23-return');
  fs.mkdirSync(data, { recursive: true }); fs.mkdirSync(home, { recursive: true });
  t.after(() => { const resolved = fs.realpathSync(root); assert.ok(resolved.startsWith(fs.realpathSync(__dirname) + path.sep)); fs.rmSync(resolved, { recursive: true }); });
  const f = { ...L, ROOT: root, DATA: data, baseline: () => ({ id: 'fixture-reference', cards: [], protectedFiles: {} }) };
  return { root, home, data, L: f, D: { catalogue: () => ({ cards: [] }) } };
}
test('preservation snapshot is immutable and detects dependency drift', t => {
  const f = fixture(t), dependency = path.join(f.root, 'source.cjs'); fs.writeFileSync(dependency, 'original');
  f.L.write(path.join(f.home, 'dependencies.json'), { 'source.cjs': crypto.createHash('sha256').update('original').digest('hex') });
  const guard = require('./preservation.cjs').createGuard(f.L, f.D, f.home), first = guard.freeze(); assert.equal(first.entries.length, 0);
  assert.deepEqual(guard.freeze(), first);
  fs.writeFileSync(dependency, 'changed'); assert.throws(() => guard.freeze(), /Dependance modifiee/);
});
test('preparation refuses changed inputs and stale proof hashes', t => {
  const f = fixture(t), guard = require('./preservation.cjs').createGuard(f.L, f.D, f.home);
  f.L.write(path.join(f.home, 'dependencies.json'), {}); guard.freeze();
  const dir = path.join(f.home, 'cards/test'), input = path.join(f.root, 'input.json'); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(input, '{}');
  const inputs = { 'input.json': guard.digest(input) };
  f.L.write(path.join(dir, 'preparation.json'), { referenceId: 'fixture-reference', existingSnapshotHash: guard.digest(guard.snapshotFile), snapshot: inputs, inputs });
  guard.preparation('test'); f.L.write(path.join(dir, 'verification.json'), { preparationHash: 'wrong' });
  assert.throws(() => guard.preparation('test', true)); fs.writeFileSync(input, '{"changed":true}'); assert.throws(() => guard.preparation('test'), /obsolete/);
});

test('old regression archive preserves exact bytes and survives ignored job removal', async t => {
  const f = fixture(t), job = crypto.randomUUID(), source = path.join(f.data, 'jobs', job, 'verification.json');
  const bytes = Buffer.from('{\r\n  "passed": true, "referenceId": "fixture-reference", "rendererHash": "fixture-renderer", "results": []\r\n}\r\n');
  fs.mkdirSync(path.dirname(source), { recursive: true }); fs.writeFileSync(source, bytes);
  const E = require('./evidence.cjs'), archived = E.archiveOldReport(f.L, f.home, job, source), copy = path.join(f.root, archived.oldReportFile);
  assert.deepEqual(fs.readFileSync(copy), bytes); assert.equal(archived.oldReportHash, await f.L.hash(copy));
  assert.deepEqual(E.archiveOldReport(f.L, f.home, job, source), archived);
  fs.writeFileSync(source, '{}'); assert.throws(() => E.archiveOldReport(f.L, f.home, job, source), /deja presente/);
  fs.unlinkSync(source); assert.deepEqual(fs.readFileSync(copy), bytes);
  const observed = await E.inspectRegression(f.L, f.home, { ...archived, rendererHash: 'fixture-renderer', results: [] }, { before: f.L.baseline(), newEntries: [] });
  assert.equal(observed.get(copy), archived.oldReportHash);
});

test('failed old regression is archived honestly and cannot pass publication gate', async t => {
  const f = fixture(t), source = path.join(f.data, 'failed.json'), E = require('./evidence.cjs');
  f.L.write(source, { passed: false, referenceId: 'fixture-reference', results: [{ key: 'old', passed: false, error: 'regression pixels' }] });
  const archived = E.archiveOldReport(f.L, f.home, crypto.randomUUID(), source);
  assert.equal(f.L.read(path.join(f.root, archived.oldReportFile)).passed, false);
  await assert.rejects(E.inspectRegression(f.L, f.home, { ...archived, results: [] }, { before: f.L.baseline(), newEntries: [] }));
});
test('rollback restores exact old bytes and removes only owned new files', async t => {
  const f = fixture(t), id = crypto.randomUUID(), old = Buffer.from('old\r\n'), current = Buffer.from('new\n');
  const target = 'V4/donnees/catalogue.json', created = 'V4/creations/41234567/profile.json', backup = 'publication/' + id + '/before/' + target;
  for (const [file, bytes] of [[path.join(f.root, target), current], [path.join(f.root, created), Buffer.from('{}')], [path.join(f.home, backup), old]]) { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, bytes); }
  const hash = b => crypto.createHash('sha256').update(b).digest('hex');
  f.L.write(path.join(f.home, 'publication', id, 'journal.json'), { id, setId: M.SET, phase: 'applying', files: [
    { to: target, beforeHash: hash(old), hash: hash(current), backup }, { to: created, beforeHash: null, hash: hash('{}'), backup: null } ] });
  await require('./publish.cjs').createPublisher({ L: f.L, D: f.D, home: f.home }).rollback(id);
  assert.deepEqual(fs.readFileSync(path.join(f.root, target)), old); assert.equal(fs.existsSync(path.join(f.root, created)), false);
  assert.equal(fs.existsSync(path.dirname(path.join(f.root, created))), false);
});
test('rollback refuses third-party changes', async t => {
  const f = fixture(t), id = crypto.randomUUID(), target = 'V4/donnees/catalogue.json';
  fs.mkdirSync(path.dirname(path.join(f.root, target)), { recursive: true }); fs.writeFileSync(path.join(f.root, target), 'user edit');
  f.L.write(path.join(f.home, 'publication', id, 'journal.json'), { id, setId: M.SET, phase: 'applying', files: [{ to: target, beforeHash: null, hash: '0'.repeat(64), backup: null }] });
  await assert.rejects(require('./publish.cjs').createPublisher({ L: f.L, D: f.D, home: f.home }).rollback(id), /Modification tierce/);
  assert.equal(fs.readFileSync(path.join(f.root, target), 'utf8'), 'user edit');
});

async function publicationFixture(t) {
  const f = fixture(t), set = makeSet(), file = n => path.join(f.home, n), refFile = path.join(f.data, 'references.json');
  const original = { id: 'fixture-reference', cards: [], protectedFiles: {} };
  f.L.write(refFile, original); f.L.baseline = () => f.L.read(refFile);
  f.L.protectedCheck = async (ref = f.L.baseline()) => { for (const [n, h] of Object.entries(ref.protectedFiles)) assert.equal(await f.L.hash(path.join(f.root, n)), h); };
  f.L.rendererHash = async () => 'fixture-renderer';
  f.D = { ...D, CATALOGUE: path.join(f.root, 'V4/donnees/catalogue.json'), catalogue() {
    const prior = fs.existsSync(this.CATALOGUE) ? f.L.read(this.CATALOGUE).cards.filter(c => c.kind === 'created') : [];
    return { referenceId: f.L.baseline().id, cards: [...f.L.baseline().cards.map(e => ({ id: e.card.id, kind: 'approved', key: e.key, profile: e.card })), ...prior] };
  } };
  f.L.write(file('set.json'), set); f.L.write(file('references-before.json'), original); f.L.write(file('dependencies.json'), {});
  f.L.write(file('profiles-a.json'), set.cards.slice(0, 7)); f.L.write(file('profiles-b.json'), set.cards.slice(7, 15)); f.L.write(file('profiles-c.json'), set.cards.slice(15));
  const guard = require('./preservation.cjs').createGuard(f.L, f.D, f.home); guard.freeze();
  const bank = path.join(f.root, 'V4/atelier/designer-assets'), manifest = L.read(path.join(L.ROOT, 'V4/atelier/designer-assets/manifest.json'));
  for (const name of ['manifest.json', 'manifest.raw.json']) f.L.write(path.join(bank, name), L.read(path.join(L.ROOT, 'V4/atelier/designer-assets', name)));
  const copies = [...Object.values(require('./assets.cjs').EXTRA), ...['crystal', 'branch'].map(k => 'V4/atelier/designer-assets/' + manifest.elements.NONE[k].file)];
  for (const relative of copies) { const dest = path.join(f.root, relative); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(path.join(L.ROOT, relative), dest); }
  fs.mkdirSync(file('components'), { recursive: true }); fs.copyFileSync(path.join(__dirname, 'components/weapon-short-sword.png'), file('components/weapon-short-sword.png'));
  const png = await L.sharp({ create: { width: 897, height: 1497, channels: 4, background: '#000000' } }).png().toBuffer();
  for (const c of set.cards) {
    const dir = file('cards/' + c.key); fs.mkdirSync(path.join(dir, 'render'), { recursive: true });
    const profile = M.profile(c, D); f.L.write(path.join(dir, 'profile.json'), profile);
    fs.writeFileSync(path.join(dir, 'card.png'), png); fs.writeFileSync(path.join(dir, 'illustration.png'), png); fs.writeFileSync(path.join(dir, 'card.psd'), 'isolated fake PSD ' + c.id);
    fs.mkdirSync(path.dirname(file(c.art)), { recursive: true }); fs.writeFileSync(file(c.art), png);
    const hiddenLayers = [];
    for (const side of ['ATK', 'DEF']) for (let die = 1; die <= 6; die++) hiddenLayers.push({ name: side + ' D' + die + (side === 'ATK' ? ' - HALO MAGIQUE' : ' - BARRIERE') });
    f.L.write(path.join(dir, 'render/composition.json'), { layers: [], hiddenLayers });
    f.L.write(path.join(dir, 'render/native.json'), { layers: [{ name: 'NOM', kind: 'LayerKind.TEXT', font: 'TimesNewRomanPSMT' }] });
    const input = { 'V4/expansions/2026-09-23-return/set.json': guard.digest(file('set.json')) };
    f.L.write(path.join(dir, 'preparation.json'), { referenceId: original.id, existingSnapshotHash: guard.digest(guard.snapshotFile), snapshot: input, inputs: input });
    f.L.write(path.join(dir, 'verification.json'), { passed: true, referenceId: original.id, modelId: c.id,
      profileHash: await f.L.hash(path.join(dir, 'profile.json')), hashes: { 'card.png': await f.L.hash(path.join(dir, 'card.png')), 'card.psd': await f.L.hash(path.join(dir, 'card.psd')) },
      preparationHash: guard.digest(path.join(dir, 'preparation.json')), components: { fixedDifferences: 0, severePixels: 0 }, roundtrip: { changed: 0 },
      barcode: { expected: c.id, passed: true }, typography: { NOM: {}, TITLE: {} },
      ...(c.element === 'NONE' ? { none: { unlit: true, crystalHash: await f.L.hash(path.join(bank, manifest.elements.NONE.crystal.file)), branchHash: await f.L.hash(path.join(bank, manifest.elements.NONE.branch.file)) } } : {}) });
  }
  const plan = await require('./canonical.cjs').createPlan(f.L, f.D, f.home);
  const job = crypto.randomUUID(), sourceReport = path.join(f.data, 'jobs', job, 'verification.json');
  f.L.write(sourceReport, { passed: true, referenceId: original.id, rendererHash: 'fixture-renderer', results: [] });
  const { oldReportFile, oldReportHash } = require('./evidence.cjs').archiveOldReport(f.L, f.home, job, sourceReport);
  fs.unlinkSync(sourceReport);
  const results = [];
  for (const e of plan.newEntries) {
    const dir = file('canonical-regression/' + e.key); fs.mkdirSync(dir, { recursive: true });
    fs.copyFileSync(file('cards/' + e.key + '/render/native.json'), path.join(dir, 'native.json'));
    fs.writeFileSync(path.join(dir, 'card.png'), png); fs.writeFileSync(path.join(dir, 'reopened.png'), png);
    results.push({ key: e.key, passed: true, comparison: { changed: 0 }, roundtrip: { changed: 0 }, barcode: { passed: true },
      nativeHash: await f.L.hash(path.join(dir, 'native.json')), hashes: { 'card.png': await f.L.hash(path.join(dir, 'card.png')), 'reopened.png': await f.L.hash(path.join(dir, 'reopened.png')) } });
  }
  f.L.write(file('canonical-regression.json'), { passed: true, planDigest: plan.digest, referenceId: plan.next.id, previousReferenceId: original.id,
    rendererHash: 'fixture-renderer', oldReportFile, oldReportHash, checkedAt: '2026-09-23T00:00:00.000Z', results });
  const prospective = async (_L, ref, published) => require('./catalogue.cjs').prospective(L, { ...L.baseline(), cards: [...L.baseline().cards, ...ref.cards] }, [...D.catalogue().cards.filter(c => c.kind === 'created'), ...published]);
  return { ...f, set, plan, prospective, publisher: require('./publish.cjs').createPublisher({ L: f.L, D: f.D, home: f.home, prospective }) };
}
test('full isolated publication appends originals and variants in separate registries', async t => {
  const f = await publicationFixture(t), old = fs.readFileSync(path.join(f.data, 'references.json'));
  const preflight = await f.publisher.preflight(); assert.equal(preflight.canonical, 11); assert.equal(preflight.created, 11);
  assert.deepEqual(fs.readFileSync(path.join(f.data, 'references.json')), old);
  const result = await f.publisher.publish(); assert.equal(result.published, true);
  const ref = f.L.baseline(), catalogue = f.L.read(f.D.CATALOGUE);
  assert.equal(ref.cards.length, 11); assert.equal(catalogue.cards.length, 22);
  assert.ok(ref.cards.every(e => /^3/.test(e.card.id))); assert.ok(catalogue.cards.filter(c => c.kind === 'created').every(c => /^4/.test(c.id)));
  assert.equal(catalogue.referenceId, ref.id); await f.L.protectedCheck();
  await assert.rejects(f.publisher.publish(), /deja effectuee/);
});
test('preflight refuses stale native proof before modifying either catalogue', async t => {
  const f = await publicationFixture(t), card = f.set.cards[0], profile = path.join(f.home, 'cards', card.key, 'profile.json');
  fs.appendFileSync(profile, ' ');
  await assert.rejects(f.publisher.preflight());
  assert.equal(f.L.baseline().cards.length, 0); assert.equal(fs.existsSync(f.D.CATALOGUE), false);
});

test('publication observes portable archive and every native regression artifact', async t => {
  const f = await publicationFixture(t), plan = await f.publisher.inspect();
  const report = f.L.read(path.join(f.home, 'canonical-regression.json'));
  assert.equal(plan.observed.get(path.join(f.root, report.oldReportFile)), report.oldReportHash);
  for (const e of f.plan.newEntries) for (const name of ['native.json', 'card.png', 'reopened.png'])
    assert.ok(plan.observed.has(path.join(f.home, 'canonical-regression', e.key, name)));
});

test('publication rejects ignored runtime report paths even when hashes match', async t => {
  const f = await publicationFixture(t), file = path.join(f.home, 'canonical-regression.json'), report = f.L.read(file);
  const runtime = 'V4/atelier/data/jobs/' + crypto.randomUUID() + '/verification.json';
  fs.mkdirSync(path.dirname(path.join(f.root, runtime)), { recursive: true });
  fs.copyFileSync(path.join(f.root, report.oldReportFile), path.join(f.root, runtime));
  report.oldReportFile = runtime; f.L.write(file, report);
  await assert.rejects(f.publisher.preflight(), /hors du lot suivi/);
});

test('publication rejects altered archived report, native state or reopened pixels', async t => {
  const f = await publicationFixture(t), report = f.L.read(path.join(f.home, 'canonical-regression.json'));
  const paths = [path.join(f.root, report.oldReportFile), ...['native.json', 'reopened.png'].map(n => path.join(f.home, 'canonical-regression', f.plan.newEntries[0].key, n))];
  for (const file of paths) {
    const before = fs.readFileSync(file); fs.appendFileSync(file, ' ');
    await assert.rejects(f.publisher.preflight(), /Preuve modifiee/); fs.writeFileSync(file, before);
  }
  assert.equal(f.L.baseline().cards.length, 0); assert.equal(fs.existsSync(f.D.CATALOGUE), false);
});
