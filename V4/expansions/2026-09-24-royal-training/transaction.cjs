'use strict';
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto'), assert = require('node:assert/strict');
const HASH = /^[a-f0-9]{64}$/, UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
function stat(file) { try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
const identity = s => [s.dev, s.ino, s.birthtimeMs].join(':');
function digest(file) {
  const h = crypto.createHash('sha256'), fd = fs.openSync(file, 'r'), chunk = Buffer.allocUnsafe(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, chunk, 0, chunk.length, null))) h.update(chunk.subarray(0, n)); }
  finally { fs.closeSync(fd); } return h.digest('hex');
}
function createIO(root) {
  root = path.resolve(root);
  function absolute(relative) {
    assert.ok(typeof relative === 'string' && relative && !/[\\:\x00-\x1f]/.test(relative) && !path.isAbsolute(relative), 'Chemin relatif requis.');
    assert.ok(relative.split('/').every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p)), 'Chemin interdit.');
    const file = path.resolve(root, relative); let cursor = file;
    while (true) {
      const s = stat(cursor); assert.ok(!s?.isSymbolicLink(), 'Lien/jonction interdit : ' + relative);
      if (s) assert.ok(cursor === file ? s.isFile() || s.isDirectory() : s.isDirectory(), 'Fichier non regulier.');
      const parent = path.dirname(cursor); if (cursor === parent) break; cursor = parent;
    }
    return file;
  }
  const hash = relative => { const file = absolute(relative), s = stat(file); if (!s) return null; assert.ok(s.isFile(), 'Fichier regulier requis.'); return digest(file); };
  const read = relative => JSON.parse(fs.readFileSync(absolute(relative), 'utf8').replace(/^\uFEFF/, ''));
  const check = map => { for (const [file, h] of Object.entries(map)) { assert.ok(h === null || HASH.test(h)); assert.equal(hash(file), h, 'Fichier modifie : ' + file); } };
  return { root, absolute, hash, read, check };
}
function createTransaction({ root, home, setId, targets, inspect, installed, checkpoint = async () => {}, now = () => new Date().toISOString() }) {
  const io = createIO(root), batch = f => home + '/' + f, lock = 'V4/atelier/data/render.lock', receipt = batch('published.json');
  const allowed = [...targets].sort(); assert.equal(new Set(allowed).size, allowed.length); allowed.forEach(io.absolute);
  const safeTarget = f => { assert.ok(allowed.includes(f), 'Cible hors allowlist : ' + f); return io.absolute(f); };
  const assertRows = rows => {
    assert.deepEqual(rows.map(r => r.to).sort(), allowed, 'Perimetre de transaction different du lot.');
    for (const r of rows) { safeTarget(r.to); assert.match(r.hash, HASH); assert.ok(r.beforeHash === null || HASH.test(r.beforeHash)); }
  };
  function atomic(relative, bytes, expected) {
    assert.equal(io.hash(relative), expected, 'Cible modifiee avant ecriture : ' + relative);
    const temp = relative + '.' + crypto.randomUUID() + '.tmp', file = io.absolute(temp);
    fs.mkdirSync(path.dirname(file), { recursive: true }); const fd = fs.openSync(file, 'wx');
    try { fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    assert.equal(io.hash(temp), sha(bytes)); assert.equal(io.hash(relative), expected, 'Cible apparue/modifiee.');
    fs.renameSync(file, io.absolute(relative));
  }
  async function locked(action) {
    const id = crypto.randomUUID(), bytes = encode({ id, pid: process.pid, kind: setId + '-publication' });
    let fd, identity;
    const owns = () => { const f = io.absolute(lock), s = stat(f); return s?.isFile() && [s.dev, s.ino, s.birthtimeMs].join(':') === identity && fs.readFileSync(f).equals(bytes); };
    const assertLock = () => assert.ok(owns(), 'Verrou perdu : arret sans suppression du verrou tiers.');
    try {
      fd = fs.openSync(io.absolute(lock), 'wx'); const s = fs.fstatSync(fd); identity = [s.dev, s.ino, s.birthtimeMs].join(':');
      fs.writeFileSync(fd, bytes); fs.fsyncSync(fd); return await action(assertLock);
    } finally { if (fd !== undefined) { fs.closeSync(fd); if (owns()) fs.unlinkSync(io.absolute(lock)); } }
  }
  function planRows(plan) {
    assertRows(plan.install);
    for (const r of plan.install) {
      assert.equal(io.hash(r.to), r.beforeHash, 'Cible stale : ' + r.to);
      assert.ok(!!r.from !== Buffer.isBuffer(r.bytes), 'Une seule source par operation.');
      assert.equal(r.from ? io.hash(r.from) : sha(r.bytes), r.hash, 'Source stale.');
    }
    io.check(plan.observed);
  }
  function journal(id, pinned) {
    assert.match(id, UUID); const name = batch('publication/' + id + '/journal.json'), hash = io.hash(name);
    assert.match(hash || '', HASH, 'Journal absent.'); if (pinned) assert.equal(hash, pinned, 'Journal stale.');
    const j = io.read(name), pf = batch('publication/' + id + '/plan.json');
    assert.equal(j.id, id); assert.equal(j.setId, setId); assert.equal(io.hash(pf), j.planHash);
    const p = io.read(pf); assert.equal(p.id, id); assert.equal(p.setId, setId); assertRows(p.files);
    assert.deepEqual(j.files, p.files); assert.deepEqual(j.summary, p.summary); assert.deepEqual(j.directories, p.directories);
    assert.ok(Array.isArray(p.directories)); assert.equal(new Set(p.directories.map(d => d.to)).size, p.directories.length);
    for (const [i, d] of p.directories.entries()) {
      io.absolute(d.to); assert.ok(allowed.some(f => f.startsWith(d.to + '/')), 'Repertoire hors perimetre.');
      assert.equal(d.staged, 'publication/' + id + '/directories/' + i); assert.equal(d.beforeAbsent, true);
      assert.ok(typeof d.identity === 'string' && /^\d+:\d+:[\d.]+$/.test(d.identity));
    }
    for (const r of p.files) {
      assert.equal(r.backup, r.beforeHash === null ? null : 'publication/' + id + '/before/' + r.to);
      if (r.backup) assert.equal(io.hash(batch(r.backup)), r.beforeHash, 'Sauvegarde alteree.');
    }
    return { j, p, name, hash };
  }
  function writeJournal(state, phase) {
    state.j.phase = phase; atomic(state.name, encode(state.j), state.hash); state.hash = io.hash(state.name);
  }
  async function restore(state, assertLock) {
    assert.equal(state.j.phase, 'applying');
    for (const r of state.j.files) assert.ok([r.hash, r.beforeHash].includes(io.hash(r.to)), 'Modification tierce, rollback refuse : ' + r.to);
    for (const r of [...state.j.files].reverse()) {
      assertLock(); const current = io.hash(r.to); if (current === r.beforeHash) continue;
      assert.equal(current, r.hash, 'Modification tierce pendant rollback.');
      if (r.beforeHash === null) fs.unlinkSync(safeTarget(r.to));
      else { const bytes = fs.readFileSync(io.absolute(batch(r.backup))); assert.equal(sha(bytes), r.beforeHash, 'Sauvegarde modifiee pendant rollback.'); atomic(r.to, bytes, r.hash); }
    }
    for (const d of [...state.j.directories].reverse()) {
      assertLock(); const file = io.absolute(d.to), s = stat(file); if (!s) continue;
      assert.ok(s.isDirectory() && identity(s) === d.identity, 'Repertoire tiers, rollback refuse : ' + d.to);
      assert.equal(fs.readdirSync(file).length, 0, 'Repertoire non vide, conserver : ' + d.to);
      fs.rmdirSync(file);
    }
    io.check(Object.fromEntries(state.j.files.map(r => [r.to, r.beforeHash]))); writeJournal(state, 'rolled-back');
  }
  async function validateInstalled(state) {
    assert.equal(state.j.phase, 'committed');
    io.check(Object.fromEntries(state.j.files.map(r => [r.to, r.hash]))); io.check(state.p.observedAfter);
    await installed(state.p, io); assert.equal(io.hash(state.name), state.hash, 'Journal modifie.');
  }
  function existingReceipt(state) {
    if (io.hash(receipt) === null) return null;
    const r = io.read(receipt), { checkedAt, recovered, ...core } = r;
    assert.deepEqual(core, { ...state.j.summary, published: true, transaction: state.j.id }, 'Recu etranger.');
    assert.ok(typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt)));
    assert.ok(recovered === undefined || recovered === true); return r;
  }
  async function preflight() {
    assert.equal(io.hash(lock), null, 'Verrou occupe.'); assert.equal(io.hash(receipt), null, 'Recu deja present.');
    const p = await inspect(); planRows(p); assert.equal(io.hash(lock), null);
    return { ...p.summary, published: false, files: p.install.map(r => ({ to: r.to, hash: r.hash, beforeHash: r.beforeHash })) };
  }
  async function publish() {
    return locked(async assertLock => {
      assert.equal(io.hash(receipt), null, 'Publication deja effectuee.');
      const base = batch('publication');
      if (stat(io.absolute(base))) for (const id of fs.readdirSync(io.absolute(base))) {
        assert.match(id, UUID); const s = journal(id); assert.equal(s.j.phase, 'rolled-back', 'Transaction a recuperer avant publication.');
      }
      const p = await inspect(); planRows(p); assertLock();
      const id = crypto.randomUUID(), prefix = batch('publication/' + id), files = [];
      for (const r of p.install) {
        const staged = prefix + '/staging/' + r.to, file = io.absolute(staged); fs.mkdirSync(path.dirname(file), { recursive: true });
        if (r.from) fs.copyFileSync(io.absolute(r.from), file, fs.constants.COPYFILE_EXCL); else fs.writeFileSync(file, r.bytes, { flag: 'wx' });
        assert.equal(io.hash(staged), r.hash);
        const backup = r.beforeHash === null ? null : 'publication/' + id + '/before/' + r.to;
        if (backup) { const to = io.absolute(batch(backup)); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(safeTarget(r.to), to, fs.constants.COPYFILE_EXCL); assert.equal(io.hash(batch(backup)), r.beforeHash); }
        files.push({ to: r.to, hash: r.hash, beforeHash: r.beforeHash, backup });
      }
      const post = { ...p.observed }; for (const r of files) if (Object.hasOwn(post, r.to)) post[r.to] = r.hash;
      // Stage empty directories first: their filesystem identity proves ownership
      // even if the process dies immediately after their atomic installation.
      const missing = new Set();
      for (const r of files) {
        let parent = path.posix.dirname(r.to);
        while (parent !== '.' && !stat(io.absolute(parent))) { missing.add(parent); parent = path.posix.dirname(parent); }
      }
      const directories = [...missing].sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b)).map((to, i) => {
        const staged = 'publication/' + id + '/directories/' + i, file = io.absolute(batch(staged));
        fs.mkdirSync(file, { recursive: true }); return { to, staged, identity: identity(fs.lstatSync(file)), beforeAbsent: true };
      });
      const saved = { id, setId, files, directories, summary: p.summary, observedAfter: post, metadata: p.metadata };
      atomic(prefix + '/plan.json', encode(saved), null);
      const j = { id, setId, phase: 'staging', planHash: io.hash(prefix + '/plan.json'), files, directories, summary: p.summary };
      atomic(prefix + '/journal.json', encode(j), null); const state = journal(id);
      try {
        await checkpoint('staged', state); planRows(p); assertLock(); writeJournal(state, 'applying');
        for (const d of directories) {
          assertLock(); assert.equal(stat(io.absolute(d.to)), null, 'Repertoire tiers apparu.');
          assert.equal(identity(fs.lstatSync(io.absolute(batch(d.staged)))), d.identity);
          fs.renameSync(io.absolute(batch(d.staged)), io.absolute(d.to));
        }
        for (const r of files) {
          assertLock(); assert.equal(io.hash(r.to), r.beforeHash, 'Cible tierce.');
          assert.equal(io.hash(prefix + '/staging/' + r.to), r.hash); assert.ok(stat(path.dirname(safeTarget(r.to)))?.isDirectory());
          fs.renameSync(io.absolute(prefix + '/staging/' + r.to), safeTarget(r.to)); await checkpoint('installed:' + r.to, state);
        }
        io.check(Object.fromEntries(files.map(r => [r.to, r.hash]))); io.check(post); await installed(saved, io); assertLock();
        writeJournal(state, 'committed'); await checkpoint('committed', state);
        await validateInstalled(state); assertLock();
        const result = { ...p.summary, published: true, transaction: id, checkedAt: now() };
        atomic(receipt, encode(result), null); return result;
      } catch (e) {
        if (state.j.phase === 'applying') { try { assertLock(); await restore(state, assertLock); } catch (r) { throw new AggregateError([e, r], 'Rollback incomplet, conserver le journal.'); } }
        throw e;
      }
    });
  }
  async function rollback(id, pinned) {
    assert.match(pinned || '', HASH, 'Hash du journal requis.');
    return locked(async assertLock => { const s = journal(id, pinned); await restore(s, assertLock); return { rolledBack: true, transaction: id }; });
  }
  async function recover(id, pinned) {
    const action = async assertLock => {
      const s = journal(id, pinned); await validateInstalled(s); const r = existingReceipt(s), receiptHash = io.hash(receipt);
      await checkpoint('recovery-checked', s); await validateInstalled(s); assert.equal(io.hash(receipt), receiptHash); if (assertLock) assertLock();
      if (!pinned) return { ...s.j.summary, published: !!r, transaction: id, journalHash: s.hash, action: r ? 'already-finalized' : 'ready-to-finalize', writePerformed: false };
      if (r) return r;
      const result = { ...s.j.summary, published: true, transaction: id, checkedAt: now(), recovered: true };
      atomic(receipt, encode(result), null); return result;
    };
    if (pinned) { assert.match(pinned, HASH); return locked(action); }
    assert.equal(io.hash(lock), null, 'Verrou occupe.'); const r = await action(); assert.equal(io.hash(lock), null); return r;
  }
  return { io, safeTarget, preflight, publish, rollback, recover, journal };
}
module.exports = { createIO, createTransaction, encode, sha, digest, HASH, UUID };
