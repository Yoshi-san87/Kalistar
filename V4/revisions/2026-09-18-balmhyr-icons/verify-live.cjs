const L = require('../../atelier/lib.cjs');
const { fs, path, ROOT, read, write, hash, assert, sharp } = L;
(async () => {
  const work = __dirname, ref = L.baseline(), old = read(path.join(work, 'references-before.json'));
  const plan = read(path.join(work, 'plan.json')), audit = read(path.join(work, 'verification.json'));
  assert.equal(ref.parentReferenceId, old.id);
  const protectedCount = await L.protectedCheck(ref);
  const pack = read(path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'));
  const packBefore = read(path.join(work, 'pack-before.json'));
  assert.equal(pack.referenceId, ref.id); assert.equal(pack.status, 'ready');
  const changedComponents = ['packed/banks/weapon-Hache.png', 'packed/banks/race-NAIN.png'];
  let unchangedComponents = 0;
  assert.deepEqual(Object.keys(pack.hashes).sort(), Object.keys(packBefore.hashes).sort());
  for (const [file, expected] of Object.entries(pack.hashes)) {
    assert.equal(await hash(path.join(ROOT, 'V4/atelier/designer-assets', file)), expected);
    if (!changedComponents.includes(file)) { assert.equal(expected, packBefore.hashes[file]); unchangedComponents++; }
  }
  const cards = [];
  const runtime = read(path.join(L.DATA, 'runtime.json'));
  for (const item of plan.items) {
    const result = audit.results.find(r => r.key === item.key), current = ref.cards.find(c => c.key === item.key);
    assert.equal(await hash(path.join(ROOT, item.psd)), result.psdHash);
    assert.equal(await hash(path.join(ROOT, item.png)), result.pngHash);
    const previous = old.cards.find(c => c.key === item.key), expected = structuredClone(previous.card);
    if (item.key === 'balmhyr') expected.artworkSource = plan.artwork;
    assert.deepEqual(current.card, expected);
    const response = await fetch(runtime.url + '/media/reference/' + item.key + '.png');
    assert.equal(response.status, 200);
    const servedHash = L.crypto.createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex');
    assert.equal(servedHash, result.pngHash, 'Browser receives stale image');
    cards.push({ key: item.key, id: current.card.id, servedHash, fieldsPreserved: true });
  }
  const catalogue = await (await fetch(runtime.url + '/api/game/catalogue')).json();
  assert.equal(catalogue.referenceId, ref.id);
  assert.deepEqual(catalogue.cards.map(c => c.id).sort(), old.cards.map(c => c.card.id).sort());
  const restoredBanks = [];
  for (const [spec, key, source] of [[pack.weapons.Hache, 'balmhyr', 'weapon-bank.png'], [pack.races.NAIN, 'lok', 'race-bank.png']]) {
    const expected = await sharp(path.join(work, 'staged', key, source)).ensureAlpha().raw().toBuffer();
    const {data, info} = await sharp(path.join(ROOT, 'V4/atelier/designer-assets', spec.file)).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    const restored = Buffer.alloc(897 * 1497 * 4);
    for (let y = 0; y < info.height; y++) data.copy(restored, ((spec.top + y) * 897 + spec.left) * 4, y * info.width * 4, (y + 1) * info.width * 4);
    // Photoshop keeps RGB in fully transparent canvas pixels; only alpha and visible RGB are meaningful.
    for (let i = 0; i < expected.length; i += 4) {
      assert.equal(restored[i + 3], expected[i + 3], 'Bank alpha geometry changed during extraction');
      if (expected[i + 3]) for (let c = 0; c < 3; c++) assert.equal(restored[i + c], expected[i + c], 'Visible bank color changed');
    }
    restoredBanks.push({ file: spec.file, alphaIdentical: true, visiblePixelsIdentical: true });
  }
  let regression = null;
  if (process.argv.includes('--complete')) {
    const r = read(path.join(L.DATA, 'regression.json'));
    assert.equal(r.referenceId, ref.id); assert.equal(r.passed, true); assert.equal(r.results.length, 26);
    assert.ok(r.results.every(c => c.passed && c.comparison.changed === 0 && c.roundtrip.changed === 0 && c.barcode.passed));
    regression = { passed: true, cards: r.results.length, checkedAt: r.checkedAt };
  }
  const report = { passed: true, referenceId: ref.id, protectedCount, cards, unchangedCards: 24,
    unchangedComponents, changedComponents, restoredBanks, catalogueCount: catalogue.cards.length,
    regression, checkedAt: new Date().toISOString() };
  write(path.join(work, regression ? 'complete.json' : 'live-verification.json'), report);
  console.log(report);
})().catch(e => { console.error(e); process.exitCode = 1; });
