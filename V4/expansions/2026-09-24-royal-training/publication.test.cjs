'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const T = require('./transaction.cjs');
function fixture(t, hook = async () => {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-royal-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const io = T.createIO(root), home = 'V4/expansions/fixture', a = 'V4/templates/A.psd', b = 'V4/creations/40000001/card.png', source = home + '/input.png';
  const put = (f, value) => { const p = io.absolute(f); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, value); };
  put(a, 'old'); put(source, 'new'); put('V4/atelier/data/keep', 'keep');
  const inputHash = io.hash(source), before = io.hash(a), summary = { cards: 1, referenceId: 'candidate', ids: ['40000001'] };
  const options = { root, home, setId: 'fixture', targets: [a, b], checkpoint: hook,
    inspect: async () => ({ summary, observed: { [source]: inputHash, [a]: before }, metadata: { id: 'fixed' }, install: [
      { to: a, bytes: Buffer.from('changed'), hash: T.sha(Buffer.from('changed')), beforeHash: before },
      { to: b, from: source, hash: inputHash, beforeHash: null }] }),
    installed: async p => { assert.equal(p.metadata.id, 'fixed'); assert.deepEqual(p.summary, summary); } };
  const tx = T.createTransaction(options);
  const journals = () => fs.readdirSync(io.absolute(home + '/publication')).map(id => tx.journal(id));
  return { root, io, home, a, b, source, put, before, inputHash, options, tx, journals };
}
test('preflight is read only and exact targets are exposed', async t => {
  const f = fixture(t), p = await f.tx.preflight(); assert.equal(p.published, false); assert.equal(f.io.hash(f.a), f.before);
  assert.equal(f.io.hash(f.home + '/publication'), null); assert.deepEqual(p.files.map(r => r.to), [f.a, f.b]);
});
test('atomic publication and portable journal paths', async t => {
  const f = fixture(t), result = await f.tx.publish(); assert.equal(result.published, true);
  const s = f.journals()[0]; assert.equal(s.j.phase, 'committed'); assert.ok(s.j.files.every(r => !path.isAbsolute(r.to)));
  assert.equal(f.io.hash('V4/atelier/data/render.lock'), null); assert.equal(f.io.hash(f.b), f.inputHash);
  assert.equal((await f.tx.recover(result.transaction)).action, 'already-finalized');
});
test('stale source fails before publication', async t => {
  const f = fixture(t); f.put(f.source, 'foreign'); await assert.rejects(f.tx.publish(), /stale|modifie/); assert.equal(f.io.hash(f.a), f.before);
});
test('stale target fails before publication', async t => {
  const f = fixture(t); f.put(f.a, 'foreign'); await assert.rejects(f.tx.publish(), /stale/); assert.equal(fs.readFileSync(f.io.absolute(f.a), 'utf8'), 'foreign');
});
test('allowlist rejects extra or missing files', async t => {
  const f = fixture(t), original = f.options.inspect;
  for (const extra of [false, true]) {
    const tx = T.createTransaction({ ...f.options, inspect: async () => { const p = await original(); if (extra) p.install.push({ ...p.install[0], to: 'V3/assets/factions/Solaria.png' }); else p.install.pop(); return p; } });
    await assert.rejects(tx.preflight(), /Perimetre/);
  }
});
test('source change after staging refuses applying', async t => {
  let f; f = fixture(t, async event => { if (event === 'staged') f.put(f.source, 'foreign'); });
  await assert.rejects(f.tx.publish(), /stale|modifie/); assert.equal(f.io.hash(f.a), f.before); assert.equal(f.io.hash(f.b), null);
});
test('failure during applying rolls back only exact targets', async t => {
  const f = fixture(t, async event => { if (event.startsWith('installed:')) throw Error('fixture interruption'); });
  await assert.rejects(f.tx.publish(), /interruption/); assert.equal(f.io.hash(f.a), f.before); assert.equal(f.io.hash(f.b), null);
  assert.equal(f.journals()[0].j.phase, 'rolled-back'); assert.equal(fs.readFileSync(f.io.absolute('V4/atelier/data/keep'), 'utf8'), 'keep');
});
test('foreign target is not overwritten by rollback', async t => {
  let f; f = fixture(t, async event => { if (event.startsWith('installed:')) { f.put(f.a, 'foreign'); throw Error('interrupt'); } });
  await assert.rejects(f.tx.publish(), /Rollback incomplet/); assert.equal(fs.readFileSync(f.io.absolute(f.a), 'utf8'), 'foreign');
  assert.equal(f.journals()[0].j.phase, 'applying');
});
test('committed receipt failure is recoverable and idempotent', async t => {
  const f = fixture(t, async event => { if (event === 'committed') throw Error('receipt failure'); });
  await assert.rejects(f.tx.publish(), /receipt failure/); const s = f.journals()[0]; assert.equal(s.j.phase, 'committed');
  assert.notEqual(f.io.hash(f.a), f.before); assert.equal(f.io.hash(f.home + '/published.json'), null);
  const tx = T.createTransaction({ ...f.options, checkpoint: async () => {} }), p = await tx.recover(s.j.id);
  assert.equal(p.writePerformed, false); const result = await tx.recover(s.j.id, p.journalHash);
  assert.equal(result.recovered, true); const hash = f.io.hash(f.home + '/published.json');
  assert.deepEqual(await tx.recover(s.j.id, p.journalHash), result); assert.equal(f.io.hash(f.home + '/published.json'), hash);
});
test('recover refuses altered installed media and does not roll back cards', async t => {
  const f = fixture(t); const result = await f.tx.publish(); f.put(f.a, 'foreign');
  await assert.rejects(f.tx.recover(result.transaction), /modifie/); assert.equal(fs.readFileSync(f.io.absolute(f.a), 'utf8'), 'foreign');
});
test('recover refuses stale journal hash', async t => {
  const f = fixture(t), r = await f.tx.publish(); await assert.rejects(f.tx.recover(r.transaction, '0'.repeat(64)), /stale/);
});
test('foreign receipt is never replaced', async t => {
  const f = fixture(t), r = await f.tx.publish(); f.put(f.home + '/published.json', JSON.stringify({ published: true, transaction: 'foreign' }));
  await assert.rejects(f.tx.recover(r.transaction), /Recu etranger/);
});
test('foreign lock blocks preflight and mutation and is retained', async t => {
  const f = fixture(t); f.put('V4/atelier/data/render.lock', 'foreign'); await assert.rejects(f.tx.preflight(), /Verrou/);
  await assert.rejects(f.tx.publish(), /EEXIST/); assert.equal(fs.readFileSync(f.io.absolute('V4/atelier/data/render.lock'), 'utf8'), 'foreign');
});
test('lost lock is not unlinked', async t => {
  let f; f = fixture(t, async event => { if (event === 'staged') f.put('V4/atelier/data/render.lock', 'foreign'); });
  await assert.rejects(f.tx.publish(), /Verrou perdu/); assert.equal(fs.readFileSync(f.io.absolute('V4/atelier/data/render.lock'), 'utf8'), 'foreign');
});
test('strict relative paths reject traversal, ADS, absolute paths and aliases', t => {
  const f = fixture(t); for (const p of ['../x', '/root', 'C:/x', 'a\\b', 'a/../b', 'a//b', 'a/./b', 'a./b', 'a /b']) assert.throws(() => f.io.absolute(p));
});
test('symlink/junction ancestors are rejected', t => {
  const f = fixture(t), target = path.join(f.root, 'actual'); fs.mkdirSync(target);
  fs.symlinkSync(target, path.join(f.root, 'linked'), process.platform === 'win32' ? 'junction' : 'dir');
  assert.throws(() => f.io.absolute('linked/output'), /Lien/);
});
test('missing installed file blocks receipt recovery', async t => {
  const f = fixture(t), r = await f.tx.publish(); fs.unlinkSync(f.io.absolute(f.b)); await assert.rejects(f.tx.recover(r.transaction), /modifie/);
});
test('post-inspection third-party proof change blocks recovery', async t => {
  const f = fixture(t), result = await f.tx.publish(); fs.unlinkSync(f.io.absolute(f.home + '/published.json'));
  const s = f.journals()[0], tx = T.createTransaction({ ...f.options, checkpoint: async e => { if (e === 'recovery-checked') f.put(f.source, 'foreign'); } });
  await assert.rejects(tx.recover(result.transaction, s.hash), /modifie/); assert.equal(f.io.hash(f.home + '/published.json'), null);
});
test('rollback only accepts applying, never committed', async t => {
  const f = fixture(t), r = await f.tx.publish(), s = f.journals()[0]; await assert.rejects(f.tx.rollback(r.transaction, s.hash));
  assert.equal(f.io.hash(f.b), f.inputHash);
});
test('new production run refuses outstanding committed receipt failure', async t => {
  const f = fixture(t, async e => { if (e === 'committed') throw Error('crash'); }); await assert.rejects(f.tx.publish());
  await assert.rejects(f.tx.publish(), /recuperer/);
});
test('rollback removes only owned new empty directories and allows complete retry', async t => {
  let interrupt = true;
  const f = fixture(t, async event => { if (interrupt && event.endsWith('/card.png')) throw Error('after new image'); });
  await assert.rejects(f.tx.publish(), /after new image/);
  assert.equal(fs.existsSync(f.io.absolute('V4/creations/40000001')), false);
  assert.equal(fs.existsSync(f.io.absolute('V4/templates')), true);
  assert.equal(f.io.hash(f.a), f.before); interrupt = false;
  const result = await f.tx.publish(); assert.equal(result.published, true); assert.equal(f.io.hash(f.b), f.inputHash);
});
test('rollback never removes pre-existing empty target directories', async t => {
  const f = fixture(t, async event => { if (event.endsWith('/card.png')) throw Error('interrupt'); });
  fs.mkdirSync(f.io.absolute('V4/creations/40000001'), { recursive: true });
  await assert.rejects(f.tx.publish(), /interrupt/); assert.equal(fs.existsSync(f.io.absolute('V4/creations/40000001')), true);
  assert.deepEqual(fs.readdirSync(f.io.absolute('V4/creations/40000001')), []);
});
test('rollback preserves a new directory made nonempty by a third party', async t => {
  let f; f = fixture(t, async event => { if (event.endsWith('/card.png')) { f.put('V4/creations/40000001/foreign.txt', 'keep'); throw Error('interrupt'); } });
  await assert.rejects(f.tx.publish(), /Rollback incomplet/);
  assert.equal(fs.readFileSync(f.io.absolute('V4/creations/40000001/foreign.txt'), 'utf8'), 'keep'); assert.equal(f.io.hash(f.b), null);
});
