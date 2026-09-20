'use strict';

const L = require('../../atelier/lib.cjs');
const {fs, path, ROOT, DATA, read, write, hash, assert, sharp} = L;
const WORK = path.relative(ROOT, __dirname).replaceAll('\\', '/');
const OUT = WORK + '/staged/publication';
const PACK = 'V4/atelier/designer-assets/';
const OLD_ID = 'af17ee6bd1c0aba0771193bbe87d2498e1ffee55df90c5506507740b667af4ea';
const ART = 'V4/assets/illustrations/elements-01/terre-plantes/BALMHYR_V4_02_CANYONERO.png';
const ICONS = 'V4/template-stable/icon-layouts.json';
const HELPER = 'V4/scripts/stable/elements-common.jsx';
const META = ['V4/template-stable/elements-01/manifest.json', 'V4/template-stable/elements-02/manifest.json', 'V4/template-stable/current-elements.json'];
const PROOFS = ['plan.json', 'verification.json', 'references-before.json', 'publish.cjs'].map(file => WORK + '/' + file);
const clone = value => structuredClone(value);

function absolute(file) {
  assert.equal(typeof file, 'string');
  assert.ok(file.startsWith('V4/') && !/[\\:\x00-\x1f]/.test(file));
  const parts = file.split('/'); assert.ok(parts.every(p => p && p !== '.' && p !== '..' && !/[. ]$/.test(p)));
  let current = ROOT;
  for (const part of parts) {
    current = path.join(current, part);
    if (fs.existsSync(current)) assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Lien interdit : ' + file);
  }
  return current;
}

async function preparePublication() {
  assert.ok(!fs.existsSync(path.join(DATA, 'render.lock')), 'Attendre la fin de toute production native');
  for (const file of ['published.json', 'transaction.json']) assert.ok(!fs.existsSync(absolute(WORK + '/' + file)), 'Transaction deja commencee');
  const checks = new Map();
  function snapshot(file) {
    const buffer = fs.readFileSync(absolute(file));
    checks.set(file, L.crypto.createHash('sha256').update(buffer).digest('hex'));
    return JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  }
  const plan = snapshot(WORK + '/plan.json'), old = snapshot(WORK + '/references-before.json');
  const audit = snapshot(WORK + '/verification.json');
  assert.equal(old.id, OLD_ID); assert.equal(Object.keys(old.protectedFiles).length, 166);
  assert.deepEqual(L.baseline(), old); await L.protectedCheck(old);
  assert.equal(audit.passed, true); assert.equal(audit.originalReferenceId, OLD_ID); assert.equal(audit.revision, plan.revision);
  assert.deepEqual(plan.items.map(i => i.key).sort(), ['balmhyr', 'lok']);
  assert.deepEqual(audit.results.map(i => i.key).sort(), ['balmhyr', 'lok']);
  assert.equal(plan.artwork, ART);
  async function remember(file, expected) {
    const actual = await hash(absolute(file));
    if (expected !== undefined) assert.equal(actual, expected, 'Source non verifiee : ' + file);
    if (checks.has(file)) assert.equal(actual, checks.get(file), 'Source changee pendant la preparation : ' + file);
    checks.set(file, actual); return actual;
  }
  for (const file of ['plan.json', 'verification.json', 'references-before.json', 'pack-before.json', 'pack-raw-before.json']) await remember(WORK + '/' + file);
  await remember(WORK + '/calibration.json', audit.calibrationHash);
  const packs = [snapshot(WORK + '/pack-before.json'), snapshot(WORK + '/pack-raw-before.json')];
  for (let i = 0; i < 2; i++) {
    assert.equal(packs[i].referenceId, OLD_ID);
    assert.deepEqual(snapshot(PACK + (i ? 'manifest.raw.json' : 'manifest.json')), packs[i], 'Pack actif change depuis la preparation');
    for (const [file, expected] of Object.entries(packs[i].hashes || {})) await remember(PACK + file, expected);
  }
  const installs = new Map();
  for (const entry of [...(plan.install || []), ...(plan.jsonUpdates || [])]) {
    absolute(entry.from); absolute(entry.to);
    assert.ok(entry.from.startsWith(WORK + '/staged/') || entry.from === WORK + '/calibration.json');
    assert.ok(!installs.has(entry.to), 'Installation dupliquee : ' + entry.to);
    installs.set(entry.to, {from:entry.from, to:entry.to});
  }
  function install(from, to) { absolute(from); absolute(to); installs.set(to, {from, to}); }
  function stageJSON(to, value) {
    const from = OUT + '/' + to; write(absolute(from), value); install(from, to); return from;
  }
  async function stageCopy(from, to, target = OUT + '/' + to) {
    await remember(from);
    fs.mkdirSync(path.dirname(absolute(target)), {recursive:true});
    fs.copyFileSync(absolute(from), absolute(target));
    assert.equal(await hash(absolute(target)), checks.get(from)); install(target, to);
  }
  const profiles = new Map(), nativeFiles = new Map();
  // Inspect all native proof inputs before writing preparation outputs.
  for (const item of plan.items) {
    const entry = old.cards.find(c => c.key === item.key), result = audit.results.find(r => r.key === item.key);
    for (const field of ['psd', 'png', 'profile']) assert.equal(item[field], entry[field]);
    assert.equal(item.report, path.posix.dirname(entry.profile) + '/render.json');
    absolute(item.destination); assert.ok(item.destination.startsWith(WORK + '/staged/'));
    assert.equal(result.passed, true); assert.equal(result.comparison.outside, 0); assert.equal(result.roundtrip.changed, 0);
    assert.equal(result.repeat.changed, 0); assert.equal(result.fixed.changed, 0);
    assert.equal(result.barcode.passed, true); assert.equal(result.barcode.expected, entry.card.id);
    for (const ext of ['psd', 'png']) {
      const from = item.destination + '/card.' + ext; await remember(from, result[ext + 'Hash']); install(from, item[ext]);
    }
    await remember(item.destination + '/native.json', result.nativeHash);
    const native = read(absolute(item.destination + '/native.json'));
    assert.equal(native.width, 897); assert.equal(native.height, 1497); assert.equal(native.resolution, 300);
    assert.ok(Array.isArray(native.before) && native.before.length && Array.isArray(native.reopened) && native.reopened.length);
    nativeFiles.set(item.key, native);
    const profile = clone(entry.card); if (item.key === 'balmhyr') profile.artworkSource = ART;
    profiles.set(item.key, profile);
  }

  await stageCopy(ART, ART);
  await stageCopy(WORK + '/calibration.json', ICONS, WORK + '/staged/icon-layouts.json');
  const helper = WORK + '/staged/elements-common.jsx'; await remember(helper); install(helper, HELPER);
  for (const item of plan.items) {
    const profile = profiles.get(item.key), native = nativeFiles.get(item.key);
    stageJSON(item.profile, profile);
    const report = read(absolute(item.report));
    report.card = clone(profile); report.before = clone(native.before); report.after = clone(native.reopened); report.reopened = clone(native.reopened);
    report.resolution = native.resolution; if (native.photoshop) report.photoshop = native.photoshop;
    report.iconRevision = {id:plan.revision, audit:WORK + '/verification.json', nativeHash:checks.get(item.destination + '/native.json'), regressionRequired:true};
    stageJSON(item.report, report);
  }
  for (const file of META) {
    const metadata = read(absolute(file));
    for (let i = 0; i < metadata.cards.length; i++) {
      const card = metadata.cards[i], entry = [...profiles].find(([key, p]) => key === card.key || p.id === card.id);
      if (!entry) continue;
      metadata.cards[i] = card.key ? {...card, artwork:entry[1].artworkSource} : clone(entry[1]);
    }
    // Nested protectedFiles are migrated by the publisher after all outputs exist.
    stageJSON(file, metadata);
  }

  const specifications = [
    {key:'balmhyr', source:'weapon-bank.png', group:'weapons', value:'Hache', file:'banks/weapon-Hache.png'},
    {key:'lok', source:'race-bank.png', group:'races', value:'NAIN', file:'banks/race-NAIN.png'}
  ];
  const banks = [];
  for (const spec of specifications) {
    const item = plan.items.find(i => i.key === spec.key), input = item.destination + '/' + spec.source;
    const inputHash = await remember(input);
    const {data, info} = await sharp(absolute(input)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width, 897); assert.equal(info.height, 1497); assert.equal(info.channels, 4);
    let x0 = info.width, y0 = info.height, x1 = -1, y1 = -1;
    for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
      if (!data[(y * info.width + x) * 4 + 3]) continue;
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
    }
    assert.ok(x1 >= x0 && y1 >= y0, 'Banque vide : ' + input);
    const exports = [];
    for (let i = 0; i < 2; i++) {
      const margin = i ? 4 : 0, left = Math.max(0, x0 - margin), top = Math.max(0, y0 - margin);
      const width = Math.min(info.width - 1, x1 + margin) - left + 1;
      const height = Math.min(info.height - 1, y1 + margin) - top + 1;
      const file = (i ? '' : 'packed/') + spec.file, to = PACK + file, from = OUT + '/' + to;
      fs.mkdirSync(path.dirname(absolute(from)), {recursive:true});
      await sharp(data, {raw:info}).extract({left, top, width, height}).png().toFile(absolute(from));
      // Extraction only: no scaling, flattening, recolouring, or alpha thresholding.
      const cropped = await sharp(absolute(from)).ensureAlpha().raw().toBuffer();
      for (let row = 0; row < height; row++) assert.ok(cropped.subarray(row * width * 4, (row + 1) * width * 4).equals(data.subarray(((top + row) * info.width + left) * 4, ((top + row) * info.width + left + width) * 4)));
      const sha256 = await hash(absolute(from)); install(from, to);
      const previous = packs[i][spec.group][spec.value];
      assert.equal(previous.file, file);
      packs[i][spec.group][spec.value] = {...previous, file, left, top, width, height,
        iconRevision:{id:plan.revision, audit:WORK + '/verification.json', preparation:WORK + '/publication-inputs.json', scope:'this-icon-bank-only', regressionRequired:true}};
      packs[i].hashes = {...packs[i].hashes, [file]:sha256};
      exports.push({to, from, sha256, left, top, width, height, margin});
    }
    banks.push({key:spec.key, input, inputHash, exports});
  }
  for (let i = 0; i < packs.length; i++) {
    const pack = packs[i];
    stageJSON(PACK + (i ? 'manifest.raw.json' : 'manifest.json'), pack);
  }
  plan.referenceId = old.id;
  plan.install = [...installs.values()]; delete plan.jsonUpdates;
  const protect = new Set(plan.protect || []);
  for (const file of [...PROOFS, ART, ICONS, ...banks.flatMap(b => b.exports.map(e => e.to))]) protect.add(file);
  plan.protect = [...protect];
  const installHashes = {};
  for (const entry of plan.install) installHashes[entry.to] = await hash(absolute(entry.from));
  await L.protectedCheck(old);
  for (const [file, expected] of checks) assert.equal(await hash(absolute(file)), expected, 'Entree changee pendant la preparation : ' + file);
  const report = {revision:plan.revision, originalReferenceId:old.id, scope:'two-native-icon-banks-only', banks,
    sourceHashes:plan.items.map(item => ({key:item.key, psdHash:checks.get(item.destination + '/card.psd'), pngHash:checks.get(item.destination + '/card.png'), nativeHash:checks.get(item.destination + '/native.json')})),
    installHashes, nativeVerification:WORK + '/verification.json', nativeVerificationHash:checks.get(WORK + '/verification.json'),
    fullPackComparisonPerformed:false, regressionRequired:true, auditRefreshRequired:true, preparedAt:new Date().toISOString()};
  write(absolute(WORK + '/publication-inputs.json'), report);
  // The verifier is the only writer of verification.json; run it again afterwards.
  write(absolute(WORK + '/plan.json'), plan);
  return {stagedCards:2, bankExports:4, auditRefreshRequired:true, regressionRequired:true};
}

module.exports = {preparePublication};
if (require.main === module) {
  Promise.resolve().then(() => {
    assert.ok(process.argv.length === 3 && process.argv[2] === '--prepare', 'Usage explicite : node prepare-publication.cjs --prepare');
    return preparePublication();
  }).then(result => console.log(result)).catch(error => { console.error(error); process.exitCode = 1; });
}
