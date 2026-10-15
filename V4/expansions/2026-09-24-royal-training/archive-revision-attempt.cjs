'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function archive() {
  const dest = G.local('attempts/01-mixed-text-inspection'); L.assert.ok(!L.fs.existsSync(dest));
  const keys = ['darnako', 'ruby'], root = L.path.resolve(G.local('revisions')) + L.path.sep;
  const copies = [...require('./revisions.cjs').CODE, 'revision-photoshop.log', 'revision-request.json', 'revision-progress.json', 'audit/native-text-diagnostic.json'];
  const originals = await G.hashes(keys.flatMap(k => G.tree(G.local('revisions/' + k))));
  for (const name of copies) {
    const input = G.local(name), output = L.path.join(dest, 'code-and-logs', name);
    if (!L.fs.existsSync(input)) continue; L.fs.mkdirSync(L.path.dirname(output), { recursive: true });
    L.fs.copyFileSync(input, output, L.fs.constants.COPYFILE_EXCL);
  }
  for (const key of keys) {
    const from = L.path.resolve(G.local('revisions/' + key)), to = L.path.resolve(L.path.join(dest, 'revisions', key));
    L.assert.ok(from.startsWith(root) && to.startsWith(dest + L.path.sep));
    L.fs.mkdirSync(L.path.dirname(to), { recursive: true }); L.fs.renameSync(from, to);
  }
  G.exclusive(L.path.join(dest, 'attempt.json'), { status: 'failed-before-export', archivedAt: new Date().toISOString(), keys, originals,
    reason: 'TextItem.font/tracking/capitalization unavailable for old mixed-style legend layers DEF and A T K. Preserve native textStyleRange descriptors instead of assuming uniform TextItem properties.',
    archiveFiles: await G.hashes(G.tree(dest)) });
  return { archived: keys, dest };
}
if (require.main === module) archive().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
