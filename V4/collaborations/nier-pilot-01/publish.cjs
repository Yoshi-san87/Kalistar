'use strict';
const shared = require('../ff8-set-01/publish.cjs');
function createPublisher(options = {}) {
  return shared.createPublisher({ ...options, home: options.home || __dirname, model: require('./model.cjs'), setId: 'nier-pilot-01', faction: 'NieR', arenas: [] });
}
module.exports = { createPublisher };
if (require.main === module) shared.main(process.argv.slice(2), createPublisher()).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
