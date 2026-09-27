'use strict';
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const { fs, path, ROOT, hash } = L;
const files = [
  'V4/collaborations/ff8-set-01/flag-FF8-packed.png',
  'V4/collaborations/ff8-set-01/build.cjs',
  'V4/collaborations/nier-pilot-01/build.cjs',
  'V4/collaborations/nier-pilot-01/typography.cjs',
  'V4/collaborations/nier-pilot-01/typography.jsx',
  'V4/scripts/stable/elements-common.jsx',
  'V4/template-stable/icon-layouts.json',
  'V4/atelier/designer-render.cjs', 'V4/atelier/designer-core.cjs', 'V4/atelier/lib.cjs',
  'V4/atelier/game-catalog.cjs', 'V4/site/engine.js', 'V4/site/collaborations.js',
  'V3/donnees/regles_demo.json', 'V3/donnees/armes.json'
];
async function main(args = process.argv.slice(2)) {
  assert.deepEqual(args, ['--after-parent-go'], 'Gel interdit avant validation parent des icones et des revisions existantes.');
  const target = path.join(__dirname, 'dependencies.json');
  await L.protectedCheck(); await require('../../atelier/designer-render.cjs').verifyAssets();
  await require('./assets.cjs').createAssets(L,__dirname).verify();
  if (!fs.existsSync(target)) {
    const values = {}; for (const file of files) values[file] = await hash(path.join(ROOT,file));
    fs.writeFileSync(target, JSON.stringify(values,null,2)+'\n', { flag: 'wx' });
  }
  const guard = require('./preservation.cjs').createGuard(L,D,__dirname);
  const snapshot = guard.freeze();
  return { existingCreated: snapshot.entries.length, existingFiles: Object.keys(snapshot.files).length, referenceId: snapshot.referenceId };
}
module.exports = { main, files };
if (require.main === module) main().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode=1; });
