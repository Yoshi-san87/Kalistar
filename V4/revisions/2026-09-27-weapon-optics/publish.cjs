'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const W = require('./revise.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, ROOT, DATA, read, write, assert, hash, crypto } = L;
const { REVISION, CHANGED } = require('./proposal.cjs');
const tx = transactionIO(L, W.file('transaction.json'));
const staging = target => W.file('publication/' + target);

function validateProof(baseline, proof) {
  assert.equal(proof.revision, REVISION); assert.equal(proof.referenceId, baseline.referenceId);
  assert.equal(proof.passed, true); assert.equal(proof.phase, 'native-verified-awaiting-publication');
  assert.deepEqual(proof.results.map(r => r.id).sort(), baseline.items.map(i => i.id).sort());
  assert.equal(proof.results.length, 6);
  for (const r of proof.results) {
    assert.equal(r.comparison.outside, 0); assert.equal(r.comparison.pixelCornersChecked, true);
    assert.equal(r.roundtrip.changed, 0); assert.equal(r.layers.editableTextsPreserved, true);
    assert.equal(r.barcode.passed, true); assert.equal(r.barcode.expected, r.id);
    assert.equal(Object.keys(r.barcode.cases).length, 4);
    assert.ok(Object.values(r.barcode.cases).every(v => v.includes(r.id)));
    if (r.contour) { assert.ok(r.contour.fullRadius <= 44); assert.ok(r.contour.opticalError <= .8); assert.equal(r.repeat.changed, 0); }
  }
  assert.deepEqual(proof.future.map(r => r.key).sort(), ['iliane', 'voloden']);
  for (const r of proof.future) { assert.equal(r.actualProductionBind, true); assert.equal(r.motif.changed, 0); assert.equal(r.bank.changed, 0); }
}

function nextReferences(old, hashes, additions) {
  const next = structuredClone(old);
  for (const [target, value] of Object.entries(hashes)) if (target in next.protectedFiles) next.protectedFiles[target] = value;
  for (const [target, value] of Object.entries(additions)) {
    assert.ok(!(target in old.protectedFiles) || hashes[target] === value || old.protectedFiles[target] === value, 'Protection changed without audit');
    next.protectedFiles[target] = value;
  }
  assert.ok(Object.keys(old.protectedFiles).every(p => p in next.protectedFiles));
  assert.deepEqual(next.cards, old.cards, 'Gameplay or reference paths changed');
  next.parentReferenceId = old.id; next.createdAt = new Date().toISOString();
  next.revision = { id: REVISION, reason: 'User-approved optical sizing of Faucille and Tome only',
    audit: W.rel(W.file('verification.json')), weapons: CHANGED, existingCards: 6, gameplayUnchanged: true };
  next.id = crypto.createHash('sha256').update(JSON.stringify(next.protectedFiles)).digest('hex');
  return next;
}

async function preflight() {
  const b = read(W.file('before.json')), proof = read(W.file('verification.json')), banks = read(W.file('banks.json'));
  await W.guard(b); await L.protectedCheck(); await R.verifyAssets(); validateProof(b, proof);
  assert.equal(await hash(W.file('calibration.json')), proof.calibrationHash);
  const old = read(W.file('originals/V4/atelier/data/references.json'));
  const targetHashes = {}, sources = {};
  const stageCopy = async (source, target) => {
    assert.ok(target in b.backups && target in b.observed, 'Unbacked target: ' + target);
    const dest = staging(target); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(source, dest);
    targetHashes[target] = await hash(dest); sources[target] = W.rel(source);
  };
  const stageJSON = async (value, target) => {
    assert.ok(target in b.backups && target in b.observed, 'Unbacked target: ' + target);
    write(staging(target), value); targetHashes[target] = await hash(staging(target)); sources[target] = 'explicit revision metadata';
  };
  for (const item of b.items) {
    const result = proof.results.find(r => r.id === item.id), dir = W.file('staged/' + item.key);
    assert.equal(await hash(path.join(dir, 'native.json')), result.nativeHash);
    for (const type of ['psd', 'png']) {
      assert.equal(await hash(path.join(dir, 'card.' + type)), result[type + 'Hash']);
      await stageCopy(path.join(dir, 'card.' + type), item[type]);
    }
  }
  for (const spec of Object.values(banks.banks)) {
    assert.equal(await hash(path.join(ROOT, spec.source)), spec.sourceHash);
    for (const output of Object.values(spec.outputs)) {
      assert.equal(await hash(path.join(ROOT, output.from)), output.afterHash);
      assert.equal(await hash(path.join(ROOT, output.to)), output.beforeHash);
      await stageCopy(path.join(ROOT, output.from), output.to);
    }
  }
  const layouts = read(W.file('calibration.json')), oldLayouts = read(W.file('originals/V4/template-stable/icon-layouts.json'));
  assert.deepEqual(layouts.race, oldLayouts.race);
  for (const [name, layout] of Object.entries(oldLayouts.weapon)) if (!CHANGED.includes(name)) assert.deepEqual(layouts.weapon[name], layout);
  await stageCopy(W.file('calibration.json'), 'V4/template-stable/icon-layouts.json');
  const additions = {};
  for (const target of Object.keys(b.backups)) additions[W.rel(W.file('originals/' + target))] = b.backups[target];
  for (const n of ['before.json', 'calibration.json', 'verification.json', 'banks.json']) additions[W.rel(W.file(n))] = await hash(W.file(n));
  for (const spec of Object.values(banks.banks)) for (const output of Object.values(spec.outputs)) additions[output.to] = output.afterHash;
  const next = nextReferences(old, targetHashes, additions);
  const revision = { id: REVISION, referenceId: next.id, previousReferenceId: old.id,
    audit: W.rel(W.file('verification.json')), scope: 'weapon-optical-sizing-only' };
  for (const item of b.items.filter(i => i.kind === 'created')) {
    const result = proof.results.find(r => r.id === item.id), previous = read(W.file('originals/' + item.verification));
    const verification = { passed: true, modelId: item.id, referenceId: next.id,
      profileHash: b.observed[item.profile], hashes: { 'card.png': result.pngHash, 'card.psd': result.psdHash },
      components: { fixedDifferences: 0, changed: result.comparison.changed, verificationScope: 'unchanged outside circular weapon mask; native editable layers preserved' },
      roundtrip: result.roundtrip, barcode: result.barcode, nativeRevision: revision,
      comparison: result.comparison, layers: result.layers, checkedAt: proof.checkedAt,
      previousVerification: { file: W.rel(W.file('originals/' + item.verification)), hash: b.backups[item.verification], checkedAt: previous.checkedAt } };
    await stageJSON(verification, item.verification);
    const creation = read(W.file('originals/' + item.creation));
    for (const [name, expected] of Object.entries(creation.hashes)) {
      assert.equal(await hash(path.join(ROOT, path.dirname(item.creation), name)), expected, 'Existing creation receipt does not match source');
    }
    creation.hashes['card.png'] = result.pngHash; creation.hashes['card.psd'] = result.psdHash;
    creation.hashes['verification.json'] = targetHashes[item.verification]; creation.nativeRevision = revision;
    await stageJSON(creation, item.creation);
  }
  for (const name of ['manifest.json', 'manifest.raw.json']) {
    const target = 'V4/atelier/designer-assets/' + name, manifest = read(W.file('originals/' + target));
    manifest.referenceId = next.id;
    for (const weapon of CHANGED) {
      const output = banks.banks[weapon].outputs[name === 'manifest.json' ? 'packed' : 'raw'];
      manifest.hashes ||= {}; manifest.hashes[manifest.weapons[weapon].file] = output.afterHash;
      manifest.weapons[weapon].iconRevision = { ...revision, scope: 'this-icon-bank-only', minimumBreathingRoom: 3.5, fullAlphaVerified: true };
    }
    manifest.weaponOpticsRevision = { ...revision, unchangedOtherWeaponBanks: 18 };
    await stageJSON(manifest, target);
  }
  const catalogue = read(W.file('originals/V4/donnees/catalogue.json'));
  assert.equal(catalogue.cards.length, b.catalogueCount); catalogue.referenceId = next.id;
  for (const card of catalogue.cards) if (b.items.some(i => i.id === card.id)) card.nativeRevision = revision;
  await stageJSON(catalogue, 'V4/donnees/catalogue.json');
  await stageJSON(next, 'V4/atelier/data/references.json');
  await stageJSON({ passed: false, referenceId: next.id, rendererHash: await L.rendererHash(), results: [], revision: REVISION,
    reason: 'Explicit migration; actual 38-reference Photoshop run is still required', previousReport: W.rel(W.file('originals/V4/atelier/data/regression.json')) }, 'V4/atelier/data/regression.json');
  const changes = Object.keys(targetHashes).sort().map(target => ({ target: path.join(ROOT, target), backup: W.file('originals/' + target), stage: staging(target), beforeHash: b.observed[target], afterHash: targetHashes[target] }));
  assert.equal(changes.length, 28);
  await W.guard(b);
  const publication = { revision: REVISION, previousReferenceId: old.id, referenceId: next.id, changes, sources,
    proofHash: await hash(W.file('verification.json')), referenceCount: b.referenceCount, cardCount: b.catalogueCount,
    changedCards: b.items.map(i => ({ id: i.id, name: i.name, weapon: i.weapon })), nativeRegressionRequired: true };
  write(W.file('publication-plan.json'), publication);
  return publication;
}

async function guardPublished(plan, { allowRegressionResult = false } = {}) {
  const b = read(W.file('before.json'));
  const after = new Map(plan.changes.map(c => [W.rel(c.target), c.afterHash]));
  for (const [target, expected] of Object.entries(b.observed)) {
    if (allowRegressionResult && target === 'V4/atelier/data/regression.json') continue;
    assert.equal(await hash(path.join(ROOT, target)), after.get(target) || expected, 'Unexpected production change: ' + target);
  }
  for (const [target, expected] of Object.entries(b.backups)) assert.equal(await hash(W.file('originals/' + target)), expected);
  assert.equal(L.baseline().id, plan.referenceId); await L.protectedCheck(); await R.verifyAssets();
}

async function verifyPublishedCatalogue(catalogue, plan, build = require('../../atelier/game-catalog.cjs').buildCatalog) {
  const game = await build({ published: catalogue.cards.filter(card => card.kind === 'created') });
  assert.equal(game.cards.length, plan.cardCount);
  assert.deepEqual(game.cards.map(card => card.id).sort(), catalogue.cards.map(card => card.id).sort());
}

async function publish() {
  assert.ok(!fs.existsSync(W.file('published.json')), 'Already published');
  const plan = await preflight(), lock = path.join(DATA, 'render.lock'), owner = crypto.randomUUID(); let fd;
  try {
    fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id: owner, pid: process.pid, revision: REVISION, phase: 'publish' }));
    await tx.commit(plan, { before: () => W.guard(read(W.file('before.json'))),
      after: async () => {
        await guardPublished(plan);
        await verifyPublishedCatalogue(read(path.join(ROOT, 'V4/donnees/catalogue.json')), plan);
      },
      afterRollback: async () => { await W.guard(read(W.file('before.json'))); await L.protectedCheck(); await R.verifyAssets(); } });
    const result = { revision: REVISION, referenceId: plan.referenceId, previousReferenceId: plan.previousReferenceId,
      changedFiles: plan.changes.map(c => ({ file: W.rel(c.target), beforeHash: c.beforeHash, afterHash: c.afterHash })),
      proof: W.rel(W.file('verification.json')), proofHash: plan.proofHash, nativeRegressionPending: true, publishedAt: new Date().toISOString() };
    write(W.file('published.json'), result); return result;
  } finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === owner) fs.unlinkSync(lock); } }
}
if (require.main === module) (process.argv[2] === '--publish' ? publish() : preflight()).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { preflight, publish, validateProof, nextReferences, guardPublished, verifyPublishedCatalogue };
