'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { buildCatalog, kalistarArenas } = require('../../atelier/game-catalog.cjs');
const entries = require('./arenas.json');
const before = require('./before.json');
const references = require('../../atelier/data/references.json');
const elements = require('../../../V3/donnees/elements.json');
const published = require('../../donnees/catalogue.json').cards.filter(c => c.kind === 'created');
test('eight additive arenas keep their rules alongside earlier places', async () => {
  const data = await buildCatalog({ published });
  assert(data.arenas.length >= before.arenas.length + 8);
  assert(before.arenas.every(a => data.arenas.some(current => current.id === a.id)));
  for (const { collaboration, ...arena } of entries) {
    assert.deepEqual(data.arenas.find(a => a.id === arena.id), arena);
    assert(arena.homeCharacters.every(id => data.cards.some(c => c.characterId === id)));
  }
});
test('native arenas unlock only with published native hosts, without changing the legacy-only catalogue', async () => {
  const a = entries.find(e => e.id === 'grivka-refuge'), id = a.homeCharacters[0];
  const cards = [{ characterId: id, faction: 'Grivka', element: 'NONE' }];
  assert.equal(kalistarArenas([a], new Set([id]), elements, [], cards).length, 1);
  assert.deepEqual(kalistarArenas([a], new Set(), elements, [], []), []);
  assert.deepEqual(kalistarArenas([a], new Set([id]), elements, [], [{ ...cards[0], collaboration: 'FF9' }]), []);
  const base = await buildCatalog();
  assert(!base.arenas.some(arena => entries.some(e => e.id === arena.id)));
  assert(references.cards.length > 0);
});
test('native metadata cannot bypass duplicate, path, element and bonus validation', () => {
  const a = entries.find(e => e.id === 'grivka-refuge'), ids = new Set(a.homeCharacters);
  const cards = [{ characterId: a.homeCharacters[0], faction: 'Grivka' }];
  const run = list => kalistarArenas(list, ids, elements, [], cards);
  for (const invalid of [null, {}, [null], [a, a], [{ ...a, collaboration: 'ff9' }],
    [{ ...a, id: '../bad' }], [{ ...a, image: '/jeu/assets/arenes/../bad.webp' }],
    [{ ...a, name: '<bad>' }], [{ ...a, homeCharacters: [null] }],
    [{ ...a, element: 'UNKNOWN' }], [{ ...a, element: null, elementBonus: 15 }],
    [{ ...a, element: 'NONE', elementBonus: 15 }], [{ ...a, homeAttack: 11 }],
    [{ ...a, homeDefense: 11 }], [{ ...a, elementBonus: 16 }], [{ ...a, homeDefense: -1 }]]) {
    assert.throws(() => run(invalid), /arene|Affinites/);
  }
  assert.throws(() => kalistarArenas([a], ids, elements, [a], cards), /duplique/);
});
test('new web media are bounded, registered and backed by explicit image provenance', () => {
  const registry = require('../../deploy/runtime-media.json');
  for (const media of require('./media.json')) {
    const record = registry.files.find(f => f.source === media.image);
    assert.equal(record?.sha256, media.sha256);
    assert(media.webBytes < 600000, 'one arena must remain below 600 kB');
    assert(media.width >= 1600 && media.height >= 900);
    assert.equal(require('./provenance.json').images.filter(i => i.id === media.id).length, 1);
  }
  const app = fs.readFileSync(path.join(__dirname, '../../site/app.js'), 'utf8');
  const start = app.indexOf('function arenaChoices('), end = app.indexOf('function matchDeckSources(', start);
  assert.match(app.slice(start, end), /loading="lazy"/);
});
