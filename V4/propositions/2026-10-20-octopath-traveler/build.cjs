'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const batch = require('./prompts.json');
const revisions = require('./revisions.json').revisions;
const nativeReady = fs.existsSync(path.resolve(__dirname, '../../expansions/2026-10-21-octopath-traveler/published.json'));
const expected = [
  ['ophilia','cyrus','tressa','olberic','primrose','alfyn','therion','haanit'],
  ['hikari','agnea','partitio','osvald','throne','temenos','ochette','castti']
];
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
assert.deepEqual(batch.characters.map(c => c.key), expected.flat());
assert.equal(new Set(batch.characters.map(c => c.key)).size, 16);
const cards = batch.characters.map(c => {
  const original = require('./provenance/' + c.key + '.json');
  assert.equal(original.prompt, c.prompt);
  assert.equal(original.sha256, hash(path.join(__dirname, original.file)));
  assert.equal(original.sha256, hash(original.source));
  const changes = revisions.filter(r => r.key === c.key);
  let chosen = original;
  for (const change of changes) {
    assert.equal(change.previousFile, chosen.file, 'Broken revision history: ' + c.key);
    assert.equal(hash(path.join(__dirname, change.file)), hash(change.source));
    chosen = change;
  }
  const file = path.resolve(__dirname, chosen.file);
  assert(file.startsWith(path.join(__dirname, 'images') + path.sep));
  const bytes = fs.readFileSync(file);
  assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])));
  const width = bytes.readUInt32BE(16), height = bytes.readUInt32BE(20);
  assert(width >= 1000 && height > width && width / height > .7);
  const sha256 = hash(file);
  assert.equal(sha256, hash(chosen.source));
  return {key:c.key,number:c.index,name:c.name,game:c.game,job:c.job,title:c.title,scene:c.scene,file:chosen.file,width,height,sha256};
});
assert.equal(new Set(cards.map(c => c.sha256)).size, 16, 'No duplicate portraits');
assert.equal(cards.filter(c => c.game === 'Octopath Traveler I').length, 8);
assert.equal(cards.filter(c => c.game === 'Octopath Traveler II').length, 8);
const figures = cards.map(c => `<figure id="${escape(c.key)}" data-number="${c.number}" data-game="${escape(c.game)}" data-search="${escape([c.name,c.job,c.title].join(' '))}">
<a class="art" href="${escape(c.file)}" aria-label="${escape('Agrandir '+c.name)}"><img src="${escape(c.file)}" width="${c.width}" height="${c.height}" loading="${c.number <= 4 ? 'eager' : 'lazy'}" alt="${escape(c.name+' : '+c.scene)}"><span class="number">${String(c.number).padStart(2,'0')}</span></a>
<figcaption><p class="meta">${escape(c.game)} · ${escape(c.job)}</p><h2>${escape(c.name)}</h2><p class="title">${escape(c.title)}</p><p class="scene">${escape(c.scene)}</p></figcaption></figure>`).join('\n');
const html = `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Octopath Traveler I &amp; II · Kalistar</title><link rel="stylesheet" href="../2026-10-17-vulkar-drax-souffle/gallery.css">
<script src="../../../V3/site/assets/lucide.min.js" defer></script><script src="gallery.js" defer></script></head>
<body><header><p class="eyebrow">KALISTAR · PROPOSITIONS D’ILLUSTRATIONS</p><h1>Octopath Traveler I &amp; II</h1>
<form class="tools" role="search"><label class="search-field">Personnage<input id="search" type="search" autocomplete="off" placeholder="Nom ou rôle…"></label>
<label class="group-field">Jeu<select id="group"><option value="">Les deux jeux</option><option>Octopath Traveler I</option><option>Octopath Traveler II</option></select></label>
<output id="count" aria-live="polite">16 / 16 illustrations</output></form></header>
<main><section class="gallery" aria-label="Les seize voyageurs">${figures}</section><p id="empty" class="empty" hidden>Aucune illustration trouvée.</p></main>
<footer>${nativeReady ? '<a href="../../expansions/2026-10-21-octopath-traveler/index.html">Voir les seize cartes natives</a>' : '<span>Illustrations sélectionnées, cartes en préparation.</span>'}<a href="prompts.json">Prompts</a><a href="revisions.json">Retouches</a><a href="README.md">Références et provenance</a></footer>
<dialog id="viewer" class="viewer" aria-labelledby="viewer-title"><div class="viewer-bar"><span id="counter" class="counter"></span>
<button id="previous" type="button" aria-label="Illustration précédente" title="Précédente"><i data-lucide="chevron-left" aria-hidden="true"></i></button>
<button id="next" type="button" aria-label="Illustration suivante" title="Suivante"><i data-lucide="chevron-right" aria-hidden="true"></i></button>
<a id="original" class="icon-link" target="_blank" rel="noopener" aria-label="Ouvrir l’image originale" title="Image originale"><i data-lucide="expand" aria-hidden="true"></i></a>
<button id="close" type="button" aria-label="Fermer" title="Fermer"><i data-lucide="x" aria-hidden="true"></i></button></div>
<div class="viewer-content"><div class="stage"><img id="full-art" alt=""></div><aside><p id="viewer-group" class="meta"></p><h2 id="viewer-title"></h2><p id="viewer-subtitle" class="title"></p><p id="viewer-scene" class="scene"></p></aside></div></dialog>
<script id="gallery-data" type="application/json">${JSON.stringify(cards).replace(/</g,'\\u003c')}</script></body></html>\n`;
fs.writeFileSync(path.join(__dirname,'index.html'), html);
fs.writeFileSync(path.join(__dirname,'verification.json'), JSON.stringify({status:'technical-checks-passed-art-awaiting-author-review',generator:batch.generator,count:cards.length,perGame:{I:8,II:8},retainedEarlierVersions:revisions.map(r => r.previousFile),nativeGameChanges:false,checks:['exact sixteen requested heroes','eight per game','unique portrait hashes','PNG dimensions','all final copies match generator originals','original versions and prompts preserved'],images:cards},null,2)+'\n');
console.log(JSON.stringify({illustrations:cards.length,perGame:{I:8,II:8},gallery:path.join(__dirname,'index.html')}));
