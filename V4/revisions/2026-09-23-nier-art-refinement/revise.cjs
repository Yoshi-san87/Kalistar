'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const R = require('../../atelier/designer-render.cjs'), B = require('../../collaborations/nier-pilot-01/build.cjs');
const M = require('../../collaborations/nier-set-02/model.cjs');
const { createGuard } = require('../../collaborations/nier-set-02/preservation.cjs');
const { transactionIO } = require('./transaction.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp } = L;
const REVISION = '2026-09-23-nier-art-refinement', HOME = __dirname;
const production = path.join(ROOT, 'V4/collaborations/nier-set-02');
const file = n => L.inside(HOME, n), source = k => path.join(production, 'cards', k);
const work = k => file('work/' + k), currentSet = () => read(path.join(production, 'set.json'));
const pub = k => path.join(ROOT, 'V4/creations', read(path.join(source(k), 'profile.json')).id);
const ART = 'ILLUSTRATION - cadrage', OLD_WEAPON = 'ARME - Poing', WEAPON = 'ARME - Orbe';
const KEYS = ['pascal', 'a2', 'adam', 'eve', 'anemone'];
const SHARED = ['card.png', 'card.psd', 'illustration.png', 'verification.json'];
const code = ['revise.cjs', 'replace.jsx', 'transaction.cjs'].map(file).concat([
  'V4/scripts/stable/common.jsx', 'V4/collaborations/nier-pilot-01/typography.jsx',
  'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py'
].map(p => path.join(ROOT, p)));
const g = createGuard(L, D, production);
const tx = transactionIO(L, file('transaction.json'));
const absolute = p => L.inside(ROOT, p);

function selection(value) {
  assert.equal(value.schemaVersion, 1); assert.ok(Array.isArray(value.cards));
  const keys = value.cards.map(c => c.key);
  assert.equal(new Set(keys).size, keys.length);
  assert.deepEqual([...keys].sort(), [...KEYS].sort(), 'Perimetre fixe : Pascal, A2, Adam, Eve et Anemone.');
  for (const c of value.cards) {
    assert.deepEqual(Object.keys(c).sort(), ['illustration', 'key']);
    assert.match(c.illustration, /^art\/[a-zA-Z0-9_-]+\.png$/, 'Illustration selectionnee attendue dans art/.');
  }
  return value.cards;
}
function revisedProfile(key, p) {
  if (key !== 'adam') return structuredClone(p);
  assert.equal(p.weapon, 'Poing');
  return { ...p, weapon: 'Orbe', weapon_index: Object.keys(require('../../../V3/donnees/armes.json')).indexOf('Orbe') };
}
function assertProfileDelta(key, old, next) { assert.deepEqual(next, revisedProfile(key, old), key + ': modification de profil hors perimetre.'); }
function revisedSet(original) {
  M.validateSet(original);
  const next = structuredClone(original); next.cards.find(c => c.key === 'adam').weapon = 'Orbe'; return next;
}
function unchangedLayers(layers, key) {
  return layers.filter(l => l.name !== ART && !(key === 'adam' && [OLD_WEAPON, WEAPON].includes(l.name))).map(({ id, ...l }) => l);
}
function unchangedLayerGeometry(before, after, oldName, name) {
  const clean = l => { assert.ok(l); const { id, name, path, ...rest } = l; return rest; };
  assert.deepEqual(clean(before.find(l => l.name === oldName)), clean(after.find(l => l.name === name)), 'Placement dynamique modifie.');
}
function backupFor(before, target) { const c = before.changes.find(c => c.target === target); assert.ok(c, 'Sauvegarde absente : ' + target); return c.backup; }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); g.dependencies(); g.assertExisting(); }
async function guard(before, state = 'original', afterHashes = {}) {
  assert.equal(before.revision, REVISION); assert.equal(before.referenceId, L.baseline().id);
  for (const [f, h] of Object.entries(before.observed)) {
    const mutable = before.changes.some(c => c.target === f);
    if (state === 'mixed' && mutable) continue;
    const expected = state === 'published' && mutable ? afterHashes[f] : h;
    assert.equal(await hash(f), expected, 'Modification inattendue : ' + f);
  }
  for (const c of before.changes) {
    assert.equal(c.backup, file('originals/' + path.relative(ROOT, c.target)));
    assert.equal(c.stage, file('staging/' + path.relative(ROOT, c.target)));
    assert.equal(await hash(c.backup), c.beforeHash);
  }
  for (const [dir, names] of Object.entries(before.inventory)) assert.deepEqual(fs.readdirSync(dir).sort(), names, 'Inventaire modifie : ' + dir);
}
// Original preparation hashes stay untouched. This explicit historical view resolves
// only replaced files to their byte-identical backups; current outputs have a new proof.
function validateHistoricalLineage(before) {
  const backups = new Map(before.changes.map(c => [c.target, c.backup]));
  const resolve = f => backups.get(path.resolve(f)) || f;
  const historic = { ...L, read: f => read(resolve(f)), fs: { ...fs, readFileSync: (f, ...args) => fs.readFileSync(resolve(f), ...args) } };
  createGuard(historic, D, production).publication();
}
async function gameCheck(catalogue, baselineCatalogue, expectedSet) {
  const { buildCatalog } = require('../../atelier/game-catalog.cjs');
  const data = await buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
  const previous = await buildCatalog({ published: baselineCatalogue.cards.filter(c => c.kind === 'created') });
  M.validateGame(data, expectedSet, require('../../site/engine.js').createEngine);
  const adam = expectedSet.cards.find(c => c.key === 'adam').id;
  assert.deepEqual(data, { ...previous, cards: previous.cards.map(c => c.id === adam ? { ...c, weapon: 'Orbe', weapon_index: revisedProfile('adam', c).weapon_index } : c) }, 'Regression du catalogue jouable.');
  return { cards: data.cards.length, onlyGameplayChange: 'adam.weapon: Poing -> Orbe' };
}
async function check() {
  const manifest = path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'), orb = read(manifest).weapons.Orbe;
  const cards = fs.existsSync(file('selection.json')) ? selection(read(file('selection.json'))) : [];
  return { revision: REVISION, prepared: fs.existsSync(file('before.json')), selectionReady: cards.length > 0,
    selected: cards.map(c => c.key), missingArt: cards.filter(c => !fs.existsSync(file(c.illustration))).map(c => c.illustration),
    adamWeapon: { key: 'Orbe', ...orb }, photoshopRun: false, productionUnchanged: true };
}
async function prepare() {
  return B.locked(async () => {
    assert.ok(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Revision deja preparee : ne pas remplacer les originaux.');
    const selected = selection(read(file('selection.json'))); await stable(); g.publication();
    // Reject incomplete parent selections before creating any backups or staged work.
    for (const c of selected) {
      const art = file(c.illustration), meta = await sharp(art).metadata();
      assert.equal(meta.format, 'png'); assert.ok(meta.width >= R.ART.width && meta.height >= R.ART.height, 'Illustration trop petite.');
      assert.notEqual(await hash(art), await hash(path.join(source(c.key), 'illustration.png')), 'Illustration initiale non corrigee : ' + c.key);
    }
    const before = { revision: REVISION, referenceId: L.baseline().id, selected, observed: {}, changes: [], inventory: {} };
    const observe = async f => { before.observed[f] = await hash(f); };
    const target = async f => {
      assert.ok(!before.changes.some(c => c.target === f)); await observe(f);
      const backup = file('originals/' + path.relative(ROOT, f)); fs.mkdirSync(path.dirname(backup), { recursive: true });
      fs.copyFileSync(f, backup, fs.constants.COPYFILE_EXCL);
      before.changes.push({ target: f, backup, beforeHash: before.observed[f], stage: file('staging/' + path.relative(ROOT, f)) });
    };
    await observe(file('selection.json'));
    const originalSet = currentSet(); M.validateSet(originalSet);
    for (const spec of originalSet.cards) {
      const dir = source(spec.key), published = pub(spec.key);
      for (const f of [dir, path.join(dir, 'render'), published]) before.inventory[f] = fs.readdirSync(f).sort();
      for (const name of [...SHARED, 'profile.json']) {
        assert.equal(await hash(path.join(dir, name)), await hash(path.join(published, name)));
        await observe(path.join(dir, name)); await observe(path.join(published, name));
      }
      await observe(path.join(published, 'creation.json'));
      const creation = read(path.join(published, 'creation.json')), verification = read(path.join(dir, 'verification.json'));
      assert.equal(verification.passed, true); assert.equal(verification.profileHash, await hash(path.join(dir, 'profile.json')));
      for (const [name, expected] of Object.entries(creation.hashes)) assert.equal(await hash(path.join(published, name)), expected);
      for (const [name, expected] of Object.entries(verification.hashes)) assert.equal(await hash(path.join(dir, name)), expected);
      const prepFile = path.join(dir, 'preparation.json'), prep = read(prepFile); await observe(prepFile);
      for (const hashes of [prep.snapshot, prep.inputs]) for (const f of Object.keys(hashes)) await observe(absolute(f));
      await observe(path.join(dir, 'render/native.json'));
    }
    await target(D.CATALOGUE);
    for (const c of selected) {
      const dir = work(c.key), src = source(c.key), published = pub(c.key), art = file(c.illustration);
      await observe(art); const meta = await sharp(art).metadata();
      assert.equal(meta.format, 'png'); assert.ok(meta.width >= R.ART.width && meta.height >= R.ART.height, 'Illustration trop petite.');
      assert.notEqual(await hash(art), await hash(path.join(src, 'illustration.png')), 'Illustration initiale non corrigee : ' + c.key);
      fs.mkdirSync(path.join(dir, 'render'), { recursive: true }); fs.copyFileSync(art, path.join(dir, 'illustration.png'));
      const p = revisedProfile(c.key, read(path.join(src, 'profile.json'))); write(path.join(dir, 'profile.json'), p);
      const plan = read(path.join(src, 'render/composition.json')), artLayer = plan.layers.find(l => l.name === ART);
      assert.deepEqual({ left: artLayer.left, top: artLayer.top, width: artLayer.width, height: artLayer.height }, R.ART);
      for (const l of plan.layers) fs.copyFileSync(path.join(src, 'render', l.file), path.join(dir, 'render', l.file));
      await sharp(art).resize(R.ART.width, R.ART.height, { fit: 'cover' }).png().toFile(path.join(dir, 'render', artLayer.file));
      const replacements = [{ ...artLayer, oldName: ART }];
      if (c.key === 'adam') {
        const weapon = plan.layers.find(l => l.name === OLD_WEAPON), orb = read(path.join(R.ASSETS, 'manifest.json')).weapons.Orbe;
        assert.ok(weapon); assert.deepEqual([weapon.left, weapon.top, weapon.width, weapon.height], [orb.left, orb.top, orb.width, orb.height]);
        const icon = L.inside(R.ASSETS, orb.file); await observe(icon); fs.copyFileSync(icon, path.join(dir, 'render', weapon.file));
        weapon.name = WEAPON; replacements.push({ ...weapon, oldName: OLD_WEAPON });
      }
      write(path.join(dir, 'render/composition.json'), plan); write(path.join(dir, 'replacements.json'), replacements);
      await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: path.join(dir, 'render', l.file) })))).png().toFile(path.join(dir, 'render/expected-components.png'));
      for (const folder of [src, published]) for (const name of SHARED) await target(path.join(folder, name));
      if (c.key === 'adam') for (const folder of [src, published]) await target(path.join(folder, 'profile.json'));
      await target(path.join(published, 'creation.json'));
      for (const name of ['composition.json', 'native.json', 'reopened.png', 'without-text.png', 'expected-components.png', ...replacements.map(l => l.file)]) await target(path.join(src, 'render', name));
      for (const name of ['preview.png', 'small-preview.png']) if (fs.existsSync(path.join(src, name))) await target(path.join(src, name));
      for (const name of ['profile.json', 'illustration.png', 'replacements.json', 'render/composition.json', 'render/expected-components.png', ...plan.layers.map(l => 'render/' + l.file)]) await observe(path.join(dir, name));
    }
    write(file('revised-set.json'), revisedSet(originalSet)); await observe(file('revised-set.json'));
    validateHistoricalLineage(before); await guard(before); write(file('before.json'), before);
    return { prepared: selected.map(c => c.key), historicalPreparationsUnchanged: true, photoshopRun: false };
  });
}
async function render() {
  return B.locked(async () => {
    const before = read(file('before.json')); await stable(); await guard(before); validateHistoricalLineage(before);
    assert.ok(!fs.existsSync(file('verified.json')), 'Deja verifie : ne pas ecraser le rendu certifie.');
    const cards = before.selected.map(c => ({ key: c.key, work: work(c.key), original: backupFor(before, path.join(source(c.key), 'card.psd')),
      native: backupFor(before, path.join(source(c.key), 'render/native.json')), replacements: read(path.join(work(c.key), 'replacements.json')) }));
    write(file('render-request.json'), { revision: REVISION, cards });
    const provenance = read(file('art-provenance.json')); assert.ok(provenance && typeof provenance === 'object', 'Provenance artistique requise.');
    const inputs = await B.hashes([...code, file('art-provenance.json'), file('render-request.json'), ...Object.keys(before.observed)]); write(file('render-inputs.json'), inputs);
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('replace.jsx')], file('photoshop.log'));
    assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs); await guard(before);
    return { rendered: before.selected.map(c => c.key), output };
  });
}
async function verify() {
  return B.locked(async () => {
    const before = read(file('before.json')), inputs = read(file('render-inputs.json'));
    await stable(); await guard(before); validateHistoricalLineage(before); assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
    const staged = [], proofs = [], evidence = [];
    const stage = async (target, value, json = false) => {
      const c = before.changes.find(c => c.target === target); assert.ok(c, 'Cible hors perimetre : ' + target);
      fs.mkdirSync(path.dirname(c.stage), { recursive: true }); if (json) write(c.stage, value); else fs.copyFileSync(value, c.stage);
      assert.ok(!staged.some(s => s.target === target)); staged.push({ ...c, afterHash: await hash(c.stage) });
    };
    const expectedSet = read(file('revised-set.json')), cat = read(D.CATALOGUE);
    for (const c of before.selected) {
      const key = c.key, dir = work(key), src = source(key), published = pub(key), p = read(path.join(dir, 'profile.json'));
      assertProfileDelta(key, read(path.join(src, 'profile.json')), p); M.validateProfile(p, expectedSet.cards.find(s => s.key === key));
      const a = read(path.join(dir, 'audit.json')), n = read(path.join(dir, 'render/native.json')), old = read(path.join(src, 'render/native.json'));
      assert.deepEqual(unchangedLayers(a.before, key), unchangedLayers(old.layers, key));
      assert.deepEqual(unchangedLayers(a.before, key), unchangedLayers(a.after, key));
      assert.deepEqual(unchangedLayers(a.after, key), unchangedLayers(a.reopened, key));
      assert.deepEqual(n.layers, a.reopened); assert.deepEqual(n.expected, old.expected); assert.deepEqual(n.typography, old.typography);
      const replacements = read(path.join(dir, 'replacements.json'));
      for (const r of replacements) {
        unchangedLayerGeometry(a.before, a.after, r.oldName, r.name); unchangedLayerGeometry(a.after, a.reopened, r.name, r.name);
      }
      const plan = read(path.join(dir, 'render/composition.json'));
      assert.deepEqual(a.embedded, Object.fromEntries(plan.layers.map(l => [l.name, true])));
      const originalPixels = await L.diff(path.join(src, 'card.png'), path.join(dir, 'before-card.png'));
      const withoutChanges = await L.diff(path.join(dir, 'before-without-changes.png'), path.join(dir, 'after-without-changes.png'));
      const outside = await L.diff(path.join(src, 'card.png'), path.join(dir, 'card.png'), replacements.map(r => [r.left, r.top, r.left + r.width, r.top + r.height]));
      assert.equal(originalPixels.changed, 0); assert.equal(withoutChanges.changed, 0); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
      const v = { ...await B.verifyNative(dir, p), key, revision: REVISION,
        lineage: { originalPreparationHash: before.observed[path.join(src, 'preparation.json')], originalVerificationHash: before.observed[path.join(src, 'verification.json')],
          selectedArtHash: before.observed[file(c.illustration)], originalPsdHash: before.observed[path.join(src, 'card.psd')] },
        scope: { originalPixels, withoutChanges, outside, changedFields: key === 'adam' ? ['weapon', 'weapon_index'] : [], nativeTextUnchanged: true, embeddedObjects: true } };
      write(path.join(dir, 'verification.json'), v); proofs.push(v);
      for (const folder of [src, published]) for (const name of SHARED) await stage(path.join(folder, name), path.join(dir, name));
      if (key === 'adam') for (const folder of [src, published]) await stage(path.join(folder, 'profile.json'), path.join(dir, 'profile.json'));
      for (const name of ['composition.json', 'native.json', 'reopened.png', 'without-text.png', 'expected-components.png', ...replacements.map(l => l.file)]) await stage(path.join(src, 'render', name), path.join(dir, 'render', name));
      for (const name of ['preview.png', 'small-preview.png']) if (fs.existsSync(path.join(src, name))) {
        if (name === 'preview.png') await stage(path.join(src, name), path.join(dir, 'card.png'));
        else { await sharp(path.join(dir, 'card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 }).resize({ width: 320 }).png().toFile(path.join(dir, name)); await stage(path.join(src, name), path.join(dir, name)); }
      }
      const creation = read(path.join(published, 'creation.json'));
      for (const name of [...SHARED, 'profile.json']) creation.hashes[name] = await hash(path.join(dir, name));
      creation.nativeRevision = { id: REVISION, proof: path.relative(ROOT, file('verified.json')).replace(/\\/g, '/'), previousCreationHash: before.observed[path.join(published, 'creation.json')] };
      await stage(path.join(published, 'creation.json'), creation, true);
      const entry = cat.cards.find(e => e.id === p.id); assert.ok(entry); assertProfileDelta(key, entry.profile, p); entry.profile = p;
      evidence.push(...['audit.json', 'before-card.png', 'before-without-changes.png', 'after-without-changes.png', 'verification.json'].map(n => path.join(dir, n)));
    }
    await stage(D.CATALOGUE, cat, true);
    assert.equal(staged.length, before.changes.length); const game = await gameCheck(cat, read(D.CATALOGUE), expectedSet);
    await guard(before); validateHistoricalLineage(before);
    const proof = { revision: REVISION, beforeHash: await hash(file('before.json')), inputs, staged, proofs, game, evidence: await B.hashes(evidence) };
    write(file('verified.json'), proof); await verifyCurrent(before, proof, new Map(staged.map(c => [c.target, c.stage])));
    return { verified: before.selected.map(c => c.key), game, productionUnchanged: true };
  });
}
async function proofIntegrity(before, proof) {
  assert.equal(proof.revision, REVISION); assert.equal(proof.beforeHash, await hash(file('before.json')));
  const ordered = rows => [...rows].sort((a, b) => a.target.localeCompare(b.target));
  assert.deepEqual(ordered(proof.staged.map(({ afterHash, ...c }) => c)), ordered(before.changes), 'Inventaire de publication altere.');
  for (const c of proof.staged) assert.equal(await hash(c.stage), c.afterHash);
  for (const [f, h] of Object.entries(proof.inputs)) {
    const c = before.changes.find(c => c.target === f);
    assert.equal(await hash(c ? c.backup : f), h, 'Entree de rendu modifiee : ' + f);
  }
  assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence);
}
async function verifyCurrent(before, proof, mapping = new Map()) {
  const resolve = f => mapping.get(f) || f;
  for (const c of proof.staged) assert.equal(await hash(resolve(c.target)), c.afterHash);
  const cat = read(resolve(D.CATALOGUE)), initial = read(backupFor(before, D.CATALOGUE)), expectedSet = read(file('revised-set.json'));
  const expectedCat = structuredClone(initial);
  for (const c of before.selected) {
    const src = source(c.key), published = pub(c.key), p = read(resolve(path.join(src, 'profile.json')));
    const oldProfile = before.changes.some(x => x.target === path.join(src, 'profile.json')) ? read(backupFor(before, path.join(src, 'profile.json'))) : read(path.join(src, 'profile.json'));
    assertProfileDelta(c.key, oldProfile, p); M.validateProfile(p, expectedSet.cards.find(s => s.key === c.key));
    for (const name of [...SHARED, 'profile.json']) assert.equal(await hash(resolve(path.join(src, name))), await hash(resolve(path.join(published, name))));
    const creation = read(resolve(path.join(published, 'creation.json'))), v = read(resolve(path.join(src, 'verification.json')));
    assert.equal(creation.nativeRevision.id, REVISION); assert.equal(v.revision, REVISION); assert.equal(v.passed, true);
    assert.equal(v.profileHash, await hash(resolve(path.join(src, 'profile.json'))));
    for (const [name, h] of Object.entries(creation.hashes)) assert.equal(await hash(resolve(path.join(published, name))), h);
    for (const [name, h] of Object.entries(v.hashes)) assert.equal(await hash(resolve(path.join(src, name))), h);
    assert.deepEqual(v, proof.proofs.find(p => p.key === c.key));
    expectedCat.cards.find(e => e.id === p.id).profile = p;
  }
  assert.deepEqual(cat, expectedCat, 'Catalogue modifie hors profils autorises.');
  validateHistoricalLineage(before); return gameCheck(cat, initial, expectedSet);
}
async function preflight() {
  const before = read(file('before.json')), proof = read(file('verified.json'));
  await stable(); await proofIntegrity(before, proof);
  const published = fs.existsSync(file('transaction.json')) && read(file('transaction.json')).state === 'published';
  await guard(before, published ? 'published' : 'original', Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash])));
  const game = await verifyCurrent(before, proof, published ? new Map() : new Map(proof.staged.map(c => [c.target, c.stage])));
  return { revision: REVISION, state: published ? 'published' : 'staged', verified: before.selected.map(c => c.key), game, historicalLineageVerified: true };
}
async function publish() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json'));
    const afterHashes = Object.fromEntries(proof.staged.map(c => [c.target, c.afterHash]));
    return tx.commit({ revision: REVISION, beforeHash: proof.beforeHash, changes: proof.staged }, {
      before: () => preflight(), guard: () => guard(before, 'mixed'),
      after: async () => { await guard(before, 'published', afterHashes); await stable(); await verifyCurrent(before, proof); },
      afterRollback: async () => { await guard(before); await stable(); g.publication(); }
    });
  });
}
async function rollback() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json')), journal = read(file('transaction.json'));
    assert.equal(journal.revision, REVISION); assert.equal(journal.beforeHash, await hash(file('before.json')));
    assert.deepEqual(journal.changes, proof.staged); await proofIntegrity(before, proof);
    return tx.rollback(journal, { guard: () => guard(before, 'mixed'), afterRollback: async () => { await guard(before); await stable(); g.publication(); } });
  });
}
module.exports = { check, prepare, render, verify, preflight, publish, rollback, selection, revisedProfile, assertProfileDelta, revisedSet, unchangedLayers, unchangedLayerGeometry };
if (require.main === module) {
  const action = process.argv[2] || 'check'; assert.ok(['check', 'prepare', 'render', 'verify', 'preflight', 'publish', 'rollback'].includes(action));
  module.exports[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
