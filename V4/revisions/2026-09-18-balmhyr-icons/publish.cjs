'use strict';

const L = require('../../atelier/lib.cjs');
const {fs, path, crypto, assert, ROOT, DATA, read, hash} = L;
const WORK = path.relative(ROOT, __dirname).replaceAll('\\', '/');
const OLD_ID = 'af17ee6bd1c0aba0771193bbe87d2498e1ffee55df90c5506507740b667af4ea';
const ART = 'V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_02_CANYONERO.png';
const REF = 'V4/atelier/data/references.json';
const REGRESSION = 'V4/atelier/data/regression.json';
const PACK = 'V4/atelier/designer-assets/';
const PACKS = [PACK + 'manifest.json', PACK + 'manifest.raw.json'];
const BANKS = ['banks/weapon-Hache.png', 'banks/race-NAIN.png'];
const BANK_TARGETS = [...BANKS, ...BANKS.map(p => 'packed/' + p)].map(p => PACK + p);
const METADATA = ['V4/template-stable/elements-01/manifest.json', 'V4/template-stable/elements-02/manifest.json', 'V4/template-stable/current-elements.json'];
const PROOFS = ['plan.json', 'verification.json', 'references-before.json', 'publish.cjs'].map(p => WORK + '/' + p);
const JOURNAL = WORK + '/transaction.json';
const PUBLISHED = WORK + '/published.json';
const SHA = /^[a-f0-9]{64}$/;
const clone = value => structuredClone(value);
const digest = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

function safe(file) {
  assert.equal(typeof file, 'string', 'Chemin relatif requis');
  assert.ok(file.startsWith('V4/') && !/[\\:\x00-\x1f]/.test(file), 'Chemin V4 invalide : ' + file);
  const parts = file.split('/');
  assert.ok(parts.every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p)), 'Chemin non canonique : ' + file);
  let current = ROOT;
  for (const part of parts) {
    current = path.join(current, part);
    if (fs.existsSync(current)) assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Lien interdit : ' + current);
  }
  return current;
}

function staged(file) {
  safe(file);
  assert.ok(file.startsWith(WORK + '/staged/') || file === WORK + '/calibration.json', 'Source hors du staging : ' + file);
  assert.ok(fs.statSync(safe(file)).isFile(), 'Fichier de staging requis : ' + file);
  return file;
}

function sameKeys(a, b, label) {
  assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), label);
}

function atomic(file, buffer) {
  const target = safe(file), temp = target + '.' + crypto.randomUUID() + '.tmp';
  fs.mkdirSync(path.dirname(target), {recursive:true});
  let fd;
  try {
    fd = fs.openSync(temp, 'wx'); fs.writeFileSync(fd, buffer); fs.fsyncSync(fd); fs.closeSync(fd); fd = undefined;
    fs.renameSync(temp, target);
  } finally {
    if (fd !== undefined) fs.closeSync(fd);
    if (fs.existsSync(temp)) fs.unlinkSync(temp);
  }
}

async function copyAtomic(from, to, expected) {
  const target = safe(to), temp = target + '.' + crypto.randomUUID() + '.tmp';
  fs.mkdirSync(path.dirname(target), {recursive:true});
  try {
    fs.copyFileSync(safe(from), temp, fs.constants.COPYFILE_EXCL);
    assert.equal(await hash(temp), expected, 'Copie modifiee : ' + to);
    const fd = fs.openSync(temp, 'r+'); try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.renameSync(temp, target);
  } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}

async function currentHash(file) {
  const absolute = safe(file);
  if (!fs.existsSync(absolute)) return null;
  assert.ok(fs.statSync(absolute).isFile(), 'Fichier attendu : ' + file);
  return hash(absolute);
}

async function prepare() {
  const inputs = new Map();
  function snapshot(file) {
    const buffer = fs.readFileSync(safe(file)); inputs.set(file, digest(buffer));
    return JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  }
  const plan = snapshot(WORK + '/plan.json'), audit = snapshot(WORK + '/verification.json');
  const old = snapshot(WORK + '/references-before.json');
  assert.equal(old.id, OLD_ID); assert.equal(Object.keys(old.protectedFiles).length, 166);
  assert.deepEqual(L.baseline(), old, 'Le verrou actif ne correspond plus au snapshot');
  assert.equal(plan.referenceId, old.id); assert.equal(audit.originalReferenceId, old.id);
  assert.ok(typeof plan.revision === 'string' && /^[a-z0-9][a-z0-9-]{0,99}$/.test(plan.revision));
  assert.equal(audit.revision, plan.revision); assert.equal(audit.passed, true);
  assert.equal(old.cards.length, 26);
  assert.ok(Array.isArray(plan.items) && Array.isArray(audit.results));
  assert.deepEqual(plan.items.map(i => i.key).sort(), ['balmhyr', 'lok']);
  assert.deepEqual(audit.results.map(i => i.key).sort(), ['balmhyr', 'lok']);
  assert.ok(Array.isArray(plan.protect));
  const protect = new Set(plan.protect);
  assert.equal(protect.size, plan.protect.length);
  for (const file of protect) {
    safe(file);
    assert.ok(!PACKS.includes(file) && file !== REF && file !== REGRESSION && file !== JOURNAL && file !== PUBLISHED, 'Protection circulaire ou etat mutable : ' + file);
  }
  for (const file of [...PROOFS, ART, ...BANK_TARGETS]) assert.ok(protect.has(file), 'plan.protect incomplet : ' + file);
  assert.ok(audit.installHashes, 'Empreintes de staging requises');
  const componentHashes = audit.componentHashes || {};
  const calibrationHash = await hash(safe(WORK + '/calibration.json'));
  assert.equal(audit.calibrationHash, calibrationHash, 'Calibration native non auditee');
  inputs.set(WORK + '/calibration.json', calibrationHash);
  await L.protectedCheck(old);

  inputs.set(WORK + '/publish.cjs', await hash(safe(WORK + '/publish.cjs')));
  const operations = new Map(), names = new Set(), targets = new Map();
  for (const item of plan.items) {
    const entry = old.cards.find(c => c.key === item.key);
    for (const field of ['psd', 'png', 'profile']) assert.equal(item[field], entry[field], 'Chemin approuve change : ' + item.key + '/' + field);
    assert.equal(item.report, path.posix.dirname(entry.profile) + '/render.json');
    safe(item.destination); assert.ok(item.destination.startsWith(WORK + '/staged/'));
    targets.set(item.key, entry);
  }
  const forbidden = new Set(old.cards.filter(c => !targets.has(c.key)).flatMap(c => [c.psd, c.png, c.profile, path.posix.dirname(c.profile) + '/render.json']));
  function admit(to) {
    safe(to);
    assert.ok(!names.has(to.toLowerCase()), 'Cible dupliquee : ' + to); names.add(to.toLowerCase());
    assert.ok(!forbidden.has(to), 'Autre carte approuvee interdite : ' + to);
    assert.ok(!to.startsWith(WORK + '/') && !to.startsWith('V4/atelier/data/') && !to.startsWith('V4/creations/') && !to.startsWith('V4/donnees/'), 'Etat hors migration : ' + to);
    assert.ok(old.protectedFiles[to] || protect.has(to) || PACKS.includes(to), 'Cible non autorisee : ' + to);
    if (to.startsWith(PACK)) assert.ok(PACKS.includes(to) || BANK_TARGETS.includes(to), 'Autre composant interdit : ' + to);
  }
  async function add(from, to, json = false) {
    admit(to); staged(from);
    const actual = await hash(safe(from));
    assert.ok(SHA.test(audit.installHashes[to])); assert.equal(actual, audit.installHashes[to], 'Staging non audite : ' + to);
    inputs.set(from, actual);
    operations.set(to, {to, from, stagedHash:actual, ...(json ? {value:read(safe(from))} : {})});
  }
  for (const item of plan.items) {
    const result = audit.results.find(r => r.key === item.key), entry = targets.get(item.key);
    assert.equal(result.passed, true); assert.equal(result.comparison?.outside, 0); assert.equal(result.roundtrip?.changed, 0);
    assert.equal(result.barcode?.passed, true); assert.equal(result.barcode.expected, entry.card.id);
    for (const format of ['psd', 'png']) {
      assert.equal(audit.installHashes[item[format]], result[format + 'Hash']);
      await add(item.destination + '/card.' + format, item[format]);
    }
    const nativeFile = staged(item.destination + '/native.json'), nativeHash = await hash(safe(nativeFile));
    assert.equal(nativeHash, result.nativeHash); inputs.set(nativeFile, nativeHash);
    const native = read(safe(nativeFile));
    assert.equal(native.width, 897); assert.equal(native.height, 1497); assert.equal(native.resolution, 300);
    assert.ok(Array.isArray(native.before) && native.before.length && Array.isArray(native.reopened) && native.reopened.length);
    item.native = native;
  }
  for (const item of plan.install || []) {
    if (operations.has(item.to)) {
      assert.equal(operations.get(item.to).from, item.from, 'Installation implicite dupliquee avec une autre source');
      assert.ok(plan.items.some(card => card.psd === item.to || card.png === item.to));
    } else await add(item.from, item.to, item.to.endsWith('.json'));
  }
  for (const item of plan.jsonUpdates || []) await add(item.from, item.to, true);
  sameKeys(audit.installHashes, Object.fromEntries(operations), 'installHashes doit couvrir exactement les installations');
  for (const file of [...PACKS, ...METADATA]) assert.ok(operations.get(file)?.value, 'JSON complet requis : ' + file);
  for (const file of BANK_TARGETS) assert.ok(operations.has(file), 'Export brut et packed requis : ' + file);

  const next = clone(old), profiles = new Map();
  for (const item of plan.items) {
    const profile = operations.get(item.profile)?.value, report = operations.get(item.report)?.value;
    assert.ok(profile && report, 'Profil et rapport stages requis : ' + item.key);
    const expected = clone(targets.get(item.key).card);
    if (item.key === 'balmhyr') expected.artworkSource = ART;
    assert.deepEqual(profile, expected, 'Seule artworkSource de Balmhyr peut changer');
    assert.deepEqual(report.card, profile); assert.deepEqual(report.before, item.native.before); assert.deepEqual(report.reopened, item.native.reopened);
    profiles.set(item.key, profile); next.cards.find(c => c.key === item.key).card = clone(profile);
  }
  const oldPacks = PACKS.map(snapshot);
  for (let i = 0; i < PACKS.length; i++) {
    const before = oldPacks[i], after = operations.get(PACKS[i]).value;
    assert.equal(before.referenceId, OLD_ID); assert.equal(after.referenceId, OLD_ID);
    if (i === 0) assert.ok(['ready', 'complete'].includes(before.status));
    const stable = m => {
      const result = clone(m); delete result.referenceId; delete result.hashes;
      delete result.weapons.Hache; delete result.races.NAIN;
      return result;
    };
    assert.deepEqual(stable(after), stable(before), 'Modification etrangere dans le pack');
    const expectedFiles = BANKS.map(file => i === 0 ? 'packed/' + file : file);
    for (const [descriptor, file, prior] of [[after.weapons.Hache, expectedFiles[0], before.weapons.Hache], [after.races.NAIN, expectedFiles[1], before.races.NAIN]]) {
      assert.equal(descriptor.file, file);
      assert.deepEqual(descriptor.iconRevision, {id:plan.revision, audit:WORK + '/verification.json', preparation:WORK + '/publication-inputs.json', scope:'this-icon-bank-only', regressionRequired:true});
      const provenance = value => { const copy = clone(value); for (const field of ['left','top','width','height','iconRevision']) delete copy[field]; return copy; };
      assert.deepEqual(provenance(descriptor), provenance(prior), 'Provenance de banque modifiee');
      for (const field of ['left', 'top', 'width', 'height']) assert.ok(Number.isInteger(descriptor[field]));
      assert.ok(descriptor.left >= 0 && descriptor.top >= 0 && descriptor.width > 0 && descriptor.height > 0 && descriptor.left + descriptor.width <= 897 && descriptor.top + descriptor.height <= 1497);
      const metadata = await L.sharp(safe(operations.get(PACK + file).from)).metadata();
      assert.equal(metadata.width, descriptor.width); assert.equal(metadata.height, descriptor.height);
    }
    const hashes = clone(before.hashes || {});
    for (const [file, expected] of Object.entries(hashes)) {
      assert.ok(SHA.test(expected));
      assert.equal(await hash(safe(PACK + file)), expected, 'Pack actif modifie : ' + file);
      if (!expectedFiles.includes(file)) assert.equal(after.hashes?.[file], expected, 'Autre empreinte du pack modifiee : ' + file);
    }
    for (const file of Object.keys(after.hashes || {})) assert.ok(file in hashes || expectedFiles.includes(file), 'Empreinte ajoutee hors banques : ' + file);
    for (const file of expectedFiles) hashes[file] = operations.get(PACK + file).stagedHash;
    after.hashes = hashes;
  }

  for (const file of [...BANK_TARGETS, ART]) assert.ok(SHA.test(componentHashes[file] || audit.installHashes[file]), 'Empreinte de composant requise : ' + file);
  for (const [file, expected] of Object.entries(componentHashes)) {
    safe(file); assert.ok(SHA.test(expected));
    assert.ok(operations.has(file) || protect.has(file), 'Composant non declare : ' + file);
    const actual = operations.get(file)?.stagedHash || await hash(safe(file));
    assert.equal(actual, expected, 'Composant non audite : ' + file);
    if (!operations.has(file)) inputs.set(file, actual);
  }

  // Historical manifests retain their unrelated fields and nested source locks.
  for (const file of METADATA) {
    const before = read(safe(file)), after = operations.get(file).value;
    const stable = value => {
      const result = clone(value); delete result.protectedFiles;
      result.cards = result.cards.filter(c => !profiles.has(c.key) && ![...profiles.values()].some(p => p.id === c.id));
      return result;
    };
    assert.deepEqual(stable(after), stable(before), 'Autres cartes ou metadonnees modifiees : ' + file);
    if (before.protectedFiles) sameKeys(after.protectedFiles, before.protectedFiles, 'Verrou historique modifie');
    assert.equal(after.cards.length, before.cards.length);
    for (const [key, profile] of profiles) {
      const prior = before.cards.find(c => c.key === key || c.id === profile.id);
      if (!prior) continue;
      const entry = after.cards.find(c => c.key === key || c.id === profile.id);
      assert.ok(entry, 'Carte manquante : ' + key);
      assert.deepEqual(entry, prior.key ? {...prior, artwork:profile.artworkSource} : profile, 'Snapshot de catalogue incoherent : ' + key);
    }
  }

  const resolving = new Set();
  async function resolve(file) {
    const operation = operations.get(file);
    if (!operation) return hash(safe(file));
    if (operation.hash) return operation.hash;
    assert.ok(!resolving.has(file), 'Cycle dans les verrous JSON : ' + file); resolving.add(file);
    if (operation.value) {
      const previous = METADATA.includes(file) ? read(safe(file)) : null;
      if (previous?.protectedFiles) {
        for (const [source, expected] of Object.entries(previous.protectedFiles)) {
          assert.equal(operation.value.protectedFiles[source], expected, 'Le parent doit conserver les anciens hashes historiques');
          if (operations.has(source)) operation.value.protectedFiles[source] = await resolve(source);
        }
      }
      operation.buffer = encode(operation.value); operation.hash = digest(operation.buffer);
    } else operation.hash = operation.stagedHash;
    resolving.delete(file); return operation.hash;
  }
  for (const file of operations.keys()) if (!PACKS.includes(file)) await resolve(file);
  for (const file of protect) {
    assert.ok(operations.has(file) || PROOFS.includes(file) || componentHashes[file], 'Nouveau fichier protege sans preuve : ' + file);
    next.protectedFiles[file] = operations.has(file) ? await resolve(file) : await hash(safe(file));
    if (!operations.has(file)) inputs.set(file, next.protectedFiles[file]);
  }
  for (const file of operations.keys()) if (Object.hasOwn(old.protectedFiles, file)) next.protectedFiles[file] = await resolve(file);
  next.id = digest(Buffer.from(JSON.stringify(next.protectedFiles)));
  next.parentReferenceId = old.id; next.createdAt = new Date().toISOString();
  next.revision = {id:plan.revision, reason:'Balmhyr canyon et calibration optique Hache / NAIN', audit:WORK + '/verification.json'};
  for (const file of PACKS) {
    const op = operations.get(file); op.value.referenceId = next.id;
    op.buffer = encode(op.value); op.hash = digest(op.buffer);
  }
  function generated(to, value) { const buffer = encode(value); operations.set(to, {to, buffer, hash:digest(buffer)}); }
  generated(REGRESSION, {passed:false, referenceId:next.id, revision:plan.revision, regressionRequired:true, previousReferenceId:old.id, results:[]});
  generated(REF, next);
  for (const op of operations.values()) op.beforeHash = await currentHash(op.to);
  for (const [file, expected] of inputs) assert.equal(await hash(safe(file)), expected, 'Source changee pendant la preparation : ' + file);
  return {plan, old, next, operations, inputs};
}

async function restore(journal) {
  assert.equal(journal.work, WORK); assert.equal(journal.previousReferenceId, OLD_ID);
  assert.notEqual(journal.phase, 'committed', 'Publication terminee : demander une nouvelle revision');
  if (journal.phase !== 'preparing') {
    // Preflight every backup and destination before restoring any of them.
    for (const entry of journal.entries) {
      safe(entry.to);
      const actual = await currentHash(entry.to);
      assert.ok(actual === entry.beforeHash || actual === entry.hash, 'Fichier modifie apres interruption : ' + entry.to);
      if (entry.beforeHash !== null) {
        assert.equal(entry.backup, WORK + '/originals/' + entry.to);
        assert.equal(await hash(safe(entry.backup)), entry.beforeHash, 'Sauvegarde invalide : ' + entry.to);
      }
    }
    for (const entry of [...journal.entries].reverse()) {
      if (await currentHash(entry.to) === entry.beforeHash) continue;
      if (entry.beforeHash === null) fs.unlinkSync(safe(entry.to));
      else await copyAtomic(entry.backup, entry.to, entry.beforeHash);
    }
  }
  journal.phase = 'rolled-back'; journal.rolledBackAt = new Date().toISOString();
  atomic(JOURNAL, encode(journal));
}

async function publish() {
  assert.ok(!fs.existsSync(safe(PUBLISHED)), 'Publication deja effectuee');
  assert.ok(!fs.existsSync(safe(JOURNAL)), 'Journal existant : examiner la transaction avant toute nouvelle tentative');
  const {plan, old, next, operations, inputs} = await prepare();
  const transactionId = crypto.randomUUID();
  const receipt = {transactionId, revision:plan.revision, previousReferenceId:old.id, referenceId:next.id, audit:WORK + '/verification.json', publishedAt:new Date().toISOString(), regressionRequired:true,
    changedFiles:[...operations.keys()], installedHashes:Object.fromEntries([...operations].map(([file, op]) => [file, op.hash])),
    backups:Object.fromEntries([...operations].filter(([, op]) => op.beforeHash !== null).map(([file]) => [file, WORK + '/originals/' + file]))};
  const receiptBuffer = encode(receipt);
  operations.set(PUBLISHED, {to:PUBLISHED, buffer:receiptBuffer, hash:digest(receiptBuffer), beforeHash:null});
  const journal = {work:WORK, transactionId, revision:plan.revision, previousReferenceId:old.id, referenceId:next.id, phase:'preparing', entries:[...operations.values()].map(op => ({to:op.to, hash:op.hash, beforeHash:op.beforeHash, backup:op.beforeHash === null ? null : WORK + '/originals/' + op.to, prepared:WORK + '/transaction/prepared/' + op.to}))};
  atomic(JOURNAL, encode(journal));
  try {
    for (const entry of journal.entries) {
      const op = operations.get(entry.to);
      assert.equal(await currentHash(entry.to), entry.beforeHash, 'Cible changee avant sauvegarde : ' + entry.to);
      if (entry.backup) {
        const backup = safe(entry.backup); fs.mkdirSync(path.dirname(backup), {recursive:true});
        fs.copyFileSync(safe(entry.to), backup, fs.constants.COPYFILE_EXCL);
        assert.equal(await hash(backup), entry.beforeHash);
      }
      assert.ok(!fs.existsSync(safe(entry.prepared)), 'Copie preparee existante');
      if (op.buffer) atomic(entry.prepared, op.buffer);
      else await copyAtomic(op.from, entry.prepared, op.hash);
      assert.equal(await hash(safe(entry.prepared)), entry.hash);
    }
    await L.protectedCheck(old);
    for (const [file, expected] of inputs) assert.equal(await hash(safe(file)), expected, 'Preuve modifiee avant installation : ' + file);
    journal.phase = 'applying'; atomic(JOURNAL, encode(journal));
    for (const entry of journal.entries) {
      assert.equal(await currentHash(entry.to), entry.beforeHash, 'Cible concurrente : ' + entry.to);
      await copyAtomic(entry.prepared, entry.to, entry.hash);
    }
    await L.protectedCheck(next);
    for (const entry of journal.entries) assert.equal(await hash(safe(entry.to)), entry.hash);
    journal.phase = 'committed'; atomic(JOURNAL, encode(journal));
    return receipt;
  } catch (error) {
    // A failed rollback leaves the shared lock in place; never mask that failure.
    try { await restore({...journal, phase:journal.phase === 'committed' ? 'applying' : journal.phase}); }
    catch (rollbackError) { throw new AggregateError([error, rollbackError], 'Echec de publication et de rollback; conserver le verrou'); }
    throw error;
  }
}

async function main() {
  assert.ok(process.argv.length === 3 && ['--publish', '--rollback'].includes(process.argv[2]), 'Usage explicite : node publish.cjs --publish | --rollback');
  const lock = path.join(DATA, 'render.lock'), owner = crypto.randomUUID();
  const fd = fs.openSync(lock, 'wx'); let release = true;
  try {
    fs.writeFileSync(fd, JSON.stringify({pid:process.pid, kind:'revision', revision:WORK, owner})); fs.fsyncSync(fd);
    if (process.argv[2] === '--rollback') {
      const journal = read(safe(JOURNAL)); await restore(journal);
      console.log({rolledBack:true, regressionRequired:true});
    } else {
      const result = await publish(); console.log({publishedCards:2, referenceId:result.referenceId, regressionRequired:true});
    }
  } catch (error) {
    release = !fs.existsSync(safe(JOURNAL)) || read(safe(JOURNAL)).phase === 'rolled-back' || read(safe(JOURNAL)).phase === 'committed';
    throw error;
  } finally {
    fs.closeSync(fd);
    if (release) {
      try { if (read(lock).owner === owner) fs.unlinkSync(lock); }
      catch (error) { console.error('Verrou conserve pour inspection : ' + error.message); }
    }
  }
}

module.exports = {prepare};
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
