'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../..');
const dist = path.join(root, 'V4/deploy/dist');
const base = 'https://yoshi-san87.github.io/Kalistar/';
async function get(relative) {
  const response = await fetch(base + relative + '?release44=' + Date.now(), {
    signal: AbortSignal.timeout(60000)
  });
  assert.equal(response.status, 200, relative);
  return response;
}
async function main() {
  const local = JSON.parse(fs.readFileSync(path.join(dist, 'release.json'), 'utf8'));
  const sha = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: root}).toString().trim();
  assert.equal(local.version, sha.slice(0, 12), 'build must use the published commit');
  const remote = await (await get('release.json')).json();
  assert.deepEqual(remote, local, 'public build must match every release asset');
  assert.equal(remote.cards, 193);
  const assets = new Map(remote.assets.map(asset => [asset.path, asset]));
  const samples = ['media/reference/reevus.png', 'media/created/40976482.png',
    'jeu/assets/ui/captain-crown-v1.webp', 'jeu/assets/ui/flail-white-v1.png',
    'jeu/assets/equipment/fallen-king-axe-v2.webp', 'jeu/assets/equipment/little-joys-flute-v2.webp'];
  for (const relative of samples) {
    assert.ok(assets.has(relative), relative + ' in release manifest');
    const bytes = Buffer.from(await (await get(relative)).arrayBuffer());
    assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), assets.get(relative).sha256, relative);
  }
  const html = await (await get('jeu/index.html')).text();
  assert.match(html, /<title>Kalistar V4\.4\.0/);
  assert.match(html, /VERSION 4\.4\.0/);
  assert.ok(html.includes('?v=' + remote.version), 'static assets use this release hash');
  const css = await (await get('jeu/v4.css')).text();
  assert.ok(css.includes("content:'V4.4.0'"), 'phone badge');
  const catalogue = await (await get('jeu/catalogue.json')).json();
  assert.deepEqual(catalogue, JSON.parse(fs.readFileSync(path.join(dist, 'jeu/catalogue.json'), 'utf8')));
  return {passed: true, version: '4.4.0', commit: sha, cards: remote.cards,
    assets: remote.assets.length, matchingSamples: samples.length, url: base + 'jeu/'};
}
if (require.main === module) main().then(result => console.log(JSON.stringify(result, null, 2)))
  .catch(error => {console.error(error); process.exitCode = 1;});
module.exports = {main};
