'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {plan, inside, DIST, versionStaticAssets} = require('./build.cjs');

test('release contains all published cards and only playable files', async () => {
  const {files, catalogue} = await plan();
  assert.equal(files.filter(f => f.card).length, catalogue.cards.length);
  assert.equal(new Set(files.map(f => f.target)).size, files.length);
  const publicData = ['jeu/story-content.json', 'jeu/astraball/data/sprite-library.json'];
  assert.ok(files.every(f => !/\.(psd|psb|cjs|ps1|cmd|zip|lnk|json|md)$/i.test(f.target) || publicData.includes(f.target)));
  assert.ok(files.some(f => f.target === 'jeu/astraball/data/sprite-library.json'));
  assert.ok(files.some(f => f.target === 'jeu/story-content.json'));
  assert.ok(files.some(f => f.target === 'jeu/assets/ui/story-closed-grimoire-v2.webp'));
  assert.equal(files.filter(f => f.target.startsWith('jeu/assets/ui/story-books/')).length, 11, 'all forthcoming Kalistel covers are published');
  const fragmentAssets = ['30000001-art-v1.webp','30000007-art-v1.webp','30000014-art-v1.webp','49055457-art-v1.webp','49900802-art-v1.webp','binding-v1.webp',
    ...['horizon','durane','guide','portes','serment','rempart','empreinte'].flatMap(id=>['balmhyr-'+id+'-v1.webp','balmhyr-'+id+'-v1-small.webp']),
    ...['rebuts','passage','carillons','rester','souffle','coutures','boite'].flatMap(id=>['momo-'+id+'-v1.webp','momo-'+id+'-v1-small.webp']),
    'momo-boite-v2.webp','momo-boite-v2-small.webp'];
  assert.deepEqual(files.filter(f => f.target.startsWith('jeu/assets/journeys/')).map(f=>f.target).sort(), fragmentAssets.map(name=>'jeu/assets/journeys/'+name).sort(), 'Fragment publishes only the binding, reward paintings and responsive story scenes');
  assert.ok(files.every(f => !/story-closed-grimoire-v\d+\.original\.png$/.test(f.target)), 'cover authoring sources stay out of the runtime');
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
  assert.ok(files.some(f => f.target === 'jeu/login.html'));
  assert.equal(files.some(f => f.target === '_worker.js'),process.env.CF_PAGES === '1');
  assert.ok(files.some(f => f.target === 'jeu/assets/pwa-192.png'));
  assert.ok(files.some(f => f.target === 'jeu/assets/pwa-512.png'));
});
test('selected Obsidian back is registered and used on every V4 surface', async () => {
  const {files}=await plan();
  const provenance=JSON.parse(fs.readFileSync(path.join(__dirname,'../revisions/2026-10-18-obsidian-back/provenance.json'),'utf8'));
  const back=files.find(file=>file.target==='jeu/assets/back-obsidian-v1.webp');
  assert.equal(back.source,provenance.output.path);
  assert.equal(back.expectedHash,provenance.output.sha256);
  const bytes=fs.readFileSync(path.resolve(__dirname,'../..',back.source));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'),provenance.output.sha256);
  assert.ok(bytes.length<350*1024,'one shared lightweight back');
  for(const name of ['app.js','accounts-ui.js','cloud-registry-ui.js','guide-view.js','page-transitions.js']){
    const source=fs.readFileSync(path.join(__dirname,'../site',name),'utf8');
    assert.ok(source.includes('assets/back-obsidian-v1.webp'),name);
    assert.ok(!source.includes('assets/back.webp'),name+' must not retain the historical V3 back');
  }
  const previous=fs.readFileSync(path.resolve(__dirname,'../../V3/site/assets/back.webp'));
  assert.equal(crypto.createHash('sha256').update(previous).digest('hex'),provenance.previous.sha256);
});

test('build paths cannot escape the generated directory', () => {
  for (const value of ['../README.md', '..\\README.md', '/outside', '']) assert.throws(() => inside(DIST, value));
});

test('Astralia atlas is published as lightweight media, not an authoring source', async () => {
  const {files} = await plan();
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '../propositions/2026-10-06-astralia-atlas-v2/manifest.json'), 'utf8'));
  const atlas = files.find(file => file.target === 'jeu/assets/ui/collection-astralia-planisphere-v2.webp');
  assert.equal(atlas?.source, manifest.runtime.file);
  assert.ok(!files.some(file => file.source.includes('astralia-planisphere-original')));
  const image = fs.readFileSync(path.resolve(__dirname, '../..', atlas.source));
  assert.equal(image.subarray(0, 4).toString(), 'RIFF');
  assert.equal(image.subarray(8, 12).toString(), 'WEBP');
  assert.equal(crypto.createHash('sha256').update(image).digest('hex'), manifest.runtime.sha256);
  assert.equal(image.length, manifest.runtime.bytes);
  assert.equal(manifest.source.file, 'astralia-planisphere-selected-v2.png');
  assert.equal(manifest.display.sourceIsSharp, true);
  const conversion = fs.readFileSync(path.join(__dirname, '../propositions/2026-10-06-astralia-atlas-v2/prepare.cjs'), 'utf8');
  assert.doesNotMatch(conversion, /\.blur\(/, 'the reusable source and runtime media remain unblurred');
  assert.ok(image.length < 650 * 1024, 'atlas stays below the 650 KiB background budget');
  assert.equal(manifest.runtime.width / manifest.runtime.height, 2);
});

test('Collection atlas is continuous and does not replace reading surfaces', () => {
  const binder = fs.readFileSync(path.join(__dirname, '../site/collection-binder.css'), 'utf8');
  const mobile = fs.readFileSync(path.join(__dirname, '../site/mobile.css'), 'utf8');
  const story = fs.readFileSync(path.join(__dirname, '../site/story-reader.css'), 'utf8');
  assert.match(binder, /\.cb-page\[data-mode=book\] \.cb-workbench \{[^}]*isolation: isolate;[^}]*background: #b89b71;/);
  assert.match(binder, /\.cb-page\[data-mode=book\] \.cb-workbench::before, \.cb-mini-book::before \{[^}]*pointer-events: none;[^}]*var\(--kalistar-atlas-image\)[^}]*filter: blur\(1\.6px\)/);
  assert.doesNotMatch(binder, /collection-astralia-planisphere/);
  assert.match(binder, /\.cb-spread::before \{ content: none; \}/);
  assert.match(binder, /\.cb-spread \{[^}]*background: transparent;/);
  assert.match(binder, /\.cb-mini-book \{[^}]*isolation: isolate;[^}]*overflow: hidden;/);
  assert.match(binder, /\.cb-page\[data-mode=reader\] \.cb-workbench \{[^}]*collection-reader-grimoire-v1\.webp/);
  assert.doesNotMatch(mobile, /background-size: 200% 112%/);
  assert.doesNotMatch(story, /collection-astralia-planisphere/);
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
  assert.match(html, /<title>Kalistar V4\.7\.11/);
  assert.match(html, /<span class="edition">VERSION 4\.7\.11<\/span>/);
  assert.ok(css.includes("content:'V4.7.11'"));
});
test('hosting adapter supports local, project Pages and saved canonical image paths', () => {
  const script = fs.readFileSync(path.join(__dirname, '../site/site-config.js'), 'utf8');
  const versions = JSON.parse(fs.readFileSync(path.join(__dirname, '../map/versions.json'), 'utf8'));
  const published = versions.versions.find(version => version.version === versions.latestVersion).publishedAsset;
  const atlasPath = path.relative(path.resolve(__dirname,'../site'), path.resolve(__dirname,'../map',published)).replaceAll('\\','/');
  for (const [src, mode] of [['http://127.0.0.1:4304/jeu/site-config.js','local'],['https://example.test/Kalistar/jeu/site-config.js?v=release','static'],['https://example.test/jeu/site-config.js?v=release','static']]) {
    let removed = 0;
    const properties = new Map();
    const context = {URL, window: {}, document: {currentScript: {src}, documentElement: {dataset: {hosting: mode},style:{setProperty:(key,value)=>properties.set(key,value)}}, querySelectorAll: () => [{remove() {removed++;}}]}};
    vm.runInNewContext(script, context);
    const site = context.window.KalistarSite;
    assert.equal(site.online, mode === 'static');
    assert.equal(removed, mode === 'static' ? 1 : 0);
    assert.equal(site.url('/media/reference/momo.png'), new URL('../',src).pathname==='/' ? '/media/reference/momo.png' : 'https://example.test/Kalistar/media/reference/momo.png');
    assert.equal(site.atlas,new URL(atlasPath,src).href,'shared atlas follows the approved published map on every host');
    assert.equal(properties.get('--kalistar-atlas-image'),`url(${JSON.stringify(site.atlas)})`);
    assert.equal(site.url('blob:abc'), 'blob:abc');
    assert.equal(site.url(site.url('/jeu/assets/arena.webp')), site.url('/jeu/assets/arena.webp'));
  }
});
