'use strict';
const L = require('../../atelier/lib.cjs');
const { ART, cropArt, clearAlphaBelow } = require('./geometry.cjs');
const { BANK, PRIOR, REVISIONS } = require('./scope.cjs');
const { fs, path, sharp, assert } = L;
const file = n => L.inside(__dirname, n), source = n => L.inside(L.ROOT, n);
const relative = f => path.relative(L.ROOT, f).replaceAll('\\', '/');
function exclusiveJson(name, value) {
  const f = file(name); fs.mkdirSync(path.dirname(f), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(value, null, 2) + '\n', { flag: 'wx' });
}
async function exclusivePng(name, buffer) {
  const f = file(name); fs.mkdirSync(path.dirname(f), { recursive: true });
  if (fs.existsSync(f)) assert.ok(fs.readFileSync(f).equals(buffer), 'Un apercu different existe deja : ' + name);
  else fs.writeFileSync(f, buffer, { flag: 'wx' });
  return { file: relative(f), sha256: await L.hash(f) };
}
async function solaria() {
  assert.ok(!fs.existsSync(file('audit/solaria.json')), 'Audit deja present : creer une revision explicite.');
  const inputs = [
    { name: 'source', file: 'V3/assets/factions/Solaria.png', cutoff: 287 },
    { name: 'raw', file: BANK + '/banks/faction-Solaria.png', cutoff: 185 },
    { name: 'packed', file: BANK + '/packed/banks/faction-Solaria.png', cutoff: 168 }
  ], results = [];
  for (const i of inputs) {
    const beforeFile = source(i.file), bytes = fs.readFileSync(beforeFile);
    const before = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const after = clearAlphaBelow(before.data, before.info, i.cutoff);
    assert.ok(after.changed > 0);
    const original = await exclusivePng('audit/solaria/' + i.name + '-before.png', bytes);
    const output = await exclusivePng('audit/solaria/' + i.name + '-candidate.png', await sharp(after.data, { raw: before.info }).png().toBuffer());
    const rows = [];
    for (let y = i.cutoff - 8; y < Math.min(before.info.height, i.cutoff + 8); y++) {
      let count = 0; for (let x = 0; x < before.info.width; x++) if (before.data[(y * before.info.width + x) * 4 + 3]) count++;
      rows.push({ y, count });
    }
    assert.ok(before.data.subarray(0, i.cutoff * before.info.width * 4).equals(after.data.subarray(0, i.cutoff * before.info.width * 4)));
    for (let p = 0; p < before.data.length; p++) if (p % 4 !== 3) assert.equal(before.data[p], after.data[p], 'RGB modifie.');
    const pair = await sharp({ create: { width: before.info.width * 2 + 12, height: before.info.height, channels: 4, background: '#30383d' } })
      .composite([{ input: bytes, left: 0, top: 0 }, { input: source(output.file), left: before.info.width + 12, top: 0 }])
      .png().toBuffer();
    const canvas = await sharp(pair).resize({ width: (before.info.width * 2 + 12) * 3, kernel: 'nearest' }).png().toBuffer();
    const comparison = await exclusivePng('audit/solaria/' + i.name + '-comparison.png', canvas);
    results.push({ ...i, sourceHash: await L.hash(beforeFile), original, output, comparison,
      width: before.info.width, height: before.info.height, changedAlpha: after.changed, rgbChanged: 0, outsideChanged: 0, nearbyRows: rows });
  }
  const m = L.read(source(BANK + '/manifest.json'));
  exclusiveJson('audit/solaria.json', { schemaVersion: 1, status: 'candidate-awaiting-native-review', photoshopRun: false,
    referenceId: L.baseline().id, createdAt: new Date().toISOString(), geometry: m.factions.Solaria,
    diagnosis: 'Motif parasite deja dans le fichier V3, distinct du tissu ; ombre propagee dans les exports natifs. V3 conserve intact.',
    nativePlan: 'Reviser le contenu du drapeau et son ombre dans des copies des PSD ; verifier les limites du groupe et toute difference hors zone. Les PNG candidats ne sont pas une preuve native.',
    sharedDisplay: { newAsset: 'V4/site/assets/factions/Solaria.png', sourceCandidate: results[0].output.file,
      routeChangeOwner: 'parent', instruction: 'Router Solaria vers assets/factions/Solaria.png dans V4 uniquement et inclure cet asset dans le build statique.' }, results });
  return { audit: file('audit/solaria.json'), changedAlpha: results.map(r => [r.name, r.changedAlpha]), photoshopRun: false };
}
async function previews(specs) {
  const R = require('../../atelier/designer-render.cjs'), D = require('../../atelier/designer-core.cjs');
  const reports = [];
  for (const c of specs) {
    const suffix = c.art ? '-art-' + (await L.hash(file(c.art))).slice(0, 10) : '';
    const stem = c.key + suffix, crop = c.crop || { zoom: 1, x: 0, y: 0 };
    assert.ok(!fs.existsSync(file('audit/zoom/' + stem + '.json')), 'Apercu deja present.');
    const old = source(PRIOR + '/cards/' + c.key), plan = L.read(path.join(old, 'render/composition.json'));
    const published = D.catalogue().cards.find(p => p.id === c.id); assert.ok(published);
    assert.equal(await L.hash(source(published.png)), await L.hash(path.join(old, 'card.png')), 'La source publiee a change.');
    const original = await sharp(source(published.png)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const without = await sharp(path.join(old, 'render/without-text.png')).ensureAlpha().raw().toBuffer();
    const layers = plan.layers.map(l => ({ ...l, input: path.join(old, 'render', l.file) }));
    const illustration = c.art ? file(c.art) : path.join(old, 'illustration.png');
    layers[0] = { ...layers[0], input: await cropArt(sharp, illustration, crop) };
    const changed = await sharp(await R.composite(layers)).ensureAlpha().raw().toBuffer();
    const result = Buffer.from(original.data); let updated = 0, textPixelsPreserved = 0;
    // Preview only: retain native text pixels rather than substituting a browser font.
    for (let y = ART.top; y < ART.top + ART.height; y++) for (let x = ART.left; x < ART.left + ART.width; x++) {
      const p = (y * original.info.width + x) * 4;
      let text = false; for (let channel = 0; channel < 4; channel++) if (Math.abs(original.data[p + channel] - without[p + channel]) > 2) text = true;
      if (text) { textPixelsPreserved++; continue; }
      if (!result.subarray(p, p + 4).equals(changed.subarray(p, p + 4))) updated++;
      changed.copy(result, p, p, p + 4);
    }
    const candidate = await exclusivePng('audit/zoom/' + stem + (c.art ? '-candidate.png' : '-12pct.png'), await sharp(result, { raw: original.info }).png().toBuffer());
    const pair = await sharp({ create: { width: 1794, height: 1497, channels: 4, background: '#080b0d' } })
      .composite([{ input: source(published.png), left: 0, top: 0 }, { input: source(candidate.file), left: 897, top: 0 }]).png().toBuffer();
    const comparison = await exclusivePng('audit/zoom/' + stem + '-comparison.png', await sharp(pair).resize(1076, 898).png().toBuffer());
    const diff = await L.diff(source(published.png), source(candidate.file), [[ART.left, ART.top, ART.left + ART.width, ART.top + ART.height]]);
    assert.equal(diff.outside, 0); assert.ok(updated > 0);
    const report = { schemaVersion: 1, status: 'preview-not-native', key: c.key, id: c.id, crop,
      inputs: { [published.png]: await L.hash(source(published.png)), [relative(illustration)]: await L.hash(illustration),
        [relative(path.join(old, 'render/composition.json'))]: await L.hash(path.join(old, 'render/composition.json')) },
      candidate, comparison, diff, textPixelsPreserved, photoshopRun: false,
      limitation: 'Compositor de consultation ; quelques pixels anti-aliases de texte conservent leur ancien fond. Aucun de ces fichiers ne sera publie. Le rendu final sera natif.' };
    exclusiveJson('audit/zoom/' + stem + '.json', report); reports.push(report);
  }
  return { previews: reports.map(r => r.comparison.file), photoshopRun: false };
}
const zooms = () => previews(REVISIONS.filter(c => c.kind === 'zoom'));
const xiaomi = () => previews(REVISIONS.filter(c => c.key === 'xiaomi'));
async function creation(key, artOverride) {
  const M = require('./model.cjs'), R = require('../../atelier/designer-render.cjs'), D = require('../../atelier/designer-core.cjs');
  const c = Object.keys(M.INPUTS).filter(n => fs.existsSync(file(n))).flatMap(n => L.read(file(n))).map(M.normalize).find(c => c.key === key);
  assert.ok(c, 'Profil inconnu.');
  if (artOverride) { assert.match(artOverride, /^art-[ab]\/[a-zA-Z0-9_-]+\.png$/); c.art = artOverride; }
  const donor = M.donor(c, D), hash = await L.hash(file(c.art)), stem = c.key + '-art-' + hash.slice(0, 10);
  const layers = await R.components(donor, { id: c.id, positionsText: true });
  const m = L.read(source(BANK + '/manifest.json')), index = layers.findIndex(l => l.name.startsWith('ARME - ')), weapon = m.weapons[c.weapon];
  layers[index] = { ...weapon, input: source(BANK + '/' + weapon.file), name: 'ARME - ' + c.weapon };
  layers[0] = { ...layers[0], input: await cropArt(sharp, file(c.art), c.crop) };
  const candidate = await exclusivePng('audit/cards/' + stem + '.png', await sharp(await R.composite(layers))
    .composite(await require('../../collaborations/nier-pilot-01/typography.cjs').preview(donor, R)).png().toBuffer());
  exclusiveJson('audit/cards/' + stem + '.json', { status: 'preview-not-native', spec: c, artHash: hash, candidate, previewArtOverride: !!artOverride, photoshopRun: false });
  return candidate;
}
module.exports = { solaria, zooms, xiaomi, previews, creation };
if (require.main === module) {
  const action = process.argv[2]; assert.ok(['solaria', 'zooms', 'xiaomi', 'creation'].includes(action));
  ({ solaria, zooms, xiaomi, creation })[action](process.argv[3], process.argv[4]).then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
}
