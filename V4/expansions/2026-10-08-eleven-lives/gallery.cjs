'use strict';
const {fs,path,sharp}=require('../../atelier/lib.cjs');
const set=require('./set.json');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
async function main(){
 const layers=[];
 for(const [i,c]of set.cards.entries())layers.push({input:await sharp(path.join(__dirname,'cards',c.key,'card.png')).resize({width:280}).png().toBuffer(),left:20+(i%5)*290,top:20+Math.floor(i/5)*477});
 await sharp({create:{width:1480,height:1451,channels:3,background:'#091411'}}).composite(layers).jpeg({quality:94}).toFile(path.join(__dirname,'vue-ensemble.jpg'));
 const cards=set.cards.map(c=>`<figure><a href="cards/${c.key}/card.png" target="_blank" rel="noopener"><img src="cards/${c.key}/card.png" alt="${esc(c.name)}" width="897" height="1497" loading="lazy"></a><figcaption><strong>${esc(c.name)}</strong><span>${esc(c.faction)} · P${c.role} · ${esc(c.job)}</span><a href="cards/${c.key}/card.psd">PSD</a></figcaption></figure>`).join('\n');
 fs.writeFileSync(path.join(__dirname,'galerie.html'),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalistar · Onze nouvelles vies</title><style>*{box-sizing:border-box}body{margin:0;background:#091411;color:#eee9df;font:16px Georgia,serif;letter-spacing:0}header{padding:24px 28px;border-bottom:1px solid #6e5b40}h1{margin:0;font-size:26px}main{padding:20px;display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:24px 12px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto}figcaption{display:grid;grid-template-columns:1fr auto;gap:7px;padding:0 12px}figcaption span{grid-row:2;font:12px system-ui;color:#b9c8c0}a{color:#d3b777}figcaption a{grid-column:2;grid-row:1/3;align-self:center;font:12px system-ui}@media(max-width:1000px){main{grid-template-columns:repeat(3,minmax(0,1fr))}}@media(max-width:600px){header{padding:20px}main{grid-template-columns:1fr;padding:12px}h1{font-size:23px}}</style><header><h1>Kalistar · Onze nouvelles vies</h1></header><main>${cards}</main></html>`);
 console.log('Gallery and native-card overview written.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});


