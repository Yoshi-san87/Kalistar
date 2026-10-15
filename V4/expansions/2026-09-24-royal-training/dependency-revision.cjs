'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function solariaSite() {
  const capture = L.read(G.local('capture.json')), file = 'V4/site/collaborations.js';
  const old = 'V4/expansions/2026-09-23-return/dependency-revision-01/after-collaborations.js';
  const beforeHash = await L.hash(L.inside(L.ROOT, old)), afterHash = await L.hash(L.inside(L.ROOT, file));
  L.assert.equal(beforeHash, capture.dependencies[file]); L.assert.notEqual(beforeHash, afterHash);
  L.assert.ok(!L.fs.existsSync(G.local('dependency-revisions.json')));
  const beforeCopy = 'dependency-revisions/01-solaria-site/before.cjs', afterCopy = 'dependency-revisions/01-solaria-site/after.cjs';
  L.fs.mkdirSync(L.path.dirname(G.local(beforeCopy)), { recursive: true });
  for (const [src, dst] of [[old, beforeCopy], [file, afterCopy]]) L.fs.copyFileSync(L.inside(L.ROOT, src), G.local(dst), L.fs.constants.COPYFILE_EXCL);
  G.exclusive(G.local('dependency-revisions.json'), [{ file, beforeHash, afterHash, beforeCopy, afterCopy,
    reason: 'Surcharge Solaria V4 realisee par le parent apres capture ; aucune modification du rendu natif.',
    authorizedBy: 'Message parent 2026-09-24 : OverrideSolaria site fini', recordedAt: new Date().toISOString() }]);
  await G.dependencies(capture); return { revisedDependency: file, beforeHash, afterHash };
}
if (require.main === module) solariaSite().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
