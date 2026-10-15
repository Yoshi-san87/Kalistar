'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRevision, main, KEYS, ART } = require('./revise.cjs');
const { fixture, digest, NAMES } = require('../../collaborations/ff8-set-01/test-fixture.cjs');

async function setup() {
  const f = fixture(), { ROOT, DATA } = f.L;
  const home = path.join(ROOT, 'V4/revisions/2026-09-21-ff8-details'), local = name => path.join(home, name);
  // Start from a published set in memory, regardless of the live catalogue's size.
  const cat = f.D.catalogue(); cat.cards = cat.cards.filter(c => c.profile?.collaboration !== 'FF8'); f.put(f.D.CATALOGUE, cat);
  await f.publisher.publish();
  for (const c of f.D.catalogue().cards) {
    for (const file of [c.png, c.psd].filter(Boolean)) if (!f.files.has(path.join(ROOT, file))) f.seed(path.join(ROOT, file), 'UNCHANGED ' + file);
    if (c.kind === 'created') for (const name of [...NAMES, 'creation.json']) {
      const file = path.join(ROOT, 'V4/creations', c.id, name); if (!f.files.has(file)) f.seed(file, 'UNCHANGED ' + file);
    }
  }
  for (const name of ['revise.cjs', 'replace.jsx']) f.seed(local(name), fs.readFileSync(path.join(__dirname, name)));
  for (const file of ['V4/scripts/stable/common.jsx', 'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py']) f.seed(path.join(ROOT, file), 'SCRIPT ' + file);
  f.put(path.join(DATA, 'references.json'), { id: f.L.baseline().id });
  for (const key of KEYS) {
    const source = name => path.join(f.source(key), name);
    f.put(local('art/' + key + '.png'), { format: 'png', width: 1024, height: 1280, key, revision: 'new illustration' });
    f.mem.copyFileSync(source('illustration.png'), path.join(f.home, 'illustrations', key + '.png'));
    const layers = [{ id: 1, name: 'ILLUSTRATION - cadrage', kind: 'LayerKind.SMARTOBJECT', visible: true, bounds: [80, 156, 817, 1077] },
      { id: 2, name: 'NOM', kind: 'LayerKind.TEXT', visible: true, text: key, font: 'Original', sizePt: 16 }];
    f.put(source('render/native.json'), { width: 897, height: 1497, resolution: 300, expected: [{ name: 'NOM', value: key }], layers });
    f.put(source('render/composition.json'), { layers: [{ file: 'component-00.png', name: 'ILLUSTRATION - cadrage', ...ART },
      { file: 'component-01.png', name: 'CADRE V4 - structure validee', left: 0, top: 0, width: 897, height: 1497 }] });
    for (const name of ['render/component-00.png', 'render/component-01.png', 'render/expected-components.png', 'render/without-text.png', 'render/reopened.png', 'preview.png', 'small-preview.png']) f.mem.copyFileSync(source('card.png'), source(name));
    const inputs = [path.join(f.home, 'set.json'), path.join(f.home, 'illustrations', key + '.png'),
      ...['profile.json', 'illustration.png', 'render/composition.json', 'render/component-00.png', 'render/component-01.png', 'render/expected-components.png'].map(source)];
    const hashes = files => Object.fromEntries(files.map(file => [file, digest(f.mem.readFileSync(file))]));
    f.put(source('preparation.json'), { referenceId: f.L.baseline().id, snapshot: hashes([path.join(DATA, 'references.json')]), inputs: hashes(inputs), none: null });
  }
  f.put(path.join(f.home, 'verification.json'), { passed: true, cards: 12, results: f.read(path.join(f.home, 'set.json')).cards.map(c => ({ ...f.read(path.join(f.source(c.key), 'verification.json')), key: c.key })) });
  const sharp = input => {
    let m = Buffer.isBuffer(input) ? JSON.parse(input.toString()) : f.read(input);
    const chain = { metadata: async () => m, png: () => chain, extract: () => chain,
      resize(width, height) { m = { ...m, width: typeof width === 'object' ? width.width : width, height: height || m.height }; return chain; },
      toFile: async file => f.put(file, m) };
    return chain;
  };
  const commands = [];
  const R = { verifyAssets: async () => {}, composite: async () => f.encode({ format: 'png', width: 897, height: 1497, revised: true }),
    command: async (exe, args) => {
      commands.push(exe);
      if (exe !== 'powershell.exe') return JSON.stringify({ passed: true, expected: args.at(-1) });
      for (const c of f.read(local('render-request.json')).cards) {
        const work = name => path.join(c.work, name), source = name => path.join(f.source(c.key), name);
        f.mem.copyFileSync(source('card.png'), work('before-card.png'));
        f.mem.copyFileSync(source('card.png'), work('before-without-art.png'));
        f.mem.copyFileSync(source('card.png'), work('after-without-art.png'));
        f.put(work('card.png'), { format: 'png', width: 897, height: 1497, revised: c.key });
        f.seed(work('card.psd'), 'IN-MEMORY REOPENED PSD ' + c.key);
        f.mem.copyFileSync(work('card.png'), work('reopened.png'));
        f.mem.copyFileSync(work('expected-components.png'), work('without-text.png'));
        const { layers } = f.read(source('render/native.json'));
        f.put(work('native.json'), { width: 897, height: 1497, resolution: 300, before: layers, after: layers, layers });
      }
      return 'MOCK PHOTOSHOP ONLY';
    } };
  f.L.sharp = sharp; f.L.protectedCheck = async () => {};
  f.L.diff = async (a, b, rectangles) => ({ changed: digest(f.mem.readFileSync(a)) === digest(f.mem.readFileSync(b)) ? 0 : 25, outside: rectangles ? 0 : undefined });
  f.L.PYTHON = 'MOCK BARCODE';
  const revision = createRevision({ L: f.L, R, D: f.D, home,
    createBuilder: ({ L }) => ({ components: async (source, plan) => {
      assert.equal(plan.layers[0].width, 737);
      assert.equal(L.read(path.join(source, 'render/expected-components.png')).revised, true);
      return { fixedDifferences: 0, severePixels: 0, changed: 0 };
    } }) });
  const original = new Map([...f.files].filter(([file]) => !file.startsWith(home + path.sep)).map(([file, bytes]) => [file, Buffer.from(bytes)]));
  const assertOriginal = () => {
    for (const [file, bytes] of original) assert.deepEqual(f.files.get(file), bytes, file);
    for (const file of f.files.keys()) if (!file.startsWith(home + path.sep)) assert.ok(original.has(file), 'Unexpected global file: ' + file);
  };
  return { ...f, R, revision, local, revisionHome: home, original, assertOriginal, commands };
}
async function ready() { const f = await setup(); await f.revision.prepare(); await f.revision.render(); await f.revision.verify(); return f; }

test('CLI defaults to read-only check; JSX parses without executing Photoshop', async () => {
  const f = await setup(), count = f.ops.length;
  const result = await main([], f.revision); assert.equal(result.missing.length, 0); assert.equal(f.ops.length, count);
  assert.deepEqual(f.commands, []); f.assertOriginal();
  await assert.rejects(main(['publish', 'extra'], f.revision), /Usage/);
  new vm.Script(fs.readFileSync(path.join(__dirname, 'replace.jsx'), 'utf8').replace(/^#.*$/gm, ''));
});
test('prepare, mock render and verify leave production byte-identical', async () => {
  const f = await ready(); f.assertOriginal();
  const before = f.read(f.local('before.json')), proof = f.read(f.local('verified.json'));
  assert.equal(before.cards.length, 5); assert.equal(proof.publication.reused, 12);
  assert.equal(f.commands.filter(c => c === 'powershell.exe').length, 1);
  assert.equal(f.commands.filter(c => c === 'MOCK BARCODE').length, 5);
  for (const c of before.changes) assert.equal(await f.L.hash(c.backup), c.beforeHash);
  await assert.rejects(f.revision.prepare(), /Sauvegardes/); assert.ok(!f.mem.existsSync(f.lock));
});
test('publication keeps IDs/profiles/index and updates both homes, proofs and only four preparation hashes', async () => {
  const f = await ready(), before = f.read(f.local('before.json'));
  assert.equal((await f.revision.publish()).reused, 12);
  assert.equal((await f.publisher.preflight()).reused, 12);
  assert.deepEqual(f.mem.readFileSync(f.D.CATALOGUE), f.original.get(f.D.CATALOGUE));
  const targets = new Set(before.changes.map(c => c.target));
  for (const [file, bytes] of f.original) if (!targets.has(file)) assert.deepEqual(f.mem.readFileSync(file), bytes, file);
  for (const c of before.cards) {
    for (const name of NAMES) assert.deepEqual(f.mem.readFileSync(path.join(c.source, name)), f.mem.readFileSync(path.join(c.published, name)));
    const prepFile = path.join(c.source, 'preparation.json'), prep = f.read(prepFile), oldPrep = JSON.parse(f.original.get(prepFile));
    assert.deepEqual(prep.snapshot, oldPrep.snapshot); assert.deepEqual(Object.keys(prep.inputs), Object.keys(oldPrep.inputs));
    assert.equal(Object.keys(prep.inputs).filter(file => prep.inputs[file] !== oldPrep.inputs[file]).length, 4);
    for (const [file, expected] of Object.entries(prep.inputs)) assert.equal(await f.L.hash(file), expected);
    const file = path.join(c.published, 'creation.json'), creation = f.read(file), old = JSON.parse(f.original.get(file));
    for (const name of ['job', 'setId', 'key', 'modelId', 'createdAt']) assert.equal(creation[name], old[name]);
    for (const name of NAMES) assert.equal(creation.hashes[name], await f.L.hash(path.join(c.published, name)));
    assert.equal(f.read(path.join(c.source, 'verification.json')).illustrationOnly.outside.outside, 0);
  }
  assert.equal((await f.revision.publish()).unchanged, true);
  await f.revision.rollback(); f.assertOriginal(); assert.equal((await f.publisher.preflight()).reused, 12);
  assert.equal((await f.revision.publish()).reused, 12);
});
test('missing art, stale preparation and a foreign lock are rejected without live writes', async () => {
  const f = await setup(), art = f.local('art/zell.png'), saved = f.mem.readFileSync(art);
  f.files.delete(art); await assert.rejects(f.revision.prepare(), /cinq illustrations/); f.seed(art, saved);
  f.put(f.lock, { id: 'another-render' }); const lock = f.mem.readFileSync(f.lock);
  await assert.rejects(f.revision.prepare(), /EEXIST/); assert.deepEqual(f.mem.readFileSync(f.lock), lock); f.files.delete(f.lock);
  const profile = path.join(f.source('linoa'), 'profile.json'); f.seed(profile, Buffer.concat([f.original.get(profile), Buffer.from(' ')]));
  await assert.rejects(f.revision.prepare(), /Profil modifie|Empreinte/);
  f.seed(profile, f.original.get(profile));
  const component = path.join(f.source('linoa'), 'render/component-01.png'); f.seed(component, 'STALE PREPARATION INPUT');
  await assert.rejects(f.revision.prepare(), /Empreinte/);
  f.seed(component, f.original.get(component)); f.assertOriginal(); assert.deepEqual(f.commands, []);
});
for (const failure of ['frame', 'outside', 'reopen', 'original', 'layer', 'barcode']) test('native proof rejects ' + failure, async () => {
  const f = await setup(); await f.revision.prepare(); await f.revision.render();
  const diff = f.L.diff;
  f.L.diff = async (a, b, rects) => {
    if (failure === 'frame' && b.endsWith('after-without-art.png')) return { changed: 1 };
    if (failure === 'outside' && rects) return { changed: 1, outside: 1 };
    if (failure === 'reopen' && b.endsWith('reopened.png')) return { changed: 1 };
    if (failure === 'original' && b.endsWith('before-card.png')) return { changed: 1 };
    return diff(a, b, rects);
  };
  if (failure === 'layer') { const file = f.local('work/linoa/native.json'), native = f.read(file); native.after[1].text = 'CHANGED'; f.put(file, native); }
  if (failure === 'barcode') f.R.command = async () => JSON.stringify({ passed: false });
  await assert.rejects(f.revision.verify()); f.assertOriginal(); assert.ok(!f.mem.existsSync(f.local('verified.json')));
});
test('changed staged bytes or an unrelated published card block publication', async () => {
  const f = await ready(), before = f.read(f.local('before.json')), first = before.changes[0], saved = f.mem.readFileSync(first.stage);
  f.seed(first.stage, 'CORRUPT'); await assert.rejects(f.revision.publish(), /Empreinte/); f.seed(first.stage, saved); f.assertOriginal();
  const squall = path.join(f.target(f.profiles.find(p => p.characterId === 'squall-ff8').id), 'card.psd');
  f.seed(squall, 'EXTERNAL EDIT'); await assert.rejects(f.revision.publish(), /Empreinte/);
  f.seed(squall, f.original.get(squall)); f.assertOriginal();
});
test('mid-publication failure automatically restores every existing file', async () => {
  const f = await ready(), targets = new Set(f.read(f.local('before.json')).changes.map(c => c.target)); let writes = 0;
  f.fault(e => { if (e.op === 'rename' && targets.has(e.to) && ++writes === 5) throw Error('SIMULATED INSTALL FAILURE'); });
  await assert.rejects(f.revision.publish(), /SIMULATED INSTALL FAILURE/); f.fault(() => {});
  f.assertOriginal(); assert.equal(f.read(f.local('transaction.json')).state, 'rolled-back');
  assert.equal((await f.publisher.preflight()).reused, 12);
});
test('interrupted rollback is recoverable from the journal without deleting cards', async () => {
  const f = await ready(), targets = new Set(f.read(f.local('before.json')).changes.map(c => c.target)); let writes = 0;
  f.fault(e => { if (e.op === 'rename' && targets.has(e.to) && ++writes >= 5) throw Error('SIMULATED DISK FAILURE'); });
  await assert.rejects(f.revision.publish(), AggregateError); f.fault(() => {});
  assert.equal(f.read(f.local('transaction.json')).state, 'publishing');
  await assert.rejects(f.revision.publish(), /rollback/);
  await f.revision.rollback(); f.assertOriginal();
});
test('rollback refuses a later independent edit instead of overwriting it', async () => {
  const f = await ready(); await f.revision.publish();
  const target = path.join(f.source('linoa'), 'card.png'); f.seed(target, 'LATER USER EDIT');
  await assert.rejects(f.revision.rollback(), /modification externe/);
  assert.equal(f.mem.readFileSync(target, 'utf8'), 'LATER USER EDIT'); assert.ok(!f.mem.existsSync(f.lock));
});
