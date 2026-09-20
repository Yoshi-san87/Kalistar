'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto').webcrypto;
const Library = require('./deck-library.js');
const Builder = require('./deck-builder.js');
const { createEngine } = require('./engine.js');
const context = { window: {}, crypto, structuredClone, Date, Uint8Array };
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'data.js'), 'utf8'), context);
vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'ownership.js'), 'utf8'), context);
const data = structuredClone(context.window.KALISTAR_DATA), engine = createEngine(data);
const Ownership = context.window.KalistarOwnership;
const knownIds = data.cards.map(c => c.id), nulls = () => Array(10).fill(null);
const ids = (...values) => values.map(n => String(30000000 + n));
const playable = ids(7, 13, 2, 4, 1, 14, 5, 17, 3, 6);
const pad = list => list.concat(Array(10 - list.length).fill(null));
const report = { suite: 'deck-library and deck-builder isolated contracts', at: new Date().toISOString(), tests: [] };
function memory() {
  const map = new Map(); let writes = 0;
  return { map, get writes() { return writes; }, getItem: key => map.has(key) ? map.get(key) : null,
    setItem(key, value) { writes++; map.set(key, value); } };
}
const library = (storage = memory(), userId = 'user-paris', extra = {}) => Library.create({ storage, userId, knownIds, crypto, ...extra });
function stateRegistry(source = data) {
  const cache = Object.fromEntries([...Ownership.stores, 'matches', 'results'].map(k => [k, []]));
  const write = (store, item) => {
    const index = cache[store].findIndex(v => v.id === item.id);
    if (index < 0) cache[store].push(structuredClone(item)); else cache[store][index] = structuredClone(item);
  };
  Ownership.seed(cache, write, source);
  const registry = Ownership.create({ data: source, engine: createEngine(source), getCache: () => cache,
    enqueue: fn => fn(), transaction: fn => fn(cache, write), refresh: async () => {}, isOpen: () => true });
  return { registry, cache };
}
const model = (extra = {}) => Builder.createModel({ data, engine, registry: stateRegistry().registry, userId: 'user-paris', ...extra });
function snapshot(storage) { return JSON.stringify([...storage.map]); }
function rejectsWithoutWrite(storage, fn, code) {
  const before = snapshot(storage), writes = storage.writes;
  assert.throws(fn, error => !code || error.code === code);
  assert.equal(storage.writes, writes); assert.equal(snapshot(storage), before);
}
const tests = [];
const test = (name, fn) => tests.push({ name, fn });

test('empty library is read-only and isolated from legacy preferences', () => {
  const storage = memory(); storage.setItem('kalistar.v3.deck', JSON.stringify(playable));
  const before = snapshot(storage), lib = library(storage);
  assert.deepEqual(lib.list(), []); assert.equal(snapshot(storage), before);
  assert.equal(lib.key, 'kalistar.v3.deckLibrary.user-paris');
});
test('Paris and Tokyo own separate namespaces', () => {
  const storage = memory(), paris = library(storage), tokyo = library(storage, 'user-tokyo');
  paris.save({ name: 'Paris', cards: playable }); tokyo.save({ name: 'Tokyo', cards: nulls() });
  assert.equal(paris.list()[0].name, 'Paris'); assert.equal(tokyo.list()[0].name, 'Tokyo');
  assert.notEqual(paris.key, tokyo.key);
  assert.notEqual(library(storage, 'a.b').key, library(storage, 'a%2Eb').key);
});
test('ten slots preserve interior nulls through a new library instance', () => {
  const storage = memory(), lib = library(storage), cards = nulls(); cards[2] = knownIds[0]; cards[9] = knownIds[40];
  const saved = lib.save({ name: 'Trous', cards });
  assert.deepEqual(library(storage).get(saved.id).cards, cards);
  assert.match(saved.id, /^kd-[a-f\d-]{36}$/); assert.equal(storage.writes, 1);
});
test('incomplete and currently unowned compositions are persistable drafts', () => {
  const lib = library();
  lib.save({ name: 'Vide', cards: nulls() });
  lib.save({ name: 'Composition non jouable', cards: Array(10).fill(knownIds[40]) });
  assert.equal(lib.list().length, 2);
});
test('names trim, preserve French text, and accept fifty characters', () => {
  const lib = library();
  assert.equal(lib.save({ name: '  Équipe de Paris  ', cards: nulls() }).name, 'Équipe de Paris');
  assert.equal(lib.save({ name: 'x'.repeat(50), cards: nulls() }).name.length, 50);
});
test('invalid names reject without any write', () => {
  const storage = memory(), lib = library(storage);
  for (const name of ['', '   ', 'x'.repeat(51), 'A\nB', 'A\x7fB', null, 123, {}, []])
    rejectsWithoutWrite(storage, () => lib.save({ name, cards: nulls() }), 'INVALID_NAME');
});
test('slot length, sparse arrays, undefined and non-array inputs reject atomically', () => {
  const storage = memory(), lib = library(storage);
  for (const cards of [[], nulls().slice(1), Array(11).fill(null), new Array(10), undefined, {}, nulls().map((v, i) => i === 4 ? undefined : v)])
    rejectsWithoutWrite(storage, () => lib.save({ name: 'Test', cards }));
});
test('only strings within the 41 V3 ids and injected catalogue are accepted', () => {
  const storage = memory(), lib = library(storage, 'user-paris', { knownIds: knownIds.slice(0, 40) });
  for (const id of ['00000001', '30000000', '30000042', '30000041', '30000001x', 30000001, {}, false, '__proto__']) {
    const cards = nulls(); cards[4] = id;
    rejectsWithoutWrite(storage, () => lib.save({ name: 'Test', cards }), 'INVALID_CARD');
  }
});
test('catalogue and user configuration are validated', () => {
  for (const knownIds of [[], ['30000042'], ['30000001', '30000001'], new Array(2), [30000001]])
    assert.throws(() => library(memory(), 'user-paris', { knownIds }));
  for (const userId of ['', ' ', null, {}, 'A\nB', 'x'.repeat(121)]) assert.throws(() => library(memory(), userId));
  assert.throws(() => Library.create({ userId: 'Paris', knownIds, crypto }));
});
test('strict draft shape rejects unknown and inherited fields', () => {
  const storage = memory(), lib = library(storage);
  rejectsWithoutWrite(storage, () => lib.save({ name: 'a', cards: nulls(), unexpected: true }));
  rejectsWithoutWrite(storage, () => lib.save(Object.create({ name: 'a', cards: nulls() })));
  assert.throws(() => lib.validateDraft({ name: 'a', cards: nulls(), id: 'bad' }));
});
test('save, get, list and validated drafts return defensive copies', () => {
  const lib = library(), cards = nulls(), saved = lib.save({ name: 'Original', cards });
  cards[0] = knownIds[0]; saved.cards[1] = knownIds[1]; saved.name = 'Mutated';
  const list = lib.list(); list[0].cards[2] = knownIds[2]; list.length = 0;
  const got = lib.get(saved.id); got.cards[3] = knownIds[3];
  assert.deepEqual(lib.get(saved.id), { id: saved.id, name: 'Original', cards: nulls() });
  const input = { name: 'Draft', cards: nulls() }, result = lib.validateDraft(input); result.cards[0] = knownIds[0];
  assert.deepEqual(input.cards, nulls());
});
test('save updates one id with one JSON write, duplicate gets a new secure id', () => {
  const storage = memory(), lib = library(storage), first = lib.save({ name: 'Premier', cards: playable });
  const updated = lib.save({ ...first, name: 'Renomme' });
  assert.equal(updated.id, first.id); assert.equal(lib.list().length, 1); assert.equal(storage.writes, 2);
  const duplicated = lib.duplicate(first.id); assert.notEqual(duplicated.id, first.id);
  assert.equal(duplicated.name, 'Renomme (copie)'); duplicated.cards[0] = null;
  assert.deepEqual(lib.get(first.id).cards, playable);
});
test('ten-entry limit holds for save and duplicate; updates remain available', () => {
  const storage = memory(), lib = library(storage);
  for (let i = 0; i < 10; i++) lib.save({ name: 'Deck ' + i, cards: nulls() });
  rejectsWithoutWrite(storage, () => lib.save({ name: 'Eleven', cards: nulls() }), 'LIBRARY_FULL');
  rejectsWithoutWrite(storage, () => lib.duplicate(lib.list()[0].id), 'LIBRARY_FULL');
  lib.save({ ...lib.list()[0], name: 'Renomme' }); assert.equal(lib.list().length, 10);
});
test('unknown ids never overwrite or delete a different entry', () => {
  const storage = memory(), lib = library(storage); lib.save({ name: 'Safe', cards: nulls() });
  for (const id of ['bad', null, undefined, 'kd-' + crypto.randomUUID()]) {
    rejectsWithoutWrite(storage, () => lib.save({ id, name: 'No', cards: nulls() }), 'NOT_FOUND');
    rejectsWithoutWrite(storage, () => lib.remove(id), 'NOT_FOUND');
    rejectsWithoutWrite(storage, () => lib.duplicate(id), 'NOT_FOUND');
  }
});
test('remove frees one slot and returns a detached composition', () => {
  const lib = library(), saved = lib.save({ name: 'Remove', cards: playable });
  const removed = lib.remove(saved.id); removed.cards[0] = null;
  assert.equal(lib.list().length, 0); assert.deepEqual(saved.cards, playable);
});
test('no insecure id fallback and no collision retry writes', () => {
  const storage = memory();
  rejectsWithoutWrite(storage, () => library(storage, 'user-paris', { crypto: {} }).save({ name: 'No', cards: nulls() }), 'NO_CRYPTO');
  const id = crypto.randomUUID(), lib = library(storage, 'user-paris', { crypto: { randomUUID: () => id } });
  lib.save({ name: 'One', cards: nulls() });
  rejectsWithoutWrite(storage, () => lib.save({ name: 'Two', cards: nulls() }), 'ID_COLLISION');
  rejectsWithoutWrite(storage, () => library(storage, 'user-paris', { crypto: { randomUUID: () => 'fake' } }).duplicate(lib.list()[0].id), 'ID_COLLISION');
});
test('valid JSON export imports atomically into another profile and preserves holes', () => {
  const storage = memory(), paris = library(storage), tokyo = library(storage, 'user-tokyo');
  const cards = nulls(); cards[7] = knownIds[0]; paris.save({ name: 'Voyage', cards });
  const imported = tokyo.importJSON(paris.exportJSON());
  assert.deepEqual(tokyo.list(), paris.list()); imported[0].cards[7] = null;
  assert.deepEqual(tokyo.list()[0].cards, cards);
});
test('JSON import rejects schema, edition, extra fields and invalid late entries', () => {
  const storage = memory(), lib = library(storage); lib.save({ name: 'Safe', cards: playable });
  const source = JSON.parse(lib.exportJSON());
  const mutations = [v => v.schema = 2, v => v.edition = 'V2', v => v.unexpected = true, v => delete v.decks,
    v => v.decks[0].cards[9] = '30000042', v => v.decks[0].name = '', v => v.decks[0].id = '1',
    v => v.decks.push({ ...v.decks[0], id: 'kd-' + crypto.randomUUID(), cards: pad(['00000001']) })];
  for (const mutation of mutations) { const value = structuredClone(source); mutation(value); rejectsWithoutWrite(storage, () => lib.importJSON(JSON.stringify(value), { mode: 'replace' })); }
  for (const raw of ['', '{', '[]', 'null', 'x'.repeat(65537), JSON.stringify({ ...source, __proto__: null, pollution: true })])
    rejectsWithoutWrite(storage, () => lib.importJSON(raw));
  rejectsWithoutWrite(storage, () => lib.importJSON(lib.exportJSON(), { mode: 'invalid' }), 'INVALID_MODE');
});
test('merge collision and aggregate overflow reject before writing', () => {
  const storage = memory(), lib = library(storage), other = library(memory());
  lib.save({ name: 'Keep', cards: nulls() });
  rejectsWithoutWrite(storage, () => lib.importJSON(lib.exportJSON()), 'DUPLICATE_ID');
  for (let i = 0; i < 10; i++) other.save({ name: 'Import ' + i, cards: nulls() });
  rejectsWithoutWrite(storage, () => lib.importJSON(other.exportJSON()), 'LIBRARY_FULL');
  lib.importJSON(other.exportJSON(), { mode: 'replace' }); assert.equal(lib.list().length, 10);
});
test('corrupt stored JSON is surfaced and never silently reset', () => {
  const storage = memory(), lib = library(storage); storage.setItem(lib.key, '{corrupt');
  const before = snapshot(storage);
  assert.throws(() => lib.list()); assert.throws(() => lib.exportJSON());
  rejectsWithoutWrite(storage, () => lib.save({ name: 'No reset', cards: nulls() }));
  rejectsWithoutWrite(storage, () => lib.importJSON(JSON.stringify({ schema: 1, edition: 'V3', decks: [] }), { mode: 'replace' }));
  assert.equal(snapshot(storage), before);
});
test('storage quota failure leaves old JSON readable', () => {
  const storage = memory(), lib = library(storage); lib.save({ name: 'Keep', cards: playable });
  const before = snapshot(storage); storage.setItem = () => { throw new Error('QuotaExceededError'); };
  assert.throws(() => lib.save({ name: 'No', cards: nulls() }), /Quota/);
  assert.equal(snapshot(storage), before); assert.equal(lib.list().length, 1);
});
test('each operation rereads storage rather than overwriting another instance', () => {
  const storage = memory(), a = library(storage), b = library(storage);
  a.save({ name: 'A', cards: nulls() }); b.save({ name: 'B', cards: nulls() }); a.save({ name: 'C', cards: nulls() });
  assert.deepEqual(b.list().map(d => d.name), ['A', 'B', 'C']);
});
test('optimistic read detects changes between preparation and commit', () => {
  let calls = 0, writes = 0;
  const storage = { getItem: () => ++calls === 1 ? null : '{changed}', setItem: () => writes++ };
  assert.throws(() => library(storage).save({ name: 'No', cards: nulls() }), { code: 'CONFLICT' });
  assert.equal(writes, 0);
});
test('real engine and real registry accept a fully covered owned formation', () => {
  const analysis = model().evaluate(playable);
  assert.equal(analysis.playable, true); assert.deepEqual(analysis.errors, []);
  assert.equal(analysis.formation.length, 5); assert.deepEqual(analysis.coverage, [2, 2, 2, 4, 2]);
});
test('incomplete ten-slot drafts are never playable', () => {
  const m = model();
  for (const cards of [nulls(), pad(playable.slice(0, 9)), pad(playable.slice(0, 5))]) {
    const state = m.evaluate(cards); assert.equal(state.playable, false); assert.ok(state.errors.length);
  }
});
test('strict coverage rejects historically valid decks; multi-position cards count in each role', () => {
  const cards = ids(7, 13, 2, 1, 14, 5, 17, 3, 6, 16);
  assert.deepEqual(engine.validateDeck(cards), []);
  assert.equal(model().evaluate(cards).playable, false);
  assert.deepEqual(model().evaluate(playable).coverage, [2, 2, 2, 4, 2]);
});
test('two compatibles per position cannot substitute for a complete matching', () => {
  const source = structuredClone(data);
  source.cards.forEach((c, i) => { c.positions = i < 2 ? [1, 2, 3] : [4, 5]; });
  const e = createEngine(source), cards = source.cards.slice(0, 10).map(c => c.id);
  const result = model({ data: source, engine: e, registry: stateRegistry(source).registry }).evaluate(cards);
  assert.ok(result.coverage.every(n => n >= 2)); assert.equal(result.formation, null); assert.equal(result.playable, false);
});
test('new strict engine methods are used, and additional validator fails closed', () => {
  let coverageCalls = 0, strictCalls = 0;
  const e = { ...engine, deckCoverage: cards => { coverageCalls++; return engine.deckCoverage(cards); },
    validatePlayableDeck: cards => { strictCalls++; return engine.validatePlayableDeck(cards); } };
  model({ engine: e }).evaluate(playable); assert.ok(coverageCalls > 0); assert.ok(strictCalls > 0);
  for (const validateDeck of [() => ['Parent refusal'], () => false, () => { throw new Error('Refused'); }])
    assert.equal(model({ validateDeck }).evaluate(playable).playable, false);
});
test('old engine fallback remains strict and enforces two copies even with looser rules', () => {
  const e = { ...engine, deckCoverage: undefined, validatePlayableDeck: undefined };
  assert.equal(model({ engine: e }).evaluate(playable).playable, true);
  assert.equal(model({ engine: e }).evaluate(ids(7, 13, 2, 1, 14, 5, 17, 3, 6, 16)).playable, false);
  const loose = { ...engine, validatePlayableDeck: () => [] };
  assert.equal(model({ engine: loose }).evaluate(Array(10).fill(knownIds[0])).playable, false);
});
test('ownership and pending transfers cap candidates and invalidate play immediately', async () => {
  const { registry } = stateRegistry(), m = model({ registry });
  assert.deepEqual(m.availability(knownIds[0]), { owned: 1, available: 1 });
  const item = registry.owned('user-paris', knownIds[0])[0];
  await registry.offer('user-paris', item.id, 'user-tokyo');
  assert.deepEqual(m.availability(knownIds[0]), { owned: 1, available: 0 });
  assert.equal(m.candidate(nulls(), 0, knownIds[0]).allowed, false);
  assert.equal(m.evaluate(playable).playable, false);
});
test('two copies require two available collectibles; a third is always blocked', () => {
  const { registry, cache } = stateRegistry();
  cache.collectibles.push({ ...cache.collectibles[0], id: 'KC-extra1' }, { ...cache.collectibles[0], id: 'KC-extra2' });
  const m = model({ registry }); assert.equal(m.availability(knownIds[0]).available, 2);
  assert.equal(m.candidate(pad([knownIds[0]]), 1, knownIds[0]).allowed, true);
  assert.equal(m.candidate(pad([knownIds[0], knownIds[0]]), 2, knownIds[0]).allowed, false);
  assert.equal(model().candidate(pad([knownIds[0]]), 1, knownIds[0]).allowed, false);
});
test('Tokyo and unavailable registries cannot play borrowed compositions', () => {
  assert.equal(model({ userId: 'user-tokyo' }).evaluate(playable).playable, false);
  assert.equal(model({ registry: null }).evaluate(playable).playable, false);
  assert.equal(model({ registry: { owned: () => [], deckErrors: () => { throw new Error('Closed'); } } }).evaluate(playable).playable, false);
});
test('Rainbow addition is blocked while another Rainbow remains in the deck', () => {
  const { registry, cache } = stateRegistry();
  const rainbow = data.cards.find(c => c.element === 'RAINBOW').id;
  cache.collectibles.push({ ...registry.owned('user-paris', rainbow)[0], id: 'KC-extra' });
  const c = model({ registry }).candidate(pad([rainbow]), 1, rainbow);
  assert.equal(c.allowed, false); assert.match(c.reason, /Rainbow/);
});
test('affinities cap at five synthetic board units and do not mutate engine data or registry', () => {
  const { registry, cache } = stateRegistry(), before = JSON.stringify({ data, cache }); let largest = 0;
  const e = { ...engine, synergy: (p, u, field) => { largest = Math.max(largest, p.board.length); return engine.synergy(p, u, field); } };
  const m = model({ registry, engine: e }), group = m.groups(pad(ids(12, 21, 22, 23, 25, 26)), 'faction')[0];
  assert.equal(group.count, 6); assert.equal(group.bonus, 40); assert.equal(largest, 5);
  m.evaluate(playable); m.candidate(playable, 0, knownIds[0]);
  assert.equal(JSON.stringify({ data, cache }), before);
});
test('candidate shows shared members, gain and coverage relative to the replaced slot', () => {
  const m = model(), cards = pad(ids(1, 2)), c = m.candidate(cards, 2, '30000013');
  assert.equal(c.affinities.faction.delta, 10); assert.equal(c.affinities.race.delta, 10);
  assert.deepEqual(c.affinities.faction.members.map(m => m.id), ['30000001']);
  assert.deepEqual(c.coverage, [1]);
  const replacement = m.candidate(pad(ids(1, 13)), 0, '30000014');
  assert.equal(replacement.affinities.faction.delta, 0); assert.equal(replacement.affinities.race.delta, 0);
  assert.deepEqual(replacement.affinities.faction.members.map(m => m.id), ['30000013']);
  assert.deepEqual(m.candidate(playable, 0, '30000011').lostCoverage, []);
  assert.deepEqual(m.candidate(playable, 0, '30000008').lostCoverage, [1]);
});
test('potential saturated at five produces no fictitious sixth-member gain', () => {
  const candidate = model().candidate(pad(ids(12, 21, 22, 23, 25)), 5, '30000026');
  assert.equal(candidate.affinities.faction.bonus, 40); assert.equal(candidate.affinities.faction.delta, 0);
  assert.equal(candidate.affinities.faction.count, 6);
});
test('builder contract is standalone, scoped, escaped, read-only until an action', () => {
  const storage = memory(), { registry, cache } = stateRegistry();
  let calls = 0; const before = JSON.stringify(cache);
  const builder = Builder.create({ data, engine, registry, userId: 'user-paris', storage, crypto,
    getDraft: () => ({ name: '<img src=x onerror=alert(1)>', cards: playable }), onDraft: () => calls++, onPlay: () => calls++ });
  const html = builder.render();
  assert.match(html, /<h1>Escouade<\/h1>/); assert.match(html, /&lt;img src=x/);
  assert.ok(!html.includes('data-action=')); assert.ok(!html.includes('<dialog')); assert.ok(!html.includes('http'));
  assert.equal((html.match(/data-deck-action="slot"/g) || []).length, 10);
  assert.equal((html.match(/class="kdb-candidate /g) || []).length, 8);
  assert.match(html, /-full\.png/); assert.match(html, /Potentiel · 5 cartes sur le plateau/);
  assert.equal(calls, 0); assert.equal(storage.writes, 0); assert.equal(JSON.stringify(cache), before);
  const result = builder.inspect(); result.draft.cards[0] = null;
  assert.equal(builder.inspect().draft.cards[0], playable[0]); builder.destroy();
});
test('builder refresh keeps holes when a legacy parent echoes compact preferences', () => {
  const cards = nulls(); cards[2] = knownIds[0]; cards[7] = knownIds[1];
  let parent = { name: 'Draft', cards };
  const builder = Builder.create({ data, engine, registry: stateRegistry().registry, userId: 'user-paris', storage: memory(), crypto,
    getDraft: () => structuredClone(parent), onDraft: () => {} });
  parent = { name: 'Draft', cards: cards.filter(Boolean) }; builder.refresh();
  assert.deepEqual(builder.inspect().draft.cards, cards);
  parent = { name: 'External', cards: [knownIds[2]] }; builder.refresh();
  assert.deepEqual(builder.inspect().draft, { name: 'External', cards: pad([knownIds[2]]) });
});
test('builder shows corrupted storage without erasing it or the supplied draft', () => {
  const storage = memory(), lib = library(storage); storage.setItem(lib.key, '{bad'); const before = snapshot(storage);
  const builder = Builder.create({ data, engine, registry: stateRegistry().registry, userId: 'user-paris', storage, crypto,
    getDraft: () => ({ name: 'Retained', cards: playable }), onDraft: () => {} });
  assert.match(builder.render(), /role="alert"/); assert.deepEqual(builder.inspect().draft.cards, playable); assert.equal(snapshot(storage), before);
});
test('builder rejects unknown legacy card ids instead of silently dropping them', () => {
  assert.throws(() => Builder.create({ data, engine, registry: stateRegistry().registry, userId: 'user-paris', storage: memory(), crypto,
    getDraft: () => ({ name: 'V2', cards: ['00000001'] }), onDraft: () => {} }), /V3/);
});
test('all 41 existing full PNG assets match the cropped 797/1388 aspect ratio', () => {
  assert.equal(data.cards.length, 41);
  for (const card of data.cards) {
    const bytes = fs.readFileSync(path.join(__dirname, 'assets', 'cards', card.slug + '-full.png'));
    assert.equal(bytes.readUInt32BE(16), 797, card.slug); assert.equal(bytes.readUInt32BE(20), 1388, card.slug);
  }
  const css = fs.readFileSync(path.join(__dirname, 'deck-builder.css'), 'utf8');
  const rule = selector => css.slice(css.indexOf(selector + ' {')).split('}')[0];
  assert.ok(!css.includes('897/1497'));
  for (const selector of ['.kdb-page .kdb-slot-image', '.kdb-page .kdb-candidate-image', '.kdb-preview-image']) assert.match(rule(selector), /aspect-ratio: 797\/1388/);
  assert.match(rule('.kdb-preview'), /grid-area: preview/);
  assert.match(rule('.kdb-workbench'), /grid-template-areas:/);
  assert.match(rule('.kdb-workbench'), /browser browser preview/);
  assert.match(rule('.kdb-page'), /max-width: none/);
  assert.match(rule('.kdb-slots'), /grid-template-columns: repeat\(5,minmax\(0,1fr\)\)/);
  assert.match(rule('.kdb-slots'), /width: 100%/);
  for (const match of css.matchAll(/\.kdb-slots\s*\{([^}]+)\}/g)) assert.doesNotMatch(match[1], /max-width|[\d.]d?vh/);
});

(async () => {
  for (const { name, fn } of tests) {
    try { await fn(); report.tests.push({ name, ok: true }); console.log('PASS ' + name); }
    catch (error) { report.tests.push({ name, ok: false, error: error.stack }); console.error('FAIL ' + name + '\n' + error.stack); }
  }
  report.passed = report.tests.filter(t => t.ok).length;
  report.failed = report.tests.length - report.passed;
  report.scope = 'Only V3/site/deck-library.test.cjs and V3/verification-flow/deck-tests.json are authored by this test. Browser integration belongs to the parent.';
  const out = path.join(__dirname, '..', 'verification-flow');
  if (!process.argv.includes('--no-report')) { fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'deck-tests.json'), JSON.stringify(report, null, 2) + '\n'); }
  console.log(`${report.passed}/${report.tests.length} passed`); process.exitCode = report.failed ? 1 : 0;
})();
