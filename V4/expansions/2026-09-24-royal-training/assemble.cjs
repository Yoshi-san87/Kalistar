'use strict';
const L = require('../../atelier/lib.cjs'), M = require('./model.cjs'), G = require('./preservation.cjs');
function assemble() {
  const cards = Object.entries(M.INPUTS).flatMap(([file, count]) => {
    const input = L.read(G.local(file)); L.assert.equal(input.length, count); return input.map(M.normalize);
  });
  const original = L.read(G.local('baseline/catalogue.json'));
  const set = M.validateSet({ schemaVersion: 1, id: M.SET, cards, arenas: [] }, original.cards.map(c => c.id));
  for (const c of cards) M.profile(c, require('../../atelier/designer-core.cjs'));
  const target = G.local('set.json');
  if (L.fs.existsSync(target)) L.assert.deepEqual(L.read(target), set, 'Set different : revision explicite requise.');
  else G.exclusive(target, set);
  return { cards: cards.length, ids: cards.map(c => [c.key, c.id]), photoshopRun: false };
}
module.exports = { assemble };
if (require.main === module) { try { console.log(assemble()); } catch (e) { console.error(e); process.exitCode = 1; } }
