'use strict';
const fs=require('node:fs'),path=require('node:path'),set=require('./set.json');
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const html=`<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Riko · Kalistar</title><link rel="stylesheet" href="gallery.css"></head>
<body><header><p>KALISTAR · NESTOWN · KORBOW · AÉRO</p><h1>Riko</h1></header>
<main>${set.cards.map(c=>`<figure><a class="card" href="cards/${c.key}/card.png" aria-label="${esc(c.name+' : '+c.title)}"><img src="cards/${c.key}/card.png" width="897" height="1497" alt="${esc(c.name+', '+c.title+', '+c.job+', positions '+c.positions.join(' et '))}"></a>
<figcaption><h2>${esc(c.title)}</h2><p class="identity">${esc(c.job)} · ${c.positions.map(p=>'P'+p).join(' / ')}</p><p>${esc(c.description)}</p><nav aria-label="Fichiers ${esc(c.title)}"><a href="${esc(c.artworkSource.split('/').slice(-2).join('/'))}">Illustration</a><a href="cards/${c.key}/card.psd">PSD natif</a></nav></figcaption></figure>`).join('')}</main>
<footer><a href="README.md">Dossier de création</a> · <a href="set.json">Profils et choix de jeu</a></footer></body></html>`;
fs.writeFileSync(path.join(__dirname,'index.html'),html+'\n');
