const { test } = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..'), repo = path.resolve(root, '../..');
const data = require('../data/sprite-library.json');

test('published appearances cover exactly the reviewed canonical identities', async () => {
  const { createSpriteLibrary } = await import('../src/sprite-library.mjs');
  const { CLIPS, SPRITE_CELL, SPRITE_FOOT } = await import('../src/sprites.mjs');
  const rows = JSON.parse(fs.readFileSync(path.join(repo, 'V4/donnees/catalogue.json'), 'utf8')).cards;
  const { cards: catalog } = await require('../../atelier/game-catalog.cjs').buildCatalog({ published: rows.filter(c => c.kind !== 'approved') });
  const production = require('../sources/sprites-v3/production.json');
  const ready = production.characters.filter(c => ['existing','ready'].includes(c.status));
  const library = createSpriteLibrary(data);
  assert.equal(library.entries.length, ready.length);
  assert.equal(library.entries.filter(e => e.file.startsWith('assets/sprites-v2/')).length, 20, 'original lot preserved');
  assert.equal(production.characterCount, new Set(catalog.map(c => c.characterId)).size);
  assert.deepEqual(new Set(production.characters.map(c => c.characterId)), new Set(catalog.map(c => c.characterId)));
  assert.equal(production.cardCount, catalog.length);
  assert.equal(data.template.cell, SPRITE_CELL); assert.equal(data.template.foot, SPRITE_FOOT);
  for (const entry of library.entries) {
    const card = catalog.find(card => String(card.id) === entry.modelId);
    assert.ok(card, entry.modelId);
    assert.equal(card.characterId, entry.characterId);
    assert.equal(card.name, entry.name);
    assert.ok(ready.some(c => c.characterId === entry.characterId && c.modelId === entry.modelId));
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
  assert.equal(new Set(data.entries.map(e => e.sha256)).size, ready.length);
  const runtime = require('../runtime-files.json');
  for (const file of ['library.html', 'library.css', 'src/sprite-gallery.mjs', 'src/sprite-library.mjs', 'data/sprite-library.json', ...data.entries.map(entry => entry.file)]) {
    assert.ok(runtime.includes(file), 'published: ' + file);
  }
});

test('unfinished production never leaks into the published library', () => {
  const production = require('../sources/sprites-v3/production.json');
  assert.equal(new Set(production.characters.map(c => c.id)).size, production.characterCount);
  for (const c of production.characters) {
    assert.ok(['existing','pending','generated','review','ready'].includes(c.status));
    const entry = data.entries.find(e => e.characterId === c.characterId);
    assert.equal(Boolean(entry), ['existing','ready'].includes(c.status), c.id);
    if (c.status === 'ready') {
      assert.ok(c.reviewedAt && c.generatedAt && c.subject);
      assert.equal(entry.sha256, c.sha256);
    }
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
