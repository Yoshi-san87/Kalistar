'use strict';
const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
const T = require('../../expansions/2026-09-24-royal-training/typography.cjs');
const cropper = require('../../expansions/2026-09-27-metal-gear-mines/build.cjs').createBuilder();
const M = require('./model.cjs');
const { fs, path, assert, read, write, hash, sharp, ROOT } = L;
async function preview() {
  assert.ok(!fs.existsSync(path.join(__dirname, 'before.json')), 'No exploratory previews after the native snapshot.');
  const results = [];
  for (const c of M.specs().filter(c => c.crop)) {
    const evidence = L.inside(ROOT, c.evidence), active = path.join(ROOT, 'V4/creations', c.id);
    const original = path.join(ROOT, 'V4/Illustrations', c.art), out = path.join(__dirname, 'qa', c.key);
    assert.ok(!fs.existsSync(out), 'Preview already exists: ' + c.key);
    assert.equal(await hash(original), await hash(path.join(active, 'illustration.png')), 'Original artwork differs from active source.');
    assert.equal(await hash(path.join(evidence, 'card.png')), await hash(path.join(active, 'card.png')), 'Stale native evidence.');
    const p = read(path.join(active, 'profile.json')), plan = read(path.join(evidence, 'render/composition.json'));
    const art = await cropper.crop(c), beforeHash = await hash(original);
    const layers = plan.layers.map(l => ({ ...l, input: l.name === M.ART ? art.input : path.join(evidence, 'render', l.file) }));
    fs.mkdirSync(out, { recursive: true });
    await sharp(art.input).toFile(path.join(out, 'art-window.png'));
    await sharp(await R.composite(layers)).composite(await T.preview(p, R)).png().toFile(path.join(out, 'frame-preview.png'));
    await sharp(path.join(out, 'frame-preview.png')).resize({ width: 360 }).png().toFile(path.join(out, 'small-preview.png'));
    const previous = await sharp(path.join(active, 'card.png')).resize({ width: 360 }).png().toBuffer();
    const proposed = await sharp(path.join(out, 'small-preview.png')).toBuffer();
    await sharp({ create: { width: 720, height: 601, channels: 4, background: '#10151a' } })
      .composite([{ input: previous, left: 0, top: 0 }, { input: proposed, left: 360, top: 0 }])
      .png().toFile(path.join(out, 'before-after.png'));
    assert.equal(await hash(original), beforeHash);
    const result = { key: c.key, id: c.id, qaOnly: true, native: false, publishable: false,
      original: 'V4/Illustrations/' + c.art, sha256: art.sha256, sourceSize: art.sourceSize,
      oldCrop: p.crop, crop: c.crop, box: art.box, originalBytesPreserved: true,
      note: 'Left: current native card. Right: crop study with approximate text; old banner retained pending parent asset. No Photoshop.' };
    write(path.join(out, 'report.json'), result); results.push(result);
  }
  write(path.join(__dirname, 'crop-previews.json'), results);
  return results;
}
module.exports = { preview };
if (require.main === module) preview().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
