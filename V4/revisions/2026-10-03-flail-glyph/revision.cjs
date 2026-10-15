'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const { circularDiff, nativeLayers } = require('../2026-09-27-weapon-optics/proof.cjs');
const { metrics } = require('../2026-09-27-weapon-optics/calibrate.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const { fs, path, ROOT, DATA, read, write, hash, sharp, assert, crypto } = L;
const REVISION = '2026-10-03-flail-glyph', file = n => path.join(__dirname, n);
const rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const controls = ['V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json', 'V4/template-stable/icon-layouts.json', 'V4/donnees/catalogue.json', 'V4/scripts/stable/elements-common.jsx'];
async function guard(b) {
  assert.equal(L.baseline().id, b.referenceId);
  for (const [target, expected] of Object.entries(b.observed)) assert.equal(await hash(path.join(ROOT, target)), expected, 'Concurrent edit: ' + target);
  for (const [target, expected] of Object.entries(b.backups)) assert.equal(await hash(file('originals/' + target)), expected, 'Backup changed: ' + target);
}
async function prepare() {
  if (fs.existsSync(file('before.json'))) { await guard(read(file('before.json'))); return; }
  await L.protectedCheck(); await R.verifyAssets();
  const refs = L.baseline(), cat = read(path.join(ROOT, 'V4/donnees/catalogue.json'));
  const items = cat.cards.filter(c => c.profile.weapon === 'Fléau').map(c => {
    const ref = refs.cards.find(r => r.card.id === c.id), base = 'V4/creations/' + c.id;
    return { id: c.id, key: ref?.key || c.id, name: c.name, kind: c.kind, psd: ref?.psd || base + '/card.psd', png: ref?.png || base + '/card.png', profile: ref?.profile || base + '/profile.json', layer: ref ? 'ARME - CONTENU' : 'ARME - Fléau', ...(ref ? {} : { verification: base + '/verification.json', creation: base + '/creation.json' }) };
  });
  assert.deepEqual(items.map(i => i.id).sort(), ['30000026', '40976482']);
  const targets = new Set(controls);
  for (const item of items) for (const field of ['psd', 'png', 'profile', 'verification', 'creation']) if (item[field]) targets.add(item[field]);
  for (const manifest of controls.slice(2, 4)) targets.add('V4/atelier/designer-assets/' + read(path.join(ROOT, manifest)).weapons['Fléau'].file);
  const b = { revision: REVISION, referenceId: refs.id, catalogueCount: cat.cards.length, items, observed: {}, backups: {}, preparedAt: new Date().toISOString() };
  for (const target of new Set([...Object.keys(refs.protectedFiles), ...targets])) b.observed[target] = await hash(path.join(ROOT, target));
  for (const target of targets) {
    const backup = file('originals/' + target); fs.mkdirSync(path.dirname(backup), { recursive: true });
    fs.copyFileSync(path.join(ROOT, target), backup, fs.constants.COPYFILE_EXCL);
    b.backups[target] = await hash(backup); assert.equal(b.backups[target], b.observed[target]);
  }
  fs.mkdirSync(file('assets'), { recursive: true });
  fs.copyFileSync(process.argv[3], file('assets/flail-delapouite.svg'), fs.constants.COPYFILE_EXCL);
  const raster = await sharp(file('assets/flail-delapouite.svg')).resize(512, 512).trim().resize({ width: 66, height: 70, fit: 'inside' }).png().withMetadata({ density: 300 }).toBuffer();
  await sharp(raster).toFile(file('assets/flail-white.png'));
  const stats = metrics(await sharp(raster).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), .35, [0, 0]);
  const layouts = read(file('originals/V4/template-stable/icon-layouts.json'));
  layouts.weapon['Fléau'] = { width: stats.bounds[2] - stats.bounds[0], height: stats.bounds[3] - stats.bounds[1], center: [137, 1163.5], anchor: stats.optical.map((v, i) => (v - stats.bounds[i]) / (stats.bounds[i + 2] - stats.bounds[i])), centroidWeight: .35, safeRadius: 44, innerRadius: 47.5, source: rel(file('assets/flail-white.png')), sourceHash: await hash(file('assets/flail-white.png')), revision: REVISION, method: 'White flail silhouette; weighted visible centroid and native full-alpha containment' };
  write(file('calibration.json'), layouts); write(file('before.json'), b);
  for (const item of items) fs.mkdirSync(file('staged/' + item.key), { recursive: true });
  console.log({ phase: 'prepared', cards: items.length, untouchedProduction: true, layout: layouts.weapon['Fléau'] });
}
async function bank() {
  const b = read(file('before.json')); await guard(b);
  for (const item of b.items) item.layer = 'ARME - Fléau';
  const email = path.join(ROOT, 'V4/revisions/2026-09-27-weapon-optics/inspection/Tome-email.png');
  const empty = await sharp(email).extract({ left: 89, top: 1116, width: 96, height: 95 }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const manifest = read(file('originals/V4/atelier/designer-assets/manifest.json'));
  const oldBank = file('originals/V4/atelier/designer-assets/' + manifest.weapons['Fléau'].file);
  const original = await sharp(oldBank).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.deepEqual(empty.info, original.info);
  // Keep the original enamel edge byte-for-byte; only the inner glyph area changes.
  for(let y=0;y<95;y++)for(let x=0;x<96;x++){
    const radius=Math.hypot(Math.max(Math.abs(x-48),Math.abs(x+1-48)),Math.max(Math.abs(y-47.5),Math.abs(y+1-47.5)));
    if(radius>44){const i=(y*96+x)*4;original.data.copy(empty.data,i,i,i+4);}
  }
  const blank = await sharp(empty.data,{raw:empty.info}).png().toBuffer();
  const glyph = await sharp(file('assets/flail-delapouite.svg')).resize(512, 512).trim().resize({ width: 60, height: 64, fit: 'inside' }).withMetadata({ density: 300 }).png().toBuffer();
  await sharp(glyph).toFile(file('assets/flail-white.png'));
  const calibration = read(file('calibration.json')), layout = calibration.weapon['Fléau'];
  const stats = metrics(await sharp(glyph).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), .35, [0, 0]);
  layout.width = stats.bounds[2] - stats.bounds[0]; layout.height = stats.bounds[3] - stats.bounds[1];
  layout.anchor = stats.optical.map((v, i) => (v - stats.bounds[i]) / (stats.bounds[i + 2] - stats.bounds[i]));
  layout.sourceHash = await hash(file('assets/flail-white.png')); write(file('calibration.json'), calibration);
  const left = Math.round(48 - layout.width * layout.anchor[0]), top = Math.round(47.5 - layout.height * layout.anchor[1]);
  const composed=await sharp(blank).composite([{ input: glyph, left, top }]).ensureAlpha().raw().toBuffer();
  for(let y=0;y<95;y++)for(let x=0;x<96;x++){
    const radius=Math.hypot(Math.max(Math.abs(x-48),Math.abs(x+1-48)),Math.max(Math.abs(y-47.5),Math.abs(y+1-47.5)));
    if(radius>44){const i=(y*96+x)*4;original.data.copy(composed,i,i,i+4);}
  }
  await sharp(composed,{raw:empty.info}).png().toFile(file('staged/flail-bank.png'));
  await sharp({ create: { width: 897, height: 1497, channels: 4, background: '#00000000' } }).composite([{ input: glyph, left: 89 + left, top: 1116 + top }]).png().toFile(file('staged/flail-motif.png'));
  const contour = metrics(await sharp(file('staged/flail-motif.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }), .35);
  assert(contour.fullRadius <= 44); assert(contour.opticalError <= .8);
  write(file('bank-source.json'), { email: rel(email), emailHash: await hash(email), placement: { left, top }, contour });
  write(file('before.json'), b); console.log({ bank: true, contour });
}
async function native() {
  const b = read(file('before.json')); await guard(b); await L.protectedCheck();
  const lock = path.join(DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
  try {
    fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, revision: REVISION }));
    console.log(await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', file('render.ps1'), '-Script', file('native.jsx')], file('native.log')));
    await guard(b);
  } finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === id) fs.unlinkSync(lock); } }
}
async function verify() {
  const b = read(file('before.json')); await guard(b); const results = [];
  fs.mkdirSync(file('proof'), { recursive: true });
  for (const item of b.items) {
    const dir = file('staged/' + item.key), native = read(path.join(dir, 'native.json'));
    const comparison = await circularDiff(path.join(ROOT, item.png), path.join(dir, 'card.png'));
    assert.equal(comparison.outside, 0); assert(comparison.changed > 0);
    const roundtrip = await L.diff(path.join(dir, 'card.png'), path.join(dir, 'reopened.png')); assert.equal(roundtrip.changed, 0);
    const layers = nativeLayers(native, item.layer);
    const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(dir, 'card.png'), item.id])); assert.equal(barcode.passed, true);
    let contour = null;
    if (item.kind === 'approved') { contour = read(file('bank-source.json')).contour; assert(contour.fullRadius <= 44); assert(contour.opticalError <= .8); }
    results.push({ id: item.id, comparison, roundtrip, layers, barcode, contour, pngHash: await hash(path.join(dir, 'card.png')), psdHash: await hash(path.join(dir, 'card.psd')), nativeHash: await hash(path.join(dir, 'native.json')) });
    const rect = { left: 74, top: 1100, width: 128, height: 128 };
    await sharp(path.join(dir, 'card.png')).extract(rect).resize(384, 384).png().toFile(file('proof/' + item.key + '-medallion.png'));
    await sharp(path.join(dir, 'card.png')).resize({ width: 300 }).png().toFile(file('proof/' + item.key + '-small.png'));
  }
  write(file('verification.json'), { revision: REVISION, referenceId: b.referenceId, passed: true, results, bankHash: await hash(file('staged/flail-bank.png')), checkedAt: new Date().toISOString() });
  console.log({ passed: true, cards: results.length, outside: 0, roundtrip: 0 });
}
async function publish() {
  const b = read(file('before.json')), proof = read(file('verification.json'));
  await guard(b); await L.protectedCheck(); await R.verifyAssets();
  assert(proof.passed); assert.equal(proof.referenceId, b.referenceId); assert.equal(proof.results.length, 2);
  const hashes = {}, changes = [];
  async function stage(target, value, json = false) {
    assert(target in b.backups); const staged = file('publication/' + target); fs.mkdirSync(path.dirname(staged), { recursive: true });
    if (json) write(staged, value); else fs.copyFileSync(value, staged);
    hashes[target] = await hash(staged);
    changes.push({ target: path.join(ROOT, target), backup: file('originals/' + target), stage: staged, beforeHash: b.observed[target], afterHash: hashes[target] });
  }
  for (const item of b.items) {
    const result = proof.results.find(r => r.id === item.id);
    for (const type of ['psd', 'png']) { const source = file('staged/' + item.key + '/card.' + type); assert.equal(await hash(source), result[type + 'Hash']); await stage(item[type], source); }
  }
  assert.equal(await hash(file('staged/flail-bank.png')), proof.bankHash);
  for (const manifest of controls.slice(2, 4)) {
    const target = 'V4/atelier/designer-assets/' + read(file('originals/' + manifest)).weapons['Fléau'].file;
    if (!(target in hashes)) await stage(target, file('staged/flail-bank.png'));
  }
  await stage('V4/template-stable/icon-layouts.json', file('calibration.json'));
  const helperPath = 'V4/scripts/stable/elements-common.jsx', helper = fs.readFileSync(file('originals/' + helperPath), 'utf8');
  const before = "var weapon = K.transplant(donor,K.need(donor,'ARME - '+card.weapon),doc,K.need(doc,'ARME - CONTENU'),'ARME - NOUVELLE');";
  assert(helper.includes(before));
  const revised = helper.replace(before, "var weaponLayout=iconLayouts.weapon[card.weapon];\n        var weapon = weaponLayout&&weaponLayout.source?place(doc,root+weaponLayout.source,K.need(doc,'ARME - CONTENU'),'ARME - NOUVELLE'):K.transplant(donor,K.need(donor,'ARME - '+card.weapon),doc,K.need(doc,'ARME - CONTENU'),'ARME - NOUVELLE');");
  const helperStage = file('staged/elements-common.jsx'); fs.writeFileSync(helperStage, revised);
  await stage(helperPath, helperStage);
  const old = read(file('originals/V4/atelier/data/references.json')), next = structuredClone(old);
  for (const [target, sha] of Object.entries(hashes)) if (target in next.protectedFiles) next.protectedFiles[target] = sha;
  for (const [target, sha] of Object.entries(b.backups)) next.protectedFiles[rel(file('originals/' + target))] = sha;
  for (const name of ['before.json', 'calibration.json', 'verification.json', 'assets/flail-delapouite.svg', 'assets/flail-white.png']) next.protectedFiles[rel(file(name))] = await hash(file(name));
  for (const [target, sha] of Object.entries(hashes)) if (target.includes('designer-assets/')) next.protectedFiles[target] = sha;
  next.parentReferenceId = old.id; next.createdAt = new Date().toISOString();
  next.revision = { id: REVISION, reason: 'User-requested white flail pictogram instead of nunchaku on every current Fléau card', audit: rel(file('verification.json')), existingCards: 2, gameplayUnchanged: true };
  next.id = crypto.createHash('sha256').update(JSON.stringify(next.protectedFiles)).digest('hex');
  assert.deepEqual(next.cards, old.cards); assert(Object.keys(old.protectedFiles).every(p => p in next.protectedFiles));
  const revision = { id: REVISION, referenceId: next.id, previousReferenceId: old.id, audit: rel(file('verification.json')), scope: 'white-flail-glyph-only' };
  for (const item of b.items.filter(i => i.kind === 'created')) {
    const result = proof.results.find(r => r.id === item.id), prior = read(file('originals/' + item.verification));
    const verification = { passed: true, modelId: item.id, referenceId: next.id, profileHash: b.observed[item.profile], hashes: { 'card.png': result.pngHash, 'card.psd': result.psdHash }, components: { fixedDifferences: 0, changed: result.comparison.changed, verificationScope: 'Native white flail replacement; zero changed pixels outside circular medallion' }, roundtrip: result.roundtrip, barcode: result.barcode, comparison: result.comparison, layers: result.layers, nativeRevision: revision, checkedAt: proof.checkedAt, previousVerification: { file: rel(file('originals/' + item.verification)), hash: b.backups[item.verification], checkedAt: prior.checkedAt } };
    await stage(item.verification, verification, true);
    const creation = read(file('originals/' + item.creation)); creation.hashes['card.png'] = result.pngHash; creation.hashes['card.psd'] = result.psdHash; creation.hashes['verification.json'] = hashes[item.verification]; creation.nativeRevision = revision;
    await stage(item.creation, creation, true);
  }
  for (const target of controls.slice(2, 4)) {
    const manifest = read(file('originals/' + target)); manifest.referenceId = next.id;
    manifest.hashes[manifest.weapons['Fléau'].file] = proof.bankHash;
    manifest.weapons['Fléau'].iconRevision = { ...revision, author: 'Delapouite', license: 'CC BY 3.0', source: 'https://game-icons.net/1x1/delapouite/flail.html' };
    await stage(target, manifest, true);
  }
  const catalogue = read(file('originals/V4/donnees/catalogue.json')); catalogue.referenceId = next.id;
  for (const card of catalogue.cards) if (b.items.some(i => i.id === card.id)) card.nativeRevision = revision;
  await stage('V4/donnees/catalogue.json', catalogue, true);
  await stage('V4/atelier/data/references.json', next, true);
  await stage('V4/atelier/data/regression.json', { passed: false, referenceId: next.id, rendererHash: await L.rendererHash(), results: [], revision: REVISION, reason: 'Explicit glyph migration: actual native regression required', previousReport: rel(file('originals/V4/atelier/data/regression.json')) }, true);
  const plan = { revision: REVISION, changes, referenceId: next.id }; write(file('publication-plan.json'), plan);
  const lock = path.join(DATA, 'render.lock'), id = crypto.randomUUID(); let fd;
  try {
    fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id, pid: process.pid, revision: REVISION, phase: 'publish' }));
    await transactionIO(L, file('transaction.json')).commit(plan, { before: () => guard(b), after: async () => {
      for (const change of changes) assert.equal(await hash(change.target), change.afterHash);
      for (const [target, sha] of Object.entries(b.observed)) if (!(target in hashes)) assert.equal(await hash(path.join(ROOT, target)), sha);
      await L.protectedCheck(); await R.verifyAssets();
      const c = await require('../../atelier/game-catalog.cjs').buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') }); assert.equal(c.cards.length, b.catalogueCount);
    }, afterRollback: () => guard(b) });
    write(file('published.json'), { revision: REVISION, referenceId: next.id, changes: changes.map(c => ({ file: rel(c.target), beforeHash: c.beforeHash, afterHash: c.afterHash })), nativeRegressionPending: true, publishedAt: new Date().toISOString() });
  } finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === id) fs.unlinkSync(lock); } }
  console.log({ published: true, cards: b.items.length, gameplayUnchanged: true, referenceId: next.id });
}
if (require.main === module) ({ prepare, bank, native, verify, publish }[process.argv[2]] || (() => { throw Error('Explicit action required'); }))().catch(e => { console.error(e); process.exitCode = 1; });
