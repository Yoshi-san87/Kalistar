'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs'), M = require('./model.cjs');
const R = require('../../atelier/designer-render.cjs'), { cropArt, ART } = require('./geometry.cjs');
const { PRIOR } = require('./scope.cjs'), { fs, path, assert, sharp } = L;
const CODE = ['solaria.cjs', 'solaria.jsx', 'geometry.cjs', 'model.cjs', 'scope.cjs', 'preservation.cjs'];
function select(keys) {
  const all = L.read(G.local('baseline/revisions.json')), wanted = keys?.split(',');
  const items = all.filter(c => c.kind === 'flag' && (!wanted || wanted.includes(c.key))); assert.ok(items.length);
  if (wanted) assert.equal(items.length, new Set(wanted).size); return items;
}
const dir = key => G.local('revisions/' + key);
async function preparation(key) {
  const p = L.read(path.join(dir(key), 'preparation.json'));
  assert.equal(p.referenceId, L.baseline().id); assert.equal(p.captureHash, G.digest(G.local('capture.json')));
  await G.unchanged(p.inputs); await G.unchanged(p.generated); return p;
}
async function prepare(keys) {
  return G.locked(async () => {
    await G.stable(); const results = [];
    for (const item of select(keys)) {
      const out = dir(item.key); assert.ok(!fs.existsSync(out), 'Revision deja preparee : archiver avant une nouvelle tentative.');
      const input = item.art ? G.local(item.art) : item.kind === 'zoom' ? L.inside(L.ROOT, PRIOR + '/cards/' + item.key + '/illustration.png') : null;
      if (input) assert.ok(fs.existsSync(input));
      const inputs = await G.hashes([...CODE.map(G.local), ...G.dependencyInputs(), ...Object.keys(item.originalHashes).map(f => L.inside(L.ROOT, f)),
        ...(input ? [input] : [G.local('audit/solaria.json')])]);
      await G.unchanged(item.originalHashes);
      fs.mkdirSync(path.join(out, 'originals'), { recursive: true });
      for (const [label, src] of [['card.psd', item.entry.psd], ['card.png', item.entry.png]])
        fs.copyFileSync(L.inside(L.ROOT, src), path.join(out, 'originals', label), fs.constants.COPYFILE_EXCL);
      G.exclusive(path.join(out, 'originals/profile.json'), item.entry.profile);
      if (input) {
        fs.copyFileSync(input, path.join(out, 'illustration.png'), fs.constants.COPYFILE_EXCL);
        await sharp(await cropArt(sharp, input, item.crop || { zoom: 1, x: 0, y: 0 })).png().toFile(path.join(out, 'component-art.png'));
      }
      const layers = item.kind === 'flag' ? ['FACTION - CONTENU', 'OMBRE - CONTENU'] : [item.reference?.artworkLayer || 'ILLUSTRATION - cadrage'];
      const plan = { key: item.key, id: item.entry.id, kind: item.kind, work: out, original: path.join(out, 'originals/card.psd'), layers,
        allowed: item.kind === 'flag' ? [[663, 997, 789, 1036]] : [[ART.left, ART.top, ART.left + ART.width, ART.top + ART.height]],
        ...(item.crop ? { crop: item.crop } : {}) };
      G.exclusive(path.join(out, 'plan.json'), plan);
      const generated = await G.hashes(G.tree(out)); await G.unchanged(inputs);
      G.exclusive(path.join(out, 'preparation.json'), { referenceId: L.baseline().id, captureHash: G.digest(G.local('capture.json')), inputs, generated });
      results.push(item.key);
    }
    await G.stable(); return { prepared: results, photoshopRun: false };
  });
}
async function render(keys, { nativeAuthorized = false } = {}) {
  assert.equal(nativeAuthorized, true, 'Feu vert Photoshop explicite requis.');
  return G.locked(async () => {
    await G.stable(); const items = select(keys), plans = [];
    for (const item of items) {
      await preparation(item.key);
      assert.ok(!fs.existsSync(path.join(dir(item.key), 'card.psd')) && !fs.existsSync(path.join(dir(item.key), 'card.png')), 'Rendu existant.');
      plans.push(L.read(path.join(dir(item.key), 'plan.json')));
    }
    L.write(G.local('solaria-request.json'), { items: plans });
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(L.ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', G.local('solaria.jsx')], G.local('solaria-photoshop.log'));
    for (const item of items) await preparation(item.key); await G.stable(); return { rendered: items.map(i => i.key), output };
  });
}
function invariantLayers(before, after, names) {
  assert.equal(before.length, after.length, 'Calques ajoutes ou supprimes.');
  const paths = before.filter(l => names.includes(l.name)).map(l => l.path);
  assert.equal(paths.length, names.length, 'Calque cible ambigu.');
  for (let i = 0; i < before.length; i++) {
    const a = structuredClone(before[i]), b = structuredClone(after[i]);
    // Only the edited layer and its ancestor group bounds can respond to the new content/mask.
    if (paths.some(p => p === a.path || p.startsWith(a.path + '/'))) { delete a.bounds; delete b.bounds; }
    assert.deepEqual(a, b, 'Calque non invariant : ' + a.path);
  }
}
async function verify(keys) {
  return G.locked(async () => {
    await G.stable(); const results = [];
    for (const item of select(keys)) {
      await preparation(item.key); const out = dir(item.key), plan = L.read(path.join(out, 'plan.json')), n = L.read(path.join(out, 'native.json'));
      assert.ok(!fs.existsSync(path.join(out, 'verification.json')), 'Preuve deja presente.');
      assert.deepEqual([n.width, n.height, n.resolution], [897, 1497, 300]);
      invariantLayers(n.before, n.after, plan.layers); assert.deepEqual(n.after, n.reopened);
      assert.deepEqual(n.textsBefore, n.textsAfter); assert.deepEqual(n.textsAfter, n.textsReopened);
      for (const layer of plan.layers) {
        const before = n.before.find(l => l.name === layer);
        if (layer === 'OMBRE - CONTENU') { assert.equal(before.kind, 'LayerKind.NORMAL'); assert.equal(n.embedded[layer], false); }
        else { assert.equal(before.kind, 'LayerKind.SMARTOBJECT'); assert.equal(n.embedded[layer], true); }
      }
      assert.deepEqual(M.gameplay(L.read(path.join(out, 'originals/profile.json'))), M.gameplay(item.entry.profile));
      const original = await L.diff(path.join(out, 'originals/card.png'), path.join(out, 'before-card.png')); assert.equal(original.changed, 0, 'Le PSD source ne restitue pas le PNG approuve.');
      const visual = await L.diff(path.join(out, 'before-card.png'), path.join(out, 'card.png'), plan.allowed);
      assert.ok(visual.changed > 0); assert.equal(visual.outside, 0, 'Pixels modifies hors region autorisee.');
      const isolated = await L.diff(path.join(out, 'before-without-edits.png'), path.join(out, 'after-without-edits.png')); assert.equal(isolated.changed, 0, 'Autre composant modifie.');
      const roundtrip = await L.diff(path.join(out, 'card.png'), path.join(out, 'reopened.png')); assert.equal(roundtrip.changed, 0);
      const barcode = JSON.parse(await R.command(L.PYTHON, [path.join(L.ROOT, 'V4/atelier/barcode.py'), path.join(out, 'card.png'), item.entry.id])); assert.equal(barcode.passed, true);
      const report = { passed: true, key: item.key, id: item.entry.id, referenceId: L.baseline().id,
        original, visual, isolated, roundtrip, barcode, invariantTexts: n.textsBefore.length, allowedLayers: plan.layers,
        preparationHash: G.digest(path.join(out, 'preparation.json')), nativeFiles: await G.hashes(['native.json', 'card.psd', 'card.png', 'reopened.png', 'before-card.png', 'before-without-edits.png', 'after-without-edits.png'].map(f => path.join(out, f))) };
      await preparation(item.key); G.exclusive(path.join(out, 'verification.json'), report); results.push(report);
    }
    await G.stable(); return { verified: results.length, keys: results.map(r => r.key) };
  });
}
module.exports = { CODE, prepare, render, verify, preparation, invariantLayers };
if (require.main === module) {
  const args = process.argv.slice(2), [action, keys] = args.filter(a => a !== '--native-authorized');
  assert.ok(['prepare', 'render', 'verify'].includes(action));
  ({ prepare, render, verify })[action](keys, { nativeAuthorized: args.includes('--native-authorized') }).then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
}
