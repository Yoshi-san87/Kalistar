'use strict';
const shared = require('../ff8-set-01/publish.cjs');
function createPublisher(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs'), D = options.D || require('../../atelier/designer-core.cjs');
  const home = options.home || __dirname, guard = require('./preservation.cjs').createGuard(L, D, home);
  const guardedL = { ...L, write(file, value) {
    if (L.path.resolve(file) === L.path.resolve(D.CATALOGUE)) {
      guard.publication(); guard.assertExisting(undefined, value);
    }
    return L.write(file, value);
  } };
  const publisher = shared.createPublisher({ ...options, L: guardedL, D, home,
    model: require('./model.cjs'), setId: 'nier-simone-03', faction: 'NieR', arenas: [] });
  async function run(action) {
    guard.publication();
    const result = await publisher[action]();
    guard.publication(); return result;
  }
  return { preflight: () => run('preflight'), publish: () => run('publish') };
}
module.exports = { createPublisher };
if (require.main === module) shared.main(process.argv.slice(2), createPublisher())
  .then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
