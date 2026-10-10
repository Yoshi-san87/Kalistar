'use strict';
const {fs,path,sharp}=require('../../atelier/lib.cjs'),s=require('./set.json');
const escape=v=>String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;');
async function main(){
 const proof=path.join(__dirname,'visual-proof');fs.mkdirSync(proof,{recursive:true});
 const elements={LUXO:'Lumiere',GEO:'Terre',HEMATO:'Sang',NECRO:'Tenebres',MINERO:'Roche',PYRO:'Feu',CRYO:'Glace'};
 const items=s.cards.map(c=>'<figure id="'+c.key+'"><a href="cards/'+c.key+'/card.png"><img src="cards/'+c.key+'/card.png" width="897" height="1497" alt="'+escape(c.name+' : '+c.title)+'"></a><figcaption><h2>'+escape(c.name)+'</h2><p>'+elements[c.element]+' / P'+c.role+' / '+escape(c.weapon)+'</p><p>'+escape(c.rationale)+'</p></figcaption></figure>').join('\n');
 const html='<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalistar / Castlevania</title><style>@font-face{font-family:Cinzel;src:url("../../site/assets/fonts/cinzel-v26-latin.woff2")}*{box-sizing:border-box}body{margin:0;background:#111917;color:#e5e8e1;font:16px/1.5 Georgia,serif;letter-spacing:0}header{padding:24px;border-bottom:1px solid #6f6359}h1{font:24px Cinzel,serif;margin:0;color:#efdbb7}main{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:30px 24px;padding:24px;max-width:1600px;margin:auto}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto}h2{font:18px Cinzel,serif;margin:8px 0}p{margin:4px 0;color:#bac6c0;font-size:14px}figcaption{padding:0 12px}footer{padding:24px;border-top:1px solid #6f6359}a{color:#dac39e}a:focus-visible{outline:2px solid #9ad5d0;outline-offset:3px}@media(max-width:900px){main{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:520px){main{grid-template-columns:1fr;padding:12px;gap:24px}header{padding:18px}h1{font-size:22px}}</style><header><h1>Kalistar x Castlevania</h1><p>9 cartes / 8 personnages</p></header><main>'+items+'</main><footer><a href="README.md">Profils et controles</a> / <a href="asset-provenance.json">Prompts et provenance</a></footer></html>';
 fs.writeFileSync(path.join(__dirname,'index.html'),html);
 for(let start=0;start<s.cards.length;start+=3){
  const layers=[];
  for(const [i,c]of s.cards.slice(start,start+3).entries())layers.push({input:await sharp(path.join(__dirname,'cards',c.key,'card.png')).resize(300,501).png().toBuffer(),left:i*310,top:0});
  await sharp({create:{width:930,height:501,channels:4,background:'#111917'}}).composite(layers).png().toFile(path.join(proof,'sheet-'+(start/3+1)+'.png'));
 }
 console.log('Gallery and three contact sheets ready.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
