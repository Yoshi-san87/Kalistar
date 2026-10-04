'use strict';
const { fs, path, sharp, read, write, hash, ROOT } = require('../../atelier/lib.cjs');
const home = __dirname;
const out = path.join(home, 'visual-audit');
const xml = s => String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
async function main() {
  fs.mkdirSync(out, {recursive:true});
  const catalogue = read(path.join(ROOT, 'V4/donnees/catalogue.json'));
  const cards = [...catalogue.cards].sort((a,b) => a.profile.faction.localeCompare(b.profile.faction) || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  const records = [];
  for (let start = 0; start < cards.length; start += 16) {
    const page = cards.slice(start, start + 16), parts = [];
    for (let i = 0; i < page.length; i++) {
      const c = page[i], png = path.join(ROOT, c.png), x = (i % 4) * 320, y = Math.floor(i / 4) * 450;
      const art = await sharp(png).extract({left:80,top:156,width:737,height:921}).resize(320,400).png().toBuffer();
      parts.push({input:art,left:x,top:y});
      const label = `<svg width="320" height="50"><rect width="320" height="50" fill="#101916"/><g fill="#ffffff" font-family="Arial" font-size="13"><text x="8" y="17">${xml(c.name)} / ${xml(c.id)}</text><text x="8" y="37">${xml(c.profile.faction)} / ${xml(c.profile.race)}</text></g></svg>`;
      parts.push({input:Buffer.from(label),left:x,top:y+400});
      records.push({index:start+i+1,page:Math.floor(start/16)+1,id:c.id,name:c.name,faction:c.profile.faction,race:c.profile.race,png:c.png,sha256:await hash(png)});
    }
    const file = `catalogue-${String(Math.floor(start/16)+1).padStart(2,'0')}.jpg`;
    await sharp({create:{width:1280,height:Math.ceil(page.length/4)*450,channels:3,background:'#101916'}}).composite(parts).jpeg({quality:92}).toFile(path.join(out,file));
    console.log(file, page.length);
  }
  write(path.join(out,'inventory.json'),{catalogueHash:await hash(path.join(ROOT,'V4/donnees/catalogue.json')),count:records.length,cards:records});
}
main().catch(e => { console.error(e); process.exitCode=1; });
