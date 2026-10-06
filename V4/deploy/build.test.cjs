'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const {plan, inside, DIST, versionStaticAssets} = require('./build.cjs');

test('release contains all published cards and only playable files', async () => {
  const {files, catalogue} = await plan();
  assert.equal(files.filter(f => f.card).length, catalogue.cards.length);
  assert.equal(new Set(files.map(f => f.target)).size, files.length);
  assert.ok(files.every(f => !/\.(psd|psb|cjs|ps1|cmd|zip|lnk|json|md)$/i.test(f.target) || f.target === 'jeu/story-content.json'));
  assert.ok(files.some(f => f.target === 'jeu/story-content.json'));
  const story = JSON.parse(fs.readFileSync(path.join(__dirname, '../site/story-content.json'), 'utf8'));
  assert.equal(story.sections.length, 18);
  assert.equal(story.sections[0].label, 'Prologue');
  assert.equal(story.sections[17].title, 'La promesse de Mennuyir');
  const words = story.sections.reduce((sum, section) => sum + section.paragraphs.join(' ').split(/\s+/).length, 0);
  assert.ok(words >= 100000 && words <= 120000);
  const references = JSON.parse(fs.readFileSync(path.join(__dirname, '../atelier/data/references.json'), 'utf8'));
  const approvedCardIds = new Set(references.cards.map(card => String(card.card.id)));
  const scenes = Object.fromEntries(story.sections.map(section => [section.id, section.illustrations || []]));
  assert.deepEqual(scenes['chapter-1'].map(scene => scene.cardId), ['30000022']);
  assert.deepEqual(scenes['chapter-4'].map(scene => scene.cardId), ['30000012']);
  assert.deepEqual(scenes['chapter-5'].map(scene => scene.cardId), ['30000007']);
  assert.deepEqual(scenes['chapter-8'].map(scene => scene.cardId), ['30000021']);
  const sectionById = Object.fromEntries(story.sections.map(section => [section.id, section]));
  for (const [sectionId, phrase] of [
    ['chapter-1', 'Au comptoir, Baba leva sa chope'],
    ['chapter-4', 'Kaylis s’arrêta tout à fait'],
    ['chapter-5', 'Balmhyr'],
    ['chapter-8', 'Un joueur lui lança le ballon'],
  ]) {
    const index = scenes[sectionId][0].afterParagraph;
    assert.ok(Number.isInteger(index) && index >= 0 && index < sectionById[sectionId].paragraphs.length);
    assert.ok(sectionById[sectionId].paragraphs[index].includes(phrase), `scene anchor matches its story moment: ${phrase}`);
  }
  for (const section of story.sections) for (const scene of section.illustrations || []) assert.ok(approvedCardIds.has(String(scene.cardId)), 'story art uses an approved V4 card: ' + scene.cardId);
  assert.ok(files.every(f => !/\/(drafts|jobs|uploads|verification|templates|revisions)\//.test(f.target)));
  assert.ok(catalogue.cards.every(c => !c.psdUrl && files.some(f => '/' + f.target === c.pngUrl)));
  assert.ok(files.filter(f => f.target.startsWith('media/reference/')).every(f => f.expectedHash));
  assert.ok(files.some(f => f.target === 'jeu/manifest.webmanifest'));
  assert.ok(files.some(f => f.target === 'jeu/pwa.js'));
  assert.ok(files.some(f => f.target === 'jeu/assets/pwa-192.png'));
  assert.ok(files.some(f => f.target === 'jeu/assets/pwa-512.png'));
});
test('build paths cannot escape the generated directory', () => {
  for (const value of ['../README.md', '..\\README.md', '/outside', '']) assert.throws(() => inside(DIST, value));
});
test('static release versions stylesheet and script URLs together', () => {
  const html = '<link rel="stylesheet" href="story-reader.css"><script defer src="boot.js"></script><img src="logo.webp">';
  const versioned = versionStaticAssets(html, 'f862a26');
  assert.match(versioned, /href="story-reader\.css\?v=f862a26"/);
  assert.match(versioned, /src="boot\.js\?v=f862a26"/);
  assert.match(versioned, /src="logo\.webp"/);
  const boot = fs.readFileSync(path.join(__dirname, '../site/boot.js'), 'utf8');
  assert.ok(boot.includes("new URL(document.currentScript?.src || location.href).searchParams.get('v')"));
  assert.ok(boot.includes('`${src}?v=${encodeURIComponent(release)}`'));
});
test('application version matches in desktop and phone headers', () => {
  const html = fs.readFileSync(path.join(__dirname, '../site/index.html'), 'utf8');
  const css = fs.readFileSync(path.join(__dirname, '../site/v4.css'), 'utf8');
  assert.match(html, /<title>Kalistar V4\.5\.35/);
  assert.match(html, /<span class="edition">VERSION 4\.5\.35<\/span>/);
  assert.ok(css.includes("content:'V4.5.35'"));
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
