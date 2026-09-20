const { execFileSync } = require('node:child_process');
const L = require('../../atelier/lib.cjs');
const { fs, path, ROOT, read, write, assert, hash, sharp } = L;
const work = __dirname;
// ExtendScript serializes numbers to fewer digits than Node; 1e-8 px is far below raster precision.
const nativePrecision = value => JSON.parse(JSON.stringify(value), (key, v) => typeof v === 'number' ? Math.round(v * 1e8) / 1e8 : v);
async function contour(file, layout) {
  const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let maximum = 0, visible = 0, weight = 0, sx = 0, sy = 0, x0 = info.width, y0 = info.height, x1 = 0, y1 = 0;
  for (let y = 0; y < info.height; y++) for (let x = 0; x < info.width; x++) {
    if (!data[(y * info.width + x) * 4 + 3]) continue;
    visible++;
    const i = (y * info.width + x) * 4;
    const w = data[i + 3] / 255 * (.35 + .65 * (data[i] * .2126 + data[i + 1] * .7152 + data[i + 2] * .0722) / 255);
    weight += w; sx += (x + .5) * w; sy += (y + .5) * w;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x + 1); y1 = Math.max(y1, y + 1);
    maximum = Math.max(maximum, Math.hypot(x + .5 - layout.center[0], y + .5 - layout.center[1]));
  }
  assert.ok(visible > 500, 'Empty or unreadably small motif');
  assert.ok(maximum <= layout.safeRadius, `${file}: alpha contour ${maximum} > ${layout.safeRadius}`);
  const optical = [(x0 + x1) / 2 * .35 + sx / weight * .65, (y0 + y1) / 2 * .35 + sy / weight * .65];
  const error = optical.map((v, i) => Math.abs(v - layout.center[i]));
  assert.ok(error.every(v => v <= .75), 'Optical center deviates by ' + error.join(', '));
  return { visiblePixels: visible, maxRadius: maximum, safeRadius: layout.safeRadius, innerRadius: layout.innerRadius, optical, opticalError: error };
}
(async () => {
  const plan = read(path.join(work, 'plan.json')), old = read(path.join(work, 'references-before.json'));
  const calibration = read(path.join(work, 'calibration.json'));
  await L.protectedCheck(old);
  const results = [];
  for (const item of plan.items) {
    const dir = path.join(ROOT, item.destination), native = read(path.join(dir, 'native.json'));
    assert.equal(native.width, 897); assert.equal(native.height, 1497); assert.equal(native.resolution, 300);
    assert.equal(native.before.length, native.reopened.length);
    const permitted = item.key === 'balmhyr' ? ['ART - CONTENU', 'ARME - CONTENU', 'RACE - CONTENU'] : ['RACE - CONTENU'];
    for (let i = 0; i < native.before.length; i++) {
      const a = structuredClone(native.before[i]), b = structuredClone(native.reopened[i]);
      if (permitted.includes(a.name)) {
        assert.equal(a.name, b.name); assert.equal(b.kind, 'LayerKind.SMARTOBJECT');
        delete a.bounds; delete b.bounds;
        if (a.name === 'ART - CONTENU') { delete a.id; delete b.id; }
      } else if (!a.kind) { delete a.bounds; delete b.bounds; }
      assert.deepEqual(b, a, item.key + ': unexpected native change in ' + a.path);
    }
    const roundtrip = await L.diff(path.join(dir, 'card.png'), path.join(dir, 'reopened.png'));
    assert.equal(roundtrip.changed, 0, 'PSD roundtrip is not exact');
    const repeat = await L.diff(path.join(dir, 'card.png'), path.join(dir, 'repeat.png'));
    assert.equal(repeat.changed, 0, 'Optical placement is not repeat-stable');
    const fixed = await L.diff(path.join(dir, 'fixed-before.png'), path.join(dir, 'fixed-after.png'));
    assert.equal(fixed.changed, 0, 'Unchanged native layers differ');
    const rectangles = item.key === 'balmhyr' ? [[80,156,817,1077],[89,1116,185,1211],[711,1116,807,1211]] : [[711,1116,807,1211]];
    const comparison = await L.diff(path.join(ROOT, item.png), path.join(dir, 'card.png'), rectangles);
    assert.equal(comparison.outside, 0, 'Pixels changed outside requested components');
    assert.ok(comparison.changed > 0);
    const race = await contour(path.join(dir, 'race.png'), calibration.race.NAIN);
    const weapon = item.key === 'balmhyr' ? await contour(path.join(dir, 'weapon.png'), calibration.weapon.Hache) : null;
    const futureRace = await L.diff(path.join(dir, 'race.png'), path.join(dir, 'future-race.png'));
    assert.equal(futureRace.changed, 0, 'Future native NAIN placement differs');
    const futureWeapon = item.key === 'balmhyr' ? await L.diff(path.join(dir, 'weapon.png'), path.join(dir, 'future-weapon.png')) : null;
    if (futureWeapon) assert.equal(futureWeapon.changed, 0, 'Future native Hache placement differs');
    assert.deepEqual(nativePrecision(read(path.join(dir, 'future-native.json')).calibration), nativePrecision(calibration));
    const bound = read(path.join(dir, 'bind-native.json'));
    assert.deepEqual(nativePrecision(bound.calibration), nativePrecision(calibration));
    assert.equal(bound.helperSource.replace(/\r\n/g, '\n'), fs.readFileSync(path.join(work, 'staged/elements-common.jsx'), 'utf8').replace(/\r\n/g, '\n'));
    const bindRace = await L.diff(path.join(dir, 'race.png'), path.join(dir, 'bind-race.png'));
    assert.equal(bindRace.changed, 0, 'Production E.bind NAIN differs');
    const bindWeapon = item.key === 'balmhyr' ? await L.diff(path.join(dir, 'weapon.png'), path.join(dir, 'bind-weapon.png')) : null;
    if (bindWeapon) assert.equal(bindWeapon.changed, 0, 'Production E.bind Hache differs');
    const card = old.cards.find(c => c.key === item.key);
    const barcode = JSON.parse(execFileSync(L.PYTHON, [path.join(ROOT, 'V4/atelier/barcode.py'), path.join(dir, 'card.png'), card.card.id], { windowsHide: true, encoding: 'utf8' }));
    assert.equal(barcode.passed, true);
    results.push({ key: item.key, passed: true, comparison, roundtrip, repeat, fixed, race, weapon, futureRace, futureWeapon, bindRace, bindWeapon, barcode,
      psdHash: await hash(path.join(dir, 'card.psd')), pngHash: await hash(path.join(dir, 'card.png')), nativeHash: await hash(path.join(dir, 'native.json')) });
    await sharp(path.join(dir, 'card.png')).resize({ width: 300 }).png().toFile(path.join(dir, 'small.png'));
    await sharp(path.join(dir, 'card.png')).extract({ left: 65, top: 1092, width: 763, height: 140 }).resize({ width: 1145 }).png().toFile(path.join(dir, 'icons-zoom.png'));
    console.log(item.key, { fixed, comparison, repeat, race, weapon });
  }
  const installHashes = {};
  for (const item of plan.items) for (const format of ['psd', 'png']) installHashes[item[format]] = await hash(path.join(ROOT, item.destination, 'card.' + format));
  for (const item of [...plan.install || [], ...plan.jsonUpdates || []]) installHashes[item.to] = await hash(path.join(ROOT, item.from));
  const componentHashes = {};
  for (const file of plan.protect || []) {
    if (installHashes[file]) componentHashes[file] = installHashes[file];
    else if (!/\/(plan|verification|references-before)\.json$|\/publish\.cjs$/.test(file)) componentHashes[file] = await hash(path.join(ROOT, file));
  }
  const unchanged = old.cards.filter(c => !plan.items.some(i => i.key === c.key));
  for (const card of unchanged) {
    assert.equal(await hash(path.join(ROOT, card.psd)), old.protectedFiles[card.psd]);
    assert.equal(await hash(path.join(ROOT, card.png)), old.protectedFiles[card.png]);
  }
  await L.protectedCheck(old);
  write(path.join(work, 'verification.json'), { revision: plan.revision, passed: true, results, installHashes, componentHashes,
    calibrationHash: await hash(path.join(work, 'calibration.json')), unchangedCards: unchanged.map(c => c.key),
    originalReferenceId: old.id, checkedAt: new Date().toISOString(), sourcesUnchanged: true });
})().catch(e => { console.error(e); process.exitCode = 1; });
