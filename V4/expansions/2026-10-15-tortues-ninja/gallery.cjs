'use strict';
const fs=require('node:fs'),path=require('node:path'),set=require('./set.json');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const flags=[...new Set(set.cards.map(c=>c.faction))];
const html=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Kalistar - Tortues Ninja, 10 cartes</title><link rel="stylesheet" href="gallery.css"></head>
<body><header><div><h1>Tortues Ninja</h1><p>Kalistar · <span id="count">10 cartes</span></p></div><form role="search"><label>Personnage<input id="search" type="search" autocomplete="off"></label><label>Collection<select id="faction"><option value="">Toutes</option>${flags.map(f=>`<option>${esc(f)}</option>`).join('')}</select></label></form></header>
<main>${set.cards.map(c=>`<figure id="${c.key}" data-faction="${esc(c.faction)}" data-search="${esc(c.name+' '+c.title+' '+c.job+' '+c.id)}"><a href="cards/${c.key}/card.png" target="_blank" rel="noopener" aria-label="${esc(c.name)}, carte en grand"><img src="cards/${c.key}/small.png" width="300" height="501" alt="${esc(c.name+' · '+c.title)}"></a><figcaption><h2>${esc(c.name)}</h2><p class="title">${esc(c.title)}</p><p>${esc(c.faction)} · ${c.positions.map(p=>'P'+p).join(' / ')} · ${esc(c.element)}</p><p>${esc(c.weapon)} · ${esc(c.job)}</p><a class="art" href="cards/${c.key}/illustration.png" target="_blank" rel="noopener">Illustration</a></figcaption></figure>`).join('\n')}</main>
<p id="empty" hidden>Aucune carte.</p><footer><a href="README.md">Profils et production</a><p>Fan crossover non officiel.</p></footer><script src="gallery.js"></script></body></html>`;
fs.writeFileSync(path.join(__dirname,'index.html'),html);
