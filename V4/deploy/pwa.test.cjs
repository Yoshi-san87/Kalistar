'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {plan} = require('./build.cjs');

const root = path.resolve(__dirname, '../site');

test('PWA opens the game inside its project-page scope with install icons', async () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.scope, './');
  assert.equal(new URL(manifest.start_url, 'https://example.test/Kalistar/jeu/manifest.webmanifest').pathname, '/Kalistar/jeu/');
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /rel="manifest" href="manifest\.webmanifest"/);
  assert.match(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), /src="pwa\.js"/);

  for (const icon of manifest.icons) {
    const bytes = fs.readFileSync(path.join(root, icon.src));
    assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(bytes.readUInt32BE(16), Number(icon.sizes.split('x')[0]));
    assert.equal(bytes.readUInt32BE(20), Number(icon.sizes.split('x')[1]));
  }

  const {files} = await plan();
  for (const target of ['jeu/manifest.webmanifest', 'jeu/pwa.js', 'jeu/assets/pwa-192.png', 'jeu/assets/pwa-512.png']) {
    assert.ok(files.some(file => file.target === target), `missing published PWA file: ${target}`);
  }
});
