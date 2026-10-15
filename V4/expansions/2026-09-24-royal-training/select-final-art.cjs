'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs'), M = require('./model.cjs');
async function select() {
  return G.locked(async () => {
    const dest = G.local('attempts/04-final-b-art-selection'), target = G.local('set.json');
    L.assert.ok(!L.fs.existsSync(dest));
    L.assert.ok(!L.fs.existsSync(G.local('cards')) || !G.tree(G.local('cards')).some(f => L.path.basename(f) === 'preparation.json'), 'Selection must precede new-card preparation.');
    const old = L.read(target), cards = Object.entries(M.INPUTS).flatMap(([file, count]) => {
      const input = L.read(G.local(file)); L.assert.equal(input.length, count); return input.map(M.normalize);
    });
    const next = M.validateSet({ schemaVersion: 1, id: M.SET, cards, arenas: [] }, L.read(G.local('baseline/catalogue.json')).cards.map(c => c.id));
    const changes = [];
    for (let i = 0; i < old.cards.length; i++) {
      const a = structuredClone(old.cards[i]), b = structuredClone(next.cards[i]);
      if (a.art !== b.art) changes.push({ key: a.key, before: a.art, after: b.art, sha256: G.digest(G.local(b.art)) });
      delete a.art; delete b.art; L.assert.deepEqual(a, b, 'Non-art change forbidden: ' + a.key);
    }
    L.assert.deepEqual(changes.map(c => c.key).sort(), ['asteran', 'brindor', 'ornelle']);
    const ready = L.read(G.local('art-b/READY-B.json'));
    L.assert.equal(ready.status, 'READY_FOR_NATIVE_COMPOSITION');
    L.fs.mkdirSync(dest, { recursive: true });
    L.fs.copyFileSync(target, L.path.join(dest, 'before-set.json'), L.fs.constants.COPYFILE_EXCL);
    L.fs.copyFileSync(G.local('art-b/READY-B.json'), L.path.join(dest, 'selection.json'), L.fs.constants.COPYFILE_EXCL);
    G.exclusive(L.path.join(dest, 'after-set.json'), next);
    G.exclusive(L.path.join(dest, 'revision.json'), { at: new Date().toISOString(), reason: 'Parent selected the three inward-weapon v2 illustrations. Gameplay and all non-art fields unchanged; no native new-card preparation existed.',
      before: G.digest(target), after: G.digest(L.path.join(dest, 'after-set.json')), changes });
    L.fs.copyFileSync(L.path.join(dest, 'after-set.json'), target);
    return { selected: changes, setHash: G.digest(target) };
  });
}
if (require.main === module) select().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
