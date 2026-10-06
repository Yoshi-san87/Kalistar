'use strict';
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const base = 'https://yoshi-san87.github.io/Kalistar/';
const tag = 'v4.5.24';
const git = args => execFileSync('git', args, {cwd:root, maxBuffer:8*1024*1024});
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function get(file) {
  const response = await fetch(base + file + '?release4524=' + Date.now(), {signal:AbortSignal.timeout(60000)});
  assert.equal(response.status, 200, file);
  return response;
}
async function main() {
  const sha = git(['rev-parse', tag + '^{commit}']).toString().trim();
  const release = await (await get('release.json')).json();
  assert.equal(release.version, sha.slice(0,12));
  assert.equal(release.cards, 214);
  const html = await (await get('jeu/index.html')).text();
  assert(html.includes('Kalistar V4.5.24'));
  assert(html.includes('VERSION 4.5.24'));
  assert(html.includes('boot.js?v=' + release.version));
  assert((await (await get('jeu/v4.css')).text()).includes("content:'V4.5.24'"));
  const catalogue = await (await get('jeu/catalogue.json')).json();
  const card = catalogue.cards.find(c => c.id === '49900602');
  assert(card, 'Draust missing from public catalogue');
  assert.equal(card.characterId, 'draust-kalistar');
  assert.deepEqual(card.positions, [1]);
  assert.equal(card.atk[5], 'guard');
  const file = 'media/created/49900602.png';
  const png = Buffer.from(await (await get(file)).arrayBuffer());
  const committed = git(['show', tag + ':V4/creations/49900602/card.png']);
  const pointer = committed.length < 1024 && committed.toString().match(/^version https:\/\/git-lfs.github.com\/spec\/v1\r?\noid sha256:([a-f0-9]{64})/);
  assert.equal(hash(png), pointer ? pointer[1] : hash(committed));
  assert.equal(hash(png), release.assets.find(a => a.path === file).sha256);
  console.log(JSON.stringify({passed:true, version:'4.5.24', commit:sha, cards:release.cards,
    model:card.id, pngSha256:hash(png), url:base + 'jeu/#collection'}, null, 2));
}
main().catch(error => {console.error(error);process.exitCode=1;});
