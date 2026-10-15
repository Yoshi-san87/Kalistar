'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const base = 'https://yoshi-san87.github.io/Kalistar/';
async function get(relative) {
  const response = await fetch(base+relative+'?release450='+Date.now(), {signal:AbortSignal.timeout(60000)});
  assert.equal(response.status, 200, relative);
  return response;
}
async function main() {
  assert(process.env.KALISTAR_RELEASE_DIST, 'Provide the isolated commit build, not the shared working-tree build');
  const dist = path.resolve(process.env.KALISTAR_RELEASE_DIST);
  const local = JSON.parse(fs.readFileSync(path.join(dist, 'release.json'), 'utf8'));
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd:root, encoding:'utf8'}).trim();
  assert.equal(local.version, sha.slice(0,12));
  const remote = await (await get('release.json')).json();
  assert.deepEqual(remote, local, 'complete public manifest must match the release commit');
  const assets = new Map(remote.assets.map(a => [a.path, a]));
  const samples = ['jeu/lineup-intro.js', 'jeu/lineup-intro.css', 'jeu/boot.js',
    'jeu/app.js', 'jeu/v4.css', 'jeu/assets/back.webp', 'jeu/assets/navigation/arena-v1.webp'];
  for (const relative of samples) {
    assert(assets.has(relative), relative);
    const bytes = Buffer.from(await (await get(relative)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), assets.get(relative).sha256, relative);
  }
  const html = await (await get('jeu/index.html')).text();
  assert.match(html, /<title>Kalistar V4\.5\.0/);
  assert.match(html, /VERSION 4\.5\.0/);
  assert(html.includes('lineup-intro.css?v='+remote.version));
  assert(!html.includes('weapon-cards.css'));
  const css = await (await get('jeu/v4.css')).text();
  assert(css.includes("content:'V4.5.0'"));
  const catalogue = await (await get('jeu/catalogue.json')).json();
  assert.deepEqual(catalogue, JSON.parse(fs.readFileSync(path.join(dist, 'jeu/catalogue.json'), 'utf8')));
  console.log(JSON.stringify({passed:true, version:'4.5.0', commit:sha, cards:remote.cards,
    assets:remote.assets.length, matchingSamples:samples.length, url:base+'jeu/'}, null, 2));
}
main().catch(error => {console.error(error);process.exitCode=1;});
