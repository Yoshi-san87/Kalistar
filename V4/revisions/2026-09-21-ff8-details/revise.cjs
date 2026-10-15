'use strict';
const assert = require('node:assert/strict');
const REVISION = '2026-09-21-ff8-details';
const KEYS = ['linoa', 'irvine', 'laguna', 'zell', 'seifer'];
const FILES = ['profile.json', 'card.png', 'card.psd', 'illustration.png', 'verification.json'];
const ART = { left: 80, top: 156, width: 737, height: 921 };
const semanticLayers = layers => layers.map(({ id, ...layer }) => layer);

function createRevision(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs');
  const R = options.R || require('../../atelier/designer-render.cjs');
  const D = options.D || require('../../atelier/designer-core.cjs');
  const publisher = options.createPublisher || require('../../collaborations/ff8-set-01/publish.cjs').createPublisher;
  const builder = options.createBuilder || require('../../collaborations/ff8-set-01/build.cjs').createBuilder;
  const { fs, path, crypto, ROOT, DATA, read, write, hash, sharp } = L;
  const home = options.home || __dirname, local = name => L.inside(home, name);
  const production = path.join(ROOT, 'V4/collaborations/ff8-set-01');
  const lock = path.join(DATA, 'render.lock');
  let owner;
  const regular = file => assert.ok(fs.lstatSync(file).isFile(), 'Fichier regulier requis : ' + file);
  const sameHash = async (file, expected) => assert.equal(await hash(file), expected, 'Empreinte modifiee : ' + file);
  const cardPaths = key => {
    assert.ok(KEYS.includes(key));
    const source = path.join(production, 'cards', key), profile = read(path.join(source, 'profile.json'));
    assert.ok(/^4\d{7}$/.test(profile.id) && profile.characterId === key + '-ff8' && profile.collaboration === 'FF8');
    return { key, id: profile.id, source, published: path.join(ROOT, 'V4/creations', profile.id), work: local('work/' + key) };
  };
  function targets(cards) {
    const paths = [path.join(production, 'verification.json')];
    for (const c of cards) {
      for (const dir of [c.source, c.published]) for (const name of FILES.filter(n => n !== 'profile.json')) paths.push(path.join(dir, name));
      paths.push(path.join(c.published, 'creation.json'), path.join(production, 'illustrations', c.key + '.png'));
      for (const name of ['preparation.json', 'render/component-00.png', 'render/expected-components.png', 'render/native.json', 'render/reopened.png', 'render/without-text.png']) paths.push(path.join(c.source, name));
      for (const name of ['preview.png', 'small-preview.png']) if (fs.existsSync(path.join(c.source, name))) paths.push(path.join(c.source, name));
    }
    return paths;
  }
  async function locked(action) {
    assert.equal(owner, undefined, 'Transaction deja active.');
    const token = JSON.stringify({ pid: process.pid, id: crypto.randomUUID(), kind: REVISION }); let fd;
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, token); owner = token;
      return await action();
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
        if (fs.existsSync(lock) && fs.readFileSync(lock, 'utf8') === token) fs.unlinkSync(lock);
      }
      owner = undefined;
    }
  }
  function owned() { assert.ok(owner && fs.readFileSync(lock, 'utf8') === owner, 'Verrou de revision perdu.'); }
  // The existing publisher remains read-only. It borrows our lock, and reads staged
  // replacements through this overlay before a single production file is changed.
  function overlay(mapping = new Map()) {
    const resolve = file => typeof file === 'string' ? mapping.get(file) || file : file;
    return { ...L, read: file => read(resolve(file)), hash: file => hash(resolve(file)), sharp: input => sharp(resolve(input)),
      fs: { ...fs, existsSync: file => { if (file === lock) { owned(); return false; } return fs.existsSync(resolve(file)); },
        readFileSync: (file, ...args) => fs.readFileSync(resolve(file), ...args), lstatSync: file => fs.lstatSync(resolve(file)) } };
  }
  async function preflight(mapping) {
    owned();
    const result = await publisher({ L: overlay(mapping), D, home: production }).preflight();
    assert.equal(result.added, 0, 'La revision exige douze cartes deja publiees.');
    assert.equal(result.reused, 12); return result;
  }
  async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
  async function check() {
    const missing = KEYS.map(k => local('art/' + k + '.png')).filter(f => !fs.existsSync(f));
    return { revision: REVISION, keys: KEYS, missing, prepared: fs.existsSync(local('before.json')), verified: fs.existsSync(local('verified.json')),
      transaction: fs.existsSync(local('transaction.json')) ? read(local('transaction.json')).state : null };
  }
  async function guard(before, mode = 'before') {
    owned(); assert.equal(before.revision, REVISION); assert.equal(before.referenceId, L.baseline().id);
    assert.deepEqual(before.cards, KEYS.map(cardPaths));
    assert.deepEqual(before.changes.map(c => c.target), targets(before.cards));
    for (const [file, oldHash] of Object.entries(before.observed)) {
      const change = before.changes.find(c => c.target === file);
      if (mode === 'immutable' && change) continue;
      await sameHash(file, oldHash);
    }
    for (const c of before.changes) {
      assert.equal(c.stage, local('staging/' + path.relative(ROOT, c.target)));
      assert.equal(c.backup, local('originals/' + c.beforeHash + path.extname(c.target)));
      assert.equal(c.beforeHash, before.observed[c.target]);
      await sameHash(c.backup, c.beforeHash);
    }
  }
  async function prepare() {
    return locked(async () => {
      assert.ok(!fs.existsSync(local('originals')) && !fs.existsSync(local('before.json')), 'Sauvegardes deja presentes : ne pas les ecraser.');
      assert.deepEqual((await check()).missing, [], 'Les cinq illustrations sont requises.');
      await stable(); await preflight();
      const before = { revision: REVISION, referenceId: L.baseline().id, cards: KEYS.map(cardPaths), observed: {}, changes: [] };
      const observe = async file => { regular(file); before.observed[file] = await hash(file); };
      await observe(D.CATALOGUE);
      for (const name of ['revise.cjs', 'replace.jsx']) await observe(local(name));
      for (const file of ['V4/scripts/stable/common.jsx', 'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py']) await observe(path.join(ROOT, file));
      for (const entry of D.catalogue().cards) {
        for (const file of [entry.png, entry.psd].filter(Boolean)) await observe(L.inside(ROOT, file));
        if (entry.kind === 'created') for (const name of [...FILES, 'creation.json']) await observe(path.join(ROOT, 'V4/creations', entry.id, name));
      }
      for (const spec of read(path.join(production, 'set.json')).cards) for (const name of FILES) await observe(path.join(production, 'cards', spec.key, name));
      for (const c of before.cards) {
        const art = local('art/' + c.key + '.png'); await observe(art);
        const m = await sharp(art).metadata(); assert.ok(m.format === 'png' && m.width > 0 && m.height > 0 && (m.pages || 1) === 1, 'PNG simple requis : ' + art);
        assert.notEqual(await hash(art), await hash(path.join(c.source, 'illustration.png')), 'Illustration identique : ' + c.key);
        const prep = read(path.join(c.source, 'preparation.json'));
        assert.equal(prep.referenceId, before.referenceId);
        for (const [file, expected] of Object.entries({ ...prep.snapshot, ...prep.inputs })) { await sameHash(file, expected); await observe(file); }
        const plan = read(path.join(c.source, 'render/composition.json'));
        assert.deepEqual(plan.layers[0], { file: 'component-00.png', name: 'ILLUSTRATION - cadrage', ...ART });
        for (const layer of plan.layers) await observe(L.inside(path.join(c.source, 'render'), layer.file));
      }
      for (const target of targets(before.cards)) {
        await observe(target);
        const beforeHash = before.observed[target], backup = local('originals/' + beforeHash + path.extname(target));
        fs.mkdirSync(path.dirname(backup), { recursive: true });
        if (!fs.existsSync(backup)) fs.copyFileSync(target, backup, fs.constants.COPYFILE_EXCL);
        await sameHash(backup, beforeHash);
        before.changes.push({ target, backup, beforeHash, stage: local('staging/' + path.relative(ROOT, target)) });
      }
      for (const c of before.cards) {
        fs.mkdirSync(c.work, { recursive: true });
        fs.copyFileSync(local('art/' + c.key + '.png'), path.join(c.work, 'illustration.png'), fs.constants.COPYFILE_EXCL);
        await sharp(path.join(c.work, 'illustration.png')).resize(ART.width, ART.height, { fit: 'cover' }).png().toFile(path.join(c.work, 'component-00.png'));
        const plan = read(path.join(c.source, 'render/composition.json'));
        const layers = plan.layers.map((l, i) => ({ ...l, input: i ? path.join(c.source, 'render', l.file) : path.join(c.work, 'component-00.png') }));
        await sharp(await R.composite(layers)).png().toFile(path.join(c.work, 'expected-components.png'));
        for (const name of ['illustration.png', 'component-00.png', 'expected-components.png']) await observe(path.join(c.work, name));
      }
      await guard(before); await stable(); write(local('before.json'), before);
      return { prepared: KEYS, productionUnchanged: true };
    });
  }
  async function render() {
    return locked(async () => {
      assert.ok(!fs.existsSync(local('transaction.json')), 'Transaction deja ouverte.');
      const before = read(local('before.json')); await guard(before); await stable();
      // A failed or interrupted new render must never leave an earlier proof usable.
      if (fs.existsSync(local('verified.json'))) fs.renameSync(local('verified.json'), local('verified.stale-' + crypto.randomUUID() + '.json'));
      const cards = before.cards.map(c => ({ key: c.key, work: c.work,
        original: before.changes.find(f => f.target === path.join(c.source, 'card.psd')).backup }));
      write(local('render-request.json'), { cards });
      const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', local('replace.jsx')], local('photoshop.log'));
      await guard(before); return { rendered: KEYS, output };
    });
  }
  async function verify() {
    return locked(async () => {
      assert.ok(!fs.existsSync(local('transaction.json')), 'Transaction deja ouverte.');
      const before = read(local('before.json')); await guard(before); await stable();
      const mapping = new Map(), results = [], evidence = {};
      const original = target => before.changes.find(c => c.target === target).backup;
      const stage = (target, input, json = false) => {
        const change = before.changes.find(c => c.target === target); assert.ok(change, 'Cible non autorisee : ' + target);
        fs.mkdirSync(path.dirname(change.stage), { recursive: true });
        if (json) write(change.stage, input); else fs.copyFileSync(input, change.stage);
        mapping.set(target, change.stage);
      };
      for (const c of before.cards) {
        const work = name => path.join(c.work, name), source = name => path.join(c.source, name);
        const n = read(work('native.json')), oldNative = read(original(source('render/native.json')));
        assert.deepEqual([n.width, n.height, n.resolution], [897, 1497, 300]);
        assert.deepEqual(n.before, n.after, 'Calques ou geometrie modifies : ' + c.key);
        assert.deepEqual(semanticLayers(n.before), semanticLayers(oldNative.layers), 'PSD original different de sa preuve native.');
        assert.deepEqual(semanticLayers(n.after), semanticLayers(n.layers), 'Calques modifies apres reouverture.');
        const art = n.layers.filter(l => l.name === 'ILLUSTRATION - cadrage');
        assert.ok(art.length === 1 && art[0].visible && art[0].kind === 'LayerKind.SMARTOBJECT');
        assert.deepEqual(art[0].bounds, [80, 156, 817, 1077]);
        const originalPixels = await L.diff(original(source('card.png')), work('before-card.png'));
        const withoutArt = await L.diff(work('before-without-art.png'), work('after-without-art.png'));
        const outside = await L.diff(original(source('card.png')), work('card.png'), [[80, 156, 817, 1077]]);
        const roundtrip = await L.diff(work('card.png'), work('reopened.png'));
        assert.equal(originalPixels.changed, 0, 'PSD original et PNG publie differents.');
        assert.equal(withoutArt.changed, 0, 'Pixels sans illustration modifies.');
        assert.equal(outside.outside, 0, 'Pixels hors illustration modifies.');
        assert.ok(outside.changed > 0, 'Aucun changement visible.'); assert.equal(roundtrip.changed, 0, 'Reouverture PSD differente.');
        const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), work('card.png'), c.id]));
        assert.equal(barcode.passed, true); if (barcode.expected !== undefined) assert.equal(barcode.expected, c.id);
        for (const name of ['card.png', 'card.psd', 'illustration.png']) for (const dir of [c.source, c.published]) stage(path.join(dir, name), work(name));
        for (const name of ['component-00.png', 'expected-components.png', 'reopened.png', 'without-text.png']) stage(source('render/' + name), work(name));
        stage(source('render/native.json'), { ...oldNative, layers: n.layers, artworkRevision: REVISION }, true);
        stage(path.join(production, 'illustrations', c.key + '.png'), work('illustration.png'));
        for (const name of ['preview.png', 'small-preview.png']) if (fs.existsSync(source(name))) {
          if (name === 'preview.png') stage(source(name), work('card.png'));
          else { await sharp(work('card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 }).resize({ width: 320 }).png().toFile(work(name)); stage(source(name), work(name)); }
        }
        const components = await builder({ L: overlay(mapping), R, D, home: production }).components(c.source, read(source('render/composition.json')));
        assert.equal(components.fixedDifferences, 0); assert.equal(components.severePixels, 0);
        const v = { ...read(original(source('verification.json'))), passed: true, key: c.key,
          hashes: { 'card.png': await hash(work('card.png')), 'card.psd': await hash(work('card.psd')) },
          components, roundtrip, barcode, illustrationOnly: { withoutArt, outside, originalPixels, layerStateIdentical: true },
          revision: REVISION, checkedAt: new Date().toISOString() };
        for (const dir of [c.source, c.published]) stage(path.join(dir, 'verification.json'), v, true);
        const prep = read(original(source('preparation.json'))), updated = [];
        for (const input of Object.keys(prep.inputs)) if (mapping.has(input)) { prep.inputs[input] = await hash(mapping.get(input)); updated.push(input); }
        assert.deepEqual(updated.sort(), [source('illustration.png'), source('render/component-00.png'), source('render/expected-components.png'), path.join(production, 'illustrations', c.key + '.png')].sort());
        stage(source('preparation.json'), prep, true);
        const creationFile = path.join(c.published, 'creation.json'), creation = read(original(creationFile));
        for (const name of FILES) creation.hashes[name] = await hash(mapping.get(path.join(c.published, name)) || path.join(c.published, name));
        creation.artworkRevision = REVISION; stage(creationFile, creation, true); results.push(v);
        for (const name of ['native.json', 'before-card.png', 'before-without-art.png', 'after-without-art.png', 'card.png', 'card.psd', 'reopened.png', 'without-text.png']) evidence[work(name)] = await hash(work(name));
      }
      const aggregateFile = path.join(production, 'verification.json'), aggregate = read(original(aggregateFile));
      assert.equal(aggregate.results.length, 12); assert.equal(new Set(aggregate.results.map(r => r.key)).size, 12);
      for (const v of results) assert.ok(aggregate.results.some(r => r.key === v.key));
      aggregate.results = aggregate.results.map(r => results.find(v => v.key === r.key) || r); stage(aggregateFile, aggregate, true);
      assert.equal(mapping.size, before.changes.length);
      const staged = {};
      for (const c of before.changes) staged[c.target] = await hash(c.stage);
      await guard(before); const publication = await preflight(mapping); await stable();
      write(local('verified.json'), { revision: REVISION, beforeHash: await hash(local('before.json')), staged, evidence, publication });
      return { verified: KEYS, reused: publication.reused, outsideArtChanged: 0, productionUnchanged: true };
    });
  }
  async function verified(before) {
    const proof = read(local('verified.json')); assert.equal(proof.revision, REVISION);
    await sameHash(local('before.json'), proof.beforeHash);
    assert.deepEqual(Object.keys(proof.staged), before.changes.map(c => c.target));
    for (const c of before.changes) await sameHash(c.stage, proof.staged[c.target]);
    for (const [file, expected] of Object.entries(proof.evidence)) await sameHash(file, expected);
    return proof;
  }
  async function install(source, target, expectedCurrent, expectedNew) {
    owned(); await sameHash(target, expectedCurrent);
    const temp = target + '.' + crypto.randomUUID() + '.tmp';
    try {
      fs.copyFileSync(source, temp, fs.constants.COPYFILE_EXCL); await sameHash(temp, expectedNew);
      await sameHash(target, expectedCurrent); owned(); fs.renameSync(temp, target);
    } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
  }
  async function restore(before, transaction) {
    assert.equal(transaction.revision, REVISION); await sameHash(local('before.json'), transaction.beforeHash);
    assert.deepEqual(Object.keys(transaction.staged), before.changes.map(c => c.target));
    await guard(before, 'immutable');
    // Check every destination before rollback, so later independent edits are never overwritten.
    for (const c of before.changes) assert.ok([c.beforeHash, transaction.staged[c.target]].includes(await hash(c.target)), 'Rollback refuse : modification externe de ' + c.target);
    for (const c of [...before.changes].reverse()) if (await hash(c.target) !== c.beforeHash) await install(c.backup, c.target, transaction.staged[c.target], c.beforeHash);
    await guard(before); const result = await preflight();
    write(local('transaction.json'), { ...transaction, state: 'rolled-back', rolledBackAt: new Date().toISOString() });
    return { rolledBack: true, reused: result.reused };
  }
  async function publish() {
    return locked(async () => {
      const before = read(local('before.json')); await stable();
      const prior = fs.existsSync(local('transaction.json')) ? read(local('transaction.json')) : null;
      if (prior?.state === 'published') {
        await sameHash(local('before.json'), prior.beforeHash); await guard(before, 'immutable');
        for (const c of before.changes) await sameHash(c.target, prior.staged[c.target]);
        return { unchanged: true, reused: (await preflight()).reused };
      }
      assert.ok(!prior || prior.state === 'rolled-back', 'Transaction interrompue : executer rollback avant publication.');
      await guard(before); const proof = await verified(before);
      const mapping = new Map(before.changes.map(c => [c.target, c.stage])); await preflight(mapping); await guard(before);
      const transaction = { revision: REVISION, state: 'publishing', beforeHash: proof.beforeHash, staged: proof.staged, startedAt: new Date().toISOString() };
      write(local('transaction.json'), transaction);
      try {
        for (const c of before.changes) await install(c.stage, c.target, c.beforeHash, proof.staged[c.target]);
        await guard(before, 'immutable'); await stable();
        for (const c of before.changes) await sameHash(c.target, proof.staged[c.target]);
        const result = await preflight();
        write(local('transaction.json'), { ...transaction, state: 'published', publishedAt: new Date().toISOString() });
        return { published: KEYS, reused: result.reused, catalogueUnchanged: true };
      } catch (error) {
        try { await restore(before, transaction); }
        catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Publication interrompue ; rollback manuel requis. ' + rollbackError.message); }
        throw error;
      }
    });
  }
  async function rollback() { return locked(() => restore(read(local('before.json')), read(local('transaction.json')))); }
  return { check, prepare, render, verify, publish, rollback };
}
async function main(args = process.argv.slice(2), revision) {
  const [action = 'check'] = args;
  assert.ok(args.length <= 1 && ['check', 'prepare', 'render', 'verify', 'publish', 'rollback'].includes(action), 'Usage: node revise.cjs [check|prepare|render|verify|publish|rollback]');
  return (revision || createRevision())[action]();
}
module.exports = { createRevision, main, KEYS, ART };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
