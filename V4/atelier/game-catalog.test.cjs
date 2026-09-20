'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { webcrypto } = require('node:crypto');
const { buildCatalog, CROP } = require('./game-catalog.cjs');
const { createEngine } = require('../site/engine.js');
const Media = require('../site/card-media.js');
const Library = require('../site/deck-library.js');
const ROOT = path.resolve(__dirname, '../..');
const references = require('./data/references.json');
const legacy = require('../../V3/donnees/cartes.json');
const published = () => ({ id: '40000099', profile: { ...references.cards[4].card, name: 'TEST PUBLICATION', description: 'Texte imprime V4.' },
  pngUrl: '/exports/test/card.png', psdUrl: '/exports/test/card.psd' });
const loadModule = file => {
  const context = { window: {}, structuredClone, crypto: webcrypto, console };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../site', file), 'utf8'), context);
  return context.window;
};

test('only the current approved V4 references, without legacy art or provenance paths', async () => {
  const data = await buildCatalog();
  assert.equal(data.version, 4); assert.equal(data.edition, 'V4'); assert.equal(data.cards.length, references.cards.length);
  assert.deepEqual(data.cards.map(c => c.id).sort(), references.cards.map(c => c.card.id).sort());
  for (const c of legacy.filter(c => !references.cards.some(r => r.card.id === c.id))) assert.ok(!data.cards.some(v => v.id === c.id));
  assert.ok(!JSON.stringify(data.cards).includes('V3/'));
  assert.deepEqual(JSON.parse(JSON.stringify(data)), data);
  assert.deepEqual(data.rules, require('../../V3/donnees/regles.json'));
  assert.deepEqual(data.weapons, require('../../V3/donnees/armes.json'));
});

test('Voloden requires V4 approval and retains his V3 role, sentry and death face', async () => {
  const source = legacy.find(c => c.id === '30000028');
  assert.equal(source.name, 'VOLODEN'); assert.equal(source.race, 'CARDEMORTIS'); assert.equal(source.weapon, 'Faucille');
  assert.equal(source.role, 2); assert.equal(source.sentry, true); assert.equal(source.canGuard, false); assert.equal(source.atk[0], 'death');
  const ref = references.cards.find(c => c.card.id === source.id), data = await buildCatalog();
  const card = data.cards.find(c => c.id === source.id);
  if (!ref) { assert.equal(card, undefined, 'V3-only Voloden must not leak into V4'); return; }
  assert.equal(ref.key, 'voloden');
  assert.equal(card.origin, 'approved'); assert.equal(card.edition, 'V4');
  for (const field of ['race', 'weapon', 'element', 'faction', 'positions', 'atk', 'defense', 'magic', 'barriers']) {
    assert.deepEqual(ref.card[field], source[field], 'Voloden profile ' + field);
    assert.deepEqual(card[field], source[field], 'Voloden game ' + field);
  }
  assert.equal(card.role, 2); assert.equal(card.sentry, true); assert.equal(card.canGuard, false); assert.equal(card.canHeal, false);
  assert.equal(card.atk[0], 'death'); assert.ok(ref.options.atk[0].includes('death'), 'Native ATK D6 must register death');
  assert.deepEqual(createEngine(data).byId[source.id].atk, source.atk);
});

test('printed V4 fields override V3 metadata and support faces remain valid', async () => {
  const data = await buildCatalog();
  for (const ref of references.cards) {
    const c = data.cards.find(c => c.id === ref.card.id);
    for (const field of ['name', 'title', 'job', 'race', 'faction', 'element', 'weapon', 'positions', 'atk', 'defense', 'magic', 'barriers']) assert.deepEqual(c[field], ref.card[field], ref.key + '.' + field);
    assert.equal(c.text, ref.card.description); assert.equal(c.edition, 'V4');
    assert.equal(c.pngUrl, '/media/reference/' + ref.key + '.png');
    assert.ok(Number.isInteger(c.role)); assert.equal(typeof c.sentry, 'boolean');
    if (c.atk.includes('guard')) assert.ok(c.canGuard);
    if (c.atk.includes('revive')) assert.ok(c.canHeal);
  }
  const momo = data.cards.filter(c => c.name === 'MOMO');
  assert.equal(new Set(momo.map(c => c.characterId)).size, 1);
  assert.equal(data.cards.find(c => c.id === '40000042').race, 'FELINEUS');
});

test('safe crop matches the approved PNG dimensions, rejects historical sizes', async () => {
  assert.deepEqual(Media.crop, CROP);
  for (const ref of references.cards) {
    const handle = fs.openSync(path.join(ROOT, ref.png), 'r'), header = Buffer.alloc(24);
    try { fs.readSync(handle, header, 0, 24, 0); } finally { fs.closeSync(handle); }
    assert.equal(header.toString('ascii', 1, 4), 'PNG');
    assert.deepEqual(Media.validateDimensions(header.readUInt32BE(16), header.readUInt32BE(20)), CROP);
  }
  assert.throws(() => Media.validateDimensions(950, 1655), /897/);
});

test('default and preset decks use only owned V4 cards and cover P1-P5 twice', async () => {
  const d = await buildCatalog(), e = createEngine(d);
  for (const ids of [d.decks.player, d.decks.enemy, ...d.decks.presets.map(p => p.cards)]) {
    assert.equal(ids.length, 10); assert.equal(new Set(ids).size, 10);
    assert.deepEqual(e.validatePlayableDeck(ids), []);
    assert.ok(Object.values(e.deckCoverage(ids)).every(n => n >= 2));
  }
});

test('publication appended with its new ID and correct URLs, no legacy fallbacks', async () => {
  const item = published(), d = await buildCatalog({ published: [item] });
  assert.equal(d.cards.length, references.cards.length + 1);
  const c = d.cards.find(c => c.id === item.id);
  assert.equal(c.origin, 'published'); assert.equal(c.name, item.profile.name);
  assert.equal(c.pngUrl, item.pngUrl); assert.equal(c.psdUrl, item.psdUrl); assert.equal(c.text, item.profile.description);
  assert.ok(createEngine(d).byId[item.id]);
  assert.equal((await buildCatalog()).cards.length, references.cards.length);
  await assert.rejects(buildCatalog({ published: [item, item] }), /dupliqu/);
  await assert.rejects(buildCatalog({ published: [{ ...item, id: '30000003' }] }), /nouvel identifiant/);
  await assert.rejects(buildCatalog({ published: [{ ...item, id: '40000042' }] }), /dupliqu/);
  await assert.rejects(buildCatalog({ published: [{ ...item, pngUrl: '//evil.invalid/card.png' }] }), /URL/);
});

test('seed is additive and idempotent, Paris gets new originals, Tokyo stays empty', async () => {
  const O = loadModule('ownership.js').KalistarOwnership;
  const s = Object.fromEntries(O.stores.map(k => [k, []]));
  const write = (store, value) => { const i = s[store].findIndex(r => r.id === value.id); if (i < 0) s[store].push(value); else s[store][i] = value; };
  const d = await buildCatalog(); O.seed(s, write, d);
  assert.equal(s.collectibles.length, references.cards.length); assert.ok(s.collectibles.every(c => c.ownerId === O.PARIS));
  const original = s.collectibles[0].id; s.collectibles[0].ownerId = O.TOKYO;
  const before = JSON.stringify(s.collectibles);
  O.seed(s, write, d); assert.equal(JSON.stringify(s.collectibles), before);
  O.seed(s, write, await buildCatalog({ published: [published()] }));
  assert.equal(s.collectibles.length, references.cards.length + 1); assert.equal(s.events.length, references.cards.length + 1);
  assert.equal(s.collectibles.find(c => c.id === original).ownerId, O.TOKYO);
  assert.equal(s.collectibles.find(c => c.cardId === published().id).ownerId, O.PARIS);
});

test('printed support abilities are retained or explicitly rejected by V3 role constraints', async () => {
  const item = published(); item.profile.atk = [200, 150, 100, 50, 'guard', 'revive'];
  await assert.rejects(buildCatalog({ published: [item] }), /guard.*P1\/P5/);
  item.profile.positions = [1]; item.profile.role = 1;
  await assert.rejects(buildCatalog({ published: [item] }), /revive.*P5/);
  item.profile.positions = [5]; item.profile.role = 5; item.profile.magic = []; item.profile.barriers = [];
  const data = await buildCatalog({ published: [item] }), c = data.cards.find(c => c.id === item.id);
  assert.deepEqual(c.atk, item.profile.atk); assert.equal(c.canGuard, true); assert.equal(c.canHeal, true);
});

test('V4 storage and deck envelopes reject V3 without touching its keys', async () => {
  const data = await buildCatalog(), stored = new Map([['kalistar.v3.deckLibrary.user-paris', 'DO NOT CHANGE']]);
  const storage = { getItem: k => stored.get(k) ?? null, setItem: (k, v) => stored.set(k, v) };
  const l = Library.create({ storage, userId: 'user-paris', knownIds: data.cards.map(c => c.id), crypto: webcrypto });
  assert.equal(l.key, 'kalistar.v4.deckLibrary.user-paris');
  assert.throws(() => l.importJSON(JSON.stringify({ schema: 1, edition: 'V3', decks: [] })));
  assert.equal(stored.get('kalistar.v3.deckLibrary.user-paris'), 'DO NOT CHANGE');
  const DB = loadModule('local-db.js').KalistarLocalDB;
  await assert.rejects(DB.open(data, { name: 'kalistar-v3-cards' }), /isol/);
  const e = createEngine(data), s = e.newGame(data.decks.player, data.decks.enemy, { deckCoverage: 2 });
  assert.equal(DB.validateGame(s), s);
  assert.throws(() => DB.validateGame({ ...s, edition: 'V3' }));
  assert.throws(() => e.restoreGame({ ...s, edition: 'V3' }));
  assert.throws(() => createEngine({ ...data, version: 3 }));
  assert.throws(() => createEngine({ ...data, cards: [{ ...data.cards[0], edition: 'V3' }] }));
});

test('active match restores unchanged after new catalogue publication', async () => {
  const d = await buildCatalog(), e = createEngine(d);
  const s = e.newGame(d.decks.player, d.decks.enemy, { deckCoverage: 2, seed: 'V4-RESTORE' });
  e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s); e.lock(s, ...e.aiChoice(s)); e.rollAttack(s);
  const upgraded = createEngine(await buildCatalog({ published: [published()] }));
  assert.deepEqual(upgraded.restoreGame(s), s);
});

test('unchanged V3 mechanics: deterministic full games agree after identity normalization', async () => {
  const d = await buildCatalog();
  const v3 = require('../../V3/site/engine.js').createEngine({ ...d, cards: d.cards.filter(c => c.id.startsWith('30')) });
  const v4 = createEngine(d);
  const step = (e, s) => {
    if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
    else if (s.phase === 'attack') e.rollAttack(s);
    else if (s.phase === 'defense') e.rollDefense(s);
    else if (s.phase === 'result') e.next(s);
    else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
    else { const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase]; e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s)); }
  };
  const normalize = s => { const value = JSON.parse(JSON.stringify(s).replaceAll('K4-', 'K3-')); delete value.edition; return value; };
  for (let i = 0; i < 5; i++) {
    const options = { seed: 'V4-MECHANICS-' + i, deckCoverage: 2 };
    const old = v3.newGame(d.decks.player, d.decks.enemy, options), current = v4.newGame(d.decks.player, d.decks.enemy, options);
    current.matchId = old.matchId;
    for (const [e, s] of [[v3, old], [v4, current]]) { e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s); }
    for (let n = 0; n < 10000 && old.phase !== 'over'; n++) { step(v3, old); step(v4, current); }
    assert.equal(current.phase, 'over'); assert.deepEqual(normalize(current), old);
  }
});
