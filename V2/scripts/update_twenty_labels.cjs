const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'..');
const file=path.join(root,'site/app.js');
let s=fs.readFileSync(file,'utf8');
s=s.replaceAll('KALISTAR_V2_12_CARTES.pdf','KALISTAR_V2_20_CARTES.pdf')
 .replaceAll('Les 12 cartes PNG','Les ${cards.length} cartes PNG')
 .replaceAll('<b>12</b>Versions','<b>${cards.length}</b>Versions')
 .replaceAll('<b>12</b>Cristaux','<b>${Object.keys(data.elements).length}</b>Cristaux')
 .replaceAll('class="${l.type}"','class="${esc(l.type)}"')
 .replaceAll('<b>${c.name}</b><small>${c.element}', '<b>${c.name}</b><small class="version-title">${esc(c.title)}</small><small>${c.element}');
fs.writeFileSync(file,s);
const rulesFile=path.join(root,'donnees/regles_demo.json');
const rules=JSON.parse(fs.readFileSync(rulesFile,'utf8'));
rules.conventions=rules.conventions.map(s=>s.replaceAll('douze cartes','vingt cartes').replaceAll('12 cartes','20 cartes'));
fs.writeFileSync(rulesFile,JSON.stringify(rules,null,2));
console.log('Collection labels and demo conventions updated to 20.');
