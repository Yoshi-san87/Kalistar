'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_MODULE || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const batch = path.resolve(__dirname, '../..');
const cards = JSON.parse(fs.readFileSync(path.join(batch, 'set.json'), 'utf8')).cards;
const escape = text => text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function label(text, width, height=30) {
  return Buffer.from(`<svg width="${width}" height="${height}"><rect width="100%" height="100%" fill="#15251f"/><text x="10" y="21" fill="white" font-size="15" font-family="Arial">${escape(text)}</text></svg>`);
}
async function main() {
  const report = { observedAt: new Date().toISOString(), readOnlyReview: true, sourceWrites: false, expected: cards.length, cards: [], missing: [], warnings: [] };
  const small = [], medium = [], lower = [];
  for (let i=0; i<cards.length; i++) {
    const card = cards[i], file = path.join(batch, 'cards', card.key, 'card.png');
    const row = Math.floor(i/3), col = i%3;
    let bytes, meta;
    if (fs.existsSync(file)) {
      try { bytes = fs.readFileSync(file); meta = await sharp(bytes).metadata(); }
      catch (error) { report.warnings.push({ key: card.key, state: 'unreadable_or_in_progress', error: error.message }); bytes = null; }
    }
    if (!bytes) report.missing.push(card.key);
    const suffix = bytes ? '' : ' / ABSENT';
    small.push({ input: label(card.name + suffix,224), left: col*240, top: row*405 });
    medium.push({ input: label(card.name + suffix,320), left: col*336, top: row*580 });
    lower.push({ input: label(card.name + suffix,449), left: col*465, top: row*250 });
    if (!bytes) continue;
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    report.cards.push({ key: card.key, file: file.replaceAll('\\','/'), sha256, width: meta.width, height: meta.height, format: meta.format, size: bytes.length, dimensionsExpected: meta.width===897 && meta.height===1497, sourceLastWrite: fs.statSync(file).mtime.toISOString(), profile: { name: card.name, title: card.title, job: card.job, weapon: card.weapon, race: card.race, faction: card.faction, positions: card.positions, element: card.element, atk: card.atk, defense: card.defense, magic: card.magic, barriers: card.barriers, description: card.description } });
    small.push({ input: await sharp(bytes).resize(224,374).png().toBuffer(), left: col*240, top: row*405+30 });
    medium.push({ input: await sharp(bytes).resize(320,534).png().toBuffer(), left: col*336, top: row*580+30 });
    lower.push({ input: await sharp(bytes).extract({ left:0, top:1070, width:897, height:360 }).resize(449,180).png().toBuffer(), left: col*465, top: row*250+30 });
  }
  const rows = Math.ceil(cards.length/3);
  for (const [file,width,height,composites] of [['small-224.png',704,rows*405,small],['medium-320.png',992,rows*580,medium],['lower-panels.png',1379,rows*250,lower]]) {
    await sharp({ create: { width,height,channels:4,background:'#070e0b' } }).composite(composites).png().toFile(path.join(__dirname,file));
  }
  report.present = report.cards.length;
  fs.writeFileSync(path.join(__dirname, 'snapshot.json'), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ observedAt: report.observedAt, present: report.present, missing: report.missing, warnings: report.warnings, dimensions: report.cards.map(c=>({key:c.key,valid:c.dimensionsExpected})) },null,2));
}
main().catch(error => { console.error(error); process.exitCode=1; });
