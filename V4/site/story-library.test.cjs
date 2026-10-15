'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES ||
  path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const sharp = createRequire(path.join(runtime, '__story_library__.cjs'))('sharp');
const repo = path.resolve(__dirname, '../..');
const proposal = path.join(repo, 'V4/propositions/2026-10-06-kalistel-books-v1');
const manifest = JSON.parse(fs.readFileSync(path.join(proposal, 'manifest.json'), 'utf8'));
const elements = require('../../V3/donnees/elements.json');
const hash = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

test('the library preserves one independent cover per canonical Kalistel', async () => {
  const codes = Object.keys(elements).filter(code => code !== 'NONE').sort();
  assert.deepEqual(manifest.items.map(book => book.code).sort(), codes);
  assert.equal(new Set(manifest.items.map(book => book.runtimeFile.sha256)).size, 12);
  for (const book of manifest.items) {
    const original = path.join(proposal, book.original);
    const image = path.join(proposal, book.image);
    assert.equal(hash(original), book.originalFile.sha256);
    assert.equal(hash(image), book.runtimeFile.sha256);
    assert.equal(hash(path.join(proposal, book.prompt)), book.promptFile.sha256);
    const runtimeImage = book.code === 'MINERO' ?
      path.join(__dirname, 'assets/ui/story-closed-grimoire-v2.webp') :
      path.join(__dirname, 'assets/ui/story-books', path.basename(image));
    assert.equal(hash(runtimeImage), book.runtimeFile.sha256);
    const metadata = await sharp(runtimeImage).metadata();
    assert.equal(metadata.width, 1024);
    assert.equal(metadata.height, 1536);
    assert.equal(metadata.hasAlpha, true);
    const stats = await sharp(runtimeImage).stats();
    assert.equal(stats.channels[3].min, 0, 'real transparent margins');
    assert.ok(stats.channels[3].max >= 250, 'solid leather, not a translucent cover');
    for (const reference of book.references) assert.equal(hash(path.join(repo, reference.path)), reference.sha256);
  }
});

test('approved Tome I and manuscript are not redrawn or rewritten', () => {
  assert.equal(hash(path.join(__dirname, 'assets/ui/story-closed-grimoire-v2.webp')),
    '3e50c2fb8fe605a08c706a251a68fa379a934baed0fb68cc2c2bd464a82a4a24');
  assert.equal(hash(path.join(__dirname, 'story-content.json')),
    'e6f3468b33b786156cb98ddaf48cc152fea2e8980e6cedf2a44a39fb797d2cef');
});
