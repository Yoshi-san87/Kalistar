'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const {createRequire} = require('node:module');
const {compileFunction} = require('node:vm');
const ROOT = path.resolve(__dirname, '../../..');
const relative = 'V4/deploy/build.cjs';
const filename = path.join(ROOT, relative);
const unfinished=['V4/site/boot.js','V4/site/story-content.json','V4/site/story-reader.js','V4/site/story-reader.css'];
const git = (...args) => execFileSync('git', args, {cwd: ROOT});

async function main() {
  // Build the committed runtime without modifying the user's unfinished cache work.
  const sha = git('rev-parse', 'HEAD').toString().trim();
  const source = git('show', sha + ':' + relative).toString();
  const committed = new Map(unfinished.map(relative=>[path.resolve(ROOT,relative),git('show',sha+':'+relative)]));
  const realRequire = createRequire(filename);
  const readOnlyOverlay = {...fs, async readFile(file, options) {
    if (typeof file === 'string' && committed.has(path.resolve(file))) {
      const bytes=committed.get(path.resolve(file));
      const encoding = typeof options === 'string' ? options : options?.encoding;
      return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
    }
    return fs.readFile(file, options);
  }};
  const requireFromCommit = name => name === 'node:fs/promises' ? readOnlyOverlay : realRequire(name);
  const module = {exports: {}};
  const run = compileFunction(source, ['exports', 'require', 'module', '__filename', '__dirname'], {filename});
  run(module.exports, requireFromCommit, module, filename, path.dirname(filename));
  process.env.GITHUB_SHA = sha;
  const manifest = await module.exports.build();
  return {commit: sha, cards: manifest.cards, files: manifest.assets.length, committedRuntime: true};
}

if (require.main === module) main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
  console.error(error); process.exitCode = 1;
});
module.exports = {main};
