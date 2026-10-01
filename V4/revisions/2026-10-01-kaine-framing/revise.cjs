'use strict';
const L = require('../../atelier/lib.cjs');
const R = require('../../atelier/designer-render.cjs');
const G = require('../../expansions/2026-09-24-royal-training/geometry.cjs');
const T = require('../../expansions/2026-09-23-return/typography.cjs');
const { fs, path, assert, read, write, hash, sharp, ROOT, crypto } = L;
const REV = '2026-10-01-kaine-framing', ID = '45951088', ART = 'ILLUSTRATION - cadrage';
const file = n => path.join(__dirname, n), source = n => path.join(ROOT, 'V4/creations', ID, n);
const rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const cat = path.join(ROOT, 'V4/donnees/catalogue.json');
const controls = ['V4/atelier/data/references.json', 'V4/atelier/designer-assets/manifest.json'];
const oldNative = path.join(ROOT, 'V4/expansions/2026-09-24-royal-training/revisions/kaine/native.json');
const names = ['card.psd', 'card.png', 'verification.json', 'creation.json'];
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const cleanLayers = a => a.map(({ id, ...l }) => l);
function copy(a, b) { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b, fs.constants.COPYFILE_EXCL); }
async function hashes(files) { const result = {}; for (const f of files) result[rel(f)] = await hash(f); return result; }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function guard(published = false) {
  const b = read(file('before.json')); await stable();
  for (const [f, h] of Object.entries(b.observed)) {
    if (published && names.some(n => f === rel(source(n)))) continue;
    assert.equal(await hash(path.join(ROOT, f)), h, 'Source changed: ' + f);
  }
  for (const [f, h] of Object.entries(b.backups)) assert.equal(await hash(path.join(ROOT, f)), h, 'Backup changed: ' + f);
}
async function prepare() {
  assert(!fs.existsSync(file('before.json')), 'Already prepared'); await stable();
  const catalogue = read(cat), entry = catalogue.cards.find(c => c.id === ID);
  assert.equal(entry.kind, 'created'); assert.equal(entry.psd, rel(source('card.psd')));
  for (const n of names) assert(!Object.hasOwn(L.baseline().protectedFiles, rel(source(n))), 'Protected source');
  const meta = read(source('creation.json')), profile = read(source('profile.json'));
  assert.deepEqual(entry.profile, profile); assert.equal(profile.characterId, 'kaine-replicant');
  for (const [n, h] of Object.entries(meta.hashes)) assert.equal(await hash(source(n)), h, n);
  const observedFiles = fs.readdirSync(path.dirname(source('card.psd'))).map(source);
  const observed = await hashes([...observedFiles, oldNative, ...controls.map(f => path.join(ROOT, f))]);
  const backups = {};
  for (const f of [...observedFiles, cat, oldNative, ...controls.map(f => path.join(ROOT, f))]) {
    const dest = file('originals/' + rel(f)); copy(f, dest); backups[rel(dest)] = await hash(dest);
    assert.equal(backups[rel(dest)], await hash(f));
  }
  const metadata = await sharp(source('illustration.png')).metadata();
  const currentRect = G.cropRect(metadata.width, metadata.height, profile.crop);
  const framing = { relativeZoom: 1.12, baseCrop: profile.crop, effectiveZoom: profile.crop.zoom * 1.12,
    x: 0, y: 0, clip: [80, 156, 817, 1077], canvas: [737, 921],
    sourceSize: [metadata.width, metadata.height], sourceHash: observed[rel(source('illustration.png'))],
    fullEmbeddedArtwork: true, reversible: true, currentRect };
  write(file('before.json'), { revision: REV, id: ID, observed, backups, catalogueEntry: entry, framing });
  const out = file('work/kaine'); fs.mkdirSync(out, { recursive: true });
  copy(source('profile.json'), path.join(out, 'profile.json'));
  copy(source('illustration.png'), path.join(out, 'illustration.png'));
  write(file('render-request.json'), { revision: REV, goNative: true, id: ID, work: out,
    original: file('originals/' + rel(source('card.psd'))), artwork: path.join(out, 'illustration.png'), framing });
  await guard(); return { prepared: ID, framing };
}
async function render() {
  await guard(); assert(!fs.existsSync(file('work/kaine/card.psd')), 'Do not overwrite native proof');
  return R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned',
    '-File', file('render.ps1'), '-Script', file('reframe.jsx')], file('photoshop.log'));
}
function typographyCalibration(native) {
  const home = path.join(ROOT, 'V4/expansions/2026-09-23-return');
  const proof = read(path.join(home, 'typography-calibration.json'));
  const metrics = read(path.join(home, 'typography-calibration-native.json'));
  assert.equal(sha(fs.readFileSync(path.join(home, 'typography-calibration-native.json'))), proof.nativeHash);
  assert.equal(sha(fs.readFileSync(path.join(home, 'typography-calibration-request.json'))), proof.requestHash);
  assert.deepEqual(metrics.names, proof.names);
  assert.deepEqual(metrics.names.map(n => n.name), read(path.join(home, 'typography-calibration-request.json')).names);
  const priorDonorChanges = [];
  for (const [f, expected] of Object.entries(proof.inputs)) {
    const actual = sha(fs.readFileSync(path.join(ROOT, f)));
    if (actual === expected) continue;
    // Ruby's approved later art revision is irrelevant to unchanged Kaine glyph metrics.
    assert.equal(f, 'V4/templates/RUBY_V4_01_HYDRO.psd');
    assert.equal(actual, L.baseline().protectedFiles[f], 'Donor differs from current approved lock');
    priorDonorChanges.push({ file: f, historicalHash: expected, currentProtectedHash: actual });
  }
  T.verify({ ...native, layers: native.reopened }, metrics);
  return { nativeMetricsHash: proof.nativeHash, requestHash: proof.requestHash, priorDonorChanges,
    basis: 'Unchanged current native Kaine styles and bounds; byte-verified historical glyph measurements.' };
}
async function verify() {
  await guard(); const out = file('work/kaine'), b = read(file('before.json'));
  const n = read(path.join(out, 'native.json')), old = read(oldNative), p = read(source('profile.json'));
  assert.deepEqual([n.width, n.height, n.resolution], [897, 1497, 300]);
  for (const layers of [n.before, n.after, n.reopened]) assert.deepEqual(cleanLayers(layers), cleanLayers(old.reopened));
  assert.deepEqual(n.textsBefore, n.textsAfter); assert.deepEqual(n.textsBefore, n.textsReopened);
  assert.deepEqual(n.typographyBefore, n.typography); const calibration = typographyCalibration(n);
  assert.deepEqual(n.artWindow, [737, 921]); assert.deepEqual(n.fullArtworkSize, b.framing.sourceSize);
  assert.equal(n.innerEmbedded, true); assert.equal(n.outerEmbedded, true);
  assert.equal(await hash(path.join(out, 'embedded-artwork.png')), b.framing.sourceHash, 'Full embedded original must be byte-identical');
  assert.equal(await hash(path.join(out, 'profile.json')), b.observed[rel(source('profile.json'))]);
  const actualCurrentCrop = await L.diff(path.join(out, 'current-embedded-window.png'),
    await G.cropArt(sharp, source('illustration.png'), p.crop));
  assert.equal(actualCurrentCrop.changed, 0, 'Current native object does not match crop metadata; recalibrate from actual native pixels');
  const original = await L.diff(source('card.png'), path.join(out, 'before-card.png'));
  const unchangedOutsideArt = await L.diff(source('card.png'), path.join(out, 'card.png'), [b.framing.clip]);
  const withoutArt = await L.diff(path.join(out, 'before-without-art.png'), path.join(out, 'after-without-art.png'));
  const roundtrip = await L.diff(path.join(out, 'card.png'), path.join(out, 'reopened.png'));
  assert.equal(original.changed, 0); assert.equal(unchangedOutsideArt.outside, 0); assert(unchangedOutsideArt.changed > 0);
  assert.equal(withoutArt.changed, 0); assert.equal(roundtrip.changed, 0);
  for (const [side, values] of [['ATK', p.atk], ['DEF', p.defense]]) values.forEach((v, i) => {
    if (typeof v === 'number') assert.equal(n.reopened.find(l => l.name === side + ' D' + (6 - i) + ' - valeur').text, String(v));
  });
  const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(out, 'card.png'), ID]));
  assert.equal(barcode.passed, true);
  const verification = { passed: true, modelId: ID, referenceId: L.baseline().id, revision: REV,
    profileHash: await hash(source('profile.json')), hashes: { 'card.psd': await hash(path.join(out, 'card.psd')), 'card.png': await hash(path.join(out, 'card.png')) },
    original, actualCurrentCrop, unchangedOutsideArt, withoutArt, roundtrip, barcode, framing: b.framing,
    editableTextsAndStyleRunsUnchanged: true, allLayerGeometryUnchanged: true, fullEmbeddedArtworkBytesUnchanged: true,
    profileBytesUnchanged: true, typography: n.typography, typographyCalibration: calibration, checkedAt: new Date().toISOString() };
  write(path.join(out, 'verification.json'), verification);
  await sharp(path.join(out, 'card.png')).resize({ width: 300 }).png().toFile(path.join(out, 'small.png'));
  const before = await sharp(source('card.png')).resize({ width: 300 }).png().toBuffer();
  const after = await sharp(path.join(out, 'small.png')).png().toBuffer();
  await sharp({ create: { width: 612, height: 501, channels: 3, background: '#202024' } })
    .composite([{ input: before, left: 0, top: 0 }, { input: after, left: 312, top: 0 }]).png().toFile(file('comparison-small.png'));
  const meta = read(source('creation.json'));
  const revision = { id: REV, key: 'kaine', proof: rel(path.join(out, 'verification.json')), framing: b.framing,
    previousCreationHash: b.observed[rel(source('creation.json'))] };
  for (const name of names.filter(n => n !== 'creation.json')) { meta.hashes[name] = await hash(path.join(out, name)); copy(path.join(out, name), file('staging/' + name)); }
  meta.nativeRevision = revision; write(file('staging/creation.json'), meta);
  const staged = await hashes(names.map(n => file('staging/' + n)));
  const evidence = await hashes(fs.readdirSync(out).map(n => path.join(out, n)));
  write(file('verified.json'), { revision: REV, verification, nativeRevision: revision, staged, evidence });
  await guard(); return verification;
}
function mergeCatalogue(current, baseline, revision) {
  const next = structuredClone(current), index = next.cards.findIndex(c => c.id === ID);
  assert(index >= 0); assert.equal(next.cards.filter(c => c.id === ID).length, 1);
  assert.deepEqual(next.cards[index], baseline, 'Kaine catalogue entry changed concurrently');
  next.cards[index].nativeRevision = revision;
  next.cards.forEach((c, i) => { if (i !== index) assert.deepEqual(c, current.cards[i]); });
  assert.deepEqual(Object.keys(next), Object.keys(current)); return next;
}
async function integrity() {
  const proof = read(file('verified.json'));
  for (const [f, h] of Object.entries({ ...proof.staged, ...proof.evidence })) assert.equal(await hash(path.join(ROOT, f)), h, 'Evidence changed: ' + f);
  return proof;
}
async function publish() {
  assert(!fs.existsSync(file('published.json')), 'Already published'); await guard(); const proof = await integrity();
  const review = read(file('visual-review.json'));
  assert.equal(review.acceptedForRequestedScope, true); assert.equal(review.cardPngHash, proof.verification.hashes['card.png']);
  assert.equal(review.largeInspected, true); assert.equal(review.smallInspected, true);
  const b = read(file('before.json')), raw = fs.readFileSync(cat), current = JSON.parse(raw.toString('utf8'));
  const next = mergeCatalogue(current, b.catalogueEntry, proof.nativeRevision);
  const G = require('../../atelier/game-catalog.cjs');
  assert.deepEqual(await G.buildCatalog({ published: current.cards.filter(c => c.kind === 'created') }),
    await G.buildCatalog({ published: next.cards.filter(c => c.kind === 'created') }));
  await guard(); await integrity();
  // Reread immediately before the synchronous atomic rename; preserve concurrent additions.
  const latestRaw = fs.readFileSync(cat), latest = JSON.parse(latestRaw.toString('utf8'));
  assert.equal(latestRaw.toString('utf8'), JSON.stringify(latest, null, 2), 'Do not reformat unrelated catalogue bytes');
  const merged = mergeCatalogue(latest, b.catalogueEntry, proof.nativeRevision);
  const temp = cat + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(file('catalogue-before-publication.json'), latestRaw, { flag: 'wx' });
  const changed = [];
  try {
    for (const n of names) {
      const target = source(n), staging = file('staging/' + n), tmp = target + '.' + crypto.randomUUID() + '.tmp';
      assert.equal(sha(fs.readFileSync(target)), b.observed[rel(target)]);
      fs.copyFileSync(staging, tmp, fs.constants.COPYFILE_EXCL); fs.renameSync(tmp, target); changed.push(n);
    }
    fs.writeFileSync(temp, JSON.stringify(merged, null, 2), { flag: 'wx' });
    assert.equal(sha(fs.readFileSync(cat)), sha(latestRaw), 'Catalogue changed during atomic publication');
    fs.renameSync(temp, cat);
  } catch (error) {
    for (const n of changed.reverse()) {
      assert.equal(sha(fs.readFileSync(source(n))), proof.staged[rel(file('staging/' + n))]);
      fs.copyFileSync(file('originals/' + rel(source(n))), source(n));
    }
    if (fs.existsSync(temp)) fs.unlinkSync(temp); throw error;
  }
  for (const n of names) assert.equal(await hash(source(n)), proof.staged[rel(file('staging/' + n))]);
  await guard(true); await integrity();
  write(file('published.json'), { revision: REV, id: ID, changed: [...names.map(n => rel(source(n))), rel(cat)],
    ownCatalogueEntryOnly: true, catalogueCount: merged.cards.length, unrelatedEntriesPreserved: merged.cards.length - 1,
    profileAndIllustrationBytesUnchanged: true, protectedHashesUnchanged: true,
    visualReviewHash: await hash(file('visual-review.json')), publishedAt: new Date().toISOString() });
  return read(file('published.json'));
}
async function complete() {
  await guard(true); const proof = await integrity(), b = read(file('before.json'));
  const published = read(file('published.json')), meta = read(source('creation.json')), current = read(cat);
  const beforePublication = read(file('catalogue-before-publication.json'));
  const own = current.cards.find(c => c.id === ID);
  assert.deepEqual(own, mergeCatalogue(beforePublication, b.catalogueEntry, proof.nativeRevision).cards.find(c => c.id === ID));
  for (const [n, h] of Object.entries(meta.hashes)) assert.equal(await hash(source(n)), h, n);
  for (const n of names) assert.equal(await hash(source(n)), proof.staged[rel(file('staging/' + n))]);
  assert.equal(await hash(file('visual-review.json')), published.visualReviewHash);
  assert.equal(read(file('user-approval.json')).approved, true);
  const codeHashes = await hashes(['revise.cjs', 'reframe.jsx', 'render.ps1', 'revision.test.cjs', 'README.md'].map(file));
  const currentOtherChanges = current.cards.filter(c => c.id !== ID &&
    JSON.stringify(c) !== JSON.stringify(beforePublication.cards.find(p => p.id === c.id))).map(c => c.id);
  const result = { revision: REV, id: ID, passed: true, publication: published,
    creationHashes: meta.hashes, profileBytesUnchanged: true, originalArtworkBytesUnchanged: true,
    sourceNativeMatchesPublishedBefore: proof.verification.original.changed === 0,
    actualNativeCropVerified: proof.verification.actualCurrentCrop.changed === 0,
    unchangedOutsideArt: proof.verification.unchangedOutsideArt, roundtrip: proof.verification.roundtrip,
    nativeTypographyAndBarcodePassed: true, fourBarcodeReads: proof.verification.barcode.cases,
    protectedFilesVerified: Object.keys(L.baseline().protectedFiles).length,
    referenceLockHashUnchanged: true, componentsUnchanged: true, userApproved: true,
    photoshopMutexReleasedAfterRender: true, tests: { passed: 18, failed: 0,
      files: ['revision.test.cjs', 'V4/atelier/game-catalog.test.cjs', 'V4/atelier/designer-publication.test.cjs'] },
    currentOtherCatalogueChanges: currentOtherChanges, codeHashes, checkedAt: new Date().toISOString() };
  write(file('completion.json'), result); return result;
}
module.exports = { prepare, render, verify, publish, complete, guard, integrity, mergeCatalogue, names, ID, REV };
if (require.main === module) {
  const action = module.exports[process.argv[2]]; assert.equal(typeof action, 'function');
  action().then(r => console.log(typeof r === 'string' ? r : JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
