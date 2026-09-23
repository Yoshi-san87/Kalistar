'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const { fs, path, ROOT, assert, read, write } = L;
const SOURCES = [
  'V4/collaborations/nier-set-02/assets.cjs', 'V4/collaborations/nier-set-02/preservation.cjs',
  'V4/collaborations/nier-set-02/model.cjs', 'V4/collaborations/ff8-set-01/model.cjs',
  'V4/collaborations/ff8-set-01/build.cjs', 'V4/collaborations/ff8-set-01/publish.cjs',
  'V4/collaborations/nier-pilot-01/build.cjs', 'V4/collaborations/nier-pilot-01/compose-one.jsx',
  'V4/collaborations/nier-pilot-01/typography.jsx', 'V4/collaborations/nier-pilot-01/typography.cjs',
  'V4/collaborations/nier-pilot-01/flag-NieR-packed.png', 'V4/collaborations/nier-pilot-01/faction.json',
  'V4/scripts/stable/common.jsx', 'V4/scripts/stable/registered.jsx', 'V4/scripts/stable/elements-common.jsx',
  'V4/revisions/2026-09-18-branches/bridge.ps1', 'V4/atelier/barcode.py',
  'V3/donnees/regles_demo.json', 'V3/donnees/armes.json'
];
async function capture() {
  const file = path.join(__dirname, 'dependencies.json');
  const guard = require('./preservation.cjs').createGuard(L, D, __dirname);
  await L.protectedCheck(); await require('./assets.cjs').createAssets(L, D).verify();
  if (!fs.existsSync(file)) {
    assert.ok(!fs.existsSync(guard.snapshotFile), 'Ne pas renouveler les dependances apres une capture.');
    const hashes = {};
    for (const source of SOURCES) hashes[source] = await L.hash(path.join(ROOT, source));
    write(file, hashes);
  }
  guard.dependencies();
  const snapshot = guard.freeze();
  return { dependencies: Object.keys(read(file)).length, preservedCreations: snapshot.entries.length,
    preservedFiles: Object.keys(snapshot.files).length, photoshopRun: false, catalogueWritten: false };
}
module.exports = { SOURCES, capture };
if (require.main === module) capture().then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => { console.error(e); process.exitCode = 1; });
