'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp, crypto } = L;
const home = __dirname, file = n => L.inside(home, n), production = path.join(ROOT, 'V4/collaborations/nier-pilot-01');
const revision = '2026-09-23-nier-typography', keys = ['2b', '9s'];
const names = ['card.png', 'card.psd', 'verification.json'];
const code = ['build.cjs', 'compose-one.jsx'];
const extras = ['typography.cjs', 'typography.jsx'];
const source = key => path.join(production, 'cards', key), work = key => file('work/' + key);
const published = key => path.join(ROOT, 'V4/creations', read(path.join(source(key), 'profile.json')).id);
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function guarded(before, allowed = []) {
  for (const [f, h] of Object.entries(before.observed)) if (!allowed.includes(f)) assert.equal(await hash(f), h, 'Modification externe : ' + f);
  for (const c of before.targets) assert.equal(await hash(c.backup), c.hash);
}
async function prepare() {
  return B.locked(async () => {
    assert.ok(!fs.existsSync(file('before.json')), 'Originaux deja conserves.'); await stable();
    const before = { revision, observed: {}, targets: [], catalogueHash: await hash(D.CATALOGUE) };
    const observe = async f => { before.observed[f] = await hash(f); };
    const target = async f => {
      await observe(f); const backup = file('originals/' + path.relative(ROOT, f));
      fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.copyFileSync(f, backup, fs.constants.COPYFILE_EXCL);
      before.targets.push({ target: f, backup, hash: before.observed[f] });
    };
    await observe(D.CATALOGUE);
    for (const c of D.catalogue().cards.filter(c => c.kind === 'created')) for (const name of ['card.png', 'card.psd', 'profile.json', 'illustration.png', 'verification.json', 'creation.json']) await observe(path.join(ROOT, 'V4/creations', c.id, name));
    for (const name of code) await target(path.join(production, name));
    for (const key of keys) {
      await B.prepared(key);
      const src = source(key), pub = published(key), dir = work(key);
      fs.mkdirSync(path.join(dir, 'render'), { recursive: true });
      for (const name of names) { assert.equal(await hash(path.join(src, name)), await hash(path.join(pub, name))); await target(path.join(src, name)); await target(path.join(pub, name)); }
      await target(path.join(pub, 'creation.json'));
      for (const name of ['preparation.json', 'preview.png', 'render/native.json', 'render/reopened.png']) await target(path.join(src, name));
      const prep = read(path.join(src, 'preparation.json'));
      for (const f of Object.keys(prep.inputs)) await observe(f);
      fs.copyFileSync(path.join(src, 'profile.json'), path.join(dir, 'profile.json'));
      const plan = read(path.join(src, 'render/composition.json'));
      for (const name of ['composition.json', 'expected-components.png', 'without-text.png', ...plan.layers.map(l => l.file)]) fs.copyFileSync(path.join(src, 'render', name), path.join(dir, 'render', name));
    }
    await guarded(before); write(file('before.json'), before); return { prepared: keys, productionMediaUnchanged: true };
  });
}
async function render() {
  return B.locked(async () => {
    const before = read(file('before.json')); await guarded(before, code.map(n => path.join(production, n))); await stable();
    const inputs = [...code, ...extras].map(n => path.join(production, n)); inputs.push(file('replace.jsx'), file('revise.cjs'));
    const hashes = await B.hashes(inputs); write(file('render-inputs.json'), hashes);
    write(file('request.json'), { cards: keys.map(key => ({ key, psd: before.targets.find(c => c.target === path.join(source(key), 'card.psd')).backup, native: path.join(source(key), 'render/native.json'), output: work(key) })) });
    const result = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('replace.jsx')], file('photoshop.log'));
    assert.deepEqual(await B.hashes(inputs), hashes); await guarded(before, code.map(n => path.join(production, n))); return { rendered: keys, result };
  });
}
const unrelated = rows => rows.filter(l => !['NOM', 'TITLE'].includes(l.name)).map(({ id, ...l }) => l);
async function verify() {
  return B.locked(async () => {
    const before = read(file('before.json')), inputs = read(file('render-inputs.json')); await guarded(before, code.map(n => path.join(production, n))); await stable();
    assert.deepEqual(await B.hashes(Object.keys(inputs)), inputs);
    const stages = [], proofs = [];
    const stage = async (target, input, json = false) => {
      assert.ok(before.targets.some(t => t.target === target)); const dest = file('staging/' + path.relative(ROOT, target));
      fs.mkdirSync(path.dirname(dest), { recursive: true }); if (json) write(dest, input); else fs.copyFileSync(input, dest);
      stages.push({ target, stage: dest, hash: await hash(dest) });
    };
    for (const key of keys) {
      const src = source(key), dir = work(key), p = read(path.join(dir, 'profile.json')), n = read(path.join(dir, 'audit.json'));
      assert.deepEqual(p, read(path.join(src, 'profile.json')));
      assert.deepEqual(unrelated(n.before), unrelated(n.after)); assert.deepEqual(unrelated(n.after), unrelated(n.reopened));
      assert.deepEqual(unrelated(n.before), unrelated(read(path.join(src, 'render/native.json')).layers));
      assert.equal((await L.diff(path.join(src, 'card.png'), path.join(dir, 'before.png'))).changed, 0);
      assert.equal((await L.diff(path.join(dir, 'before-without-labels.png'), path.join(dir, 'after-without-labels.png'))).changed, 0);
      const regions = [...n.before, ...n.after].filter(l => ['NOM', 'TITLE'].includes(l.name)).map(l => [Math.floor(l.ink[0])-2, Math.floor(l.ink[1])-2, Math.ceil(l.ink[2])+2, Math.ceil(l.ink[3])+2]);
      const outside = await L.diff(path.join(src, 'card.png'), path.join(dir, 'card.png'), regions); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
      const v = { ...await B.verifyNative(dir, p), key, revision, typographyOnly: { outside, unchangedGameplay: true, unchangedOtherLayers: true } };
      write(path.join(dir, 'verification.json'), v); proofs.push(v);
      for (const folder of [src, published(key)]) for (const name of names) await stage(path.join(folder, name), path.join(dir, name));
      await stage(path.join(src, 'render/native.json'), path.join(dir, 'render/native.json'));
      await stage(path.join(src, 'render/reopened.png'), path.join(dir, 'render/reopened.png'));
      await stage(path.join(src, 'preview.png'), path.join(dir, 'card.png'));
      const creation = read(path.join(published(key), 'creation.json'));
      for (const name of names) creation.hashes[name] = await hash(path.join(dir, name));
      creation.typographyRevision = revision; await stage(path.join(published(key), 'creation.json'), creation, true);
      const prepFile = path.join(src, 'preparation.json'), prep = read(prepFile);
      prep.inputs = { ...prep.inputs, ...Object.fromEntries([...code, ...extras].map(name => [path.join(production, name), inputs[path.join(production, name)]])) };
      prep.typographyRevision = { revision, originalPreparationHash: before.observed[prepFile], nativeProof: v.hashes, inputHashes: inputs };
      await stage(prepFile, prep, true);
    }
    write(file('verified.json'), { revision, beforeHash: await hash(file('before.json')), inputs, stages, proofs }); return { verified: keys, unchangedOutsideText: true, profilesUnchanged: true };
  });
}
async function publish() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json'));
    assert.equal(proof.beforeHash, await hash(file('before.json'))); await guarded(before, code.map(n => path.join(production, n))); await stable();
    assert.deepEqual(await B.hashes(Object.keys(proof.inputs)), proof.inputs);
    for (const s of proof.stages) assert.equal(await hash(s.stage), s.hash);
    write(file('transaction.json'), { revision, state: 'publishing' });
    try {
      for (const s of proof.stages) { const temp = s.target + '.' + crypto.randomUUID() + '.tmp'; fs.copyFileSync(s.stage, temp, fs.constants.COPYFILE_EXCL); fs.renameSync(temp, s.target); }
      await guarded(before, [...code.map(n => path.join(production, n)), ...proof.stages.map(s => s.target)]); await stable();
      assert.equal(await hash(D.CATALOGUE), before.catalogueHash);
      for (const s of proof.stages) assert.equal(await hash(s.target), s.hash);
      for (const key of keys) await B.prepared(key);
      write(file('transaction.json'), { revision, state: 'published', ids: keys.map(k => read(path.join(source(k), 'profile.json')).id), catalogueUnchanged: true });
      return { published: keys, typographyOnly: true, catalogueUnchanged: true };
    } catch (error) {
      for (const s of proof.stages) assert.ok([s.hash, before.observed[s.target]].includes(await hash(s.target)), 'External change prevents restoration.');
      for (const s of proof.stages) fs.copyFileSync(before.targets.find(t => t.target === s.target).backup, s.target);
      write(file('transaction.json'), { revision, state: 'rolled-back', error: error.message }); throw error;
    }
  });
}
module.exports = { prepare, render, verify, publish, unrelated };
if (require.main === module) {
  const action = process.argv[2]; assert.ok(['prepare', 'render', 'verify', 'publish'].includes(action));
  module.exports[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
