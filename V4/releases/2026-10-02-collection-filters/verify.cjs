'use strict';
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root}).toString().trim();
const unfinished = ['boot.js', 'story-content.json', 'story-reader.js', 'story-reader.css'];
const committed = new Map(unfinished.map(name => {
  const relative = 'V4/site/' + name;
  return [path.join(root, relative), execFileSync('git', ['show', sha + ':' + relative], {cwd: root})];
}));
const readSync = fs.readFileSync.bind(fs), readAsync = fsp.readFile.bind(fsp);
function overlay(file, options) {
  const bytes = typeof file === 'string' && committed.get(path.resolve(file));
  if (!bytes) return null;
  const encoding = typeof options === 'string' ? options : options?.encoding;
  return encoding ? bytes.toString(encoding) : Buffer.from(bytes);
}
// Exclude unrelated unpublished Story edits in memory; never replace source files.
fs.readFileSync = (file, options) => overlay(file, options) ?? readSync(file, options);
fsp.readFile = async (file, options) => overlay(file, options) ?? readAsync(file, options);
if (process.argv.includes('--build')) {
  process.env.GITHUB_SHA = sha;
  require('../../deploy/build.cjs').build().catch(error => {
    console.error(error); process.exitCode = 1;
  });
} else {
  for (const file of [
    'V4/atelier/game-catalog.test.cjs', 'V4/atelier/collaboration-arenas.test.cjs',
    'V4/deploy/build.test.cjs', 'V4/deploy/pwa.test.cjs', 'V4/site/statistics.test.cjs',
    'V4/site/collaborations.test.cjs', 'V4/site/metal-gear.test.cjs',
    'V4/site/resident-evil.test.cjs', 'V4/site/one-piece.test.cjs'
  ]) require(path.join(root, file));
}
