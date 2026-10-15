'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
function assemble(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const home = options.home || __dirname, file = n => L.inside(home, n);
  const inputs = Object.entries(M.INPUTS).map(([name, count]) => {
    const cards = L.read(file(name)); assert.ok(Array.isArray(cards)); assert.equal(cards.length, count, name);
    return cards.map(M.normalize);
  });
  const set = M.validateSet({ schemaVersion: 1, id: M.SET, cards: inputs.flat(), arenas: [], presets: [] });
  const taken = new Set(D.catalogue().cards.map(c => c.id));
  const requests = L.path.join(L.DATA, 'designer/requests');
  if (L.fs.existsSync(requests)) for (const name of L.fs.readdirSync(requests).filter(n => n.endsWith('.json'))) taken.add(L.read(L.path.join(requests, name)).modelId);
  const existing = L.fs.existsSync(file('set.json')) ? L.read(file('set.json')) : null;
  if (existing) { assert.deepEqual(existing, set, 'Set assemble different : ne pas remplacer une preparation.'); return set; }
  for (const c of set.cards) {
    assert.ok(!taken.has(c.id), 'Collision ID : ' + c.key + ' / ' + c.id);
    assert.ok(!L.fs.existsSync(L.path.join(L.ROOT, 'V4/creations', c.id)), 'Cible deja presente.');
    M.profile(c, D);
  }
  L.write(file('set.json'), set); return set;
}
module.exports = { assemble };
if (require.main === module) { try { const set = assemble(); console.log(JSON.stringify({ cards: set.cards.map(c => ({ key: c.key, id: c.id, legacyId: c.legacyId })), published: false }, null, 2)); } catch (e) { console.error(e); process.exitCode = 1; } }
