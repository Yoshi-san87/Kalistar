'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs'), T = require('../../collaborations/nier-pilot-01/typography.cjs');
const { fs, path, assert, read, write, hash, sharp, ROOT } = L;
const REV = '2026-10-01-skull-face', ID = '49600118', KEY = 'skull-face';
const home = __dirname, file = n => L.inside(home, n), rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const creation = n => path.join(ROOT, 'V4/creations', ID, n), work = n => file('work/' + KEY + '/' + n);
const source = n => path.join(ROOT, 'V4/expansions/2026-09-30-metal-gear-saga/cards', KEY, n);
const ART = 'V4/Illustrations/Skull_Face_MGS5_Fidelity_20261001.png';
const CATALOGUE = path.join(ROOT, 'V4/donnees/catalogue.json');
const NAMES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png', 'creation.json'];
const CHANGED = ['ILLUSTRATION - cadrage', 'RACE', 'RACE - HUMAIN', 'RACE - SKULLZ'];
const ART_RECT = [80, 156, 817, 1077], ICON_RECT = [711, 1116, 807, 1211];
const CODE = ['revise.cjs', 'compose.jsx', 'render.ps1'].map(file).concat([
  'V4/atelier/lib.cjs', 'V4/atelier/designer-render.cjs', 'V4/atelier/designer-core.cjs',
  'V4/atelier/game-catalog.cjs', 'V4/atelier/barcode.py', 'V4/scripts/stable/common.jsx',
  'V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/site/engine.js',
  'V4/scripts/stable/elements-common.jsx', 'V4/collaborations/nier-pilot-01/build.cjs',
  'V4/collaborations/nier-pilot-01/typography.cjs', 'V4/collaborations/nier-pilot-01/typography.jsx',
  'V4/collaborations/ff8-set-01/build.cjs', 'V4/atelier/designer-assets/manifest.json',
  'V4/atelier/designer-assets/race-extensions.json'
].map(f => path.join(ROOT, f)));
function raceOnly(before, after) {
  assert.equal(before.id, ID); assert.equal(before.race, 'HUMAIN');
  assert.deepEqual(after, { ...before, race: 'SKULLZ' }, 'Only profile.race may change.');
}
const stableLayers = layers => layers.filter(l => !CHANGED.includes(l.name)).map(({ id, ...l }) => l);
function catalogueChange(before, after, oldProfile, newProfile) {
  raceOnly(oldProfile, newProfile);
  assert.equal(before.cards.filter(c => c.id === ID).length, 1);
  assert.equal(after.cards.length, before.cards.length);
  assert.deepEqual({ ...after, cards: undefined }, { ...before, cards: undefined });
  for (let i = 0; i < before.cards.length; i++) {
    const a = before.cards[i], b = after.cards[i];
    if (a.id !== ID) assert.deepEqual(b, a, 'Unrelated catalogue entry changed.');
    else {
      assert.deepEqual(a.profile, oldProfile); assert.deepEqual(b.profile, newProfile);
      assert.deepEqual({ ...b, profile: undefined, nativeRevision: undefined }, { ...a, profile: undefined, nativeRevision: undefined });
    }
  }
}
async function hashes(files) { const result = {}; for (const f of files) result[rel(f)] = await hash(f); return result; }
async function match(entries) { for (const [f, h] of Object.entries(entries)) assert.equal(await hash(path.join(ROOT, f)), h, 'Changed frozen input: ' + f); }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
function iconSpec() {
  const manifest = read(path.join(R.ASSETS, 'manifest.json')), spec = manifest.races.SKULLZ;
  assert.deepEqual([spec.left, spec.top, spec.width, spec.height], [711, 1116, 96, 95]);
  return { spec, path: path.join(R.ASSETS, spec.file), hash: manifest.hashes[spec.file] };
}
async function guard() {
  const before = read(file('before.json')); assert.equal(before.revision, REV);
  await stable(); await match(before.observed); await match(before.backups); await match(before.inputs);
  assert.deepEqual(read(CATALOGUE).cards.find(c => c.id === ID), before.catalogueEntry, 'Target catalogue entry changed.');
  raceOnly(read(creation('profile.json')), read(work('profile.json')));
  return before;
}
async function check() {
  const p = read(creation('profile.json')), icon = iconSpec();
  assert.equal(p.id, ID); assert.equal(p.race, 'HUMAIN'); assert.equal(p.faction, 'MGS5');
  assert.equal(await hash(icon.path), icon.hash);
  const entry = read(CATALOGUE).cards.find(c => c.id === ID); assert.deepEqual(entry.profile, p);
  for (const n of ['card.png', 'card.psd', 'profile.json']) assert.equal(await hash(source(n)), await hash(creation(n)), 'Stale native evidence: ' + n);
  const catalogue = await require('../../atelier/game-catalog.cjs').buildCatalog({ published: read(CATALOGUE).cards.filter(c => c.kind === 'created') });
  return { revision: REV, key: KEY, id: ID, nativeEvidence: rel(source('render/native.json')),
    art: ART, artReady: fs.existsSync(path.join(ROOT, ART)), prepared: fs.existsSync(file('before.json')),
    gameCount: catalogue.cards.length, photoshopGranted: process.env.KALISTAR_SKULL_PS_GRANTED === '2026-10-01',
    codeStableConfirmed: process.env.KALISTAR_SKULL_CODE_STABLE === '2026-10-01' };
}
async function prepare() {
  assert.equal(process.env.KALISTAR_SKULL_CODE_STABLE, '2026-10-01', 'Parent must confirm shared SHARKAN code is stable before freezing.');
  assert(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Keep original backups; preparation already exists.');
  assert((await check()).artReady, 'Parent artwork is not ready.'); await stable();
  const icon = iconSpec(), plan = read(source('render/composition.json')), p = read(creation('profile.json'));
  const oldPlan = structuredClone(plan), art = plan.layers.find(l => l.name === CHANGED[0]), race = plan.layers.find(l => l.name === 'RACE - HUMAIN');
  assert.deepEqual([art.left, art.top, art.width, art.height], [80, 156, 737, 921]);
  assert.deepEqual([race.left, race.top, race.width, race.height], [711, 1116, 96, 95]);
  const observedFiles = NAMES.map(creation).concat(['card.png', 'card.psd', 'profile.json', 'render/native.json', 'render/composition.json'].map(source), oldPlan.layers.map(l => source('render/' + l.file)));
  const before = { revision: REV, observed: await hashes(observedFiles), catalogueEntry: read(CATALOGUE).cards.find(c => c.id === ID) };
  fs.mkdirSync(work('render'), { recursive: true });
  for (const n of NAMES) { const dest = file('originals/' + KEY + '/' + n); fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.copyFileSync(creation(n), dest, fs.constants.COPYFILE_EXCL); }
  for (const n of ['native.json', 'composition.json']) fs.copyFileSync(source('render/' + n), file('originals/' + KEY + '/' + n), fs.constants.COPYFILE_EXCL);
  before.backups = await hashes(NAMES.concat(['native.json', 'composition.json']).map(n => file('originals/' + KEY + '/' + n)));
  for (const l of plan.layers) fs.copyFileSync(source('render/' + l.file), work('render/' + l.file), fs.constants.COPYFILE_EXCL);
  await sharp(path.join(ROOT, ART)).resize(737, 921, { fit: 'cover' }).png().toFile(work('render/' + art.file));
  fs.copyFileSync(icon.path, work('render/' + race.file)); race.name = 'RACE - SKULLZ';
  fs.copyFileSync(path.join(ROOT, ART), work('illustration.png'), fs.constants.COPYFILE_EXCL);
  write(work('profile.json'), { ...p, race: 'SKULLZ' }); write(work('render/composition.json'), plan);
  await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: work('render/' + l.file) })))).png().toFile(work('render/expected-components.png'));
  write(file('render-request.json'), { revision: REV, key: KEY, original: rel(file('originals/' + KEY + '/card.psd')),
    native: rel(file('originals/' + KEY + '/native.json')), allowedChanges: CHANGED });
  before.inputs = await hashes(CODE.concat([path.join(ROOT, ART), icon.path, file('render-request.json'), work('profile.json'),
    work('illustration.png'), work('render/composition.json'), work('render/expected-components.png'), ...plan.layers.map(l => work('render/' + l.file))]));
  await match(before.observed); write(file('before.json'), before); await guard();
  return { prepared: ID, nativeKey: KEY, sharedCodeFrozen: true, productionUnchanged: true, photoshopRun: false };
}
async function render() {
  assert.equal(process.env.KALISTAR_SKULL_PS_GRANTED, '2026-10-01', 'Explicit parent Photoshop grant required.');
  return B.locked(async () => {
    await guard(); assert(!fs.existsSync(work('card.psd')), 'Native output already exists; preserve the attempt.');
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', file('render.ps1')], file('photoshop.log'));
    await guard(); return { rendered: ID, output };
  });
}
function assertNative(audit, native, old) {
  for (const layers of [audit.before, audit.after, audit.reopened]) assert.deepEqual(stableLayers(layers), stableLayers(old.layers));
  assert.deepEqual(native.layers, audit.reopened);
  assert.deepEqual(audit.textsAfter, audit.textsBefore, 'Native style runs changed.');
  assert.deepEqual(audit.textsReopened, audit.textsBefore, 'Native style runs changed on reopen.');
  assert.deepEqual(audit.effectsAfter, audit.effectsBefore); assert.deepEqual(audit.effectsReopened, audit.effectsBefore);
  for (const [layers, label] of [[audit.before, 'HUMAIN'], [audit.after, 'SKULLZ'], [audit.reopened, 'SKULLZ']]) {
    assert.equal(layers.length, old.layers.length);
    const text = layers.find(l => l.name === 'RACE'), oldText = old.layers.find(l => l.name === 'RACE');
    assert.equal(text.text, label); assert.equal(text.kind, 'LayerKind.TEXT');
    const style = ({ id, bounds, ink, text, ...s }) => s;
    assert.deepEqual(style(text), style(oldText));
    assert(Math.abs((text.ink[0] + text.ink[2]) / 2 - 599) <= 1);
    assert(Math.abs((text.ink[1] + text.ink[3]) / 2 - 1172.5) <= 1);
    assert(text.ink[2] - text.ink[0] <= 171 && text.ink[3] - text.ink[1] <= 18);
    for (const [name, originalName] of [[CHANGED[0], CHANGED[0]], ['RACE - ' + label, 'RACE - HUMAIN']]) {
      const layer = layers.find(l => l.name === name), original = old.layers.find(l => l.name === originalName);
      assert(layer && original); const normalized = ({ id, name, path, ...s }) => s;
      assert.deepEqual(normalized(layer), normalized(original));
    }
  }
  assert.deepEqual(audit.embeddedAfter, [{ name: CHANGED[0], linked: false }, { name: 'RACE - SKULLZ', linked: false }]);
  assert.deepEqual(audit.embeddedReopened, audit.embeddedAfter);
}
async function verify() {
  await guard(); const p = read(work('profile.json')), old = read(file('originals/' + KEY + '/native.json'));
  const n = read(work('render/native.json')), audit = read(work('audit.json')); assert.equal(n.photoshop, '26.11.7');
  assertNative(audit, n, old); T.verify(n);
  const originalPixels = await L.diff(creation('card.png'), work('before-card.png')); assert.equal(originalPixels.changed, 0);
  const withoutChanges = await L.diff(work('before-without-changes.png'), work('after-without-changes.png')); assert.equal(withoutChanges.changed, 0);
  const reopenedWithoutChanges = await L.diff(work('before-without-changes.png'), work('reopened-without-changes.png')); assert.equal(reopenedWithoutChanges.changed, 0);
  const labelRects = [audit.before, audit.after].map(layers => { const b = layers.find(l => l.name === 'RACE').bounds; return [Math.floor(b[0]) - 2, Math.floor(b[1]) - 2, Math.ceil(b[2]) + 2, Math.ceil(b[3]) + 2]; });
  const rects = [ART_RECT, ICON_RECT, ...labelRects], scope = await L.diff(creation('card.png'), work('card.png'), rects);
  assert.equal(scope.outside, 0); assert(scope.changed > 0);
  for (const rect of [ART_RECT, ICON_RECT, [514, 1161, 685, 1184]]) {
    const [left, top, right, bottom] = rect, crop = { left, top, width: right - left, height: bottom - top };
    const a = await sharp(creation('card.png')).extract(crop).raw().toBuffer(), b = await sharp(work('card.png')).extract(crop).raw().toBuffer();
    assert(!a.equals(b), 'Every requested region must actually change.');
  }
  const v = { ...await B.verifyNative(work(''), p), revision: REV, scope, allowedRectangles: rects,
    originalPixels, withoutChanges, reopenedWithoutChanges, preservedNativeStyles: true, onlyProfileRaceChanged: true };
  write(work('verification.json'), v); await sharp(work('card.png')).resize({ width: 300 }).png().toFile(work('small.png'));
  const evidence = ['card.png', 'card.psd', 'profile.json', 'illustration.png', 'verification.json', 'audit.json', 'before-card.png',
    'before-without-changes.png', 'after-without-changes.png', 'reopened-without-changes.png', 'render/native.json', 'render/without-text.png', 'render/reopened.png'];
  await guard(); write(file('verified.json'), { revision: REV, beforeHash: await hash(file('before.json')), evidence: await hashes(evidence.map(work)), publication: 'awaiting-parent-after-one-piece' });
  return { verified: ID, scope, onlyProfileRaceChanged: true, productionUnchanged: true };
}
async function publicationPlan() {
  const frozen = await guard(); assert(!fs.existsSync(file('published.json')), 'Already published.');
  const proof = read(file('verified.json')); assert.equal(proof.revision, REV); assert.equal(proof.beforeHash, await hash(file('before.json'))); await match(proof.evidence);
  const v = read(work('verification.json')); assert(v.passed && v.scope.outside === 0 && v.preservedNativeStyles && v.onlyProfileRaceChanged);
  assert.equal(v.profileHash, await hash(work('profile.json')));
  for (const n of ['card.png', 'card.psd']) assert.equal(v.hashes[n], await hash(work(n)));
  const catalogueHash = await hash(CATALOGUE), before = read(CATALOGUE), catalogue = structuredClone(before);
  const entry = catalogue.cards.find(c => c.id === ID), profile = read(work('profile.json')); assert.deepEqual(entry, frozen.catalogueEntry);
  entry.profile = profile; entry.nativeRevision = { id: REV, key: KEY, proof: rel(work('verification.json')), artworkSource: ART, changedFields: ['race'] };
  catalogueChange(before, catalogue, read(creation('profile.json')), profile);
  const G = require('../../atelier/game-catalog.cjs'), oldGame = await G.buildCatalog({ published: before.cards.filter(c => c.kind === 'created') }), newGame = await G.buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
  assert.equal(oldGame.cards.length, newGame.cards.length);
  for (const a of oldGame.cards) { const b = newGame.cards.find(c => c.id === a.id); assert(b); assert.deepEqual(b, a.id === ID ? { ...a, race: 'SKULLZ' } : a); }
  const meta = read(creation('creation.json')), names = NAMES.filter(n => n !== 'creation.json');
  for (const n of names) meta.hashes[n] = await hash(work(n)); meta.nativeRevision = entry.nativeRevision;
  assert.equal(await hash(CATALOGUE), catalogueHash, 'Catalogue changed during preflight; rerun.');
  return { catalogue, catalogueHash, meta, names, gameCount: newGame.cards.length };
}
async function publish() {
  assert.equal(process.env.KALISTAR_SKULL_PARENT_COORDINATED, '2026-10-01', 'Parent release approval after One Piece required.');
  return B.locked(async () => {
    const plan = await publicationPlan(); await guard(); assert.equal(await hash(CATALOGUE), plan.catalogueHash);
    assert(!fs.existsSync(file('catalogue-before-publication.json')), 'Previous publication attempt exists; inspect it.');
    fs.copyFileSync(CATALOGUE, file('catalogue-before-publication.json'), fs.constants.COPYFILE_EXCL);
    const before = read(file('before.json')), changed = [], stagedHashes = { ...await hashes(plan.names.map(work)) };
    write(file('publication-meta.json'), plan.meta); write(file('publication-catalogue.json'), plan.catalogue);
    const writes = plan.names.map(n => [work(n), creation(n)]).concat([[file('publication-meta.json'), creation('creation.json')], [file('publication-catalogue.json'), CATALOGUE]]);
    for (const [stage] of writes) stagedHashes[rel(stage)] = await hash(stage);
    write(file('transaction.json'), { revision: REV, state: 'publishing', catalogueHash: plan.catalogueHash, stagedHashes });
    try {
      for (const [stage, target] of writes) {
        assert.equal(await hash(target), target === CATALOGUE ? plan.catalogueHash : before.observed[rel(target)], 'Concurrent publication: ' + target);
        const temp = target + '.' + REV + '.tmp';
        fs.copyFileSync(stage, temp, fs.constants.COPYFILE_EXCL); assert.equal(await hash(temp), stagedHashes[rel(stage)]);
        assert.equal(await hash(target), target === CATALOGUE ? plan.catalogueHash : before.observed[rel(target)], 'Concurrent publication: ' + target);
        fs.renameSync(temp, target); changed.push([stage, target]);
        assert.equal(await hash(target), stagedHashes[rel(stage)]);
      }
      await stable(); raceOnly(read(file('originals/' + KEY + '/profile.json')), read(creation('profile.json')));
      write(file('published.json'), { revision: REV, id: ID, changed: changed.map(([, target]) => rel(target)), onlyProfileRaceChanged: true, gameCount: plan.gameCount });
      write(file('transaction.json'), { revision: REV, state: 'published', gameCount: plan.gameCount });
      return { published: ID, race: 'SKULLZ', gameCount: plan.gameCount };
    } catch (error) {
      for (const [stage, target] of changed.slice().reverse()) {
        assert.equal(await hash(target), stagedHashes[rel(stage)], 'External change: automatic rollback refused.');
        fs.copyFileSync(target === CATALOGUE ? file('catalogue-before-publication.json') : file('originals/' + KEY + '/' + path.basename(target)), target);
      }
      write(file('transaction.json'), { revision: REV, state: 'rolled-back', error: String(error) }); throw error;
    }
  });
}
module.exports = { REV, ID, KEY, ART, CHANGED, ART_RECT, ICON_RECT, raceOnly, stableLayers, catalogueChange, assertNative, check, prepare, render, verify, guard, publicationPlan, publish };
if (require.main === module) {
  const action = process.argv[2] || 'check', fn = { check, prepare, render, verify, preflight: publicationPlan, publish }[action]; assert(fn, 'Unknown action.');
  fn().then(r => console.log(JSON.stringify(action === 'preflight' ? { ready: true, id: ID, gameCount: r.gameCount } : r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
