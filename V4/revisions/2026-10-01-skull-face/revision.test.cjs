'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs'), S = require('./revise.cjs');
const p = L.read(L.path.join(L.ROOT, 'V4/expansions/2026-09-30-metal-gear-saga/cards/skull-face/profile.json'));
const old = L.read(L.path.join(L.ROOT, 'V4/expansions/2026-09-30-metal-gear-saga/cards/skull-face/render/native.json'));
const clone = v => structuredClone(v), revised = () => ({ ...clone(p), race: 'SKULLZ' });
test('only HUMAIN to SKULLZ, identity, MGS5, positions and stats unchanged', () => {
  S.raceOnly(p, revised());
  for (const [field, value] of Object.entries({ name: 'OTHER', id: '49600119', characterId: 'other', race: 'CYBORG', faction: 'MGS4',
    positions: [2, 4], atk: [999, 225, 180, 130, 80, 'retry'], defense: [0, 125, 95, 65, 35, 10], artworkSource: S.ART, description: 'New text' })) {
    assert.throws(() => S.raceOnly(p, { ...revised(), [field]: value }), field);
  }
});
test('publication operates on fresh catalogue with later One Piece additions intact', () => {
  const before = { schemaVersion: 1, cards: [{ id: S.ID, profile: clone(p), nativeRevision: { id: 'old' } },
    ...Array.from({ length: 11 }, (_, i) => ({ id: 'OP-' + i, profile: { race: i === 0 ? 'SHARKAN' : 'HUMAIN' } }))] };
  const after = clone(before); after.cards[0].profile = revised(); after.cards[0].nativeRevision = { id: S.REV };
  S.catalogueChange(before, after, p, revised());
  const bad = clone(after); bad.cards[1].profile.race = 'SKULLZ'; assert.throws(() => S.catalogueChange(before, bad, p, revised()));
  const count = clone(after); count.cards.pop(); assert.throws(() => S.catalogueChange(before, count, p, revised()));
  const title = clone(after); title.cards[0].title = 'Unexpected'; assert.throws(() => S.catalogueChange(before, title, p, revised()));
  const top = clone(after); top.schemaVersion++; assert.throws(() => S.catalogueChange(before, top, p, revised()));
});
test('current playable catalogue accepts only the target race transition', async () => {
  const G = require('../../atelier/game-catalog.cjs');
  const before = L.read(L.path.join(L.ROOT, 'V4/donnees/catalogue.json')).cards.filter(c => c.kind === 'created'), after = clone(before);
  after.find(c => c.id === S.ID).profile = revised();
  const a = await G.buildCatalog({ published: before }), b = await G.buildCatalog({ published: after });
  assert.equal(a.cards.length, b.cards.length);
  for (const card of a.cards) assert.deepEqual(b.cards.find(c => c.id === card.id), card.id === S.ID ? { ...card, race: 'SKULLZ' } : card);
});
function nativeFixture() {
  const before = clone(old.layers), after = clone(before);
  const race = after.find(l => l.name === 'RACE'); race.text = 'SKULLZ';
  const icon = after.find(l => l.name === 'RACE - HUMAIN'); icon.name = icon.path = 'RACE - SKULLZ';
  const audit = { before, after, reopened: clone(after), textsBefore: [{ path: 'RACE', nativeStyleRuns: 'same' }],
    textsAfter: [{ path: 'RACE', nativeStyleRuns: 'same' }], textsReopened: [{ path: 'RACE', nativeStyleRuns: 'same' }],
    effectsBefore: [{ path: 'NOM', effects: 'same' }], effectsAfter: [{ path: 'NOM', effects: 'same' }], effectsReopened: [{ path: 'NOM', effects: 'same' }],
    embeddedAfter: [{ name: 'ILLUSTRATION - cadrage', linked: false }, { name: 'RACE - SKULLZ', linked: false }] };
  audit.embeddedReopened = clone(audit.embeddedAfter);
  return { audit, native: { layers: clone(after) } };
}
test('native audit accepts exact preserved layers and rejects mutations', () => {
  const good = nativeFixture(); S.assertNative(good.audit, good.native, old);
  const cases = [
    a => { a.after.find(l => l.name === 'NOM').text = 'OTHER'; },
    a => { a.after.find(l => l.name === 'RACE').font = 'Arial'; },
    a => { a.after.find(l => l.name === 'RACE').ink[0] += 8; },
    a => { a.after.find(l => l.name === 'RACE - SKULLZ').bounds[0]++; },
    a => { a.textsAfter[0].nativeStyleRuns = 'changed'; },
    a => { a.effectsAfter[0].effects = 'changed'; },
    a => { a.embeddedAfter[0].linked = true; },
    a => { a.reopened.find(l => l.name === 'DESCRIPTION').text = 'OTHER'; }
  ];
  for (const mutate of cases) { const f = nativeFixture(); mutate(f.audit); assert.throws(() => S.assertNative(f.audit, f.native, old)); }
});
test('pixel scope rejects even one out-of-scope pixel', async () => {
  const raw = Buffer.alloc(897 * 1497 * 4, 255), changed = Buffer.from(raw);
  const png = data => L.sharp(data, { raw: { width: 897, height: 1497, channels: 4 } }).png().toBuffer();
  changed[(200 * 897 + 300) * 4] = 0;
  const allowed = [S.ART_RECT, S.ICON_RECT, [549, 1162, 649, 1183]];
  assert.deepEqual(await L.diff(await png(raw), await png(changed), allowed), { changed: 1, outside: 0 });
  changed[(1400 * 897 + 50) * 4] = 0;
  assert.deepEqual(await L.diff(await png(raw), await png(changed), allowed), { changed: 2, outside: 1 });
});
test('Photoshop and publication need explicit grants before touching resources', async () => {
  const keys = ['KALISTAR_SKULL_PS_GRANTED', 'KALISTAR_SKULL_PARENT_COORDINATED', 'KALISTAR_SKULL_CODE_STABLE'];
  const before = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  try {
    for (const k of keys) delete process.env[k];
    await assert.rejects(S.render(), /Explicit parent Photoshop grant/);
    await assert.rejects(S.publish(), /Parent release approval/);
    await assert.rejects(S.prepare(), /shared SHARKAN code is stable/);
  } finally { for (const k of keys) if (before[k] === undefined) delete process.env[k]; else process.env[k] = before[k]; }
});
test('bridge uses only exact active Photoshop, mutex and process lock', () => {
  const bridge = L.fs.readFileSync(L.path.join(__dirname, 'render.ps1'), 'utf8');
  assert.match(bridge, /GetActiveObject\('Photoshop.Application.190'\)/);
  assert.match(bridge, /26\.11\.7/); assert.match(bridge, /KalistarV4AtelierRender/); assert.match(bridge, /render.lock/);
  assert.doesNotMatch(bridge, /New-Object -ComObject/);
});
