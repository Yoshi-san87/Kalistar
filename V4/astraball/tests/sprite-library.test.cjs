const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '../..');
const data = require('../data/sprite-library.json');

test('twenty distinct appearances tied to real stable identities', async () => {
  const { createSpriteLibrary } = await import('../src/sprite-library.mjs');
  const { CLIPS, SPRITE_CELL, SPRITE_FOOT } = await import('../src/sprites.mjs');
  const catalog = JSON.parse(fs.readFileSync(path.join(repo, 'V4/donnees/catalogue.json'), 'utf8')).cards;
  const library = createSpriteLibrary(data);
  assert.equal(library.entries.length, 20);
  assert.equal(data.template.cell, SPRITE_CELL); assert.equal(data.template.foot, SPRITE_FOOT);
  for (const entry of library.entries) {
    const card = catalog.find(card => String(card.id) === entry.modelId);
    assert.ok(card, entry.modelId);
    assert.equal(card.profile.characterId, entry.characterId);
    assert.equal(card.profile.name, entry.name);
    assert.equal(library.forModel(entry.modelId), entry);
    assert.equal(library.get(entry.id), entry);
    assert.ok(library.forCharacter(entry.characterId).includes(entry));
    assert.ok(Object.isFrozen(entry));
    for (const forbidden of ['atk','defense','ownership','playerId','position','stats']) assert.ok(!(forbidden in entry));
  }
  assert.equal(library.forModel('unknown'), null);
  assert.equal(library.get('__proto__'), null);
  assert.deepEqual(library.forCharacter('RIKKA'), [], 'display name is not an identity');
  for (const clip of Object.values(CLIPS)) assert.ok(clip.frames.every(frame => frame >= 0 && frame < 16));
  assert.equal(new Set(data.entries.map(e => e.sha256)).size, 20);
  const runtime = require('../runtime-files.json');
  for (const file of ['library.html', 'library.css', 'src/sprite-gallery.mjs', 'src/sprite-library.mjs', 'data/sprite-library.json', ...data.entries.map(entry => entry.file)]) {
    assert.ok(runtime.includes(file), 'published: ' + file);
  }
});

test('gallery entry and shared scripts use the release cache token', () => {
  const { versionStaticAssets } = require('../../deploy/build.cjs');
  const html = fs.readFileSync(path.join(root, 'library.html'), 'utf8');
  const output = versionStaticAssets(html, 'sprite-test');
  for (const file of ['library.css', 'src/sprite-gallery.mjs', '/jeu/cloud-config.js', '/jeu/cloud-session.js', '/jeu/auth-guard.js']) {
    assert.ok(output.includes(file + '?v=sprite-test'), file);
  }
  assert.equal(versionStaticAssets(output, 'sprite-test'), output);
});

test('unsafe, duplicate or incompatible records rejected', async () => {
  const { createSpriteLibrary } = await import('../src/sprite-library.mjs');
  for (const change of [
    row => { row.entries[0].file = '../private.png'; },
    row => { row.entries[0].file = 'https://example.org/image.png'; },
    row => { row.entries[0].modelId = 'rikka'; },
    row => { row.entries[0].sha256 = 'bad'; },
    row => { row.entries[0].width = 512; },
    row => { row.entries[0].scale = NaN; },
    row => { row.template.foot = 96; },
    row => { row.entries.push({ ...row.entries[0] }); },
  ]) {
    const copy = structuredClone(data); change(copy);
    assert.throws(() => createSpriteLibrary(copy));
  }
});

test('future second appearance never replaces the original model', async () => {
  const { createSpriteLibrary } = await import('../src/sprite-library.mjs');
  const copy = structuredClone(data), first = copy.entries[0];
  copy.entries.push({ ...first, id: first.id + '.variant', modelId: '49999999' });
  const library = createSpriteLibrary(copy);
  assert.equal(library.forCharacter(first.characterId).length, 2);
  assert.equal(library.forModel(first.modelId).id, first.id);
  assert.equal(library.forModel('49999999').id, first.id + '.variant');
});
