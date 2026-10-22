'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__balmhyr_qa__.cjs'))('playwright');
const proof = require('../deploy/fixtures/journey-equipment-4.6.109.json');

test('isolated real IndexedDB open/reopen migrates old gant profiles durably without rewriting owned cards or ongoing matches', async t => {
  const data = await require('../atelier/game-catalog.cjs').buildCatalog({published: require('../donnees/catalogue.json').cards.filter(c => c.kind === 'created')});
  const browser = await chromium.launch({channel: 'chrome', headless: true});
  t.after(() => browser.close());
  const context = await browser.newContext({serviceWorkers: 'block'});
  await context.route('**/*', route => route.fulfill({contentType: 'text/html', body: '<!doctype html><title>Isolated equipment migration QA</title>'}));
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto('https://equipment-qa.invalid/');
  for (const name of ['factions', 'ultimate-definitions', 'weapons', 'defensive-equipment', 'relic-ultimates', 'ultimate-runtime', 'equipment', 'turn-order', 'performance-index', 'ai-strategies', 'engine', 'team-composition', 'journey-combat', 'ownership', 'local-db']) {
    await page.addScriptTag({content: await fs.readFile(path.join(__dirname, name + '.js'), 'utf8')});
  }
  const result = await page.evaluate(async ({data, game}) => {
    const cases = [];
    const raw = async (name, row) => new Promise((resolve, reject) => {
      const r = indexedDB.open(name);
      r.onerror = () => reject(r.error);
      r.onsuccess = () => {
        const db = r.result, tx = db.transaction('equipment', row ? 'readwrite' : 'readonly');
        const q = row ? tx.objectStore('equipment').put(row) : tx.objectStore('equipment').get('user-paris');
        let value; q.onsuccess = () => {value = q.result;};
        tx.oncomplete = () => {db.close(); resolve(value);}; tx.onabort = () => {db.close(); reject(tx.error);};
      };
    });
    for (const conflict of [false, true]) {
      const name = 'kalistar-v4-cards-balmhyr-isolated-' + crypto.randomUUID();
      let db = await KalistarLocalDB.open(data, {name});
      const local = structuredClone(game); delete local.collection;
      const bound = db.registry.bindGame('user-paris', local);
      await db.saveGame(bound);
      const before = await db.exportBackup(); db.close();
      const row = {id: 'user-paris', version: 2, slots: {weapon: {balmhyr: 'mythic-iron-gauntlet'}, shield: {balmhyr: 'durane-rampart'}, relic: conflict ? {balmhyr: 'exiled-king-seal'} : {}}};
      await raw(name, row);
      db = await KalistarLocalDB.open(data, {name});
      const after = await db.exportBackup(), profile = db.equipment.profile('user-paris'), persisted = await raw(name);
      const owns = db.equipment.owns('user-paris', 'mythic-iron-gauntlet');
      db.close();
      db = await KalistarLocalDB.open(data, {name});
      const repeated = db.equipment.profile('user-paris'); db.close();
      cases.push({conflict, before, after, profile, persisted, repeated, owns, bound});
      await new Promise((resolve, reject) => {const r = indexedDB.deleteDatabase(name); r.onsuccess = resolve; r.onerror = () => reject(r.error);});
    }
    return cases;
  }, {data, game: proof.attempt.state});
  for (const r of result) {
    const expected = {id: 'user-paris', version: 2, slots: {weapon: {}, shield: {balmhyr: 'durane-rampart'}, relic: {balmhyr: r.conflict ? 'exiled-king-seal' : 'mythic-iron-gauntlet'}}};
    assert.deepEqual(r.profile, expected); assert.deepEqual(r.persisted, expected); assert.deepEqual(r.repeated, expected);
    assert(r.owns);
    for (const key of ['instances', 'matches', 'results', 'collectibles', 'activations', 'transfers', 'events', 'registryMeta']) assert.deepEqual(r.after[key], r.before[key], key + ' changed');
    assert.deepEqual(r.after.matches[0].state, r.bound);
    assert.deepEqual(r.after.matches[0].state.equipment, proof.attempt.state.equipment);
  }
  assert.deepEqual(errors, []);
});
