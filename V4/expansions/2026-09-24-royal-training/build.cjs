'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const M = require('./model.cjs'), A = require('./assets.cjs'), G = require('./preservation.cjs'), T = require('./typography.cjs');
const { cropArt } = require('./geometry.cjs'), { fs, path, assert, sharp } = L;
const CODE = ['build.cjs', 'model.cjs', 'assets.cjs', 'geometry.cjs', 'preservation.cjs', 'scope.cjs', 'compose.jsx',
  'typography.cjs', 'calibrate-typography.cjs', 'calibrate-typography.jsx'];
const folder = key => G.local('cards/' + key);
function set() {
  const value = M.validateSet(L.read(G.local('set.json')), L.read(G.local('baseline/catalogue.json')).cards.map(c => c.id));
  assert.deepEqual(value.cards, Object.keys(M.INPUTS).flatMap(n => L.read(G.local(n)).map(M.normalize)), 'Assembler la revision explicite des profils.');
  return value;
}
function select(key) { const result = set().cards.filter(c => !key || c.key === key); assert.ok(result.length, 'Carte inconnue.'); return result; }
function artEvidence(c) {
  if (c.art.startsWith('art-a/')) {
    const file = G.local('art-a/selection.json'), selection = L.read(file);
    assert.equal(selection.readyForNativePreparation, true);
    const selected = selection.cards.find(p => p.key === c.key); assert.ok(selected);
    assert.equal(selected.file, c.art); assert.equal(G.digest(G.local(c.art)), selected.sha256);
    assert.deepEqual(selected.crop, c.crop);
    const request = selected.request ? G.local(selected.request.file) : null;
    if (request) assert.equal(G.digest(request), selected.request.sha256);
    return [file, ...(request ? [request] : [])];
  }
  const file = G.local('art-b/READY-B.json'), selection = L.read(file);
  assert.equal(selection.status, 'READY_FOR_NATIVE_COMPOSITION'); assert.equal(selection.parentSelectionApproved, true);
  const selected = selection.selections.find(p => p.key === c.key); assert.ok(selected);
  assert.equal(selected.art, G.relative(G.local(c.art))); assert.equal(G.digest(G.local(c.art)), selected.sha256);
  assert.deepEqual(selection.crop, c.crop);
  const provenanceFile = L.inside(L.ROOT, selection.provenance); assert.equal(G.digest(provenanceFile), selection.provenanceSha256);
  const provenance = L.read(provenanceFile), evidence = [...provenance.editRevisions, ...provenance.artworks].find(p => p.key === c.key && p.selected === selected.art);
  assert.ok(evidence); const request = L.inside(L.ROOT, evidence.requestFile); assert.equal(G.digest(request), evidence.requestFileSha256);
  return [file, provenanceFile, request];
}
function sources(c) {
  return [...CODE, 'capture.json', 'typography-calibration.json', 'typography-calibration-native.json', 'typography-calibration-request.json']
    .map(G.local).concat(Object.keys(L.read(G.local('capture.json')).dependencies).map(f => L.inside(L.ROOT, f)),
      Object.keys(T.loadCalibration().inputs).map(f => L.inside(L.ROOT, f)), A.inputs(c), G.local(c.art), artEvidence(c), G.dependencyInputs());
}
async function game() {
  const old = L.read(G.local('baseline/catalogue.json')), refs = L.read(G.local('baseline/references.json'));
  const additions = set().cards.map(c => ({ id: c.id, profile: M.profile(c, D), pngUrl: '/media/created/' + c.id + '.png' }));
  const data = await require('../2026-09-23-return/catalogue.cjs').prospective(L, refs, [...old.cards.filter(c => c.kind === 'created'), ...additions]);
  const engine = require('../../site/engine.js').createEngine(data);
  assert.equal(data.cards.length, 89); assert.equal(data.arenas.length, 23);
  for (const c of additions) {
    const actual = data.cards.find(p => p.id === c.id);
    for (const key of [...M.PRINTED, 'id', 'role', 'characterId']) assert.deepEqual(actual[key], c.profile[key]);
    for (const version of data.cards.filter(p => p.id !== c.id && p.characterId === c.profile.characterId))
      assert.ok(engine.validateDeck([version.id, c.id]).some(message => /personnage/i.test(message)), 'Versions cumulables.');
  }
  return data;
}
async function check(key) {
  const cards = select(key); await G.stable(); await game();
  cards.forEach(c => { M.profile(c, D); artEvidence(c); });
  const required = cards.flatMap(c => [G.local(c.art), ...A.inputs(c)]);
  return { cards: cards.length, ids: cards.map(c => c.id), missing: [...new Set(required)].filter(f => !fs.existsSync(f)), photoshopRun: false };
}
async function prepare(key) {
  return G.locked(async () => {
    assert.deepEqual((await check(key)).missing, []); T.loadCalibration();
    const prepared = [];
    for (const c of select(key)) {
      await A.verify(c); const dir = folder(c.key), render = path.join(dir, 'render');
      assert.ok(!fs.existsSync(path.join(dir, 'preparation.json')) && !fs.existsSync(path.join(dir, 'profile.json')), 'Dossier deja prepare : archiver une tentative explicite.');
      const inputHashes = await G.hashes(sources(c)), p = M.profile(c, D), donor = M.donor(c, D);
      fs.mkdirSync(render, { recursive: true }); G.exclusive(path.join(dir, 'spec.json'), c); G.exclusive(path.join(dir, 'profile.json'), p);
      fs.copyFileSync(G.local(c.art), path.join(dir, 'illustration.png'), fs.constants.COPYFILE_EXCL);
      const layers = A.apply(await R.components(donor, { id: c.id, positionsText: true }), c);
      layers[0] = { ...layers[0], input: await cropArt(sharp, G.local(c.art), c.crop) };
      await sharp(await R.composite(layers)).composite(await T.preview(donor, R)).png().toFile(path.join(dir, 'preview.png'));
      const active = layers.filter(l => !l.name.startsWith('POSITION SLOT '));
      const plan = { textSource: G.relative(G.local('revisions/ruby/originals/card.psd')), layers: [], hiddenLayers: [] };
      for (const [i, l] of active.entries()) {
        const file = 'component-' + String(i).padStart(2, '0') + '.png'; await sharp(l.input).png().toFile(path.join(render, file));
        plan.layers.push({ file, name: l.name, left: l.left, top: l.top, width: l.width, height: l.height });
      }
      G.exclusive(path.join(render, 'composition.json'), plan);
      await sharp(await R.composite(active)).png().toFile(path.join(render, 'expected-components.png'));
      const generated = [path.join(dir, 'spec.json'), path.join(dir, 'profile.json'), path.join(dir, 'illustration.png'),
        path.join(render, 'composition.json'), path.join(render, 'expected-components.png'), ...plan.layers.map(l => path.join(render, l.file))];
      assert.deepEqual(await G.hashes(sources(c)), inputHashes);
      G.exclusive(path.join(dir, 'preparation.json'), { schemaVersion: 1, referenceId: L.baseline().id,
        captureHash: G.digest(G.local('capture.json')), inputs: inputHashes, generated: await G.hashes(generated) });
      prepared.push(c.key);
    }
    await G.stable(); return { prepared, photoshopRun: false };
  });
}
async function prepared(c) {
  await G.preparation(c.key); assert.deepEqual(L.read(path.join(folder(c.key), 'spec.json')), c, 'Profil normalise modifie.');
}
async function render(key, { nativeAuthorized = false } = {}) {
  assert.equal(nativeAuthorized, true, 'Feu vert Photoshop explicite requis.');
  return G.locked(async () => {
    await G.stable(); const cards = select(key);
    for (const c of cards) {
      await prepared(c);
      assert.ok(!fs.existsSync(path.join(folder(c.key), 'card.psd')) && !fs.existsSync(path.join(folder(c.key), 'card.png')), 'Rendu deja present : revision explicite requise.');
    }
    L.write(G.local('render-request.json'), { keys: cards.map(c => c.key) });
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(L.ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', G.local('compose.jsx')], G.local('photoshop.log'));
    for (const c of cards) await prepared(c); await G.stable(); return { rendered: cards.map(c => c.key), output };
  });
}
async function verify(key) {
  return G.locked(async () => {
    await G.stable(); const results = [];
    for (const c of select(key)) {
      await prepared(c); const dir = folder(c.key), p = L.read(path.join(dir, 'profile.json')); assert.deepEqual(p, M.profile(c, D));
      const existing = path.join(dir, 'verification.json');
      if (fs.existsSync(existing)) {
        const proof = L.read(existing); assert.equal(proof.preparationHash, G.digest(path.join(dir, 'preparation.json')));
        for (const [f, h] of Object.entries(proof.hashes)) assert.equal(await L.hash(path.join(dir, f)), h);
        await G.unchanged(proof.nativeFiles); results.push(proof); continue;
      }
      const native = L.read(path.join(dir, 'render/native.json')); T.verify(native);
      const proof = await require('../../collaborations/nier-pilot-01/build.cjs').verifyNative(dir, p);
      let none = null;
      if (p.element === 'NONE') none = await require('../../collaborations/ff8-set-01/build.cjs').createBuilder().noneProof(dir, L.read(path.join(dir, 'render/composition.json')), A.manifest());
      await prepared(c);
      const result = { ...proof, key: c.key, ...(none ? { none } : {}), preparationHash: G.digest(path.join(dir, 'preparation.json')),
        nativeFiles: await G.hashes(['native.json', 'reopened.png', 'without-text.png'].map(f => path.join(dir, 'render', f))) };
      G.exclusive(existing, result); results.push(result);
    }
    await game(); await G.stable(); return { verified: results.length, keys: results.map(r => r.key) };
  });
}
function createBuilder() { return { check, prepare, render, verify, game, stable: G.stable, locked: G.locked, sources }; }
module.exports = { CODE, createBuilder, check, prepare, render, verify, game, sources };
if (require.main === module) {
  const args = process.argv.slice(2), [action = 'check', key] = args.filter(a => a !== '--native-authorized');
  assert.ok(['check', 'prepare', 'render', 'verify'].includes(action)); assert.ok(args.filter(a => a !== '--native-authorized').length <= 2);
  ({ check, prepare, render, verify })[action](key, { nativeAuthorized: args.includes('--native-authorized') }).then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
}
