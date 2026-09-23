'use strict';
const SOURCES = [
  'V4/collaborations/nier-set-02/assets.cjs', 'V4/collaborations/ff8-set-01/build.cjs',
  'V4/collaborations/nier-pilot-01/build.cjs', 'V4/collaborations/nier-pilot-01/assets.cjs',
  'V4/collaborations/nier-pilot-01/typography.jsx', 'V4/collaborations/nier-pilot-01/typography.cjs',
  'V4/collaborations/nier-pilot-01/flag-NieR-packed.png', 'V4/collaborations/nier-pilot-01/faction.json',
  'V4/collaborations/nier-pilot-01/components/weapon-Katana.png',
  'V4/collaborations/ff7-set-01/weapon-projectile.png', 'V4/collaborations/ff7-set-01/weapon-email-native.png',
  'V4/collaborations/ff8-set-01/weapon-fleau.png',
  'V4/scripts/stable/common.jsx', 'V4/scripts/stable/registered.jsx', 'V4/scripts/stable/elements-common.jsx',
  'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py',
  'V4/atelier/lib.cjs', 'V4/atelier/designer-core.cjs', 'V4/atelier/designer-render.cjs',
  'V4/atelier/game-catalog.cjs', 'V4/atelier/runner.cjs', 'V4/atelier/worker.jsx', 'V4/site/engine.js',
  'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json',
  'V4/atelier/designer-assets/race-extensions.json', 'V4/atelier/data/references.json',
  'V3/donnees/regles_demo.json', 'V3/donnees/armes.json', 'V3/donnees/cartes.json',
  'V3/assets/revisions-buffs-scenes-20260914/armes/16.png'
];
async function capture(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const home = options.home || __dirname, file = L.path.join(home, 'dependencies.json');
  const guard = require('./preservation.cjs').createGuard(L, D, home);
  await L.protectedCheck(); await (options.R || require('../../atelier/designer-render.cjs')).verifyAssets();
  if (!L.fs.existsSync(file)) {
    L.assert.ok(!L.fs.existsSync(guard.snapshotFile)); const hashes = {};
    for (const source of SOURCES) hashes[source] = await L.hash(L.path.join(L.ROOT, source));
    L.write(file, hashes);
    L.write(L.path.join(home, 'references-before.json'), L.baseline());
  }
  const snapshot = guard.freeze();
  return { preservedCreations: snapshot.entries.length, preservedFiles: Object.keys(snapshot.files).length, photoshopRun: false, catalogueWritten: false };
}
module.exports = { capture, SOURCES };
if (require.main === module) capture().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
