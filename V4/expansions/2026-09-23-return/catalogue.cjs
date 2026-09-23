'use strict';
// Evaluate the unchanged catalogue module with one scoped, read-only prospective
// reference file. This avoids temporarily replacing the real production lock.
const vm = require('node:vm');
const { createRequire } = require('node:module');
async function prospective(L, references, published) {
  const source = L.path.join(L.ROOT, 'V4/atelier/game-catalog.cjs'), req = createRequire(source), mod = { exports: {} };
  const io = req('node:fs/promises'), target = L.path.join(L.DATA, 'references.json');
  const localRequire = name => name === 'node:fs/promises' ? { ...io, readFile(file, ...args) {
    if (L.path.resolve(file) === L.path.resolve(target)) return Promise.resolve(JSON.stringify(references));
    return io.readFile(file, ...args);
  } } : req(name);
  vm.compileFunction(L.fs.readFileSync(source, 'utf8'), ['require', 'module', 'exports', '__dirname'], { filename: source })(localRequire, mod, mod.exports, L.path.dirname(source));
  return mod.exports.buildCatalog({ published });
}
module.exports = { prospective };
