'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { buildCatalog } = require('../atelier/game-catalog.cjs');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const ROOT = path.resolve(__dirname, '../..'), origin = 'http://127.0.0.1:43876';
const references = require('../atelier/data/references.json');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const checks = [], errors = [];
let browser;
async function approvedAdditionFixtures() {
  const previous = JSON.parse(fs.readFileSync(path.join(ROOT, 'V4/revisions/2026-09-18-voloden/references-before.json'), 'utf8'));
  const next = await buildCatalog(), ids = new Set(previous.cards.map(c => c.card.id));
  const addedId = '30000028', added = next.cards.find(c => c.id === addedId);
  assert.equal(added?.origin, 'approved'); assert.equal(added.role, 2);
  assert.equal(added.sentry, true); assert.equal(added.canGuard, false); assert.equal(added.atk[0], 'death');
  assert.deepEqual(next.cards.filter(c => !ids.has(c.id)).map(c => c.id), [addedId]);
  const old = structuredClone(next); old.referenceId = previous.id;
  old.cards = old.cards.filter(c => ids.has(c.id));
  assert.deepEqual(old.cards.map(c => c.id).sort(), [...ids].sort());
  old.decks.presets = old.decks.presets.filter(p => p.cards.every(id => ids.has(id)));
  for (const deck of [old.decks.player, old.decks.enemy]) assert.ok(deck.every(id => ids.has(id)));
  return { old, next, addedId };
}

async function main() {
  const { chromium } = createRequire(path.join(runtime, '__v4_evolution__.cjs'))('playwright');
  const old = await buildCatalog();
  assert.deepEqual(old.cards.map(c => c.id).sort(), references.cards.map(c => c.card.id).sort());
  const publication = { id: '40000099', profile: { ...references.cards[4].card, characterId: 'atelier-40000099', name: 'CARTE NOUVELLE' }, pngUrl: '/media/reference/rikka.png', psdUrl: '/exports/test/card.psd' };
  const next = await buildCatalog({ published: [publication] });
  let catalogue = old;
  browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  await context.route(origin + '/**', async route => {
    const p = decodeURIComponent(new URL(route.request().url()).pathname);
    if (p === '/db-tests') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Isolated V4 evolution tests</title>' });
    if (p === '/api/game/catalogue') return route.fulfill({ json: catalogue });
    let file;
    if (p.startsWith('/media/reference/')) {
      const ref = references.cards.find(c => p === '/media/reference/' + c.key + '.png');
      if (ref) file = path.join(ROOT, ref.png);
    } else if (p.startsWith('/jeu/shared/')) file = path.join(ROOT, 'V3/assets', p.slice('/jeu/shared/'.length));
    else if (p.startsWith('/jeu/')) {
      file = path.join(__dirname, p.slice('/jeu/'.length) || 'index.html');
      if (!fs.existsSync(file) && p.startsWith('/jeu/assets/')) file = path.join(ROOT, 'V3/site', p.slice('/jeu/'.length));
    }
    if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: p });
    return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
  });
  const page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(origin + '/db-tests');
  for (const file of ['engine.js', 'ownership.js', 'local-db.js']) await page.addScriptTag({ url: origin + '/jeu/' + file });
  for (const fixture of [{ old, next, addedId: publication.id }, await approvedAdditionFixtures()]) {
    const results = await page.evaluate(runDatabaseScenarios, fixture);
    for (const result of results) { checks.push(result); console.log('PASS ' + result); }
  }
  await page.close();

  const stale = await context.newPage(); stale.on('pageerror', error => errors.push(error.message));
  await stale.goto(origin + '/jeu/'); await stale.waitForFunction(() => window.KALISTAR_READY);
  await stale.locator('[data-view=arena]').click(); await stale.locator('[data-action=start]').click();
  await stale.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).phase === 'choose');
  const activeGame = await stale.evaluate(() => localStorage.getItem('kalistar.v4.game'));
  catalogue = next;
  const fresh = await context.newPage(); fresh.on('pageerror', error => errors.push(error.message));
  await fresh.goto(origin + '/jeu/'); await fresh.waitForFunction(() => window.KALISTAR_READY);
  await stale.locator('#catalogue-refresh').waitFor({ state: 'visible' });
  assert.equal(await stale.evaluate(() => KALISTAR_DATA.cards.length), old.cards.length);
  assert.equal(await stale.evaluate(() => localStorage.getItem('kalistar.v4.game')), activeGame);
  assert.equal(await stale.locator('[data-view=arena]').getAttribute('aria-current'), 'page');
  await stale.locator('[data-action=account]').click();
  await stale.locator('[data-registry-action=tab][data-tab=collection]').click();
  assert.equal(await stale.locator('.registry-owned-row').count(), next.cards.length);
  assert.ok((await stale.locator('.registry-owned').innerText()).includes('CARTE NOUVELLE'));
  assert.match(await stale.locator('.registry-owned-total').innerText(), new RegExp('^' + next.cards.length + '\\b'));
  await stale.locator('[data-registry-action=close]').click();
  await stale.locator('[data-view=collection]').click();
  assert.match(await stale.locator('.cb-completion').innerText(), new RegExp('\\b' + next.cards.length + '\\s*/\\s*' + next.cards.length + '\\b'));
  await stale.locator('[data-action=account]').click();
  await stale.locator('#account-dialog [data-action=catalogue-refresh]').click();
  await stale.waitForFunction(count => window.KALISTAR_READY && KALISTAR_DATA.cards.length === count, next.cards.length);
  assert.equal(await stale.evaluate(() => localStorage.getItem('kalistar.v4.game')), activeGame);
  assert.equal(await stale.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), next.cards.length);
  assert.deepEqual(errors, []);
  checks.push('two real tabs: complete ownership rows/counts, manual refresh, unchanged active game');
  console.log('PASS ' + checks.at(-1));
  await context.close();
  fs.mkdirSync(path.join(__dirname, 'verification'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'verification/catalogue-evolution-report.json'), JSON.stringify({ passed: true, isolated: true, checks, errors }, null, 2));
}

// Shared by the browser suite and the manual, isolated Voloden harness.
async function runDatabaseScenarios({ old, next, addedId, namespace = 'kalistar-v4-cards-evolution-' + crypto.randomUUID() }, onResult = () => {}) {
  const beforeCatalogue = old, afterCatalogue = next, checks = [], opened = [];
  const P = KalistarOwnership.PARIS, T = KalistarOwnership.TOKYO;
  const check = (ok, message = 'Assertion failed') => { if (!ok) throw Error(message); };
  const equal = (a, b) => check(JSON.stringify(a) === JSON.stringify(b), 'Expected ' + JSON.stringify(b) + ', got ' + JSON.stringify(a));
  const reject = async (fn, code) => { try { await fn(); } catch (e) { if (code) equal(e.code, code); return; } throw Error('Expected rejection ' + code); };
  const openDb = async (label, data = beforeCatalogue) => { const db = await KalistarLocalDB.open(data, { name: namespace + '-' + label }); opened.push(db); return db; };
  const snapshot = async db => { const b = await db.exportBackup(); delete b.exportedAt; return b; };
  const send = async (db, id) => { const offer = await db.registry.offer(P, id, T); await db.registry.accept(T, offer.id); };
  const finish = (e, s) => {
      e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
      for (let n = 0; n < 10000 && s.phase !== 'over'; n++) {
        if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
        else if (s.phase === 'attack') e.rollAttack(s);
        else if (s.phase === 'defense') e.rollDefense(s);
        else if (s.phase === 'result') e.next(s);
        else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
        else { const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase]; e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s)); }
      }
      equal(s.phase, 'over'); return s;
    };
  const origin = next.cards.find(c => c.id === addedId)?.origin;
  check(!old.cards.some(c => c.id === addedId) && ['approved', 'published'].includes(origin), 'An actual catalogue addition is required');
  const run = async (name, fn) => {
    const label = origin + ': ' + name;
    try { await fn(); checks.push(label); onResult({ name: label, passed: true }); }
    catch (error) { onResult({ name: label, passed: false, error: error.message }); throw error; }
  };
  try {
  await run('old backup preserves transferred newer originals, issued copies, activation and transfer proofs', async () => {
    let db = await openDb('newer'), backup = await db.exportBackup(); db.close();
    db = await openDb('newer', afterCatalogue);
    const original = db.registry.owned(P, addedId)[0]; await send(db, original.id);
    const issued = await db.registry.issue(P, beforeCatalogue.cards[0].id);
    await db.registry.activate(T, issued.collectible.id, issued.code);
    const prior = await snapshot(db);
    await db.importBackup(backup, { replaceRegistry: true });
    const restored = await snapshot(db);
    equal(restored.collectibles.length, afterCatalogue.cards.length + 1); equal(db.registry.get(original.id).ownerId, T); equal(db.registry.get(issued.collectible.id).ownerId, T);
    for (const key of ['activations', 'transfers', 'events']) {
      const relevant = row => [original.id, issued.collectible.id].includes(key === 'activations' ? row.id : row.collectibleId);
      equal(restored[key].filter(relevant), prior[key].filter(relevant));
    }
    KalistarOwnership.validateBackup(restored, afterCatalogue); KalistarOwnership.validateArchive(restored);
    await db.importBackup(backup); equal((await snapshot(db)).collectibles.length, afterCatalogue.cards.length + 1);
    await reject(() => db.registry.activate(P, issued.collectible.id, issued.code));
    db.close();
  });
  await run('default merge rejects old ownership conflicts; explicit restore retains newer transfers', async () => {
    let db = await openDb('conflict'), backup = await db.exportBackup(); db.close();
    db = await openDb('conflict', afterCatalogue);
    const oldCard = db.registry.owned(P, beforeCatalogue.cards[0].id)[0], newCard = db.registry.owned(P, addedId)[0];
    await send(db, oldCard.id); await send(db, newCard.id);
    const prior = await snapshot(db);
    await reject(() => db.importBackup(backup), 'REGISTRY_CONFLICT'); equal(await snapshot(db), prior);
    await db.importBackup(backup, { replaceRegistry: true });
    equal(db.registry.get(oldCard.id).ownerId, P); equal(db.registry.get(newCard.id).ownerId, T);
    db.close();
  });
  await run('newer pending transfers survive an old snapshot and forged transfer history is rejected', async () => {
    let db = await openDb('pending'), backup = await db.exportBackup(); db.close();
    db = await openDb('pending', afterCatalogue);
    const original = db.registry.owned(P, addedId)[0], offer = await db.registry.offer(P, original.id, T);
    const prior = await snapshot(db);
    await db.importBackup(backup, { replaceRegistry: true });
    const restored = await snapshot(db);
    equal(restored.transfers, prior.transfers); equal(db.registry.get(original.id).ownerId, P);
    await db.registry.accept(T, offer.id); equal(db.registry.get(original.id).ownerId, T);
    const accepted = await snapshot(db), broken = structuredClone(accepted);
    broken.events = broken.events.filter(e => e.transferId !== offer.id || e.type !== 'accepted');
    await reject(() => db.importBackup(broken, { replaceRegistry: true })); equal(await snapshot(db), accepted);
    db.close();
  });
  await run('mixed old/new matches preserve connected owners, release proofs and recomputed counters', async () => {
    let db = await openDb('matches'), backup = await db.exportBackup(); db.close();
    db = await openDb('matches', afterCatalogue);
    const e = KalistarEngine.createEngine(afterCatalogue);
    const deck = beforeCatalogue.decks.player.map((_, slot) => beforeCatalogue.decks.player.map((id, i) => i === slot ? addedId : id)).find(ids => !e.validatePlayableDeck(ids).length);
    check(deck, 'The added card must have a playable mixed deck');
    equal(e.validatePlayableDeck(deck), []);
    const make = seed => db.registry.bindGame(P, e.newGame(deck, beforeCatalogue.decks.enemy, { seed, deckCoverage: 2 }));
    const final = make('NEWER-FINAL'); await db.saveGame(final); finish(e, final); await db.saveGame(final);
    const released = make('NEWER-RELEASED'); await db.saveGame(released); await db.registry.releaseGame(P, released.matchId);
    const original = db.registry.owned(P, addedId)[0], connected = db.registry.owned(P, deck.find(id => id !== addedId))[0];
    await send(db, original.id); await send(db, connected.id);
    const prior = await snapshot(db);
    backup.results = [{ matchId: final.matchId, instanceId: 'fake', kills: 999999 }];
    await db.importBackup(backup, { replaceRegistry: true });
    const restored = await snapshot(db);
    equal(restored.results, prior.results); equal(restored.matches.length, 2);
    equal(db.registry.get(original.id).ownerId, T); equal(db.registry.get(connected.id).ownerId, T);
    equal(db.match(final.matchId).state, final); equal(db.match(released.matchId).state, released);
    await reject(() => db.saveGame(released), 'LEASE_RELEASED');
    check(restored.events.some(row => row.type === 'released' && row.matchId === released.matchId));
    KalistarOwnership.validateBackup(restored, afterCatalogue); KalistarOwnership.validateArchive(restored);
    db.close();
  });
  await run('tampered owners, missing origins and omitted approved profiles fail atomically', async () => {
    let db = await openDb('tamper'), backup = await db.exportBackup(); db.close(); db = await openDb('tamper', afterCatalogue);
    for (const mutate of [
      b => { b.collectibles[0].ownerId = T; },
      b => { b.events = b.events.filter(e => e.collectibleId !== b.collectibles[0].id); },
      b => { const id = b.versions[0].id; b.versions = b.versions.filter(c => c.id !== id); },
      b => { b.events[0].actorId = T; },
      b => { b.edition = 'V3'; },
      b => { b.versions[0].edition = 'V3'; },
      b => { b.versions[0].characterId = 'forged-identity'; },
      b => { b.versions.push(structuredClone(b.versions[0])); },
      b => { b.collectibles = b.collectibles.filter(c => c.cardId !== b.versions[0].id); },
      b => { b.instances[0].cardId = addedId; }
    ]) {
      const broken = structuredClone(backup); mutate(broken); const prior = await snapshot(db);
      await reject(() => db.importBackup(broken, { replaceRegistry: true })); equal(await snapshot(db), prior);
    }
    db.close();
  });
  await run('old backup restores into a fresh expanded registry without reminting newer originals', async () => {
    const source = await openDb('source'), backup = await source.exportBackup(); source.close();
    const target = await openDb('fresh', afterCatalogue), original = target.registry.owned(P, addedId)[0];
    await target.importBackup(backup);
    equal(target.registry.owned(P).length, afterCatalogue.cards.length); equal(target.registry.owned(T).length, 0);
    equal(target.registry.owned(P, addedId)[0].id, original.id);
    const once = await snapshot(target); await target.importBackup(backup); const twice = await snapshot(target);
    for (const table of KalistarOwnership.stores) equal(twice[table], once[table]);
    target.close();
  });
  if (origin === 'approved') await run('schema 2 cannot omit approved profiles without registry proofs', async () => {
    let db = await openDb('legacy'), backup = await db.exportBackup(); db.close();
    backup.schema = 2; for (const table of KalistarOwnership.stores) delete backup[table];
    db = await openDb('legacy', afterCatalogue); const prior = await snapshot(db);
    await reject(() => db.importBackup(backup)); equal(await snapshot(db), prior); db.close();
  });
  await run('stale connection reports new IDs and cannot import until its catalogue is refreshed', async () => {
    const stale = await openDb('stale'), backup = await stale.exportBackup(); let noticed = [];
    stale.onCatalogueChange(ids => { noticed = ids; });
    const fresh = await openDb('stale', afterCatalogue);
    equal(noticed, [addedId]); equal(stale.catalogueChanges(), [addedId]);
    const prior = await snapshot(fresh);
    await reject(() => stale.importBackup(backup, { replaceRegistry: true }), 'CATALOGUE_STALE');
    equal(await snapshot(fresh), prior); stale.close(); fresh.close();
  });
  return checks;
  } finally { for (const db of opened) db.close(); }
}
module.exports = { approvedAdditionFixtures, runDatabaseScenarios };
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
