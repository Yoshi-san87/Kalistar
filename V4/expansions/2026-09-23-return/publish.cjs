'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
const FILES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png'];
function createPublisher(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const { fs, path, ROOT, DATA, read, write, crypto } = L, home = options.home || __dirname, local = n => L.inside(home, n);
  const guard = require('./preservation.cjs').createGuard(L, D, home), lock = path.join(DATA, 'render.lock');
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex'), bytes = value => Buffer.from(JSON.stringify(value, null, 2));
  const absolute = f => {
    const file = L.inside(ROOT, f); let cursor = file;
    while (cursor !== ROOT) { if (fs.existsSync(cursor)) assert.ok(!fs.lstatSync(cursor).isSymbolicLink(), 'Lien interdit.'); cursor = path.dirname(cursor); }
    return file;
  };
  const hashNow = f => fs.existsSync(absolute(f)) ? guard.digest(absolute(f)) : null;
  function safeTarget(f) {
    assert.ok(/^V4\/(?:creations\/[4][0-9]{7}\/(?:profile\.json|card\.png|card\.psd|verification\.json|illustration\.png|creation\.json)|templates\/KALISTAR_V4_3[0-9]{7}\.psd|cartes\/KALISTAR_V4_3[0-9]{7}\.png|template-stable\/return-20260923\/[a-z0-9-]+\/card\.json|atelier\/designer-assets\/(?:manifest(?:\.raw)?\.json|(?:packed\/)?banks\/return-weapon-[0-9]+\.png)|atelier\/data\/(?:references|regression)\.json|donnees\/catalogue\.json)$/.test(f), 'Cible hors transaction : ' + f);
    return absolute(f);
  }
  function generated(to, value) { const buffer = bytes(value); return { to, bytes: buffer, hash: sha(buffer) }; }
  async function inspect() {
    guard.publication(); await L.protectedCheck();
    const canonical = await (options.canonical || require('./canonical.cjs')).createPlan(L, D, home), set = M.validateSet(read(local('set.json')));
    const report = read(local('canonical-regression.json'));
    assert.equal(report.passed, true); assert.equal(report.planDigest, canonical.digest);
    assert.equal(report.referenceId, canonical.next.id); assert.equal(report.previousReferenceId, canonical.before.id);
    assert.equal(report.rendererHash, await L.rendererHash());
    assert.deepEqual(report.results.map(r => r.key).sort(), canonical.next.cards.map(c => c.key).sort());
    for (const r of report.results) assert.ok(r.passed && r.comparison?.changed === 0 && r.roundtrip?.changed === 0 && r.barcode?.passed === true);
    const observed = await require('./evidence.cjs').inspectRegression(L, home, report, canonical);
    const cat = D.catalogue(), install = [...canonical.install], added = [];
    const observe = async f => observed.set(f, await L.hash(f));
    for (const file of ['set.json', 'canonical-regression.json', 'existing-created.snapshot.json']) await observe(local(file));
    for (const c of set.cards) {
      const dir = local('cards/' + c.key), p = read(path.join(dir, 'profile.json')), v = read(path.join(dir, 'verification.json'));
      M.validateProfile(p, c); const hashes = {};
      for (const file of FILES) { const f = path.join(dir, file); hashes[file] = await L.hash(f); observed.set(f, hashes[file]); }
      assert.ok(v.passed && v.referenceId === canonical.before.id && v.modelId === p.id && v.testOnly !== true);
      assert.equal(v.profileHash, hashes['profile.json']);
      for (const f of ['card.png', 'card.psd']) assert.equal(v.hashes[f], hashes[f]);
      assert.ok(v.components?.fixedDifferences === 0 && v.components?.severePixels === 0 && v.roundtrip?.changed === 0 && v.barcode?.passed === true);
      assert.equal(v.barcode.expected, c.id);
      const meta = await L.sharp(path.join(dir, 'card.png')).metadata(); assert.deepEqual([meta.width, meta.height], [897, 1497]);
      assert.ok(v.typography?.NOM && v.typography?.TITLE);
      if (c.element === 'NONE') {
        assert.equal(v.none?.unlit, true);
        const manifest = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'));
        for (const kind of ['crystal', 'branch']) assert.equal(v.none[kind + 'Hash'], await L.hash(path.join(ROOT, 'V4/atelier/designer-assets', manifest.elements.NONE[kind].file)));
      }
      if (c.edition === 'canonical') continue;
      assert.match(p.id, /^4\d{7}$/); const target = 'V4/creations/' + p.id;
      assert.ok(!fs.existsSync(absolute(target)), 'Creation deja presente : ' + p.id);
      assert.ok(!cat.cards.some(old => old.id === p.id));
      const creation = { job: crypto.randomUUID(), setId: M.SET, key: c.key, modelId: p.id, hashes,
        ...(c.legacyId ? { legacyId: c.legacyId, edition: c.edition, replacesModel: false } : {}), createdAt: report.checkedAt };
      for (const file of FILES) install.push({ to: target + '/' + file, from: path.join(dir, file), hash: hashes[file] });
      install.push(generated(target + '/creation.json', creation));
      added.push({ id: p.id, kind: 'created', creationJob: creation.job, name: p.name, title: p.title, element: p.element, profile: p,
        png: target + '/card.png', psd: target + '/card.psd', pngUrl: '/media/created/' + p.id + '.png', psdUrl: '/media/created/' + p.id + '.psd',
        createdAt: creation.createdAt, publicationSource: 'V4/expansions/' + M.SET });
    }
    const approved = canonical.next.cards.map(e => ({ id: e.card.id, kind: 'approved', key: e.key, name: e.card.name, title: e.card.title,
      element: e.card.element, profile: e.card, png: e.png, psd: e.psd, pngUrl: '/media/reference/' + e.key + '.png', psdUrl: null }));
    const nextCat = { schemaVersion: 4, referenceId: canonical.next.id, cards: [...approved, ...cat.cards.filter(c => c.kind === 'created'), ...added] };
    const data = await (options.prospective || require('./catalogue.cjs').prospective)(L, canonical.next, nextCat.cards.filter(c => c.kind === 'created'));
    M.validateGame(data, set, options.createEngine || require('../../site/engine.js').createEngine);
    install.push(generated('V4/atelier/data/regression.json', report), generated('V4/atelier/data/references.json', canonical.next), generated('V4/donnees/catalogue.json', nextCat));
    assert.equal(new Set(install.map(op => op.to)).size, install.length);
    for (const op of install) { safeTarget(op.to); op.beforeHash = hashNow(op.to); if (op.from) observed.set(op.from, op.hash); }
    assert.deepEqual(nextCat.cards.filter(c => c.kind === 'created' && !added.some(a => a.id === c.id)), cat.cards.filter(c => c.kind === 'created'));
    return { canonical, nextCat, install, observed, added, count: set.cards.length };
  }
  async function recheck(plan) {
    guard.publication(); await L.protectedCheck();
    for (const [f, h] of plan.observed) assert.equal(await L.hash(f), h, 'Entree modifiee pendant publication : ' + f);
    for (const op of plan.install) assert.equal(hashNow(op.to), op.beforeHash, 'Cible modifiee pendant publication : ' + op.to);
  }
  const summary = p => ({ cards: p.count, canonical: p.canonical.newEntries.length, created: p.added.length, referenceId: p.canonical.next.id, ids: p.nextCat.cards.slice(-p.added.length).map(c => c.id) });
  async function preflight() { assert.ok(!fs.existsSync(lock)); const plan = await inspect(); await recheck(plan); return { ...summary(plan), published: false }; }
  async function restore(journal) {
    assert.equal(journal.setId, M.SET); assert.match(journal.id, /^[a-f0-9-]{36}$/);
    for (const row of journal.files) {
      safeTarget(row.to); assert.ok([row.beforeHash, row.hash].includes(hashNow(row.to)), 'Modification tierce, rollback refuse : ' + row.to);
      if (row.beforeHash !== null) {
        assert.equal(row.backup, 'publication/' + journal.id + '/before/' + row.to);
        assert.equal(guard.digest(local(row.backup)), row.beforeHash);
      }
    }
    for (const row of [...journal.files].reverse()) {
      const f = safeTarget(row.to); if (hashNow(row.to) === row.beforeHash) continue;
      if (row.beforeHash === null) fs.unlinkSync(f);
      else { const temp = f + '.' + crypto.randomUUID() + '.tmp'; fs.copyFileSync(local(row.backup), temp, fs.constants.COPYFILE_EXCL); fs.renameSync(temp, f); }
    }
    const createdFolders = new Set(journal.files.filter(r => r.beforeHash === null && /^V4\/creations\//.test(r.to)).map(r => path.dirname(absolute(r.to))));
    for (const folder of createdFolders) if (fs.existsSync(folder) && fs.readdirSync(folder).length === 0) fs.rmdirSync(folder);
    journal.phase = 'rolled-back'; write(local('publication/' + journal.id + '/journal.json'), journal);
  }
  async function publish() {
    assert.ok(!fs.existsSync(local('published.json')), 'Publication deja effectuee.');
    const id = crypto.randomUUID(), owner = { id, pid: process.pid, kind: 'return-publication' }; let fd, journal;
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify(owner));
      const plan = await inspect(), transaction = local('publication/' + id); fs.mkdirSync(transaction, { recursive: true });
      journal = { id, setId: M.SET, phase: 'staging', files: [] };
      for (const op of plan.install) {
        const staged = path.join(transaction, 'staging', op.to), backup = op.beforeHash === null ? null : 'publication/' + id + '/before/' + op.to;
        fs.mkdirSync(path.dirname(staged), { recursive: true });
        if (op.bytes) fs.writeFileSync(staged, op.bytes, { flag: 'wx' }); else fs.copyFileSync(op.from, staged, fs.constants.COPYFILE_EXCL);
        assert.equal(await L.hash(staged), op.hash);
        if (backup) { const f = local(backup); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.copyFileSync(absolute(op.to), f, fs.constants.COPYFILE_EXCL); assert.equal(await L.hash(f), op.beforeHash); }
        journal.files.push({ to: op.to, hash: op.hash, beforeHash: op.beforeHash, backup });
      }
      write(path.join(transaction, 'journal.json'), journal); await recheck(plan);
      journal.phase = 'applying'; write(path.join(transaction, 'journal.json'), journal);
      for (const row of journal.files) {
        assert.equal(hashNow(row.to), row.beforeHash); const target = safeTarget(row.to); fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.renameSync(path.join(transaction, 'staging', row.to), target);
      }
      for (const row of journal.files) assert.equal(hashNow(row.to), row.hash);
      await L.protectedCheck(plan.canonical.next);
      assert.deepEqual(L.baseline().cards.slice(0, plan.canonical.before.cards.length), plan.canonical.before.cards);
      const old = read(guard.snapshotFile);
      for (const [f, h] of Object.entries(old.files)) assert.equal(await L.hash(absolute(f)), h, 'Ancienne creation modifiee.');
      journal.phase = 'committed'; write(path.join(transaction, 'journal.json'), journal);
      const result = { ...summary(plan), published: true, transaction: id, checkedAt: new Date().toISOString() }; write(local('published.json'), result); return result;
    } catch (error) {
      if (journal?.phase === 'applying') { try { await restore(journal); } catch (rollback) { throw new AggregateError([error, rollback], 'Rollback incomplet : conserver les sauvegardes.'); } }
      throw error;
    } finally { if (fd !== undefined) { fs.closeSync(fd); if (read(lock).id === id) fs.unlinkSync(lock); } }
  }
  async function rollback(id) {
    assert.match(id, /^[a-f0-9-]{36}$/); assert.ok(!fs.existsSync(lock));
    const journal = read(local('publication/' + id + '/journal.json')); assert.equal(journal.phase, 'applying');
    const fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, kind: 'return-rollback', pid: process.pid }));
    try { await restore(journal); return { rolledBack: true }; } finally { fs.closeSync(fd); fs.unlinkSync(lock); }
  }
  return { inspect, preflight, publish, rollback, safeTarget };
}
async function main(args = process.argv.slice(2), publisher) {
  const p = publisher || createPublisher();
  if (!args.length) return p.preflight();
  if (args.length === 1 && args[0] === '--publish') return p.publish();
  if (args.length === 2 && args[0] === '--rollback') return p.rollback(args[1]);
  throw Error('Usage: publish.cjs [--publish | --rollback transaction-id]');
}
module.exports = { createPublisher, main, FILES };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
