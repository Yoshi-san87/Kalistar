const fs=require('fs'),path=require('path');
const sharp=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..'),site=path.join(root,'site');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
async function main(){
  fs.mkdirSync(path.join(site,'assets/cards'),{recursive:true});
  for(const a of read('generation_site_manifest').assets){
    fs.copyFileSync(a.source,path.join(site,'assets',a.key.toLowerCase()+'.png'));
    await sharp(a.source).resize(a.key==='LOGO'?1000:a.key==='ARENA'?1800:600).webp({quality:88}).toFile(path.join(site,'assets',a.key.toLowerCase()+'.webp'));
  }
  const cards=read('cartes');
  for(const c of cards){
    await sharp(path.join(root,'cartes',c.slug+'.png')).resize(538).webp({quality:88}).toFile(path.join(site,'assets/cards',c.slug+'.webp'));
    await sharp(c.art).resize(800).webp({quality:88}).toFile(path.join(site,'assets/cards',c.slug+'-art.webp'));
  }
  const data={cards:cards.map(({previous_art,art,reference,...c})=>c),rules:read('regles'),elements:read('elements'),weapons:read('armes'),demo:read('regles_demo'),decks:read('decks_demo')};
  fs.writeFileSync(path.join(site,'data.js'),'window.KALISTAR_DATA = '+JSON.stringify(data)+';\n');
  const lucide='C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/lucide';
  fs.copyFileSync(path.join(lucide,'dist/umd/lucide.min.js'),path.join(site,'assets/lucide.min.js'));
  fs.copyFileSync(path.join(lucide,'LICENSE'),path.join(site,'assets/LUCIDE-LICENSE'));
  console.log('Offline site assets and source data ready.');
}
main().catch(e=>{console.error(e);process.exit(1)});
