'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const os = require('node:os');
const {sources,buildDocuments,browserSource,renderDocument,linkTarget,validateSources} = require('./rules-documents.cjs');

test('player manuscripts and their rule references stay byte-synchronized', async () => {
  const bundle = await buildDocuments();
  assert.equal(await validateSources(),true);
  const checkedIn = await fs.readFile(path.join(__dirname,'rules-documents.js'),'utf8');
  assert.equal(checkedIn,browserSource(bundle),'Regenerate with node V4/site/rules-documents.cjs after the documentation changes.');
  assert.deepEqual(bundle.documents.map(document => document.file),['REGLES_JEU.md','COMPOSITION_EQUIPE.md','INITIATIVE_ABBA.md','EQUIPEMENTS_460.md','RELIQUES_ULTIMES.md','INDICE_PERFORMANCE.md']);
  assert.equal(bundle.audience,'players');
  assert.equal(bundle.schema,2);
  for (const document of bundle.documents) {
    const bytes = await fs.readFile(path.resolve(__dirname,'../docs/joueurs',document.file));
    const rules = await fs.readFile(path.resolve(__dirname,'../docs',document.file));
    assert.equal(document.source.sha256,crypto.createHash('sha256').update(bytes).digest('hex'));
    assert.equal(document.source.bytes,bytes.length);
    assert.equal(document.rulesSource.sha256,crypto.createHash('sha256').update(rules).digest('hex'));
    assert.equal(document.rulesSource.bytes,rules.length);
    assert(document.wordCount > 300);
    assert(document.sections.length > 4);
    for (const section of document.sections) assert(document.html.includes(`id="${section.id}"`));
  }
  assert(bundle.documents[0].html.includes('réservistes incompatibles'));
  assert(bundle.documents[4].html.includes('La boîte est sa'));
  assert(bundle.documents[5].html.includes('121 ATK valorisée'));
});

test('readable content contains rules and examples, never developer documentation or links', async () => {
  const bundle = await buildDocuments();
  for (const document of bundle.documents) {
    assert(!/<a\b|<pre\b|<code\b|\.test\.cjs|\.js\b|\.md\b|SHA-?256|IndexedDB|\bschema\b|\bUID\b|\bRNG\b|snapshot|fixture|implémentation|implementation|guide de reprise|campagne precedente/i.test(document.html),document.id);
    assert(!/href=|https?:/.test(document.description));
  }
  const byId = id => bundle.documents.find(document => document.id === id).html;
  assert(byId('regles').includes('deux éclats'));
  assert(byId('regles').includes('200 tours'));
  assert(byId('composition').includes('au moins deux personnages'));
  assert(byId('initiative').includes('J1 → J2 → J2 → J1 → J1 → J2 → J2 → J1'));
  assert(byId('equipements').includes('+30 ATK à Momo'));
  assert(byId('reliques').includes('une fois par rencontre'));
  assert(byId('performance').includes('meilleure médaille de chaque rencontre terminée'));
});

test('publication rejects stale player text or stale rule references independently', async t => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(),'kalistar-library-sync-'));
  t.after(() => fs.rm(directory,{recursive:true,force:true}));
  await fs.mkdir(path.join(directory,'joueurs'));
  for (const source of sources) for (const subdir of ['', 'joueurs']) {
    await fs.copyFile(path.resolve(__dirname,'../docs',subdir,source.file),path.join(directory,subdir,source.file));
  }
  assert.equal(await validateSources({docsDirectory:directory}),true);
  const player = path.join(directory,'joueurs',sources[0].file),rules = path.join(directory,sources[0].file);
  const original = await fs.readFile(player);
  await fs.appendFile(player,'\nTexte modifié.\n');
  await assert.rejects(validateSources({docsDirectory:directory}),/review the player manuscript/);
  await fs.writeFile(player,original);
  await fs.appendFile(rules,'\nNouvelle règle.\n');
  await assert.rejects(validateSources({docsDirectory:directory}),/review the player manuscript/);
});

test('marked handles nested lists, GFM tables, code, duplicate headings and the final paragraph', async () => {
  const markdown = '# Test\n\n## Un chapitre\n\n- Texte **fort**\n  - Un enfant\n\n| Colonne | Valeur |\n| --- | --- |\n| a | b |\n\n```js\nconst test = "<script>";\n```\n\n## Un chapitre\n\nDernier paragraphe conserv\u00e9.\n';
  const document = await renderDocument(markdown,sources[0]);
  assert(document.html.includes('<strong>fort</strong>'));
  assert(document.html.includes('<table>'));
  assert(document.html.includes('class="library-table" role="region" tabindex="0"'));
  assert(document.html.includes('&lt;script&gt;'));
  assert(document.html.includes('Dernier paragraphe conserv\u00e9.'));
  assert.equal(new Set(document.sections.map(section => section.id)).size,3);
  assert.equal(document.sections.at(-1).id,'library-regles-un-chapitre-2');
});

test('raw HTML, dangerous URLs and image payloads cannot become active content', async () => {
  const markdown = '# S\u00e9curit\u00e9\n\n<script>window.pwned = true</script>\n\n<img src=x onerror=alert(1)>\n\n[unsafe](javascript:alert%281%29)\n\n[data](data:text/html,evil)\n\n[relative](../site/app.js)\n\n[obsolete](ARMES_EQUIPEES.md)\n\n![image](https://example.org/pixel)\n\n[good](https://example.org/path)\n\n[reliques](RELIQUES_ULTIMES.md)\n';
  const document = await renderDocument(markdown,sources[0]);
  assert(!document.html.includes('<script>'));
  assert(!document.html.includes('<img'));
  assert(!document.html.includes('href="javascript:'));
  assert(!document.html.includes('href="data:'));
  assert(!document.html.includes('href="../'));
  assert(!document.html.includes('data-library-document="armes'));
  assert(!document.html.includes('href="https://'));
  assert(!document.html.includes('title="../site/app.js"'));
  assert(document.html.includes('data-library-document="reliques"'));
  assert.equal(linkTarget('//evil.example/x','regles'),null);
  assert.equal(linkTarget('https://user:password@example.org','regles'),null);
  assert.equal(linkTarget('https://example.org\n/x','regles'),null);
  assert.equal(linkTarget('https://example.org/path','regles'),null);
  assert.equal(linkTarget('RELIQUES_ULTIMES.md?anything','regles'),null);
});

test('generated bundle is deeply frozen and embedding-safe', async () => {
  const bundle = await buildDocuments();
  const scope = {window:{}};
  const javascript = browserSource(bundle);
  vm.runInNewContext(javascript,scope);
  assert.equal(scope.window.KalistarRulesDocuments.manifestHash,bundle.manifestHash);
  assert(Object.isFrozen(scope.window.KalistarRulesDocuments.documents[0].source));
  assert(!browserSource({documents:[{html:'</script>\u2028\u2029'}]}).includes('</script>'));
});

test('the view has the autonomous render/mount/destroy API and escaped metadata', async () => {
  const scope = {window:{}};
  vm.runInNewContext(await fs.readFile(path.join(__dirname,'library-view.js'),'utf8'),scope);
  const view = scope.window.KalistarLibrary.create({documents:[{...sources[0],title:'<img onerror="x">',sections:[{depth:2}],source:{path:'x',sha256:'abc'},html:'<p>Generated body</p>'}]});
  assert.equal(typeof view.render,'function');
  assert.equal(typeof view.mount,'function');
  assert.equal(typeof view.destroy,'function');
  assert(view.render().includes('&lt;img onerror='));
  assert(!view.render().includes('<img onerror='));
  const code = await fs.readFile(path.join(__dirname,'library-view.js'),'utf8');
  assert(!code.includes('library-source'));
  assert(!code.includes('SHA-256'));
  view.destroy(); view.destroy();
  assert.equal(typeof scope.window.KalistarLibrary.create().render(),'string');
});
