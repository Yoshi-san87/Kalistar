'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const M = require('./model.cjs');
const { FILES } = require('./publish.cjs');
const { createFinalizer, main } = require('./finalize-publication.cjs');
const SET = require('./set.json');
const weapons = Object.keys(require('../../../V3/donnees/armes.json'));
const HOME = 'V4/expansions/' + M.SET, REF = 'V4/atelier/data/references.json';
const CAT = 'V4/donnees/catalogue.json', REG = 'V4/atelier/data/regression.json', BANK = 'V4/atelier/designer-assets/';
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value, null, 2));
const profile = c => ({ ...c, text: c.description, edition: c.edition || 'new', visual_revision: 'V4-' + M.SET,
  weapon_index: weapons.indexOf(c.weapon), canHeal: c.atk.includes('revive'), canGuard: c.atk.includes('guard'),
  sentry: c.sentry ?? c.element !== 'NONE', ...(c.legacyId ? { replacesModel: false } : {}),
  ...(M.COLLAB[c.faction] ? { collaboration: c.faction, officialCollaboration: false } : {}) });
const approved = e => ({ id: e.card.id, kind: 'approved', key: e.key, name: e.card.name, title: e.card.title,
  element: e.card.element, profile: e.card, png: e.png, psd: e.psd, pngUrl: '/media/reference/' + e.key + '.png', psdUrl: null });
function inventory(root) {
  const out = {};
  function visit(dir) { for (const name of fs.readdirSync(dir).sort()) {
    const file = path.join(dir, name), s = fs.lstatSync(file);
    if (s.isDirectory()) visit(file); else out[path.relative(root, file).replace(/\\/g, '/')] = s.isSymbolicLink() ? fs.readlinkSync(file) : sha(fs.readFileSync(file));
  } }
  visit(root); return out;
}
function fixture(t, overrides = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-receipt-test-'));
  t.after(() => {
    const real = fs.realpathSync(root), parent = fs.realpathSync(os.tmpdir());
    assert.ok(real.startsWith(parent + path.sep) && path.basename(real).startsWith('kalistar-receipt-test-'));
    fs.rmSync(real, { recursive: true });
  });
  const file = n => path.join(root, n), write = (n, value) => {
    const bytes = Buffer.isBuffer(value) ? value : encode(value);
    fs.mkdirSync(path.dirname(file(n)), { recursive: true }); fs.writeFileSync(file(n), bytes); return bytes;
  }, read = n => JSON.parse(fs.readFileSync(file(n), 'utf8'));
  const id = crypto.randomUUID(), journalPath = HOME + '/publication/' + id + '/journal.json', receiptPath = HOME + '/published.json';
  const set = structuredClone(SET), snapshot = { referenceId: 'old-reference', entries: [], files: {} };
  write(HOME + '/set.json', set);
  const oldMedia = 'V4/cartes/EXISTING.png'; write(oldMedia, Buffer.from('protected old source'));
  const oldCard = { key: 'old-reference', card: { id: '30009999', name: 'OLD', title: 'Original', element: 'NONE' }, png: oldMedia, psd: 'unused.psd' };
  const before = { id: snapshot.referenceId, cards: [oldCard], protectedFiles: { [oldMedia]: sha(fs.readFileSync(file(oldMedia))) } };
  const oldCreated = { id: '49999999', kind: 'created', profile: { name: 'PREVIOUS CREATION' } };
  snapshot.entries.push(oldCreated);
  const oldCreatedFile = 'V4/creations/49999999/profile.json'; write(oldCreatedFile, oldCreated.profile);
  snapshot.files[oldCreatedFile] = sha(fs.readFileSync(file(oldCreatedFile)));
  write(HOME + '/existing-created.snapshot.json', snapshot); write(HOME + '/references-before.json', before);
  const prior = { [REF]: before, [CAT]: { schemaVersion: 4, referenceId: before.id, cards: [approved(oldCard), oldCreated] },
    [REG]: { passed: true, referenceId: before.id }, [BANK + 'manifest.json']: { referenceId: before.id, weapons: {} }, [BANK + 'manifest.raw.json']: { referenceId: before.id, weapons: {} } };
  const ref = structuredClone(before), targets = [], created = [];
  ref.parentReferenceId = before.id;
  ref.protectedFiles[HOME + '/set.json'] = sha(fs.readFileSync(file(HOME + '/set.json')));
  const add = (n, value, protect = false) => { const b = write(n, value); targets.push(n); if (protect) ref.protectedFiles[n] = sha(b); };
  for (const c of set.cards) {
    const p = profile(c); M.validateProfile(p, c);
    if (c.edition === 'canonical') {
      const e = { key: c.key, card: p, profile: 'V4/template-stable/return-20260923/' + c.key + '/card.json',
        png: 'V4/cartes/KALISTAR_V4_' + c.id + '.png', psd: 'V4/templates/KALISTAR_V4_' + c.id + '.psd' };
      ref.cards.push(e); add(e.profile, p, true); add(e.png, Buffer.from('PNG ' + c.id), true); add(e.psd, Buffer.from('PSD ' + c.id), true);
      const prep = HOME + '/cards/' + c.key + '/preparation.json';
      write(prep, { existingSnapshotHash: sha(fs.readFileSync(file(HOME + '/existing-created.snapshot.json'))) });
      ref.protectedFiles[prep] = sha(fs.readFileSync(file(prep)));
    } else {
      const dir = 'V4/creations/' + c.id, hashes = {};
      for (const name of FILES) { add(dir + '/' + name, name === 'profile.json' ? p : Buffer.from(name + ' ' + c.id)); hashes[name] = sha(fs.readFileSync(file(dir + '/' + name))); }
      const creation = { job: crypto.randomUUID(), setId: M.SET, key: c.key, modelId: c.id, hashes };
      add(dir + '/creation.json', creation);
      created.push({ id: c.id, kind: 'created', profile: p, png: dir + '/card.png', psd: dir + '/card.psd', creationJob: creation.job, publicationSource: HOME });
    }
  }
  const packs = {};
  for (const name of ['manifest.json', 'manifest.raw.json']) {
    const pack = { weapons: {}, hashes: {} };
    if (overrides.withBank) {
      const relative = (name === 'manifest.json' ? 'packed/' : '') + 'banks/return-weapon-1.png';
      add(BANK + relative, Buffer.from('new native bank'), true);
      pack.weapons['Ep\u00e9e courte'] = { file: relative, left: 89, top: 1116, width: 96, height: 95 };
      pack.hashes[relative] = sha(fs.readFileSync(file(BANK + relative)));
    }
    packs[BANK + name] = pack;
  }
  ref.id = sha(Buffer.from(JSON.stringify(ref.protectedFiles)));
  for (const pack of Object.values(packs)) pack.referenceId = ref.id;
  const regression = { passed: true, referenceId: ref.id, previousReferenceId: before.id,
    results: ref.cards.map(e => ({ key: e.key, passed: true, comparison: { changed: 0 }, roundtrip: { changed: 0 }, barcode: { passed: true } })) };
  const catalogue = { schemaVersion: 4, referenceId: ref.id, cards: [...ref.cards.map(approved), oldCreated, ...created] };
  for (const [n, value] of Object.entries({ [REF]: ref, [CAT]: catalogue, [REG]: regression, ...packs })) add(n, value);
  write(HOME + '/canonical-regression.json', regression);
  const journal = { id, setId: M.SET, phase: 'committed', files: targets.map(to => {
    const backup = Object.hasOwn(prior, to) ? 'publication/' + id + '/before/' + to : null;
    const beforeHash = backup ? sha(write(HOME + '/' + backup, prior[to])) : null;
    return { to, hash: sha(fs.readFileSync(file(to))), beforeHash, backup };
  }) };
  write(journalPath, journal);
  const options = { root, now: () => new Date('2026-09-24T07:00:00.000Z'), ...overrides };
  const finalizer = createFinalizer(options);
  return { root, id, file, write, read, journal, journalPath, receiptPath, oldMedia, oldCreatedFile, set, ref, catalogue,
    finalizer, options, hash: () => sha(fs.readFileSync(file(journalPath))), hashFile: n => sha(fs.readFileSync(file(n))) };
}

test('default CLI is read-only and reconstructs exact publisher summary', async t => {
  const f = fixture(t), before = inventory(f.root), result = await main([f.id], f.finalizer);
  assert.deepEqual(result, { cards: 22, canonical: 11, created: 11, referenceId: f.ref.id,
    ids: f.set.cards.filter(c => c.edition !== 'canonical').map(c => c.id), published: false, transaction: f.id,
    journalHash: f.hash(), action: 'ready-to-finalize', writePerformed: false });
  assert.deepEqual(inventory(f.root), before);
});

test('committed publication without receipt is finalized without changing installed files', async t => {
  const f = fixture(t), before = inventory(f.root), p = await f.finalizer.preflight(f.id);
  const result = await main([f.id, '--finalize', p.journalHash], f.finalizer);
  assert.deepEqual(result, { cards: 22, canonical: 11, created: 11, referenceId: f.ref.id,
    ids: p.ids, published: true, transaction: f.id, checkedAt: '2026-09-24T07:00:00.000Z', recovered: true });
  const after = inventory(f.root); delete after[f.receiptPath]; assert.deepEqual(after, before);
  assert.deepEqual(f.read(f.receiptPath), result);
});

test('new raw and packed weapon banks are verified as journal-owned additions', async t => {
  const f = fixture(t, { withBank: true }), before = inventory(f.root);
  await f.finalizer.finalize(f.id, f.hash()); const after = inventory(f.root); delete after[f.receiptPath];
  assert.deepEqual(after, before);
});

test('repeated finalization preserves the matching receipt bytes and timestamp', async t => {
  const f = fixture(t), first = await f.finalizer.finalize(f.id, f.hash());
  const before = inventory(f.root), timestamp = fs.statSync(f.file(f.receiptPath)).mtimeMs;
  assert.deepEqual(await f.finalizer.finalize(f.id, f.hash()), first);
  assert.equal(fs.statSync(f.file(f.receiptPath)).mtimeMs, timestamp); assert.deepEqual(inventory(f.root), before);
  assert.equal((await f.finalizer.preflight(f.id)).action, 'already-finalized');
});

test('original publisher receipt is also idempotent without adding recovered', async t => {
  const f = fixture(t), receipt = await f.finalizer.finalize(f.id, f.hash()); delete receipt.recovered;
  receipt.checkedAt = '2026-09-23T10:00:00.000Z'; f.write(f.receiptPath, receipt);
  const bytes = fs.readFileSync(f.file(f.receiptPath)); assert.deepEqual(await f.finalizer.finalize(f.id, f.hash()), receipt);
  assert.deepEqual(fs.readFileSync(f.file(f.receiptPath)), bytes);
});

test('receipt-write failure leaves cards committed and permits a clean retry', async t => {
  const f = fixture(t), before = inventory(f.root);
  const failing = createFinalizer({ ...f.options, checkpoint: stage => { if (stage === 'before-rename') throw Object.assign(Error('receipt ENOSPC'), { code: 'ENOSPC' }); } });
  await assert.rejects(failing.finalize(f.id, f.hash()), { code: 'ENOSPC' });
  assert.deepEqual(inventory(f.root), before); assert.equal(f.read(f.journalPath).phase, 'committed');
  assert.equal((await f.finalizer.finalize(f.id, f.hash())).published, true);
});

test('crash after committed with an orphan receipt temp neither adopts nor deletes the temp', async t => {
  const f = fixture(t), orphan = f.receiptPath + '.' + crypto.randomUUID() + '.tmp'; f.write(orphan, Buffer.from('interrupted writer'));
  const hash = f.hashFile(orphan); await f.finalizer.finalize(f.id, f.hash()); assert.equal(f.hashFile(orphan), hash);
});

for (const phase of ['applying', 'staging', 'rolled-back']) test('refuses journal phase ' + phase, async t => {
  const f = fixture(t); f.journal.phase = phase; f.write(f.journalPath, f.journal); const before = inventory(f.root);
  await assert.rejects(f.finalizer.finalize(f.id, f.hash()), /non committed/); assert.deepEqual(inventory(f.root), before);
});

test('refuses missing journal, missing media and stale pinned journal hash', async t => {
  const f = fixture(t); await assert.rejects(f.finalizer.preflight(crypto.randomUUID()), /absent/);
  const pinned = f.hash(); fs.appendFileSync(f.file(f.journalPath), ' ');
  await assert.rejects(f.finalizer.finalize(f.id, pinned), /Fichier modifie/);
  fs.unlinkSync(f.file(f.ref.cards[1].png)); await assert.rejects(f.finalizer.preflight(f.id), /absent/);
});

test('refuses changed installed, protected, old-created, set and backup files', async t => {
  const f = fixture(t);
  const paths = [f.ref.cards[1].png, REF, CAT, REG, f.oldMedia, f.oldCreatedFile, HOME + '/set.json', HOME + '/' + f.journal.files.find(r => r.to === REF).backup];
  for (const relative of paths) {
    const bytes = fs.readFileSync(f.file(relative)); fs.appendFileSync(f.file(relative), ' ');
    await assert.rejects(f.finalizer.preflight(f.id), /modifie|lie au verrou/); fs.writeFileSync(f.file(relative), bytes);
  }
});

test('matching journal hashes cannot hide inconsistent catalogue reference ID', async t => {
  const f = fixture(t), cat = f.read(CAT); cat.referenceId = 'wrong'; f.write(CAT, cat);
  f.journal.files.find(r => r.to === CAT).hash = f.hashFile(CAT); f.write(f.journalPath, f.journal);
  await assert.rejects(f.finalizer.preflight(f.id));
});

test('foreign or malformed receipts are never overwritten', async t => {
  const f = fixture(t), receipt = await f.finalizer.finalize(f.id, f.hash());
  for (const value of [{ ...receipt, transaction: crypto.randomUUID() }, { ...receipt, cards: 23 }, { ...receipt, recovered: false }, Buffer.from('')]) {
    f.write(f.receiptPath, value); const before = fs.readFileSync(f.file(f.receiptPath));
    await assert.rejects(f.finalizer.finalize(f.id, f.hash())); assert.deepEqual(fs.readFileSync(f.file(f.receiptPath)), before);
  }
});

test('foreign render lock blocks both modes and is preserved', async t => {
  const f = fixture(t), lock = 'V4/atelier/data/render.lock'; f.write(lock, { id: 'native-worker', pid: 123 }); const before = inventory(f.root);
  await assert.rejects(f.finalizer.preflight(f.id), /render.lock/); await assert.rejects(f.finalizer.finalize(f.id, f.hash()), /EEXIST/);
  assert.deepEqual(inventory(f.root), before);
});

test('a lock acquired during read-only preflight is preserved and blocks success', async t => {
  const f = fixture(t), lock = 'V4/atelier/data/render.lock', foreign = { id: 'native-worker' };
  const racing = createFinalizer({ ...f.options, checkpoint: () => f.write(lock, foreign) });
  await assert.rejects(racing.preflight(f.id), /render.lock/); assert.deepEqual(f.read(lock), foreign);
  assert.equal(fs.existsSync(f.file(f.receiptPath)), false);
});

test('journal and all observed inputs are rechecked after inspection and before receipt commit', async t => {
  const f = fixture(t);
  for (const stage of ['after-inspect', 'before-rename']) for (const relative of [f.journalPath, HOME + '/set.json', REF, CAT, f.oldMedia, f.ref.cards[1].png]) {
    const original = fs.readFileSync(f.file(relative));
    const racing = createFinalizer({ ...f.options, checkpoint: current => { if (current === stage) fs.appendFileSync(f.file(relative), ' '); } });
    await assert.rejects(racing.finalize(f.id, f.hash()), /Fichier modifie/);
    assert.equal(fs.existsSync(f.file(f.receiptPath)), false); assert.ok(f.hashFile(relative) !== sha(original));
    fs.writeFileSync(f.file(relative), original);
  }
});

test('receipt arriving before rename is preserved, not replaced', async t => {
  const f = fixture(t), foreign = { transaction: 'someone-else' };
  const racing = createFinalizer({ ...f.options, checkpoint: stage => { if (stage === 'before-rename') f.write(f.receiptPath, foreign); } });
  await assert.rejects(racing.finalize(f.id, f.hash()), /Recu apparu/); assert.deepEqual(f.read(f.receiptPath), foreign);
});

test('lost lock is never removed and no receipt is committed', async t => {
  const f = fixture(t), lock = 'V4/atelier/data/render.lock', foreign = { id: 'foreign-lock' };
  const racing = createFinalizer({ ...f.options, checkpoint: stage => { if (stage === 'before-rename') { fs.unlinkSync(f.file(lock)); f.write(lock, foreign); } } });
  await assert.rejects(racing.finalize(f.id, f.hash()), /Verrou/); assert.deepEqual(f.read(lock), foreign);
  assert.equal(fs.existsSync(f.file(f.receiptPath)), false);
});

test('journal traversal, duplicate, extra and missing targets reject', async t => {
  const f = fixture(t), original = structuredClone(f.journal);
  const extra = 'V4/cartes/KALISTAR_V4_39999999.png'; f.write(extra, Buffer.from('unrelated'));
  for (const change of [j => j.files[0].to = '../escape', j => j.files.push(j.files[0]),
    j => j.files.push({ to: extra, hash: f.hashFile(extra), beforeHash: null, backup: null }), j => j.files.shift()]) {
    const j = structuredClone(original); change(j); f.write(f.journalPath, j); await assert.rejects(f.finalizer.preflight(f.id));
  }
});

test('junction in the journal path is rejected without touching its target', async t => {
  const f = fixture(t), parent = f.file(HOME + '/publication'), moved = f.file('junction-target');
  fs.renameSync(parent, moved); fs.symlinkSync(moved, parent, process.platform === 'win32' ? 'junction' : 'dir');
  const before = inventory(moved); await assert.rejects(f.finalizer.preflight(f.id), /Lien symbolique/); assert.deepEqual(inventory(moved), before);
});

test('matching receipt does not bypass file validation', async t => {
  const f = fixture(t); await f.finalizer.finalize(f.id, f.hash()); const receipt = fs.readFileSync(f.file(f.receiptPath));
  fs.appendFileSync(f.file(f.ref.cards[1].png), 'foreign edit');
  await assert.rejects(f.finalizer.finalize(f.id, f.hash()), /Fichier modifie/); assert.deepEqual(fs.readFileSync(f.file(f.receiptPath)), receipt);
});

test('CLI rejects implicit writes, missing hash and unexpected arguments', async () => {
  for (const args of [[], ['--finalize'], [crypto.randomUUID(), '--finalize'], [crypto.randomUUID(), '--publish', '0'.repeat(64)]])
    await assert.rejects(main(args, { preflight: async id => assert.match(id, /^[a-f0-9-]{36}$/) }));
});
