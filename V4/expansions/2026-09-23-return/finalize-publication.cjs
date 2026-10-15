'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const M = require('./model.cjs');
const { createPublisher, FILES } = require('./publish.cjs');
const HOME = 'V4/expansions/' + M.SET;
const REF = 'V4/atelier/data/references.json', CAT = 'V4/donnees/catalogue.json';
const REG = 'V4/atelier/data/regression.json', BANK = 'V4/atelier/designer-assets/';
const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/;
const HASH = /^[a-f0-9]{64}$/;
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const encode = value => Buffer.from(JSON.stringify(value, null, 2));
function stat(file) { try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; throw e; } }
const identity = file => { const s = fs.lstatSync(file); return [s.dev, s.ino, s.birthtimeMs].join(':'); };
function digest(file) {
  const h = crypto.createHash('sha256'), block = Buffer.allocUnsafe(1024 * 1024), fd = fs.openSync(file, 'r');
  try { let size; while ((size = fs.readSync(fd, block, 0, block.length, null))) h.update(block.subarray(0, size)); }
  finally { fs.closeSync(fd); }
  return h.digest('hex');
}

function createFinalizer(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '../../..'));
  const checkpoint = options.checkpoint || (async () => {}), now = options.now || (() => new Date());
  function absolute(relative) {
    assert.ok(typeof relative === 'string' && relative && !relative.includes('\\') && !relative.includes(':') && !path.isAbsolute(relative), 'Chemin relatif requis.');
    assert.ok(relative.split('/').every(p => p && p !== '.' && p !== '..'), 'Chemin interdit.');
    const file = path.resolve(root, relative);
    let cursor = file;
    while (true) {
      const s = stat(cursor); assert.ok(!s?.isSymbolicLink(), 'Lien symbolique/jonction interdit : ' + relative);
      if (s && cursor !== file) assert.ok(s.isDirectory(), 'Parent non repertoire.');
      const parent = path.dirname(cursor); if (parent === cursor) break; cursor = parent;
    }
    return file;
  }
  const batch = name => HOME + '/' + name;
  const read = file => parse(fs.readFileSync(file));
  const inside = (base, relative) => {
    const target = path.resolve(base, relative), rel = path.relative(base, target);
    assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Chemin interdit.'); return target;
  };
  // Reuse the publisher's allowlist without running its preflight or publication.
  const safeTarget = createPublisher({ L: { fs, path, crypto, ROOT: root, DATA: absolute('V4/atelier/data'), read, inside }, D: {}, home: absolute(HOME) }).safeTarget;
  const lockRelative = 'V4/atelier/data/render.lock', receiptRelative = batch('published.json');
  const unlocked = () => assert.ok(!stat(absolute(lockRelative)), 'render.lock occupe : ne pas supprimer le verrou.');

  function inspect(id, expectedJournalHash) {
    assert.match(id, UUID, 'Transaction UUID invalide.');
    if (expectedJournalHash !== undefined) assert.match(expectedJournalHash, HASH, 'Empreinte du journal requise.');
    const observed = new Map();
    function observe(relative, expected, json = false) {
      const file = absolute(relative); assert.ok(stat(file)?.isFile(), 'Fichier absent/non regulier : ' + relative);
      const bytes = json ? fs.readFileSync(file) : null, hash = bytes ? sha(bytes) : digest(file);
      if (expected !== undefined) assert.equal(hash, expected, 'Fichier modifie : ' + relative);
      if (observed.has(relative)) assert.equal(hash, observed.get(relative), 'Fichier modifie pendant controle : ' + relative);
      observed.set(relative, hash); return json ? parse(bytes) : hash;
    }
    const journalPath = batch('publication/' + id + '/journal.json');
    const journal = observe(journalPath, expectedJournalHash, true), journalHash = observed.get(journalPath);
    assert.equal(journal.id, id); assert.equal(journal.setId, M.SET);
    assert.equal(journal.phase, 'committed', 'Journal non committed. Pour applying, utiliser le rollback existant apres inspection.');
    assert.ok(Array.isArray(journal.files) && journal.files.length > 0);
    const rows = new Map();
    for (const row of journal.files) {
      safeTarget(row.to); absolute(row.to); assert.ok(!rows.has(row.to), 'Cible dupliquee.');
      assert.match(row.hash, HASH); assert.ok(row.beforeHash === null || HASH.test(row.beforeHash));
      assert.equal(row.backup, row.beforeHash === null ? null : 'publication/' + id + '/before/' + row.to);
      observe(row.to, row.hash); rows.set(row.to, row);
      if (row.backup) observe(batch(row.backup), row.beforeHash);
    }
    const installed = relative => { assert.ok(rows.has(relative), 'Cible absente du journal : ' + relative); return observe(relative, rows.get(relative).hash, true); };
    const prior = relative => { const row = rows.get(relative); assert.ok(row?.backup, 'Sauvegarde requise : ' + relative); return observe(batch(row.backup), row.beforeHash, true); };
    const ref = installed(REF), before = prior(REF), catalogue = installed(CAT), previousCatalogue = prior(CAT), regression = installed(REG);
    const set = M.validateSet(observe(batch('set.json'), undefined, true));
    assert.equal(ref.protectedFiles[batch('set.json')], observed.get(batch('set.json')), 'Lot non lie au verrou publie.');
    assert.equal(ref.id, sha(Buffer.from(JSON.stringify(ref.protectedFiles))), 'Identifiant du verrou incoherent.');
    assert.equal(ref.parentReferenceId, before.id); assert.equal(catalogue.referenceId, ref.id); assert.equal(catalogue.schemaVersion, 4);
    assert.equal(regression.referenceId, ref.id); assert.equal(regression.previousReferenceId, before.id); assert.equal(regression.passed, true);
    assert.deepEqual(regression.results.map(r => r.key).sort(), ref.cards.map(c => c.key).sort());
    for (const r of regression.results) assert.ok(r.passed && r.comparison?.changed === 0 && r.roundtrip?.changed === 0 && r.barcode?.passed === true);
    observe(batch('canonical-regression.json'), rows.get(REG).hash);
    assert.deepEqual(observe(batch('references-before.json'), undefined, true), before);
    const snapshot = observe(batch('existing-created.snapshot.json'), undefined, true);
    assert.equal(snapshot.referenceId, before.id);
    const oldCreated = previousCatalogue.cards.filter(c => c.kind === 'created'); assert.deepEqual(oldCreated, snapshot.entries);
    assert.deepEqual(ref.cards.slice(0, before.cards.length), before.cards);
    for (const [file, hash] of Object.entries(before.protectedFiles)) assert.equal(ref.protectedFiles[file], hash, 'Protection historique modifiee.');
    for (const [file, hash] of Object.entries(ref.protectedFiles)) { assert.match(hash, HASH); observe(file, hash); }
    for (const [file, hash] of Object.entries(snapshot.files)) { assert.match(hash, HASH); observe(file, hash); }

    const canonical = set.cards.filter(c => c.edition === 'canonical'), created = set.cards.filter(c => c.edition !== 'canonical');
    const appended = ref.cards.slice(before.cards.length), required = new Set([REF, CAT, REG, BANK + 'manifest.json', BANK + 'manifest.raw.json']);
    assert.deepEqual(appended.map(c => c.key), canonical.map(c => c.key));
    function newFile(relative) { assert.equal(rows.get(relative)?.beforeHash, null, 'Ajout neuf absent : ' + relative); required.add(relative); }
    for (const [i, spec] of canonical.entries()) {
      const entry = appended[i], profile = 'V4/template-stable/return-20260923/' + spec.key + '/card.json';
      const png = 'V4/cartes/KALISTAR_V4_' + spec.id + '.png', psd = 'V4/templates/KALISTAR_V4_' + spec.id + '.psd';
      assert.equal(entry.profile, profile); assert.equal(entry.png, png); assert.equal(entry.psd, psd);
      for (const file of [profile, png, psd]) newFile(file);
      assert.deepEqual(installed(profile), entry.card); M.validateProfile(entry.card, spec);
      const prepFile = batch('cards/' + spec.key + '/preparation.json');
      assert.match(ref.protectedFiles[prepFile] || '', HASH);
      const prep = observe(prepFile, ref.protectedFiles[prepFile], true);
      assert.equal(prep.existingSnapshotHash, observed.get(batch('existing-created.snapshot.json')));
    }
    const approved = ref.cards.map(e => ({ id: e.card.id, kind: 'approved', key: e.key, name: e.card.name, title: e.card.title,
      element: e.card.element, profile: e.card, png: e.png, psd: e.psd, pngUrl: '/media/reference/' + e.key + '.png', psdUrl: null }));
    assert.deepEqual(catalogue.cards.slice(0, approved.length + oldCreated.length), [...approved, ...oldCreated]);
    const added = catalogue.cards.slice(approved.length + oldCreated.length);
    assert.deepEqual(added.map(c => c.id), created.map(c => c.id));
    for (const [i, spec] of created.entries()) {
      const item = added[i], dir = 'V4/creations/' + spec.id;
      for (const file of [...FILES, 'creation.json']) newFile(dir + '/' + file);
      const profile = installed(dir + '/profile.json'), creation = installed(dir + '/creation.json'); M.validateProfile(profile, spec);
      assert.equal(item.kind, 'created'); assert.deepEqual(item.profile, profile); assert.equal(item.publicationSource, HOME);
      assert.equal(item.png, dir + '/card.png'); assert.equal(item.psd, dir + '/card.psd');
      assert.equal(creation.setId, M.SET); assert.equal(creation.key, spec.key); assert.equal(creation.modelId, spec.id);
      assert.equal(item.creationJob, creation.job);
      for (const name of FILES) assert.equal(creation.hashes[name], rows.get(dir + '/' + name).hash);
    }
    for (const name of ['manifest.json', 'manifest.raw.json']) {
      const pack = installed(BANK + name); assert.equal(pack.referenceId, ref.id);
      for (const weapon of Object.values(pack.weapons)) {
        const relative = BANK + weapon.file;
        if (rows.has(relative)) { newFile(relative); assert.equal(pack.hashes[weapon.file], rows.get(relative).hash); }
      }
    }
    assert.deepEqual([...rows.keys()].sort(), [...required].sort(), 'Perimetre du journal different du lot.');
    const summary = { cards: set.cards.length, canonical: canonical.length, created: created.length, referenceId: ref.id, ids: added.map(c => c.id) };
    let receipt = null;
    if (stat(absolute(receiptRelative))) {
      receipt = observe(receiptRelative, undefined, true);
      const { checkedAt, recovered, ...core } = receipt;
      assert.deepEqual(core, { ...summary, published: true, transaction: id }, 'Recu etranger/incoherent : ne pas remplacer.');
      assert.ok(typeof checkedAt === 'string' && Number.isFinite(Date.parse(checkedAt)), 'Date du recu invalide.');
      assert.ok(recovered === undefined || recovered === true, 'Recu etranger/incoherent.');
    }
    return { observed, journalHash, summary, receipt, id };
  }
  function recheck(plan) {
    for (const [relative, hash] of plan.observed) {
      const file = absolute(relative); assert.ok(stat(file)?.isFile(), 'Fichier absent/non regulier : ' + relative);
      assert.equal(digest(file), hash, 'Fichier modifie depuis le controle : ' + relative);
    }
    if (!plan.receipt) assert.ok(!stat(absolute(receiptRelative)), 'Recu apparu pendant le controle : ne pas remplacer.');
  }
  async function preflight(id) {
    unlocked(); const plan = inspect(id); await checkpoint('after-inspect'); recheck(plan); unlocked();
    return { ...plan.summary, published: !!plan.receipt, transaction: id, journalHash: plan.journalHash,
      action: plan.receipt ? 'already-finalized' : 'ready-to-finalize', writePerformed: false };
  }
  async function finalize(id, journalHash) {
    assert.match(id, UUID); assert.match(journalHash || '', HASH, 'Fournir le hash du journal obtenu au preflight.');
    const token = crypto.randomUUID(), owner = encode({ id: token, transaction: id, kind: 'return-receipt-finalization', pid: process.pid });
    const lock = absolute(lockRelative), receipt = absolute(receiptRelative);
    let fd, lockIdentity, temporary;
    const ownsLock = () => { const s = stat(absolute(lockRelative)); return s?.isFile() && identity(lock) === lockIdentity && fs.readFileSync(lock).equals(owner); };
    const assertLock = () => assert.ok(ownsLock(), 'Verrou de finalisation perdu.');
    try {
      fd = fs.openSync(lock, 'wx'); lockIdentity = identity(lock); fs.writeFileSync(fd, owner); fs.fsyncSync(fd);
      const plan = inspect(id, journalHash); await checkpoint('after-inspect'); recheck(plan); assertLock();
      if (plan.receipt) return plan.receipt;
      const result = { ...plan.summary, published: true, transaction: id, checkedAt: now().toISOString(), recovered: true }, bytes = encode(result);
      const relative = receiptRelative + '.' + token + '.tmp', file = absolute(relative), tempFd = fs.openSync(file, 'wx');
      temporary = { relative, identity: identity(file), hash: sha(bytes) };
      try { fs.writeFileSync(tempFd, bytes); fs.fsyncSync(tempFd); } finally { fs.closeSync(tempFd); }
      await checkpoint('before-rename'); recheck(plan); assertLock();
      assert.equal(identity(absolute(relative)), temporary.identity); assert.equal(digest(file), temporary.hash, 'Recu temporaire modifie.');
      assert.ok(!stat(absolute(receiptRelative)), 'Recu etranger apparu : ne pas remplacer.');
      fs.renameSync(file, receipt); temporary = null;
      return result;
    } finally {
      try {
        if (temporary) {
          const file = absolute(temporary.relative), s = stat(file);
          if (s?.isFile() && identity(file) === temporary.identity && digest(file) === temporary.hash) fs.unlinkSync(file);
        }
      } finally {
        if (fd !== undefined) { fs.closeSync(fd); if (ownsLock()) fs.unlinkSync(lock); }
      }
    }
  }
  return { preflight, finalize };
}
async function main(args = process.argv.slice(2), finalizer) {
  assert.ok(args.length === 1 || args.length === 3 && args[1] === '--finalize', 'Usage: finalize-publication.cjs transaction-id [--finalize journal-sha256]');
  const f = finalizer || createFinalizer(); return args.length === 1 ? f.preflight(args[0]) : f.finalize(args[0], args[2]);
}
module.exports = { createFinalizer, main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
