const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), crypto = require('node:crypto');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '../..');
const modules = process.env.KALISTAR_NODE_MODULES || 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const sharp = require(path.join(modules, 'sharp'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const report = require('../sources/sprites-v2/atlas-report.json'), library = require('../data/sprite-library.json');

test('all 320 frames have crisp alpha, foot anchor, gutters and motion', async () => {
  let bytes = 0;
  for (const entry of library.entries) {
    const file = path.join(root, entry.file), source = report.characters.find(c => c.id === entry.spriteKey);
    assert.equal(hash(fs.readFileSync(file)), entry.sha256);
    assert.equal(hash(fs.readFileSync(path.join(root, source.source))), source.sourceSha256);
    assert.equal(hash(fs.readFileSync(path.join(repo, source.reference))), source.referenceSha256);
    assert.equal(source.frames.length, 16);
    const buffer = fs.readFileSync(file);
    assert.equal(buffer.length, entry.bytes); bytes += buffer.length;
    const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    assert.equal(info.width, 384); assert.equal(info.height, 384);
    const visible = Array(16).fill(0), bottom = Array(16).fill(-1);
    for (let y = 0; y < 384; y++) for (let x = 0; x < 384; x++) {
      const a = data[(y * 384 + x) * 4 + 3], frame = Math.floor(y / 96) * 4 + Math.floor(x / 96);
      assert.ok(a === 0 || a === 255, entry.id + ' alpha');
      if (x % 96 < 3 || x % 96 >= 93 || y % 96 < 3 || y % 96 >= 90) assert.equal(a, 0, entry.id + ' gutter');
      if (a) { visible[frame]++; bottom[frame] = Math.max(bottom[frame], y % 96); }
    }
    assert.ok(visible.every(count => count > 500 && count < 7000), entry.id + ' sixteen nonblank poses');
    assert.ok(bottom.every(y => y === 89), entry.id + ' common foot anchor');
    const frames = [];
    for (let i = 0; i < 16; i++) frames.push(hash(await sharp(buffer).extract({ left: i % 4 * 96, top: Math.floor(i / 4) * 96, width: 96, height: 96 }).raw().toBuffer()));
    assert.equal(new Set(frames.slice(4, 8)).size, 4, entry.id + ' four running frames');
    assert.equal(new Set(frames.slice(8, 12)).size, 4, entry.id + ' four action frames');
    assert.ok(buffer.length < 60000, entry.id + ' texture budget');
  }
  assert.ok(bytes < 1000000, 'whole pack below one MB');
});

test('v1 originals remain byte-identical', () => {
  const original = require('../sources/sprites-v1/atlas-report.json');
  for (const entry of original.characters) {
    assert.equal(hash(fs.readFileSync(path.join(root, entry.file))), entry.sha256);
    assert.equal(hash(fs.readFileSync(path.join(root, entry.source))), entry.sourceSha256);
  }
});
