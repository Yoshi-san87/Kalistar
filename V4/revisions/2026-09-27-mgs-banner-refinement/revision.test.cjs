'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('./model.cjs');
test('Scope is exactly ten existing MGS cards and Kaylis', () => {
  const cards = M.specs();
  assert.equal(cards.length, 11); assert.equal(new Set(cards.map(c => c.id)).size, 11);
  assert.equal(cards.filter(c => c.faction).length, 10);
  assert.deepEqual(cards.filter(c => c.crop).map(c => c.key), ['liquid-snake', 'kaylis']);
});
test('Only two crop metadata fields may change; gameplay and other fields are immutable', () => {
  for (const c of M.specs()) {
    const before = { id: c.id, crop: { zoom: 1, x: 0, y: 0 }, atk: [250, 200], title: 'unchanged' };
    const after = M.profile(before, c);
    M.profileGuard(before, after, c);
    assert.deepEqual(before.crop, { zoom: 1, x: 0, y: 0 });
    after.atk[0]++; assert.throws(() => M.profileGuard(before, after, c));
  }
});
test('Only the artwork or banner windows and named smart objects are allowed', () => {
  for (const c of M.specs()) {
    assert.deepEqual(M.names(c), c.key === 'kaylis' ? [M.ART] :
      c.key === 'liquid-snake' ? [M.ART, 'FACTION - MGS1'] : ['FACTION - ' + c.faction]);
    assert.deepEqual(M.windows(c), c.crop ? [[80, 156, 817, 1077]] : [[672, 829, 770, 1052]]);
  }
});
test('Crop parameters retain proportional cover and valid bounded pan', () => {
  for (const c of M.specs().filter(c => c.crop)) {
    assert.ok(c.crop.zoom >= 1 && c.crop.zoom <= 1.15);
    assert.ok(Math.abs(c.crop.x) <= 1 && Math.abs(c.crop.y) <= 1);
  }
});
test('Publication targets only eleven creations and their catalogue; original art excluded', () => {
  const targets = require('./revise.cjs').targets();
  assert.equal(targets.length, 47);
  assert.equal(targets.filter(f => f.endsWith('profile.json')).length, 2);
  assert.ok(targets.every(f => /[\\/]V4[\\/](creations[\\/]|donnees[\\/]catalogue.json$)/.test(f)));
  assert.ok(targets.every(f => !f.endsWith('illustration.png')));
});
test('Catalogue update preserves unrelated rows and changes only crop/revision metadata', () => {
  const { revisedCatalogue } = require('./revise.cjs'), specs = M.specs();
  const before = { cards: specs.map(c => ({ id: c.id, kind: 'created', profile: { id: c.id, crop: { zoom: 1, x: 0, y: 0 }, atk: [123] } })) };
  before.cards.push({ id: 'other', profile: { title: 'untouched' } });
  const after = revisedCatalogue(before, Object.fromEntries(specs.map(c => [c.id, { id: M.REVISION }])));
  assert.deepEqual(after.cards.at(-1), before.cards.at(-1));
  for (let i = 0; i < specs.length; i++) {
    const row = structuredClone(after.cards[i]); delete row.nativeRevision;
    row.profile.crop = before.cards[i].profile.crop;
    assert.deepEqual(row, before.cards[i]);
  }
});
test('Parent flags obey the existing dimensions, hashes and FF8 alpha contract', async () => {
  const L = require('../../atelier/lib.cjs');
  await require('../../expansions/2026-09-27-metal-gear-mines/assets.cjs').createAssets(L, __dirname).verify();
});
test('Embedded flag resolution changes metadata only, not a single source pixel', async () => {
  const L = require('../../atelier/lib.cjs');
  for (const faction of ['MGS1', 'MGS2', 'MGS4']) {
    const input = L.path.join(__dirname, 'art-flags', 'flag-' + faction + '-packed.png');
    const output = await L.sharp(input).withMetadata({ density: 300 }).png().toBuffer();
    assert.equal((await L.sharp(output).metadata()).density, 300);
    assert.deepEqual(await L.sharp(output).raw().toBuffer(), await L.sharp(input).raw().toBuffer());
  }
});
