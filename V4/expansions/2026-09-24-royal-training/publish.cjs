'use strict';
const assert = require('node:assert/strict');
const P = require('./reference-plan.cjs'), T = require('./transaction.cjs'), M = require('./model.cjs');
const CODE = ['publish.cjs', 'transaction.cjs', 'reference-plan.cjs', 'regression.cjs', 'regression.jsx'];
function selectedBProfiles(r, selection, set) {
  const activeProfiles = P.batch('profiles-b.json'), activeSet = P.batch('set.json');
  assert.equal(selection.profiles, activeProfiles);
  const activeHash = r.observe(activeProfiles);
  const prefix = P.batch('attempts/05-ornelle-description/');
  if (activeHash === selection.profilesSha256 && r.io.hash(prefix + 'revision.json') === null) return;
  const report = r.read(prefix + 'revision.json');
  assert.equal(report.schemaVersion, 1); assert.equal(report.kind, 'parent-approved-description-revision'); assert.equal(report.key, 'ornelle');
  assert.ok(typeof report.authorizedBy === 'string' && report.authorizedBy.trim());
  assert.ok(typeof report.reason === 'string' && report.reason.trim());
  assert.deepEqual(report.active, { profiles: activeProfiles, set: activeSet });
  const copies = {};
  for (const phase of ['before', 'after']) {
    copies[phase] = {};
    for (const [field, name] of [['profiles', 'profiles-b.json'], ['set', 'set.json']]) {
      const record = report[phase][field]; assert.equal(record.file, prefix + phase + '-' + name);
      copies[phase][field] = r.read(record.file, record.sha256);
    }
  }
  assert.equal(report.before.profiles.sha256, selection.profilesSha256, 'Selection B historique non preservee.');
  assert.equal(report.after.profiles.sha256, activeHash, 'Profils B actifs hors revision.');
  r.observe(activeSet, report.after.set.sha256); assert.deepEqual(set, copies.after.set);
  assert.equal(copies.before.profiles.length, 5); assert.equal(copies.before.set.cards.length, 9);
  const beforeText = report.before.description, afterText = report.after.description;
  assert.ok(typeof beforeText === 'string' && typeof afterText === 'string' && afterText.trim() === afterText && afterText.length > 0 && afterText.length < beforeText.length, 'Raccourcissement explicite requis.');
  for (const [before, after] of [[copies.before.profiles, copies.after.profiles], [copies.before.set.cards, copies.after.set.cards]]) {
    assert.equal(before.filter(c => c.key === 'ornelle').length, 1); assert.equal(new Set(before.map(c => c.key)).size, before.length);
    const expected = structuredClone(before), orn = expected.find(c => c.key === 'ornelle'); assert.equal(orn.description, beforeText);
    orn.description = afterText; assert.deepEqual(after, expected, 'Seul Ornelle.description peut changer.');
  }
  const expectedSet = structuredClone(copies.before.set); expectedSet.cards = copies.after.set.cards;
  assert.deepEqual(copies.after.set, expectedSet, 'Metadonnees du lot modifiees.');
  const keys = copies.before.set.cards.filter(c => c.key !== 'ornelle').map(c => c.key).sort();
  assert.deepEqual(Object.keys(report.unchanged).sort(), keys);
  for (const key of keys) {
    const hashes = report.unchanged[key], files = ['preparation.json', 'verification.json', 'card.psd', 'card.png'].map(f => P.batch('cards/' + key + '/' + f));
    assert.deepEqual(Object.keys(hashes).sort(), files.sort()); r.check(hashes);
  }
  const archive = report.archivedCard, originalPrefix = P.batch('cards/ornelle/');
  assert.equal(archive.directory, prefix + 'card');
  for (const name of ['preparation.json', 'verification.json', 'profile.json', 'card.psd', 'card.png', 'illustration.png']) assert.ok(archive.originalHashes[originalPrefix + name], 'Archive Ornelle incomplete.');
  const expectedHashes = Object.fromEntries(Object.entries(archive.originalHashes).map(([file, hash]) => {
    assert.ok(file.startsWith(originalPrefix), 'Source archive hors Ornelle.'); return [archive.directory + '/' + file.slice(originalPrefix.length), hash];
  }));
  assert.deepEqual(archive.archivedHashes, expectedHashes); r.check(archive.archivedHashes);
}
function artSelections(r, set) {
  const a = r.read(P.batch('art-a/selection.json')), b = r.read(P.batch('art-b/READY-B.json'));
  assert.equal(a.parentSelection, true); assert.equal(b.parentSelectionApproved, true);
  r.observe(P.batch(a.profiles.file), a.profiles.sha256); selectedBProfiles(r, b, set); r.observe(b.provenance, b.provenanceSha256);
  const records = [...a.cards.map(x => ({ key: x.key, art: P.batch(x.file), sha256: x.sha256 })), ...b.selections];
  assert.deepEqual(records.map(x => x.key).sort(), set.cards.map(x => x.key).sort());
  for (const c of set.cards) {
    const art = records.find(x => x.key === c.key); assert.equal(art.art, P.batch(c.art)); r.observe(art.art, art.sha256);
  }
  for (const x of a.cards) {
    if (x.request) r.observe(P.batch(x.request.file), x.request.sha256);
    if (x.original) r.observe(P.batch(x.original.file), x.original.sha256);
  }
  const provenance = r.read(b.provenance);
  for (const rev of provenance.editRevisions || []) r.observe(rev.requestFile, rev.requestFileSha256);
  const retouches = r.read(P.batch('retouches/provenance.json'));
  for (const key of ['darnako', 'ruby', 'xiaomi']) {
    const entry = retouches.assets.find(x => x.selected && x.output.path === P.batch('retouches/' + key + '.png'));
    assert.ok(entry, 'Retouche selectionnee absente : ' + key); r.observe(entry.output.path, entry.output.sha256); r.observe(entry.request.path, entry.request.sha256);
  }
}
async function solaria(r, L) {
  const audit = r.read(P.batch('audit/solaria.json')), packed = r.read(P.batch('components/solaria.json'));
  assert.equal(packed.auditHash, r.observed[P.batch('audit/solaria.json')]);
  assert.deepEqual(packed.geometry, { left: 667, top: 829, width: 109, height: 168 });
  r.observe(packed.file, packed.sha256);
  for (const x of audit.results) {
    r.observe(x.file, x.sourceHash); r.observe(x.original.file, x.original.sha256); r.observe(x.output.file, x.output.sha256);
    assert.equal(x.original.sha256, x.sourceHash);
    const before = await L.sharp(r.io.absolute(x.original.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const after = await L.sharp(r.io.absolute(x.output.file)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.deepEqual(before.info, after.info);
    for (let i = 0; i < before.data.length; i++) {
      const row = Math.floor(i / (before.info.width * 4));
      if (i % 4 !== 3 || row < x.cutoff) assert.equal(after.data[i], before.data[i], 'Solaria hors masque/RGB.');
      else assert.equal(after.data[i], 0, 'Alpha parasite restant.');
    }
  }
  const source = audit.results.find(x => x.name === 'source'); assert.equal(source.file, 'V3/assets/factions/Solaria.png');
  const raw = audit.results.find(x => x.name === 'raw'), prior = audit.results.find(x => x.name === 'packed');
  assert.equal(raw.file, P.BANK + 'banks/faction-Solaria.png'); assert.equal(prior.file, P.BANK + 'packed/banks/faction-Solaria.png');
  const clipped = await L.sharp(r.io.absolute(prior.output.file)).extract({ left: 0, top: 0, width: 109, height: 168 }).ensureAlpha().raw().toBuffer();
  const actual = await L.sharp(r.io.absolute(packed.file)).ensureAlpha().raw().toBuffer(); assert.deepEqual(actual, clipped);
  return { raw, packed };
}
function validateCatalogue(base, next, cat, specs) {
  assert.equal(next.cards.length, 38); assert.equal(cat.cards.length, 89); assert.equal(new Set(cat.cards.map(c => c.id)).size, 89);
  assert.equal(cat.cards.filter(c => c.kind === 'created').length, 51); assert.equal(cat.referenceId, next.id);
  const newIds = specs.map(c => c.id); assert.deepEqual(cat.cards.slice(-9).map(c => c.id), newIds);
  assert.deepEqual(next.cards.map(c => c.card.id), base.before.cards.map(c => c.card.id));
  for (const original of base.cat.cards) {
    const current = cat.cards.find(c => c.id === original.id); assert.ok(current); assert.equal(current.kind, original.kind);
    assert.deepEqual(M.gameplay(current.profile), M.gameplay(original.profile), 'Ancienne identite/gameplay modifie.');
    const revision = base.revisions.find(c => c.id === original.id), expected = structuredClone(original);
    if (revision?.crop) expected.profile.crop = revision.crop;
    assert.deepEqual(current, expected, 'Ancienne entree modifiee hors crop autorise.');
  }
  for (const original of base.before.cards) {
    const expected = structuredClone(original), revision = base.revisions.find(c => c.id === original.card.id);
    if (revision?.crop) expected.card.crop = revision.crop;
    assert.deepEqual(next.cards.find(c => c.key === original.key), expected, 'Reference/registre natif modifie hors crop.');
  }
}
function createPublisher(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const root = options.root || L.ROOT, G = require('./preservation.cjs');
  const initial = P.reader(root), base0 = P.baseline(initial), set0 = M.validateSet(initial.read(P.batch('set.json')), base0.cat.cards.map(c => c.id));
  const allowed = P.targets(base0, set0);
  async function inspect() {
    await G.stable(); const r = P.reader(root), base = P.baseline(r), candidate = P.candidate(r, base);
    r.check(base.before.protectedFiles); r.check(base.capture.createdFiles);
    r.observe(P.REF, r.observed[P.batch('baseline/references.json')]);
    assert.deepEqual(D.catalogue(), base.cat); r.observe(P.CAT);
    const set = M.validateSet(r.read(P.batch('set.json')), base.cat.cards.map(c => c.id));
    assert.deepEqual(P.targets(base, set), allowed);
    assert.deepEqual(set.cards, Object.keys(M.INPUTS).flatMap(f => r.read(P.batch(f)).map(M.normalize)));
    CODE.forEach(f => r.observe(P.batch(f))); artSelections(r, set);
    const regression = require('./regression.cjs').inspect(r, candidate);
    assert.equal(regression.rendererHash, await L.rendererHash());
    const next = structuredClone(base.before), cat = structuredClone(base.cat), install = [];
    const add = op => { assert.ok(allowed.includes(op.to), 'Hors allowlist.'); assert.ok(!install.some(x => x.to === op.to)); install.push(op); return op; };
    const generated = (to, value) => { const bytes = T.encode(value); return add({ to, bytes, hash: T.sha(bytes) }); };
    const source = (to, from) => add({ to, from, hash: r.observe(from) });
    for (const item of base.revisions) {
      const change = candidate.revised.find(c => c.item.key === item.key) || P.revision(r, item, base);
      source(item.entry.psd, change.dir + '/card.psd'); source(item.entry.png, change.dir + '/card.png');
      const entry = cat.cards.find(c => c.id === item.id);
      if (item.reference) {
        const ref = next.cards.find(c => c.key === item.key);
        if (item.crop) { ref.card = change.profile; entry.profile = change.profile; generated(ref.profile, change.profile); }
      } else {
        const prefix = 'V4/creations/' + item.id + '/', oldVerification = prefix + 'verification.json';
        const creation = r.read(prefix + 'creation.json'); r.observe(oldVerification);
        generated(prefix + 'profile.json', change.profile); entry.profile = change.profile;
        source(prefix + 'illustration.png', change.dir + '/illustration.png');
        generated(prefix + 'verification.json', { passed: true, modelId: item.id, referenceId: base.before.id, kind: 'verified-visual-revision',
          profileHash: install.find(x => x.to === prefix + 'profile.json').hash,
          hashes: Object.fromEntries(['card.psd', 'card.png'].map(f => [f, install.find(x => x.to === prefix + f).hash])),
          roundtrip: change.verification.roundtrip, barcode: change.verification.barcode,
          originalVerificationHash: r.observed[oldVerification], visualRevision: { setId: M.SET, report: change.dir + '/verification.json', sha256: r.observed[change.dir + '/verification.json'] } });
        creation.hashes = Object.fromEntries(P.NEW_FILES.filter(f => f !== 'creation.json').map(f => [f, install.find(x => x.to === prefix + f).hash]));
        creation.visualRevision = { setId: M.SET, previousCreationHash: r.observed[prefix + 'creation.json'], crop: change.profile.crop };
        generated(prefix + 'creation.json', creation);
      }
    }
    for (const c of set.cards) {
      const dir = P.batch('cards/' + c.key), prefix = 'V4/creations/' + c.id + '/';
      assert.ok(!L.fs.existsSync(r.io.absolute(prefix.slice(0, -1))), 'Nouvelle creation deja presente.');
      const prep = r.read(dir + '/preparation.json'); assert.equal(prep.referenceId, base.before.id); assert.equal(prep.captureHash, r.observed[P.batch('capture.json')]);
      r.check(prep.inputs); r.check(prep.generated); assert.deepEqual(r.read(dir + '/spec.json'), c);
      const p = r.read(dir + '/profile.json'), v = r.read(dir + '/verification.json'); assert.deepEqual(p, M.profile(c, D));
      assert.equal(v.passed, true); assert.equal(v.testOnly === true, false); assert.equal(v.modelId, c.id); assert.equal(v.referenceId, base.before.id);
      assert.equal(v.preparationHash, r.observed[dir + '/preparation.json']); assert.equal(v.profileHash, r.observed[dir + '/profile.json']);
      for (const f of ['card.psd', 'card.png']) r.observe(dir + '/' + f, v.hashes[f]);
      for (const f of ['native.json', 'reopened.png', 'without-text.png']) assert.ok(v.nativeFiles?.[dir + '/render/' + f]); r.check(v.nativeFiles);
      assert.equal(v.components?.fixedDifferences, 0); assert.equal(v.components?.severePixels, 0); assert.equal(v.roundtrip?.changed, 0);
      assert.equal(v.barcode?.passed, true); assert.equal(v.barcode.expected, c.id);
      require('./typography.cjs').verify(r.read(dir + '/render/native.json'));
      if (c.element === 'NONE') assert.equal(v.none?.unlit, true);
      r.observe(dir + '/illustration.png', r.observed[P.batch(c.art)]);
      const hashes = {};
      for (const f of P.NEW_FILES.filter(f => f !== 'creation.json')) hashes[f] = source(prefix + f, dir + '/' + f).hash;
      // A deterministic publication job keeps repeated preflights byte-stable.
      const job = M.SET + ':' + c.id, createdAt = regression.checkedAt;
      generated(prefix + 'creation.json', { job, setId: M.SET, key: c.key, modelId: c.id, hashes, createdAt });
      cat.cards.push({ id: c.id, kind: 'created', creationJob: job, name: p.name, title: p.title, element: p.element, profile: p,
        png: prefix + 'card.png', psd: prefix + 'card.psd', pngUrl: '/media/created/' + c.id + '.png', psdUrl: '/media/created/' + c.id + '.psd', createdAt, publicationSource: P.HOME });
    }
    const assets = await solaria(r, L);
    source(P.BANK + 'banks/faction-Solaria.png', assets.raw.output.file); source(P.BANK + 'packed/banks/faction-Solaria.png', assets.packed.file);
    const replacements = new Set(base.revisions.filter(x => x.reference).flatMap(x => [x.entry.psd, x.entry.png, ...(x.crop ? [x.reference.profile] : [])]));
    for (const op of install) if (Object.hasOwn(next.protectedFiles, op.to)) { assert.ok(replacements.has(op.to), 'Protection hors revision.'); next.protectedFiles[op.to] = op.hash; }
    for (const [file, hash] of Object.entries(r.observed)) if (file.startsWith(P.HOME + '/')) {
      assert.ok(!Object.hasOwn(next.protectedFiles, file) || next.protectedFiles[file] === hash); next.protectedFiles[file] = hash;
    }
    for (const op of install.filter(x => x.to.startsWith(P.BANK))) next.protectedFiles[op.to] = op.hash;
    for (const [file, hash] of Object.entries(base.before.protectedFiles)) if (!replacements.has(file)) assert.equal(next.protectedFiles[file], hash);
    next.parentReferenceId = base.before.id; next.id = T.sha(Buffer.from(JSON.stringify(next.protectedFiles))); next.createdAt = regression.checkedAt;
    next.revision = { id: M.SET, reason: 'Sept revisions visuelles autorisees; neuf nouvelles editions distinctes; Solaria V3 preservee', audit: P.batch('evidence/native-regression/report.json'), baseReferenceId: base.before.id };
    cat.referenceId = next.id;
    for (const name of ['manifest.json', 'manifest.raw.json']) {
      const manifest = r.read(P.batch('baseline/' + name)); r.observe(P.BANK + name, r.observed[P.batch('baseline/' + name)]);
      manifest.referenceId = next.id;
      if (name === 'manifest.json') Object.assign(manifest.factions.Solaria, assets.packed.geometry);
      manifest.hashes ||= {}; const file = manifest.factions.Solaria.file;
      manifest.hashes[file] = install.find(x => x.to === P.BANK + file).hash; generated(P.BANK + name, manifest);
    }
    validateCatalogue(base, next, cat, set.cards);
    const data = await require('../2026-09-23-return/catalogue.cjs').prospective(L, next, cat.cards.filter(c => c.kind === 'created'));
    assert.equal(data.cards.length, 89); assert.equal(data.arenas.length, 23);
    const engine = require('../../site/engine.js').createEngine(data);
    for (const c of set.cards) {
      const card = data.cards.find(x => x.id === c.id); for (const key of [...M.PRINTED, 'role', 'characterId']) assert.deepEqual(card[key], c[key]);
      for (const other of data.cards.filter(x => x.id !== c.id && x.characterId === c.characterId)) assert.ok(engine.validateDeck([other.id, c.id]).some(x => /personnage/i.test(x)));
    }
    generated(P.REG, { ...regression, referenceId: next.id, previousReferenceId: base.before.id }); generated(P.REF, next); generated(P.CAT, cat);
    for (const op of install) op.beforeHash = r.io.hash(op.to);
    assert.deepEqual(install.map(x => x.to).sort(), allowed);
    await G.stable(); r.io.check(r.observed);
    return { install, observed: r.observed, summary: { cards: 9, revised: 7, canonical: 38, created: 51, catalogue: 89, arenas: 23, referenceId: next.id, ids: set.cards.map(c => c.id) },
      metadata: { baseReferenceId: base.before.id, candidateDigest: candidate.digest, setHash: r.observed[P.batch('set.json')], revisionKeys: P.KEYS } };
  }
  async function installed(p, io) {
    const r = P.reader(root), base = P.baseline(r), set = M.validateSet(r.read(P.batch('set.json')), base.cat.cards.map(c => c.id));
    assert.equal(r.observed[P.batch('set.json')], p.metadata.setHash); assert.equal(base.before.id, p.metadata.baseReferenceId);
    assert.deepEqual(p.files.map(x => x.to).sort(), P.targets(base, set));
    const ref = io.read(P.REF), cat = io.read(P.CAT), reg = io.read(P.REG);
    assert.equal(ref.id, T.sha(Buffer.from(JSON.stringify(ref.protectedFiles)))); assert.equal(ref.parentReferenceId, base.before.id);
    assert.equal(ref.id, p.summary.referenceId); assert.equal(reg.referenceId, ref.id); assert.equal(reg.baseReferenceId, base.before.id);
    assert.equal(reg.candidateDigest, p.metadata.candidateDigest); assert.equal(reg.passed, true); assert.equal(reg.results.length, 38);
    validateCatalogue(base, ref, cat, set.cards); io.check(ref.protectedFiles);
    const changed = new Map(p.files.map(x => [x.to, x]));
    for (const [file, hash] of Object.entries(base.capture.createdFiles)) assert.equal(io.hash(file), changed.get(file)?.hash || hash);
    const expectedInventory = [...new Set([...Object.keys(base.capture.createdFiles), ...p.files.map(x => x.to).filter(f => f.startsWith('V4/creations/'))])].sort();
    const currentInventory = cat.cards.filter(c => c.kind === 'created').flatMap(c => G.tree(io.absolute('V4/creations/' + c.id)).map(f => L.path.relative(root, f).replaceAll('\\', '/'))).sort();
    assert.deepEqual(currentInventory, expectedInventory, 'Inventaire des creations modifie.');
    for (const [file, hash] of Object.entries(base.before.protectedFiles)) assert.equal(ref.protectedFiles[file], changed.get(file)?.hash || hash);
    for (const item of base.revisions.filter(x => x.crop)) assert.deepEqual(cat.cards.find(c => c.id === item.id).profile.crop, item.crop);
    for (const name of ['manifest.json', 'manifest.raw.json']) {
      const m = io.read(P.BANK + name); assert.equal(m.referenceId, ref.id);
      assert.equal(io.hash(P.BANK + m.factions.Solaria.file), m.hashes[m.factions.Solaria.file]);
    }
    const audit = io.read(P.batch('audit/solaria.json')).results.find(x => x.name === 'source'); assert.equal(io.hash('V3/assets/factions/Solaria.png'), audit.sourceHash);
    for (const c of set.cards) {
      const prefix = 'V4/creations/' + c.id + '/', profile = io.read(prefix + 'profile.json'); assert.deepEqual(profile, M.profile(c, D));
      const record = cat.cards.find(x => x.id === c.id); assert.deepEqual(record.profile, profile);
      const creation = io.read(prefix + 'creation.json'); assert.equal(record.creationJob, creation.job);
      for (const [f, hash] of Object.entries(creation.hashes)) assert.equal(io.hash(prefix + f), hash);
    }
    assert.deepEqual(p.summary, { cards: 9, revised: 7, canonical: 38, created: 51, catalogue: 89, arenas: 23, referenceId: ref.id, ids: set.cards.map(c => c.id) });
  }
  return T.createTransaction({ root, home: P.HOME, setId: M.SET, targets: allowed, inspect, installed, ...(options.checkpoint ? { checkpoint: options.checkpoint } : {}) });
}
async function main(args = process.argv.slice(2), publisher) {
  const p = publisher || createPublisher();
  if (!args.length) return p.preflight();
  if (args.length === 1 && args[0] === '--publish') return p.publish();
  if (args.length === 3 && args[0] === '--rollback') return p.rollback(args[1], args[2]);
  if ((args.length === 2 || args.length === 4 && args[2] === '--finalize') && args[0] === '--recover') return p.recover(args[1], args[3]);
  throw Error('publish.cjs [--publish | --rollback UUID journalSHA | --recover UUID [--finalize journalSHA]]');
}
module.exports = { createPublisher, main, artSelections, selectedBProfiles, solaria, validateCatalogue };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
