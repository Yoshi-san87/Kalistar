'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
const { BANK, REVISIONS } = require('./scope.cjs');
const SOURCES = [...require('../2026-09-23-return/capture.cjs').SOURCES,
  'V3/donnees/elements.json', 'V4/atelier/designer-barcode.py', 'V4/donnees/catalogue.json',
  'V4/donnees/arenes-collaborations.json', 'V4/site/collaborations.js',
  'V4/expansions/2026-09-23-return/catalogue.cjs',
  'V4/expansions/2026-09-23-return/typography.cjs',
  'V4/expansions/2026-09-23-return/typography-calibration.json',
  'V4/expansions/2026-09-23-return/typography-calibration-native.json',
  'V4/expansions/2026-09-23-return/typography-calibration-request.json'];
async function capture() {
  const { fs, path, assert } = L;
  if (fs.existsSync(G.local('capture.json'))) { await G.stable(); return { reused: true }; }
  await L.protectedCheck(); await require('../../atelier/designer-render.cjs').verifyAssets();
  const catalogue = require('../../atelier/designer-core.cjs').catalogue(), references = L.baseline();
  assert.equal(references.cards.length, 38); assert.equal(catalogue.cards.length, 80);
  const originals = REVISIONS.map(spec => {
    const entry = catalogue.cards.find(c => spec.id ? c.id === spec.id : c.key === spec.key); assert.ok(entry, spec.key);
    const reference = references.cards.find(c => c.card.id === entry.id);
    return { ...spec, entry, ...(reference ? { reference } : {}), originalHashes: null };
  });
  for (const item of originals) item.originalHashes = await G.hashes([item.entry.psd, item.entry.png,
    ...(item.reference ? [item.reference.profile] : ['V4/creations/' + item.id + '/profile.json', 'V4/creations/' + item.id + '/illustration.png'])].map(f => L.inside(L.ROOT, f)));
  const bank = L.read(path.join(L.ROOT, BANK, 'manifest.json'));
  const sources = [...SOURCES, ...Object.keys(bank.hashes).map(f => BANK + '/' + f), ...Object.keys(references.protectedFiles)];
  const dependencies = await G.hashes(sources.map(f => L.inside(L.ROOT, f)));
  const createdFiles = await G.hashes(catalogue.cards.filter(c => c.kind === 'created').flatMap(c => G.tree(path.join(L.ROOT, 'V4/creations', c.id))));
  const copies = [['V4/atelier/data/references.json', 'references.json'], [BANK + '/manifest.json', 'manifest.json'], [BANK + '/manifest.raw.json', 'manifest.raw.json']];
  fs.mkdirSync(G.local('baseline'), { recursive: true });
  for (const [src, dest] of copies) fs.copyFileSync(L.inside(L.ROOT, src), G.local('baseline/' + dest), fs.constants.COPYFILE_EXCL);
  G.exclusive(G.local('baseline/catalogue.json'), catalogue);
  G.exclusive(G.local('baseline/revisions.json'), originals);
  G.exclusive(G.local('capture.json'), { schemaVersion: 1, referenceId: references.id, capturedAt: new Date().toISOString(),
    counts: { cards: 80, approved: 38, created: 42 }, dependencies, createdFiles,
    snapshots: await G.hashes(G.tree(G.local('baseline'))), photoshopRun: false });
  await G.stable(); return { preserved: catalogue.cards.length, dependencies: Object.keys(dependencies).length, photoshopRun: false };
}
module.exports = { capture, SOURCES };
if (require.main === module) capture().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
