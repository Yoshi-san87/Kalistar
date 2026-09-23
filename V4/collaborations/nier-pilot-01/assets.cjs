'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const { fs, path, sharp, assert, read, write, ROOT, hash } = L;
const home = __dirname, file = n => path.join(home, n);
const GEOMETRY = { left: 711, top: 1116, width: 96, height: 95 };
const WEAPON_GEOMETRY = { ...GEOMETRY, left: 89 };
const FLAG = { left: 672, top: 829, width: 98, height: 223 };
const CENTER = [48, 47.5], VISIBLE_ALPHA = 16;
function opticalMetrics({ data, info }, target = CENTER) {
  const fullBounds = [info.width, info.height, 0, 0], visibleBounds = [...fullBounds];
  let mass = 0, sx = 0, sy = 0, fullAlphaRadius = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    const i = (y * info.width + x) * 4, alpha = data[i + 3]; if (!alpha) continue;
    fullBounds[0] = Math.min(fullBounds[0], x); fullBounds[1] = Math.min(fullBounds[1], y);
    fullBounds[2] = Math.max(fullBounds[2], x + 1); fullBounds[3] = Math.max(fullBounds[3], y + 1);
    // Test every nonzero pixel's outer corners, including imperceptible fringes.
    fullAlphaRadius = Math.max(fullAlphaRadius, Math.hypot(Math.max(Math.abs(x - target[0]), Math.abs(x + 1 - target[0])), Math.max(Math.abs(y - target[1]), Math.abs(y + 1 - target[1]))));
    if (alpha < VISIBLE_ALPHA) continue;
    visibleBounds[0] = Math.min(visibleBounds[0], x); visibleBounds[1] = Math.min(visibleBounds[1], y);
    visibleBounds[2] = Math.max(visibleBounds[2], x + 1); visibleBounds[3] = Math.max(visibleBounds[3], y + 1);
    const weight = alpha / 255 * (.35 + .65 * (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255);
    mass += weight; sx += (x + .5) * weight; sy += (y + .5) * weight;
  }
  assert.ok(mass > 0, 'Motif visible requis.');
  const centroid = [sx / mass, sy / mass], midpoint = [(visibleBounds[0] + visibleBounds[2]) / 2, (visibleBounds[1] + visibleBounds[3]) / 2];
  const optical = midpoint.map((v, i) => .35 * v + .65 * centroid[i]);
  return { fullBounds, visibleBounds, centroid, optical, fullAlphaRadius, opticalError: Math.hypot(optical[0] - target[0], optical[1] - target[1]), visibleAlphaThreshold: VISIBLE_ALPHA };
}
async function race(source, output, geometry = GEOMETRY) {
  const pixels = await sharp(source).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const sourceMetrics = opticalMetrics(pixels), b = sourceMetrics.fullBounds;
  assert.ok(pixels.data.some((v, i) => i % 4 === 3 && v === 0), 'Fond transparent requis.');
  const crop = { left: b[0], top: b[1], width: b[2] - b[0], height: b[3] - b[1] };
  let icon, placement, metrics, canvas;
  for (let size = 84; size >= 24; size--) {
    icon = await sharp(source).extract(crop).resize(size, size, { fit: 'inside' }).ensureAlpha().png().toBuffer();
    const p = await sharp(icon).raw().toBuffer({ resolveWithObject: true });
    const optical = opticalMetrics(p).optical;
    placement = { left: Math.round(CENTER[0] - optical[0]), top: Math.round(CENTER[1] - optical[1]) };
    if (placement.left < 0 || placement.top < 0 || placement.left + p.info.width > 96 || placement.top + p.info.height > 95) continue;
    canvas = await sharp({ create: { width: 96, height: 95, channels: 4, background: '#00000000' } }).composite([{ input: icon, ...placement }]).png().toBuffer();
    metrics = opticalMetrics(await sharp(canvas).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
    if (metrics.fullAlphaRadius <= 39 && metrics.opticalError <= .75) break;
  }
  assert.ok(metrics && metrics.fullAlphaRadius <= 39 && metrics.opticalError <= .75, 'Calibrage optique hors tolerance.');
  const native = path.join(ROOT, 'V4/collaborations/ff7-set-01/weapon-email-native.png');
  const email = await sharp(native).extract({ left: 89, top: 1116, width: 96, height: 95 }).png().toBuffer();
  const mask = await sharp(canvas).ensureAlpha().raw().toBuffer(), original = await sharp(email).ensureAlpha().raw().toBuffer();
  const blended = await sharp(email).composite([{ input: canvas }]).ensureAlpha().raw().toBuffer();
  for (let i = 0; i < blended.length; i += 4) if (!mask[i + 3]) original.copy(blended, i, i, i + 4);
  await sharp(blended, { raw: { width: 96, height: 95, channels: 4 } }).png().toFile(output);
  const motif = output.replace(/\.png$/, '.motif.png'); await sharp(canvas).png().toFile(motif);
  return { ...geometry, source: path.relative(ROOT, source), sourceHash: await hash(source), sha256: await hash(output),
    nativeEmail: path.relative(ROOT, native), nativeEmailHash: await hash(native), crop, placement, sourceMetrics, metrics,
    motif: path.relative(ROOT, motif), motifHash: await hash(motif), opticalTarget: [geometry.left + CENTER[0], geometry.top + CENTER[1]],
    measuredOpticalCenter: metrics.optical.map((v, i) => v + (i ? geometry.top : geometry.left)), radiusLimit: 39, opticalTolerance: .75,
    method: '65% visible luminance-alpha centroid / 35% visible bounds centre; full nonzero alpha contour contained; visible alpha >=16' };
}
async function prepare() {
  await L.protectedCheck(); await R.verifyAssets(); fs.mkdirSync(file('components'), { recursive: true });
  const races = {};
  for (const name of ['ANDROID', 'CYBORG']) {
    const source = name === 'CYBORG' ? path.join(ROOT, 'V3/assets/races/CYBORG.png') : file('art/ANDROID.png');
    if (fs.existsSync(source)) races[name] = await race(source, file('components/race-' + name + '.png'));
  }
  write(file('race-components.json'), { schemaVersion: 1, races });
  write(file('weapon-katana.json'), await race(path.join(ROOT, 'V3/assets/revisions-buffs-scenes-20260914/armes/18.png'), file('components/weapon-Katana.png'), WEAPON_GEOMETRY));
  if (fs.existsSync(file('art/flag-source.png'))) {
    const outline = path.join(ROOT, 'V4/propositions/collaborations/cloud-ff7-01/flag-FF7.png');
    const source = await sharp(file('art/flag-source.png')).flatten({ background: '#151719' }).resize(109, 230, { fit: 'fill' }).png().toBuffer();
    const clipped = await sharp(source).composite([{ input: outline, blend: 'dest-in' }]).png().toBuffer();
    await sharp(clipped).extract({ left: 5, top: 0, width: 98, height: 223 }).png().toFile(file('flag-NieR-packed.png'));
    write(file('faction.json'), { id: 'NieR', label: 'NieR', packedGeometry: FLAG, sourceHash: await hash(file('art/flag-source.png')), flagHash: await hash(file('flag-NieR-packed.png')), outlineHash: await hash(outline), bonusField: 'faction', bonusStat: 'ATK', membersScope: 'living-board-only', isolatedFrom: ['FF7', 'FF8', 'Chroma'] });
  }
  return { preparedRaces: Object.keys(races), flag: fs.existsSync(file('faction.json')), installed: false };
}
async function install() {
  await L.protectedCheck(); await R.verifyAssets();
  const extension = read(file('race-components.json')), bank = path.join(ROOT, 'V4/atelier/designer-assets');
  assert.deepEqual(Object.keys(extension.races).sort(), ['ANDROID', 'CYBORG']);
  const target = path.join(bank, 'race-extensions.json');
  assert.ok(!fs.existsSync(target), 'Extension deja installee ; ne pas remplacer.');
  const races = {};
  for (const [name, spec] of Object.entries(extension.races)) {
    const source = file('components/race-' + name + '.png'); assert.equal(await hash(source), spec.sha256);
    assert.equal(await hash(path.join(ROOT, spec.source)), spec.sourceHash);
    const relative = 'extensions/race-' + name + '.png', dest = path.join(bank, relative);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest)) assert.equal(await hash(dest), spec.sha256); else fs.copyFileSync(source, dest, fs.constants.COPYFILE_EXCL);
    races[name] = { file: relative, ...GEOMETRY, sha256: spec.sha256 };
  }
  write(target, { schemaVersion: 1, races }); return { installed: Object.keys(races), originalManifestUnchanged: true };
}
module.exports = { prepare, install, race, opticalMetrics, GEOMETRY, WEAPON_GEOMETRY, FLAG, CENTER };
if (require.main === module) (process.argv[2] === '--install' ? install() : prepare()).then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
