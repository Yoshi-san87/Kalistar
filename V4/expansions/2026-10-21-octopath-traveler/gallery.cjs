'use strict';
const fs=require('node:fs'),path=require('node:path'),set=require('./set.json');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Octopath Traveler · Kalistar</title><link rel="stylesheet" href="gallery.css"></head>
<body><header><img src="flag.png" width="109" height="230" alt="Banniere Octopath"><div><p>KALISTAR · COLLABORATION NON OFFICIELLE</p><h1>Octopath Traveler I &amp; II</h1><nav aria-label="Livres"><a href="#book-1">Traveler I</a><a href="#book-2">Traveler II</a></nav></div></header>
<main>${[1,2].map((book)=>`<section id="book-${book}"><h2>Traveler ${book===1?'I':'II'}</h2><div class="cards">${set.cards.slice((book-1)*8,book*8).map(c=>`<figure id="${c.key}"><a class="card" href="cards/${c.key}/card.png" aria-label="${esc(c.name+' : '+c.title)}"><img src="cards/${c.key}/card.png" width="897" height="1497" alt="${esc(c.name+', '+c.title+', '+c.job+', positions '+c.positions.join(' et '))}"></a><figcaption><h3>${esc(c.name)}</h3><p class="title">${esc(c.title)}</p><p class="identity">${esc(c.element)} · ${esc(c.weapon)} · ${c.positions.map(p=>'P'+p).join(' / ')}</p><p>${esc(c.rationale)}</p><nav aria-label="Fichiers ${esc(c.name)}"><a href="../../${esc(c.artworkSource.replace(/^V4\//,''))}">Illustration</a><a href="cards/${c.key}/card.psd">PSD natif</a></nav></figcaption></figure>`).join('')}</div></section>`).join('')}</main>
<footer><a href="README.md">Dossier de creation</a> · <a href="set.json">Profils et choix de jeu</a></footer></body></html>`;
fs.writeFileSync(path.join(__dirname,'index.html'),html+'\n');
