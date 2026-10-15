'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
async function main() {
  L.assert.deepEqual(process.argv.slice(2), ['--native-authorized'], 'Feu vert Photoshop explicite requis.');
  const { fs, path, assert } = L, home = __dirname, output = path.join(home, 'typography-calibration.json');
  assert.ok(!fs.existsSync(output), 'Calibration existante : revision explicite requise.');
  const cards = L.read(path.join(home, 'set.json')).cards;
  const names = [...new Set(cards.map(c => c.name))].sort();
  const source = 'V4/expansions/2026-09-24-royal-training/revisions/ruby/originals/card.psd';
  assert.ok(fs.existsSync(path.join(L.ROOT, source)), 'Archiver le PSD Ruby original avant calibration.');
  const files = [source, 'V4/collaborations/nier-pilot-01/typography.jsx', 'V4/scripts/stable/common.jsx',
    'V4/expansions/2026-09-24-royal-training/calibrate-typography.jsx'];
  const inputs = {}; for (const f of files) inputs[f] = await L.hash(path.join(L.ROOT, f));
  await require('./build.cjs').createBuilder().locked(async () => {
    await L.protectedCheck(); L.write(path.join(home, 'typography-calibration-request.json'), { source, names,
      descriptions: cards.map(c => ({ key: c.key, description: c.description })) });
    await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
      path.join(L.ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', path.join(home, 'calibrate-typography.jsx')], path.join(home, 'typography-calibration.log'));
    const native = L.read(path.join(home, 'typography-calibration-native.json'));
    assert.deepEqual(native.names.map(n => n.name), names);
    for (const item of native.names) {
      assert.equal(item.font, 'TimesNewRomanPSMT'); assert.ok(Math.abs(item.sizePt - 10) < .001);
      assert.ok(item.width <= 471 && item.height >= 25 && item.ink[1] >= 99 && item.ink[3] <= 160, 'Hors du bandeau approuve.');
    }
    for (const [f, h] of Object.entries(inputs)) assert.equal(await L.hash(path.join(L.ROOT, f)), h);
    L.write(output, { ...native, calibratedAt: new Date().toISOString(), inputs,
      nativeHash: await L.hash(path.join(home, 'typography-calibration-native.json')), requestHash: await L.hash(path.join(home, 'typography-calibration-request.json')) });
    console.log(JSON.stringify({ calibrated: names.length, names: native.names.map(n => ({ name: n.name, width: n.width, height: n.height })), descriptions: native.descriptions }));
  });
}
if (require.main === module) main().catch(e => { console.error(e); process.exitCode = 1; });
