'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs');
async function archive() {
  return G.locked(async () => {
    const dest = G.local('attempts/03-solaria-mask-channel'); L.assert.ok(!L.fs.existsSync(dest));
    const keys = ['aelis', 'iliane'], root = L.path.resolve(G.local('revisions')) + L.path.sep;
    const originals = await G.hashes(keys.flatMap(k => G.tree(G.local('revisions/' + k))));
    for (const name of [...require('./solaria.cjs').CODE, 'solaria-photoshop.log', 'solaria-request.json', 'solaria-progress.json']) {
      const src = G.local(name), dst = L.path.join(dest, 'code-and-logs', name);
      if (!L.fs.existsSync(src)) continue;
      L.fs.mkdirSync(L.path.dirname(dst), { recursive: true }); L.fs.copyFileSync(src, dst, L.fs.constants.COPYFILE_EXCL);
    }
    for (const key of keys) {
      const from = L.path.resolve(G.local('revisions/' + key)), to = L.path.resolve(L.path.join(dest, 'revisions', key));
      L.assert.ok(from.startsWith(root) && to.startsWith(dest + L.path.sep));
      L.fs.mkdirSync(L.path.dirname(to), { recursive: true }); L.fs.renameSync(from, to);
    }
    G.exclusive(L.path.join(dest, 'attempt.json'), { status: 'failed-before-export', archivedAt: new Date().toISOString(), keys, originals,
      reason: 'Make-mask used null/class reference instead of the native Nw/Chnl class descriptor. Restore the exact descriptor pattern in momo-bottom/refine-flag-barcode.jsx. No ancestor locks, group masks, shadow kind, opacity or effects change.',
      archiveFiles: await G.hashes(G.tree(dest)) });
  });
}
if (require.main === module) archive().then(() => console.log('Mask attempt archived')).catch(e => { console.error(e); process.exitCode = 1; });
