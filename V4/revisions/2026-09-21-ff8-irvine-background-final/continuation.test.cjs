'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createRevision, main } = require('./revise.cjs');
const Z = require('./zell.cjs');
const parentTest = path.join(__dirname, '../2026-09-21-ff8-refinements/revise.test.cjs');
const source = fs.readFileSync(parentTest, 'utf8'), boundary = source.indexOf("\ntest('default is read-only;");
assert.ok(boundary > 0);
// Reuse only the existing in-memory fixture declarations, not its registered tests.
const { ready } = vm.compileFunction(source.slice(0, boundary) + '\nreturn { ready };', ['require', '__dirname'], { filename: parentTest })(createRequire(parentTest), path.dirname(parentTest));

async function setup() {
  const f = await ready(), home = path.join(f.L.ROOT, 'V4/revisions/2026-09-21-ff8-irvine-background-final');
  const local = name => path.join(home, name), input = path.join(f.L.ROOT, 'incoming-irvine-final.png');
  for (const name of ['revise.cjs', 'replace.jsx', 'zell.cjs', 'seifer.cjs', 'inherit.cjs']) f.seed(local(name), fs.readFileSync(path.join(__dirname, name)));
  f.put(input, { format: 'png', width: 1024, height: 1280, key: 'irvine', background: 'corrected carousel' });
  const nativeRequests = [], R = { ...f.R, command: async (exe, args) => {
    if (exe !== 'powershell.exe') return f.R.command(exe, args);
    assert.equal(args.at(-1), local('replace.jsx'));
    const request = f.read(local('render-request.json')); nativeRequests.push(request);
    assert.deepEqual(request.cards.map(c => c.key), ['irvine']);
    const c = request.cards[0], work = name => path.join(c.work, name), original = name => path.join(f.source('irvine'), name);
    for (const name of ['before-card.png', 'before-without-art.png', 'after-without-art.png']) f.mem.copyFileSync(original('card.png'), work(name));
    f.put(work('card.png'), { format: 'png', width: 897, height: 1497, newIrvine: true });
    f.seed(work('card.psd'), 'NEW IRVINE MOCK PSD ONLY');
    f.mem.copyFileSync(work('card.png'), work('reopened.png'));
    f.mem.copyFileSync(work('expected-components.png'), work('without-text.png'));
    const { layers } = f.read(original('render/native.json'));
    f.put(work('native.json'), { width: 897, height: 1497, resolution: 300, before: layers, after: layers, layers });
    return 'MOCK IRVINE ONLY';
  } };
  const revision = createRevision({ L: f.L, D: f.D, R, home, art: input,
    zell: { ...Z, verifyPixels: async () => ({ outside: { changed: 10, outside: 0 }, artwork: { changed: 0 }, withoutChanges: { changed: 0 }, from: 'PYRO', to: 'ELECTRO' }) },
    createBuilder: () => ({ components: async () => ({ fixedDifferences: 0, severePixels: 0 }) }) });
  const oldFiles = new Map([...f.files].filter(([file]) => file.startsWith(f.revisionHome + path.sep)).map(([file, value]) => [file, Buffer.from(value)]));
  const assertParent = () => {
    for (const [file, value] of oldFiles) assert.deepEqual(f.mem.readFileSync(file), value, file);
    for (const file of f.files.keys()) if (file.startsWith(f.revisionHome + path.sep)) assert.ok(oldFiles.has(file), 'Unexpected parent write.');
  };
  const isRevision = file => file.startsWith(home + path.sep) || file.startsWith(f.revisionHome + path.sep);
  const globals = new Map([...f.files].filter(([file]) => !isRevision(file)).map(([file, value]) => [file, Buffer.from(value)]));
  const assertOriginal = () => {
    for (const [file, value] of globals) assert.deepEqual(f.mem.readFileSync(file), value, file);
    for (const file of f.files.keys()) if (!isRevision(file)) assert.ok(globals.has(file), 'Unexpected global file: ' + file);
  };
  return { ...f, child: revision, childHome: home, childFile: local, input, nativeRequests, assertParent, assertOriginal };
}
test('new snapshot retains every old hash; only Irvine renders, all five verify and publish idempotently', async () => {
  const f = await setup(), count = f.ops.length;
  await main([], f.child); assert.equal(f.ops.length, count);
  const parent = f.read(f.local('before.json'));
  const prepared = await f.child.prepare(); assert.deepEqual(prepared.reusedNative, ['seifer', 'squall', 'ward', 'zell']);
  const before = f.read(f.childFile('before.json'));
  for (const [file, expected] of Object.entries(parent.observed)) assert.equal(before.observed[file], expected);
  for (const name of ['before.json', 'verified.json']) assert.deepEqual(f.mem.readFileSync(f.childFile('previous/' + name)), f.mem.readFileSync(f.local(name)));
  for (const key of prepared.reusedNative) for (const name of ['card.png', 'card.psd', 'native.json', 'reopened.png']) assert.deepEqual(f.mem.readFileSync(f.childFile('work/' + key + '/' + name)), f.mem.readFileSync(f.local('work/' + key + '/' + name)));
  assert.ok(!f.mem.existsSync(f.childFile('work/irvine/card.psd')), 'Old Irvine native proof must not be reusable.');
  assert.notEqual(before.observed[f.childFile('art/irvine.png')], before.observed[f.local('art/irvine.png')]);
  assert.deepEqual((await f.child.render()).rendered, ['irvine']); assert.equal(f.nativeRequests.length, 1);
  assert.equal((await f.child.verify()).reused, 12); f.assertOriginal(); f.assertParent();
  assert.equal((await f.child.publish()).reused, 12); assert.equal((await f.publisher.preflight()).reused, 12); f.assertParent();
  assert.equal((await f.child.publish()).unchanged, true);
  await f.child.rollback(); f.assertOriginal(); f.assertParent();
});
test('parent templates and native routines are not edited for continuation', () => {
  for (const name of ['replace.jsx', 'zell.cjs', 'seifer.cjs']) assert.deepEqual(fs.readFileSync(path.join(__dirname, name)), fs.readFileSync(path.join(path.dirname(parentTest), name)));
});
for (const kind of ['proof-missing', 'old-art', 'evidence', 'staging', 'production', 'transaction', 'lock', 'same-art']) test('inherit refuses ' + kind + ' without touching parent or production', async () => {
  const f = await setup(); let file;
  if (kind === 'proof-missing') file = f.local('verified.json');
  if (kind === 'old-art') file = f.local('art/irvine.png');
  if (kind === 'evidence') file = f.local('work/ward/card.psd');
  if (kind === 'staging') file = f.read(f.local('before.json')).changes[0].stage;
  if (kind === 'production') file = path.join(f.source('squall'), 'profile.json');
  if (kind === 'transaction') f.put(f.local('transaction.json'), { state: 'published' });
  if (kind === 'lock') f.put(f.lock, { id: 'another-owner' });
  if (kind === 'same-art') f.seed(f.input, f.mem.readFileSync(f.local('art/irvine.png')));
  if (file) { if (kind === 'proof-missing') f.files.delete(file); else f.seed(file, 'CHANGED'); }
  const snapshot = new Map([...f.files].map(([name, value]) => [name, Buffer.from(value)]));
  await assert.rejects(f.child.prepare()); assert.deepEqual(f.files, snapshot);
});
test('reused output is pinned, failed catalogue commit rolls back, and later edits are never overwritten', async () => {
  const f = await setup(); await f.child.prepare(); await f.child.render();
  const file = f.childFile('work/ward/card.psd'), saved = f.mem.readFileSync(file); f.seed(file, 'TAMPER');
  await assert.rejects(f.child.verify(), /Empreinte/); f.seed(file, saved); await f.child.verify();
  let failed = false;
  f.fault(e => { if (!failed && e.op === 'rename' && e.to === f.D.CATALOGUE) { failed = true; throw Error('COMMIT FAILURE'); } });
  await assert.rejects(f.child.publish(), /COMMIT FAILURE/); f.fault(() => {}); f.assertOriginal(); f.assertParent();
  await f.child.publish(); const profile = path.join(f.source('irvine'), 'profile.json'); f.seed(profile, 'EXTERNAL');
  await assert.rejects(f.child.rollback()); assert.equal(f.mem.readFileSync(profile, 'utf8'), 'EXTERNAL'); f.assertParent();
});
