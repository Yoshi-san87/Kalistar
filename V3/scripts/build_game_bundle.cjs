const fs = require('node:fs');
const path = require('node:path');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..'), site = path.join(root, 'site');
const read = name => JSON.parse(fs.readFileSync(path.join(root,'donnees',name+'.json'),'utf8'));
const crop = {left:50,top:50,width:797,height:1388};

async function main() {
  const dataOnly=process.argv.includes('--data-only');
  const cards=read('cartes'), missing=[];
  fs.mkdirSync(path.join(site,'assets/cards'),{recursive:true});
  if(!dataOnly) for(const c of cards) {
    const print=path.join(root,'cartes',c.slug+'.png');
    if(!fs.existsSync(print)){missing.push(c.slug);continue;}
    const metadata=await sharp(print).metadata();
    if(metadata.width!==897||metadata.height!==1497)throw new Error('Print dimensions changed: '+c.slug);
    await sharp(print).extract(crop).png().toFile(path.join(site,'assets/cards',c.slug+'-full.png'));
    await sharp(print).extract(crop).resize(538).webp({quality:93}).toFile(path.join(site,'assets/cards',c.slug+'.webp'));
    await sharp(path.join(root,'assets/illustrations',c.slug+'.png')).resize({width:1024,withoutEnlargement:true}).webp({quality:94}).toFile(path.join(site,'assets/cards',c.slug+'-art.webp'));
  }
  const data={version:3,crop,cards:cards.map(({previous_art,art,reference,source_art,...c})=>c),rules:read('regles'),elements:read('elements'),weapons:read('armes'),demo:read('regles_demo'),decks:read('decks_demo'),arenas:read('arenes')};
  fs.writeFileSync(path.join(site,'data.js'),'window.KALISTAR_DATA = '+JSON.stringify(data)+';\n');
  if(!dataOnly)fs.writeFileSync(path.join(root,'verification','game-bundle.json'),JSON.stringify({cards:cards.length,exported:cards.length-missing.length,missing,crop},null,2));
  console.log('V3 data bundle: '+cards.length+' profiles; '+(dataOnly?'images unchanged':(cards.length-missing.length)+' cropped card images.'));
  if(missing.length)console.log('Pending: '+missing.join(', '));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
