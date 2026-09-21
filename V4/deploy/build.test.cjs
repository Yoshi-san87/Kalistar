'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {plan, inside, DIST} = require('./build.cjs');

test('release contains all published cards and only playable files', async () => {
  const {files, catalogue} = await plan();
  assert.equal(files.filter(f => f.card).length, catalogue.cards.length);
  assert.equal(new Set(files.map(f => f.target)).size, files.length);
  assert.ok(files.every(f => !/\.(psd|psb|cjs|ps1|cmd|zip|lnk|json|md)$/i.test(f.target)));
  assert.ok(files.every(f => !/\/(drafts|jobs|uploads|verification|templates|revisions)\//.test(f.target)));
  assert.ok(catalogue.cards.every(c => !c.psdUrl && files.some(f => '/' + f.target === c.pngUrl)));
  assert.ok(files.filter(f => f.target.startsWith('media/reference/')).every(f => f.expectedHash));
});
test('build paths cannot escape the generated directory', () => {
  for (const value of ['../README.md', '..\\README.md', '/outside', '']) assert.throws(() => inside(DIST, value));
});
test('hosting adapter supports local, project Pages and saved canonical image paths', () => {
  const script = fs.readFileSync(path.join(__dirname, '../site/site-config.js'), 'utf8');
  for (const [src, mode] of [['http://127.0.0.1:4304/jeu/site-config.js','local'],['https://example.test/Kalistar/jeu/site-config.js','static']]) {
    let removed = 0;
    const context = {URL, window: {}, document: {currentScript: {src}, documentElement: {dataset: {hosting: mode}}, querySelectorAll: () => [{remove() {removed++;}}]}};
    vm.runInNewContext(script, context);
    const site = context.window.KalistarSite;
    assert.equal(site.online, mode === 'static');
    assert.equal(removed, mode === 'static' ? 1 : 0);
    assert.equal(site.url('/media/reference/momo.png'), mode === 'static' ? 'https://example.test/Kalistar/media/reference/momo.png' : '/media/reference/momo.png');
    assert.equal(site.url('blob:abc'), 'blob:abc');
    assert.equal(site.url(site.url('/jeu/assets/arena.webp')), site.url('/jeu/assets/arena.webp'));
  }
});
