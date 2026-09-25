const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const sharp = require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '../../../..');
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'provenance.json'), 'utf8'));
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex').toUpperCase();

async function main() {
  const report = { scope: 'illustration-only', references: [], outputs: [], nativeFrameQa: 'pending-parent' };
  for (const ref of manifest.referenceImages) {
    assert.equal(hash(path.join(root, ref.path)), ref.sha256, ref.path);
    report.references.push({ path: ref.path, sha256: ref.sha256, verified: true });
  }
  const layers = [];
  let selected = 0;
  for (const item of manifest.outputs) {
    const file = path.join(__dirname, item.selected || item.file);
    assert.equal(hash(file), item.sha256, item.key);
    assert.equal(hash(path.join(__dirname, item.request)), item.requestSha256, item.request);
    const request = JSON.parse(fs.readFileSync(path.join(__dirname, item.request), 'utf8'));
    for (const ref of manifest.referenceImages.filter(ref => ref.role.includes('style'))) {
      assert.ok(request.referenced_image_paths.some(p => path.resolve(p) === path.resolve(root, ref.path)), item.request + ' style references');
    }
    for (const ref of request.referenced_image_paths) assert.ok(fs.existsSync(ref), ref);
    const metadata = await sharp(file).metadata();
    assert.equal(metadata.format, 'png');
    assert.ok(Math.abs(metadata.width / metadata.height - 0.8) < 0.001, item.key + ' ratio');
    assert.ok(metadata.width >= 1000 && metadata.height >= 1250, item.key + ' resolution');
    report.outputs.push({ key: item.key, file: path.basename(file), selected: Boolean(item.selected), width: metadata.width, height: metadata.height, sha256: item.sha256, verified: true });
    if (item.selected) {
      layers.push({ input: await sharp(file).resize(224, 280, { fit: 'fill' }).png().toBuffer(), left: (selected % 2) * 240 + 8, top: Math.floor(selected / 2) * 296 + 8 });
      selected++;
    }
  }
  assert.equal(selected, 4);
  const qa = path.join(__dirname, 'qa');
  fs.mkdirSync(qa, { recursive: true });
  await sharp({ create: { width: 480, height: 592, channels: 3, background: '#171b1a' } }).composite(layers).png().toFile(path.join(qa, 'small-size-contact.png'));
  fs.writeFileSync(path.join(qa, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify({ ok: true, refs: report.references.length, generations: report.outputs.length, selected, report: 'qa/results.json' }));
}
main().catch(error => { process.stderr.write(error.stack); process.exitCode = 1; });
