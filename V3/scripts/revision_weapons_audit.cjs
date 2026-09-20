const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const deps = 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp = require(path.join(deps, 'sharp'));
const JSZip = require(path.join(deps, 'jszip'));
const xml = require(path.join(deps, 'xml-js'));
const root = path.resolve(__dirname, '../..');
const out = path.join(root, 'V3/assets/revisions-buffs-scenes-20260914/armes/qa');
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
const read = p => fs.readFileSync(path.join(root, p));
const names = Object.keys(JSON.parse(read('V3/donnees/armes.json')));
const svg = s => Buffer.from(s);
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;');
const list = value => value ? (Array.isArray(value) ? value : [value]) : [];
async function workbook(file) {
  const z = await JSZip.loadAsync(read(file));
  const media = [];
  for (const item of Object.values(z.files).filter(f => /^xl\/media\//.test(f.name) && !f.dir)) {
    const bytes = await item.async('nodebuffer');
    const meta = await sharp(bytes).metadata();
    media.push({name:item.name, sha256:hash(bytes), width:meta.width, height:meta.height, bytes:bytes.length});
  }
  const wb = xml.xml2js(await z.file('xl/workbook.xml').async('string'), {compact:true});
  const sheets = list(wb.workbook.sheets.sheet).map(s => s._attributes);
  return {file, sha256:hash(read(file)), media, sheets};
}
async function main() {
  fs.mkdirSync(out, {recursive:true});
  const books = await Promise.all([
    workbook('main/Kalistar.xlsx'),
    workbook('main/Book Kalistar-20260913T134649Z-1-001/Book Kalistar/Kalistar.xlsx')
  ]);
  const rows = [], comps = [];
  for (let i=0; i<20; i++) {
    const index = String(i).padStart(2,'0');
    const source = `V1/assets/armes/${index}.jpg`;
    const bytes = read(source), meta = await sharp(bytes).metadata();
    rows.push({index:i, name:names[i], source, width:meta.width, height:meta.height, sha256:hash(bytes),
      workbook_matches:books.flatMap(b => b.media.filter(m => m.sha256 === hash(bytes)).map(m => ({file:b.file, media:m.name}))),
      v2_jpeg_identical:hash(bytes) === hash(read(`V2/assets/armes/${index}.jpg`))});
    const x = (i%5)*230+20, y = Math.floor(i/5)*245+42;
    const thumb = await sharp(bytes).resize(184,184,{kernel:'nearest'}).png().toBuffer();
    comps.push({input:thumb,left:x+13,top:y});
    comps.push({input:svg(`<svg width="220" height="34"><text x="110" y="22" text-anchor="middle" font-family="Arial" font-size="16" fill="white">${index} ${esc(names[i])}</text></svg>`),left:x-5,top:y+189});
  }
  await sharp({create:{width:1150,height:1020,channels:3,background:'#252a2d'}}).composite(comps).png().toFile(path.join(out,'historical-20.png'));
  console.log(JSON.stringify({books,rows,contact_sheet:path.relative(root,path.join(out,'historical-20.png'))},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
