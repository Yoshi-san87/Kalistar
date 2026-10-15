'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const sharp = require(process.env.SHARP_MODULE || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp'));
const root = path.resolve(__dirname, '../../../..');
const batch = path.dirname(__dirname);
const revision = process.argv[3] === 'v2' ? '-v2' : '';
const qa = path.join(__dirname, 'qa' + revision);
const assets = path.join(root, 'V4/atelier/designer-assets');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const rel = file => path.relative(root, file).replaceAll('\\', '/');
const profilesFile = process.argv[2] ? path.resolve(process.argv[2]) : path.join(batch, 'profiles-b.json');
const profiles = read(profilesFile);
const manifestFile = path.join(assets, 'manifest.json');
const m = read(manifestFile);
const sources = read(path.join(root, 'V3/sources/sources-extraites.json'));
const oldCards = read(path.join(root, 'V3/donnees/cartes.json'));
const sheets = sources.workbooks[0].sheets;
const base = sheets[Object.keys(sheets).find(key => key.includes('base'))];
const values = Object.fromEntries(base.flat().map(cell => [cell.cell, cell.value]));
const weapons = new Set(sheets['Armes V2'].slice(1).map(row => row.find(c => /^A\d+$/.test(c.cell))?.value));
const bounds = {};
for (let role = 1; role <= 5; role++) {
  const row = role + 2;
  const take = columns => columns.map(col => values[col + row]);
  bounds[role] = { atk: { max: take(['D','E','F','G','H','I']), min: take(['R','S','T','U','V','W']) }, defense: { max: take(['K','L','M','N','O','P']), min: take(['Y','Z','AA','AB','AC','AD']) } };
}
// The V3 builder already normalizes the contradictory spreadsheet DEF D5 cells.
for (const role of [2, 4]) bounds[role].defense.max[1] = 150;
const usedComponents = new Map();
async function component(spec) {
  const file = path.join(assets, spec.file);
  usedComponents.set(rel(file), hash(file));
  return { input: await sharp(file).resize(spec.width, spec.height).png().toBuffer(), left: spec.left, top: spec.top };
}
const checks = [];
const previews = [];
async function main() {
  fs.mkdirSync(qa, { recursive: true });
  assert.equal(profiles.length, 5);
  for (const field of ['key','characterId','name','race','role']) assert.equal(new Set(profiles.map(p => p[field])).size, 5, 'unique ' + field);
  for (const p of profiles) {
    assert.deepEqual(p.positions, [p.role]);
    assert(!('id' in p), 'Parent assigns IDs');
    assert(weapons.has(p.weapon), p.key + ' weapon');
    assert(oldCards.some(c => c.race === p.race), p.key + ' race');
    assert(oldCards.some(c => c.faction === p.faction), p.key + ' faction');
    assert(m.elements[p.element], p.key + ' element');
    assert(!new RegExp('\\b' + p.name + '\\b', 'i').test(JSON.stringify(sources)), p.key + ' new name');
    assert.deepEqual(p.crop, { zoom: 1, x: 0, y: 0 });
    for (const side of ['atk', 'defense']) {
      assert.equal(p[side].length, 6);
      const allowed = side === 'atk' ? ['retry','mana','buff_atk','guard','revive'] : ['retry','dodge'];
      p[side].forEach((value, i) => {
        if (typeof value === 'number') assert(Number.isInteger(value) && value >= bounds[p.role][side].min[i] && value <= bounds[p.role][side].max[i], `${p.key} ${side} D${6-i}`);
        else assert(allowed.includes(value), p.key + ' effect');
      });
    }
    if (p.atk.includes('guard')) assert([1,5].includes(p.role));
    if (p.atk.includes('revive')) assert.equal(p.role, 5);
    for (const [field, side] of [['magic','atk'],['barriers','defense']]) {
      assert.equal(new Set(p[field]).size, p[field].length);
      for (const face of p[field]) assert(Number.isInteger(face) && face >= 1 && face <= 6 && typeof p[side][6-face] === 'number', p.key + ' ' + field);
    }
    if (p.element === 'NONE') assert.equal(p.magic.length + p.barriers.length, 0);
    const artFile = path.resolve(root, p.art);
    assert.equal(path.dirname(artFile), __dirname);
    const metadata = await sharp(artFile).metadata();
    assert.equal(metadata.format, 'png');
    assert(metadata.width >= 737 && metadata.height >= 921);
    const requestFile = path.join(__dirname, path.basename(p.art, '.png') + '.request.json');
    const request = read(requestFile);
    if (p.art.endsWith('-v2.png')) {
      assert.equal(request.referenced_image_paths.length, 1);
      assert.equal(path.basename(request.referenced_image_paths[0]), p.key + '.png');
      assert.equal(read(path.join(__dirname, p.key + '.request.json')).referenced_image_paths.length, 3);
    } else assert.equal(request.referenced_image_paths.length, 3);
    for (const reference of request.referenced_image_paths) assert(fs.existsSync(reference));
    const [left, top, right, bottom] = m.frame.artRectangle;
    const artwork = await sharp(artFile).resize(right-left, bottom-top, { fit: 'cover', position: 'centre' }).png().toBuffer();
    const layers = [{ input: artwork, left, top }, await component(p.element === 'ELECTRO' ? m.frame.electro : m.frame)];
    for (let face = 1; face <= 6; face++) layers.push(await component(m.stats.atk[p.element][face][p.magic.includes(face) ? 'magic' : 'physical']));
    for (const face of p.barriers) layers.push(await component(m.stats.def[face].barrier));
    for (let i = 0; i < p.positions.length; i++) {
      layers.push(await component(m.position.supports[i+1]));
      layers.push(await component(m.position.numerals[i+1][p.positions[i]]));
    }
    layers.push(await component(m.factions[p.faction]));
    const full = await sharp({ create: { width: m.width, height: m.height, channels: 4, background: '#10202a' } }).composite(layers).png().toBuffer();
    const fullFile = path.join(qa, p.key + '-native-frame.png');
    await sharp(full).toFile(fullFile);
    const windowFile = path.join(qa, p.key + '-window.png');
    const windowBuffer = await sharp(full).extract({ left, top, width: right-left, height: bottom-top }).png().toBuffer();
    await sharp(windowBuffer).toFile(windowFile);
    const thumb = await sharp(windowBuffer).resize(368,460).png().toBuffer();
    const label = Buffer.from(`<svg width="368" height="35"><rect width="368" height="35" fill="#11201e"/><text x="184" y="24" fill="white" font-family="Arial" font-size="18" text-anchor="middle">${p.name} / P${p.role}</text></svg>`);
    previews.push({ input: label, left: previews.length / 2 * 378, top: 0 }, { input: thumb, left: previews.length / 2 * 378, top: 35 });
    checks.push({ key: p.key, status: 'pass', width: metadata.width, height: metadata.height, bytes: fs.statSync(artFile).size, sha256: hash(artFile), art: p.art, request: rel(requestFile), windowPreview: rel(windowFile), framePreview: rel(fullFile), validation: ['numeric role minima/maxima','six faces per side','effect permissions','numeric-only magic and barriers','existing weapon/race/faction','original identity','five-race/five-role diversity','PNG dimensions','existing references or preserved V1 edit-target lineage'] });
  }
  await sharp({ create: { width: 1880, height: 495, channels: 4, background: '#11201e' } }).composite(previews).png().toFile(path.join(qa, 'contact-native-windows.png'));
  const report = { status: 'pass', generatedAt: new Date().toISOString(), profilesSha256: hash(path.join(batch,'profiles-b.json')), bounds, spreadsheetException: 'DEF D5 P2/P4: spreadsheet maximum 50 contradicts minimum 120. Use established V3/scripts/build_repertoire.cjs:67 maximum 150; no source or gameplay change.', previewMethod: 'Read-only native component JSON composite at 897x1497. Art cover at [80,156,817,1077], frame, selected backgrounds/halos/barriers, native position tile/numeral, faction overlay. No stats text, identity text or generated barcode: occlusion proof only, not a native PSD validation.', manifest: { file: rel(manifestFile), sha256: hash(manifestFile) }, components: Object.fromEntries(usedComponents), profiles: checks, pending: ['Visual review of native-window contact sheet','Parent native PSD and final rendered-card QA','Final Solaria bank revision belongs to parent'] };
  report.profilesSha256 = hash(profilesFile);
  report.profilesFile = rel(profilesFile);
  const reviewFile = path.join(__dirname, 'visual-review' + revision + '.json');
  if (fs.existsSync(reviewFile)) {
    const review = read(reviewFile);
    report.visualReview = { file: rel(reviewFile), sha256: hash(reviewFile), summary: review.summary };
    report.productionReady = false;
    report.pending = review.pending || ['Native fit/recomposition decision for Brindor hammer, Asteran tip and Ornelle sceptre', 'Parent decision on partial Keryn staff occlusion', 'Parent native PSD and final rendered-card QA', 'Final Solaria bank revision belongs to parent'];
  }
  fs.writeFileSync(path.join(__dirname, 'validation' + revision + '.json'), JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify({ status: report.status, profiles: checks, contactSheet: rel(path.join(qa,'contact-native-windows.png')) },null,2));
}
main().catch(error => { console.error(error); process.exitCode=1; });
