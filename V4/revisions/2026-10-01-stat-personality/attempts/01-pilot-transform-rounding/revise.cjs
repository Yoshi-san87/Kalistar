'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs'), S = require('./numeric-only.cjs');
const rows = require('./plan.cjs'), bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const { fs, path, assert, ROOT, read, write, hash, sharp } = L;
const file = n => L.inside(__dirname, n), rel = p => path.relative(ROOT, p).replaceAll('\\', '/');
const creation = (id, n) => path.join(ROOT, 'V4/creations', id, n), work = (id, n) => file('work/' + id + '/' + n);
const original = (id, n) => file('originals/' + id + '/' + n), catalogueFile = path.join(ROOT, 'V4/donnees/catalogue.json');
const NAMES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png', 'creation.json'];
const PUBLISHED = ['profile.json', 'card.png', 'card.psd', 'verification.json'];
const CODE = ['revise.cjs', 'numeric-only.cjs', 'plan.cjs', 'compose.jsx', 'render.ps1'];
const SHARED = ['V3/donnees/regles_demo.json', 'V4/site/engine.js', 'V4/atelier/lib.cjs', 'V4/atelier/designer-render.cjs',
  'V4/atelier/game-catalog.cjs', 'V4/atelier/barcode.py', 'V4/scripts/stable/common.jsx', 'V4/scripts/stable/elements-common.jsx',
  'V4/collaborations/nier-pilot-01/build.cjs', 'V4/collaborations/nier-pilot-01/typography.cjs', 'V4/collaborations/nier-pilot-01/typography.jsx',
  'V4/collaborations/ff8-set-01/build.cjs', 'V4/atelier/data/references.json', 'V4/atelier/data/regression.json', 'V4/atelier/designer-assets/manifest.json'];
async function hashes(files) { const out = {}; for (const f of files) out[rel(f)] = await hash(f); return out; }
async function match(entries) { for (const [f, h] of Object.entries(entries)) assert.equal(await hash(path.join(ROOT, f)), h, 'Frozen file changed: ' + f); }
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
function nativeSource(entry) {
  const dir = entry.nativeRevision ? path.dirname(path.join(ROOT, entry.nativeRevision.proof)) : path.join(ROOT, entry.publicationSource, 'cards', read(creation(entry.id, 'creation.json')).key);
  const n = path.join(dir, 'render/native.json'); assert(fs.existsSync(n), 'Current native proof missing: ' + entry.id);
  return dir;
}
async function prepare() {
  assert(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Originals already frozen; never overwrite them.');
  await stable();
  const catalogue = read(catalogueFile), cards = [], observed = [], sources = [];
  for (const row of rows) {
    const entry = catalogue.cards.find(c => c.id === row.id); assert.equal(entry?.kind, 'created');
    const before = read(creation(row.id, 'profile.json')); assert.deepEqual(entry.profile, before);
    const after = { ...before, atk: row.atk, defense: row.defense }; S.numericOnly(before, after, bounds);
    const dir = nativeSource(entry), native = read(path.join(dir, 'render/native.json')), composition = read(path.join(dir, 'render/composition.json'));
    const edits = S.changes(before, after);
    for (const e of edits) assert.equal(native.layers.find(l => l.name === e.name)?.text, e.before, 'Stale numeric native evidence.');
    fs.mkdirSync(work(row.id, 'render'), { recursive: true }); fs.mkdirSync(original(row.id, 'render'), { recursive: true });
    for (const n of NAMES) { fs.copyFileSync(creation(row.id, n), original(row.id, n), fs.constants.COPYFILE_EXCL); observed.push(creation(row.id, n)); }
    for (const n of ['native.json', 'composition.json']) {
      fs.copyFileSync(path.join(dir, 'render', n), original(row.id, 'render/' + n), fs.constants.COPYFILE_EXCL);
      sources.push(path.join(dir, 'render', n));
    }
    for (const l of composition.layers) {
      fs.copyFileSync(path.join(dir, 'render', l.file), work(row.id, 'render/' + l.file), fs.constants.COPYFILE_EXCL);
      sources.push(path.join(dir, 'render', l.file));
    }
    fs.copyFileSync(path.join(dir, 'render/expected-components.png'), work(row.id, 'render/expected-components.png'), fs.constants.COPYFILE_EXCL);
    write(work(row.id, 'render/composition.json'), composition); write(work(row.id, 'profile.json'), after);
    // Artwork is copied byte-for-byte solely for native verification, never replaced in production.
    fs.copyFileSync(creation(row.id, 'illustration.png'), work(row.id, 'illustration.png'), fs.constants.COPYFILE_EXCL);
    cards.push({ id: row.id, key: row.key, name: before.name, faction: before.faction, role: before.role,
      before: { atk: before.atk, defense: before.defense }, after: { atk: after.atk, defense: after.defense },
      reason: row.reason, numericChanges: edits.length, nativeSource: rel(dir), catalogueEntry: entry });
  }
  write(file('plan.json'), { revision: S.REV, ordering: 'D6 to D1', cards });
  const originals = cards.flatMap(c => NAMES.concat(['render/native.json', 'render/composition.json']).map(n => original(c.id, n)));
  const historical = [...new Set(cards.map(c => c.catalogueEntry.publicationSource))].flatMap(dir => ['set.json', 'model.cjs'].map(n => path.join(ROOT, dir, n)));
  write(file('before.json'), { revision: S.REV, planHash: await hash(file('plan.json')), observed: await hashes(observed), backups: await hashes(originals),
    sources: await hashes(sources.concat(historical)), protected: await hashes(SHARED.map(p => path.join(ROOT, p))) });
  const groups = {};
  for (const c of cards) {
    const family = c.faction === 'ONEPIECE' ? 'One Piece' : c.faction.startsWith('RE') ? 'Resident Evil' : 'MGS';
    const t = groups[family] ||= { cards: 0, before: 0, after: 0, increased: 0, decreased: 0 };
    const sum = p => S.SIDES.flatMap(side => p[side]).reduce((s, v) => s + (typeof v === 'number' ? v : 0), 0);
    const a = sum(c.before), b = sum(c.after); t.cards++; t.before += a; t.after += b; t[b > a ? 'increased' : 'decreased']++;
  }
  write(file('summary.json'), { revision: S.REV, groups, productionUnchanged: true, native: 'awaiting-parent-grant', publication: 'awaiting-parent-review' });
  await guard(); return { prepared: cards.length, groups, photoshopRun: false, productionUnchanged: true };
}
async function guard() {
  const before = read(file('before.json')); assert.equal(before.planHash, await hash(file('plan.json')));
  await stable(); await match(before.observed); await match(before.backups); await match(before.sources); await match(before.protected);
  const catalogue = read(catalogueFile);
  for (const c of read(file('plan.json')).cards) {
    assert.deepEqual(catalogue.cards.find(e => e.id === c.id), c.catalogueEntry, 'Target entry changed.');
    const source = read(original(c.id, 'profile.json')), staged = read(work(c.id, 'profile.json'));
    S.numericOnly(source, staged, bounds); assert.deepEqual(staged, { ...source, ...c.after }, 'Staged profile differs from reviewed plan.');
    assert.deepEqual(read(work(c.id, 'render/composition.json')), read(original(c.id, 'render/composition.json')));
  }
  return before;
}
async function render(id, limit = 6) {
  assert.equal(process.env.KALISTAR_STATS_PS_GRANTED, '2026-10-01', 'Explicit parent Photoshop grant required.');
  assert(Number.isInteger(limit) && limit >= 1 && limit <= 48);
  const cards = read(file('plan.json')).cards.filter(c => id === 'next' ? !fs.existsSync(work(c.id, 'card.psd')) : !id || c.id === id).slice(0, id === 'next' ? limit : 48); assert(cards.length);
  return B.locked(async () => {
    await guard();
    const request = { revision: S.REV, cards: cards.map(c => ({ id: c.id, original: rel(original(c.id, 'card.psd')), native: rel(original(c.id, 'render/native.json')),
      output: rel(work(c.id, '')), changes: S.changes(read(original(c.id, 'profile.json')), read(work(c.id, 'profile.json'))) })) };
    for (const c of cards) assert(!fs.existsSync(work(c.id, 'card.psd')), 'Native attempt exists; preserve and inspect it.');
    write(file('render-request.json'), request);
    const stagedInputs = read(file('plan.json')).cards.flatMap(c => ['profile.json', 'illustration.png', 'render/composition.json', 'render/expected-components.png',
      ...read(work(c.id, 'render/composition.json')).layers.map(l => 'render/' + l.file)].map(n => work(c.id, n)));
    write(file('render-inputs.json'), await hashes(CODE.map(file).concat([file('plan.json')], stagedInputs)));
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', file('render.ps1')], file('photoshop-' + cards[0].id + '-' + cards.at(-1).id + '.log'));
    await guard(); await match(read(file('render-inputs.json'))); return { rendered: cards.map(c => c.id), output };
  });
}
async function verify(id) {
  await guard(); await match(read(file('render-inputs.json')));
  const results = [];
  for (const c of read(file('plan.json')).cards.filter(c => !id || c.id === id)) {
    const old = read(original(c.id, 'render/native.json')), n = read(work(c.id, 'render/native.json')), audit = read(work(c.id, 'audit.json'));
    const p = read(work(c.id, 'profile.json')), before = read(original(c.id, 'profile.json'));
    S.assertNative(audit, n, old, before, p);
    for (const [a, b] of [['before-card.png', original(c.id, 'card.png')], ['before-without-numbers.png', work(c.id, 'after-without-numbers.png')],
      ['before-without-numbers.png', work(c.id, 'reopened-without-numbers.png')]]) assert.equal((await L.diff(work(c.id, a), b)).changed, 0, 'Fixed frame changed.');
    const a = await L.pixels(original(c.id, 'card.png')), b = await L.pixels(work(c.id, 'card.png')); assert.deepEqual(a.info, b.info);
    const circles = S.circlesFor(S.changes(before, p)), scope = S.diffPixels(a.data, b.data, a.info.width, a.info.height, circles);
    assert.equal(scope.outside, 0, 'Pixels outside numeric circles changed.'); assert(scope.changed > 0);
    const v = { ...await B.verifyNative(work(c.id, ''), p), revision: S.REV, numericOnly: true, scope, allowedCircles: circles,
      preservedNativeStyles: true, unchangedArtworkAndComponents: true, originalHash: await hash(original(c.id, 'card.psd')) };
    write(work(c.id, 'verification.json'), v);
    await sharp(work(c.id, 'card.png')).resize({ width: 300 }).png().toFile(work(c.id, 'small.png'));
    const names = PUBLISHED.concat(['audit.json', 'render/native.json', 'render/reopened.png', 'render/without-text.png', 'before-card.png',
      'before-without-numbers.png', 'after-without-numbers.png', 'reopened-without-numbers.png']);
    write(work(c.id, 'verified.json'), { id: c.id, revision: S.REV, planHash: await hash(file('plan.json')), evidence: await hashes(names.map(n => work(c.id, n))) });
    results.push({ id: c.id, scope });
  }
  await guard(); return { verified: results.length, results };
}
async function publicationPlan() {
  const frozen = await guard(); assert(!fs.existsSync(file('published.json')), 'Already published.');
  const cards = read(file('plan.json')).cards, oldHash = await hash(catalogueFile), before = read(catalogueFile), catalogue = structuredClone(before), metas = [];
  for (const c of cards) {
    const proof = read(work(c.id, 'verified.json')); assert.equal(proof.planHash, frozen.planHash); await match(proof.evidence);
    const v = read(work(c.id, 'verification.json')); assert(v.passed && v.numericOnly && v.preservedNativeStyles && v.scope.outside === 0);
    const profile = read(work(c.id, 'profile.json')), entry = catalogue.cards.find(e => e.id === c.id);
    entry.profile = profile;
    entry.nativeRevision = { id: S.REV, key: c.key, proof: rel(work(c.id, 'verification.json')), changedFields: ['atk', 'defense'], previous: c.catalogueEntry.nativeRevision || null };
    const meta = read(original(c.id, 'creation.json'));
    for (const n of PUBLISHED) meta.hashes[n] = await hash(work(c.id, n));
    meta.nativeRevision = entry.nativeRevision; metas.push({ id: c.id, meta });
  }
  S.catalogueChange(before, catalogue, cards.map(c => read(work(c.id, 'profile.json'))), bounds);
  const G = require('../../atelier/game-catalog.cjs');
  const oldGame = await G.buildCatalog({ published: before.cards.filter(c => c.kind === 'created') }), game = await G.buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
  assert.equal(game.cards.length, oldGame.cards.length);
  for (const a of oldGame.cards) {
    const b = game.cards.find(c => c.id === a.id), row = cards.find(c => c.id === a.id);
    assert.deepEqual(b, row ? { ...a, atk: row.after.atk, defense: row.after.defense } : a, 'Unintended playable change.');
  }
  assert.equal(await hash(catalogueFile), oldHash, 'Concurrent catalogue publication; retry preflight.');
  return { catalogue, catalogueHash: oldHash, metas, gameCount: game.cards.length };
}
async function publish() {
  assert.equal(process.env.KALISTAR_STATS_PARENT_REVIEWED, '2026-10-01', 'Parent plan and proof review required before publication.');
  return B.locked(async () => {
    const plan = await publicationPlan(), frozen = read(file('before.json')), writes = [], done = [];
    assert(!fs.existsSync(file('catalogue-before-publication.json')), 'Previous transaction exists; inspect it.');
    fs.copyFileSync(catalogueFile, file('catalogue-before-publication.json'), fs.constants.COPYFILE_EXCL);
    for (const { id, meta } of plan.metas) {
      write(work(id, 'creation.json'), meta);
      for (const n of PUBLISHED.concat(['creation.json'])) writes.push({ stage: work(id, n), target: creation(id, n), backup: original(id, n), before: frozen.observed[rel(creation(id, n))] });
    }
    write(file('publication-catalogue.json'), plan.catalogue);
    writes.push({ stage: file('publication-catalogue.json'), target: catalogueFile, backup: file('catalogue-before-publication.json'), before: plan.catalogueHash });
    for (const w of writes) w.after = await hash(w.stage);
    write(file('transaction.json'), { revision: S.REV, state: 'publishing', writes });
    try {
      for (const w of writes) {
        assert.equal(await hash(w.target), w.before, 'Concurrent change: ' + w.target);
        const temp = w.target + '.' + S.REV + '.tmp'; fs.copyFileSync(w.stage, temp, fs.constants.COPYFILE_EXCL);
        assert.equal(await hash(temp), w.after); assert.equal(await hash(w.target), w.before);
        fs.renameSync(temp, w.target); done.push(w); assert.equal(await hash(w.target), w.after);
      }
      await stable(); await match(frozen.sources); await match(frozen.protected); await match(frozen.backups);
      for (const { id } of plan.metas) {
        S.numericOnly(read(original(id, 'profile.json')), read(creation(id, 'profile.json')), bounds);
        assert.equal(await hash(creation(id, 'illustration.png')), frozen.observed[rel(creation(id, 'illustration.png'))]);
      }
      write(file('published.json'), { revision: S.REV, ids: plan.metas.map(m => m.id), changed: writes.map(w => rel(w.target)), gameCount: plan.gameCount, numericOnly: true });
      write(file('transaction.json'), { revision: S.REV, state: 'published', gameCount: plan.gameCount });
      return { published: plan.metas.length, gameCount: plan.gameCount };
    } catch (error) {
      for (const w of done.slice().reverse()) {
        assert.equal(await hash(w.target), w.after, 'External change: automatic rollback refused.'); fs.copyFileSync(w.backup, w.target);
      }
      write(file('transaction.json'), { revision: S.REV, state: 'rolled-back', error: String(error) }); throw error;
    }
  });
}
module.exports = { prepare, guard, render, verify, publicationPlan, publish };
if (require.main === module) {
  const action = process.argv[2] || 'guard', fn = { prepare, guard, render, verify, preflight: publicationPlan, publish }[action]; assert(fn);
  fn(process.argv[3], Number(process.argv[4]) || 6).then(r => console.log(JSON.stringify(action === 'preflight' ? { ready: true, gameCount: r.gameCount } : action === 'guard' ? { frozen: true } : r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
