'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { createRequire, Module } = require('node:module');
const { createHash, randomUUID } = require('node:crypto');

const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const output = path.join(root, 'verification-buffs');
const screenshots = path.join(output, 'screenshots');
const hash = value => createHash('sha256').update(value).digest('hex');
// Freeze the served code, not the artwork: other workers can finish assets during this run.
const sourceFiles = fs.readdirSync(site).filter(f => /\.(js|css|html)$/.test(f));
const sources = Object.fromEntries(sourceFiles.map(f => [f, fs.readFileSync(path.join(site, f))]));
const sandbox = { window: {} };
vm.runInNewContext(sources['data.js'].toString(), sandbox);
const data = JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const engineModule = new Module(path.join(site, 'engine.js'), module);
engineModule._compile(sources['engine.js'].toString(), path.join(site, 'engine.js'));
const E = engineModule.exports.createEngine(data);
const profileSource = fs.readFileSync(path.join(root, 'donnees/cartes.json'));
const correctedElenion = JSON.parse(profileSource).find(c => c.id === '30000036');
const historyFile = path.join(output, 'historical-supplied-data.json');
if (!fs.existsSync(historyFile)) {
  assert.equal(data.cards.find(c => c.id === '30000036').weapon_index, 4,
    'Keep verification-buffs/historical-supplied-data.json from the pre-bundle run to test the real old flail catalogue.');
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(historyFile, JSON.stringify({ source: 'V3/site/data.js', sourceSHA256: hash(sources['data.js']), capturedAt: new Date().toISOString(), data }, null, 2) + '\n');
}
const historicalCapture = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
const historicalData = historicalCapture.data;
const historicalEngine = engineModule.exports.createEngine(historicalData);
if (process.argv.includes('--capture-history-only')) {
  console.log(JSON.stringify({ historicalSnapshot: historyFile, sourceSHA256: historicalCapture.sourceSHA256,
    weapon: historicalData.cards.find(c => c.id === '30000036').weapon, currentSourceUnchanged: historicalCapture.sourceSHA256 === hash(sources['data.js']) }, null, 2));
  process.exit(0);
}
const copy = value => JSON.parse(JSON.stringify(value));
const values = { ward: 60, luck: 1, reraise: 1, mana: 60, physical: 60 };
const grants = {
  ward: ['guard', 'grantGuard'], luck: ['retry', 'grantClover'],
  reraise: ['revive', 'grantReraise'], mana: ['mana', 'grantPotion'],
  physical: ['buff_atk', 'grantPhysical']
};
const report = {
  testedAt: new Date().toISOString(), mode: 'real-41-profiles-real-browser-indexeddb',
  isolation: 'Fresh Playwright Chrome process and nonpersistent context; ephemeral loopback origin; no user profile or database access.',
  fixtures: 'Legal seeded engine games, real cards, actual grant methods and legal forced setup faces. No profile, UI, engine or image mocks. Defense rolls use the unmodified seeded RNG.',
  artPolicy: 'Use available real assets; do not require render/art freshness.',
  profiles: data.cards.map(c => ({ id: c.id, slug: c.slug, characterId: c.characterId })),
  sourceHashes: Object.fromEntries(sourceFiles.map(f => [f, hash(sources[f])])),
  historicalSource: { path: 'V3/verification-buffs/historical-supplied-data.json', sourceSHA256: historicalCapture.sourceSHA256, capturedAt: historicalCapture.capturedAt },
  tests: [], scenarios: {}, geometry: [], screenshots: [], browserErrors: [], missingResources: [], risks: []
};

function deck(board, engine = E) {
  const ids = board.map(c => c.id);
  if (engine === E) for (let position = 1; position <= 5; position++) {
    while (engine.deckCoverage(ids)[position] < 2) ids.push(engine.data.cards.find(c => c.positions.includes(position) && !ids.includes(c.id) && c.element !== 'RAINBOW').id);
  }
  for (const c of engine.data.cards) if (ids.length < 10 && !ids.includes(c.id) && c.element !== 'RAINBOW') ids.push(c.id);
  assert.deepEqual(copy(engine === E ? engine.validatePlayableDeck(ids) : engine.validateDeck(ids)), []);
  return ids;
}
function base(seed = 'STACKED-BUFFS-UI', middle = '30000001', engine = E) {
  // P1 Taulio has guard/physical, P3 Momo has luck/mana, P5 Julienne has heart.
  const cards = ['30000013', '30000002', middle, '30000023', '30000003'].map(id => engine.byId[id]);
  assert.ok(cards.every(Boolean), 'Required real support profiles absent');
  const s = engine.newGame(deck(cards, engine), deck(cards, engine), { seed, mode: 'local', arenaId: engine.data.arenas[0].id, ...(engine === E ? {deckCoverage:2} : {}) });
  for (const side of [0, 1]) for (let slot = 0; slot < 5; slot++) {
    const u = s.players[side].reserve.find(u => u.cardId === cards[slot].id);
    engine.deploy(s, side, u.uid, slot);
  }
  engine.start(s);
  return s;
}
function support(s, key, recipientSlot) {
  const [face, grant] = grants[key];
  const slot = s.players[s.turn].board.findIndex(u => E.card(u).atk.includes(face));
  assert.ok(slot >= 0, 'Real caster missing for ' + key);
  const c = E.card(s.players[s.turn].board[slot]);
  E.lock(s, slot, 0); E.rollAttack(s, 6 - c.atk.indexOf(face));
  E[grant](s, s.players[s.turn].board[recipientSlot].uid);
  E.assertState(s); E.next(s);
}
function stacked(keys = Object.keys(values), seed) {
  const s = base(seed);
  for (let slot = 0; slot < 5; slot++) for (const key of keys) {
    support(s, key, slot); support(s, key, slot);
  }
  E.assertState(s);
  return s;
}
const allStacked = stacked();
const fourStacked = stacked(Object.keys(values).filter(k => k !== 'physical'));
function fresh(s) { const next = copy(s); next.matchId = 'match-' + randomUUID(); return next; }
function physicalPending(side = 0, mode = 'local', refresh = false) {
  const s = fresh(refresh ? allStacked : fourStacked);
  if (side) support(s, 'ward', 0);
  s.mode = mode;
  const slot = s.players[side].board.findIndex(u => E.card(u).atk.includes('buff_atk'));
  E.lock(s, slot, 0); E.rollAttack(s, 6 - E.card(s.players[side].board[slot]).atk.indexOf('buff_atk'));
  E.assertState(s); assert.equal(s.phase, 'physical');
  return s;
}
function orderingScenario() {
  for (let n = 0; n < 100; n++) {
    const s = stacked(Object.keys(values), 'STACK-ORDER-' + n);
    E.lock(s, 1, 3); E.rollAttack(s, 6);
    const middle = copy(s); E.rollDefense(middle);
    if (!middle.duel.autoDefense || typeof middle.duel.defenseValue !== 'number') continue;
    const after = copy(middle); E.rollDefense(after);
    if (after.phase === 'result' && after.duel.reraised && typeof after.duel.defenseValue === 'number') {
      [s, middle, after].forEach(E.assertState);
      return { before: copy(s), middle, after };
    }
  }
  throw Error('No deterministic real-profile ward/luck/heart scenario');
}
const ordering = orderingScenario();
report.scenarios.ordering = { seed: ordering.before.seed, before: ordering.before, middle: ordering.middle, after: ordering.after };
function complete(s, engine = E) {
  s = copy(s);
  for (let i = 0; i < 6000 && s.phase !== 'over'; i++) {
    if (s.phase === 'choose') engine.lock(s, ...engine.aiChoice(s));
    else if (s.phase === 'attack') engine.rollAttack(s);
    else if (s.phase === 'defense') engine.rollDefense(s);
    else if (s.phase === 'result') engine.next(s);
    else if (s.phase === 'replace') engine.autoDeploy(s, s.replacing);
    else {
      const [grant, choice] = { guard: ['grantGuard', 'aiGuardChoice'], clover: ['grantClover', 'aiCloverChoice'],
        potion: ['grantPotion', 'aiPotionChoice'], physical: ['grantPhysical', 'aiPhysicalChoice'],
        heart: ['grantReraise', 'aiReraiseChoice'] }[s.phase];
      engine[grant](s, engine[choice](s));
    }
  }
  assert.equal(s.phase, 'over'); engine.assertState(s); return s;
}
function playwright() {
  try { return require('playwright'); } catch {}
  const bundle = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  return createRequire(path.join(bundle, '__stacked_buffs__.cjs'))('playwright');
}
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1');
  if (url.pathname === '/blank') return res.end('<!doctype html><title>Isolated stacked buffs verification</title>');
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    const bytes = path.dirname(file) === site && sources[path.basename(file)] || fs.readFileSync(file);
    res.setHeader('Content-Type', { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' }[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { report.missingResources.push(url.pathname); res.writeHead(404).end(); }
});
let browser, page, url, historicalBackup;
async function capture(name, locator) {
  const file = path.join(screenshots, name + '.png');
  if (locator) {
    const b = await locator.boundingBox(), v = page.viewportSize();
    const x = Math.max(0, b.x - 24), y = Math.max(0, b.y - 8);
    await page.screenshot({ path: file, animations: 'allow', clip: { x, y, width: Math.min(v.width, b.x + b.width + 24) - x, height: Math.min(v.height, b.y + b.height + 8) - y } });
  } else await page.screenshot({ path: file, fullPage: false, animations: 'allow' });
  report.screenshots.push(path.relative(root, file).replaceAll('\\', '/'));
}
async function test(name, fn) {
  const started = Date.now();
  try { await fn(); report.tests.push({ name, ok: true, ms: Date.now() - started }); console.log('PASS ' + name); }
  catch (error) {
    report.tests.push({ name, ok: false, ms: Date.now() - started, error: error.stack }); console.log('FAIL ' + name + ': ' + error.message);
    try { await capture('failure-' + report.tests.length); } catch {}
  }
}
const ready = () => page.waitForFunction(() => window.KALISTAR_READY && window.KALISTAR_DB);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v3.game')));
const closeDialogs = () => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
async function importState(s) {
  E.assertState(s); await closeDialogs();
  if (!await page.locator('#game-file').count()) await page.locator('[data-view="arena"]').click();
  await page.locator('#game-file').setInputFiles({ name: 'stacked-buffs-scenario.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(s)) });
  await page.waitForFunction(id => JSON.parse(localStorage.getItem('kalistar.v3.game'))?.matchId === id, s.matchId);
  await page.evaluate(() => KALISTAR_DB.idle());
}
async function dbEquals(expected) {
  await page.evaluate(() => KALISTAR_DB.idle());
  const match = await page.evaluate(id => KALISTAR_DB.match(id), expected.matchId);
  assert.deepEqual(match.state, copy(expected)); assert.deepEqual(match.summary, copy(E.matchStats(expected)));
}
const diceBounds = () => page.locator('.dice-stage').evaluateAll(nodes => nodes.map(n => {
  const r = n.getBoundingClientRect(), p = n.closest('.battlefield').getBoundingClientRect();
  return { x: r.x - p.x, y: r.y - p.y, width: r.width, height: r.height };
}));
function sameDice(before, after) {
  assert.equal(after.length, 2);
  for (let i = 0; i < 2; i++) for (const key of ['x', 'y', 'width', 'height']) assert.ok(Math.abs(before[i][key] - after[i][key]) < 1, 'Dice shifted: ' + JSON.stringify({ before, after }));
}
async function geometry() {
  return page.evaluate(() => {
    const rect = e => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height }; };
    const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.x, b.x) > 0.75 && Math.min(a.bottom, b.bottom) - Math.max(a.y, b.y) > 0.75;
    const slots = [...document.querySelectorAll('.slot[data-unit]')];
    const issues = [], badges = [...document.querySelectorAll('.trait-badge')];
    const visibleRect = badge => {
      const r = rect(badge), b = badge.querySelector('b');
      if (b) { const n = rect(b); r.x = Math.min(r.x, n.x); r.y = Math.min(r.y, n.y); r.right = Math.max(r.right, n.right); r.bottom = Math.max(r.bottom, n.bottom); }
      return r;
    };
    for (let i = 0; i < badges.length; i++) {
      const b = badges[i], own = b.closest('.slot'), r = visibleRect(b), id = own.dataset.unit + ':' + b.dataset.bonus;
      for (let j = i + 1; j < badges.length; j++) if (overlap(r, visibleRect(badges[j]))) issues.push({ type: 'badge-overlap', id, other: badges[j].dataset.uid + ':' + badges[j].dataset.bonus });
      for (const slot of slots) {
        const obstacles = [...slot.querySelectorAll('.inspect,.position-label,.buff-chip')];
        if (slot !== own) obstacles.push(slot.querySelector('.slot-card'));
        for (const e of obstacles.filter(Boolean)) if (overlap(r, rect(e))) {
          const other = rect(e);
          issues.push({ type: 'control-overlap', id, other: slot.dataset.unit + ':' + e.className,
            intersection: { width: Math.min(r.right, other.right) - Math.max(r.x, other.x), height: Math.min(r.bottom, other.bottom) - Math.max(r.y, other.y) } });
        }
      }
    }
    const c = document.querySelector('.duel-centre');
    for (const e of [c, c.querySelector('.duel-status'), c.querySelector('.duel-recap')]) if (e.scrollHeight > e.clientHeight + 1) issues.push({ type: 'console-overflow', className: e.className, scroll: e.scrollHeight, client: e.clientHeight });
    return { viewport: [innerWidth, innerHeight], badges: badges.length, issues, stacks: slots.map(s => ({ uid: s.dataset.unit, slot: rect(s), stack: rect(s.querySelector('.trait-stack')) })) };
  });
}
async function badgeDetails(side, uid) {
  for (const key of Object.keys(values)) {
    const b = page.locator(`.slot[data-unit="${uid}"] .${key}-badge`);
    await b.scrollIntoViewIfNeeded();
    const accessible = await b.evaluate(el => { const r = el.getBoundingClientRect(); return el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); });
    assert.ok(accessible, 'Badge obscured: ' + uid + ':' + key);
    await b.click();
    await page.waitForSelector('#detail-dialog[open]');
    assert.equal(await page.locator(`.bonus-explanation.highlighted[data-explains="${key}"]`).count(), 1);
    assert.ok((await page.locator('.live-bonuses h2').innerText()).includes(String(side + 1)));
    await closeDialogs();
  }
}

async function run() {
  fs.mkdirSync(screenshots, { recursive: true });
  assert.equal(data.cards.length, 41); assert.equal(new Set(data.cards.map(c => c.characterId)).size, 40);
  for (const key of ['traits', 'grantPhysical', 'aiPhysicalChoice']) assert.equal(typeof E[key], 'function');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  url = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright().chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  report.browserVersion = browser.version();
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce', acceptDownloads: true });
  await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
  page = await context.newPage(); page.setDefaultTimeout(12000);
  page.on('pageerror', error => report.browserErrors.push(error.message));
  await page.goto(url + '/blank');
  await page.evaluate(async () => {
    localStorage.setItem('kalistar.v2.game', 'STACK-TEST-V2-SENTINEL');
    await new Promise((resolve, reject) => {
      const req = indexedDB.open('kalistar-v2-cards', 1);
      req.onupgradeneeded = () => req.result.createObjectStore('sentinel'); req.onerror = () => reject(req.error);
      req.onsuccess = () => { const db = req.result, tx = db.transaction('sentinel', 'readwrite'); tx.objectStore('sentinel').put('UNCHANGED', 'marker'); tx.oncomplete = () => { db.close(); resolve(); }; };
    });
  });
  await page.goto(url + '/site/index.html'); await ready();
  await test('Real 41 profiles loaded unchanged in UI and IndexedDB', async () => {
    assert.deepEqual(await page.evaluate(() => KALISTAR_DATA.cards), data.cards);
    assert.match(await page.locator('.cb-count').innerText(), /40 personnages.*41 versions/);
    const versions = await page.evaluate(() => KALISTAR_DB.inspect('versions'));
    assert.equal(versions.length, 41);
    for (const c of data.cards) { const v = versions.find(v => v.id === c.id); delete v.updatedAt; assert.deepEqual(v, c); }
  });
  await page.locator('[data-view="arena"]').click();
  await test('Five buffs built by legal grants, one charge each, persisted with 50 support events', async () => {
    await importState(allStacked);
    assert.equal(allStacked.match.events.length, 50);
    for (const p of allStacked.players) for (const u of p.board) {
      for (const key of Object.keys(values)) assert.equal(u[key], values[key]);
      assert.deepEqual(copy(E.traits(u)), ['ward', 'luck', 'reraise', 'mana', 'physical']);
    }
    assert.equal(await page.locator('.trait-badge').count(), 50);
    assert.equal(await page.locator('.trait-badge b').count(), 30);
    assert.equal(await page.locator('.luck-badge b,.reraise-badge b').count(), 0);
    assert.ok((await page.locator('.trait-badge b').allTextContents()).every(v => v === '60'));
    await dbEquals(allStacked);
  });
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 2560, height: 1440 }, { width: 390, height: 844 }, { width: 360, height: 800 }]) {
    await test(`All five badges: geometry and real clickable details at ${viewport.width}`, async () => {
      await page.setViewportSize(viewport); await importState(fresh(allStacked));
      const result = await geometry(); report.geometry.push(result);
      // Exercise clicks even if the geometry audit reports a problem.
      for (const side of [0, 1]) {
        const uid = allStacked.players[side].board[2].uid;
        await badgeDetails(side, uid);
        await page.locator(`[data-action="focus-${side ? 'right' : 'left'}"]`).click();
        await capture(`badges-${viewport.width}-side-${side}`);
      }
      await page.locator('[data-action="focus-duel"]').click();
      await capture(`dice-${viewport.width}`);
      assert.equal(await page.locator('.dice-stage canvas').count(), 2);
      result.detailsClicksPassed = 10;
      if (result.issues.length) report.risks.push({ severity: 'P2', title: 'Stacked buff overlaps inspection control',
        viewport, evidence: result.issues, locations: ['V3/site/duel-presentation.css:16', 'V3/site/battle-ui.css:1', 'V3/site/battle-ui.css:27'],
        impact: 'Independent clickable controls visually overlap on all five left-side slots; badge detail clicks still pass.' });
      assert.deepEqual(result.issues, [], JSON.stringify(result.issues));
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await test('Actual seeded UI attack enters physical choice without consuming other buffs or moving dice', async () => {
    let s, expected;
    for (let n = 0; n < 100; n++) {
      s = stacked(Object.keys(values), 'PHYSICAL-UI-ROLL-' + n);
      E.lock(s, 0, 0); expected = copy(s); E.rollAttack(expected);
      if (expected.phase === 'physical') break;
    }
    assert.equal(expected.phase, 'physical');
    await importState(s); const dice = await diceBounds();
    await page.locator('[data-action="roll"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'physical');
    assert.deepEqual(await state(), expected); await dbEquals(expected); sameDice(dice, await diceBounds());
    assert.equal(await page.locator('.physical-eligible').count(), 5);
    assert.match(await page.locator('.duel-centre').innerText(), /Choisir une carte alli/);
    for (const [key, value] of Object.entries(values)) assert.equal(expected.players[0].board[0][key], value);
    report.scenarios.physicalRoll = { seed: s.seed, die: expected.duel.attackDie, phase: expected.phase };
    await capture('physical-phase-after-real-roll');
  });
  for (const side of [0, 1]) for (const self of [true, false]) {
    await test(`Physical UI own-side eligibility and ${self ? 'self' : 'ally'} recipient, side ${side}`, async () => {
      const s = physicalPending(side), uid = s.players[side].board[self ? 0 : 2].uid;
      const expected = copy(s); E.grantPhysical(expected, uid);
      await importState(s); const dice = await diceBounds();
      assert.equal(await page.locator('.physical-eligible').count(), 5);
      assert.equal(await page.locator(`.formation[data-player="${1 - side}"] .physical-eligible`).count(), 0);
      const before = await state();
      await page.locator(`.formation[data-player="${1 - side}"] .slot-card`).first().click();
      assert.deepEqual(await state(), before);
      assert.match(await page.locator('#toast').innerText(), /votre plateau/);
      const reserve = page.locator(`[data-reserve-card][data-side="${side}"]`).first();
      const reserveUid = await reserve.getAttribute('data-uid'), reserveCard = E.card(s.players[side].reserve.find(u => u.uid === reserveUid));
      await reserve.hover(); await page.locator('#reserve-preview:popover-open').waitFor();
      assert.equal(await page.locator('#reserve-preview > img').getAttribute('src'), `assets/cards/${reserveCard.slug}-full.png`);
      assert.equal(await page.locator('#reserve-preview [data-preview-place]').count(), 0, 'Reserve cannot deploy during a support choice');
      await reserve.click(); assert.deepEqual(await state(), before);
      await page.locator('#reserve-preview [data-preview-close]').click();
      assert.equal(await page.locator('#reserve-preview:popover-open').count(), 0);
      assert.deepEqual(await state(), before);
      await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
      assert.deepEqual(await state(), expected); await dbEquals(expected);
      assert.equal(expected.duel.physicalGranted, uid);
      assert.equal(await page.locator(`.slot[data-unit="${uid}"] .trait-badge`).count(), 5);
      sameDice(dice, await diceBounds());
      report.scenarios[`physical-${side}-${self ? 'self' : 'ally'}`] = { seed: s.seed, side, recipient: uid, physicalGranted: expected.duel.physicalGranted };
    });
  }
  await test('Regrant each category preserves all five without doubling charges or support totals', async () => {
    for (const key of Object.keys(values)) {
      const s = fresh(allStacked), [face, grant] = grants[key];
      const slot = s.players[0].board.findIndex(u => E.card(u).atk.includes(face)), uid = s.players[0].board[2].uid;
      E.lock(s, slot, 0); E.rollAttack(s, 6 - E.card(s.players[0].board[slot]).atk.indexOf(face));
      const expected = copy(s); E[grant](expected, uid);
      await importState(s); await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
      assert.deepEqual(await state(), expected); assert.equal(expected.duel.traitRefreshed, true);
      for (const [k, v] of Object.entries(values)) assert.equal(expected.players[0].board[2][k], v);
      assert.equal(E.matchStats(expected).teams[0].support, E.matchStats(s).teams[0].support);
      await dbEquals(expected);
    }
  });
  await test('AI physical choice on both sides; side 1 auto grants, side 0 remains user-controlled', async () => {
    for (const side of [0, 1]) {
      const s = physicalPending(side, 'ai'), uid = E.aiPhysicalChoice(s), expected = copy(s);
      E.grantPhysical(expected, uid);
      const actualChoice = await page.evaluate(s => KalistarEngine.createEngine(KALISTAR_DATA).aiPhysicalChoice(s), s);
      assert.equal(actualChoice, uid); assert.ok(s.players[side].board.some(u => u.uid === uid));
      await importState(s);
      if (!side) {
        await page.waitForTimeout(600); assert.equal((await state()).phase, 'physical');
        await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
      }
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
      assert.deepEqual(await state(), expected); await dbEquals(expected);
      report.scenarios['ai-' + side] = { recipient: uid, automaticInUI: side === 1 };
    }
  });
  await test('Export/save/reload pending physical phase, then grant to ally with retained DB summary', async () => {
    const s = physicalPending(1), uid = s.players[1].board[2].uid;
    await importState(s);
    const downloadPromise = page.waitForEvent('download'); await page.locator('[data-action="save-game"]').click();
    const download = await downloadPromise, file = path.join(output, 'physical-pending-export.json');
    await download.saveAs(file); assert.deepEqual(JSON.parse(fs.readFileSync(file, 'utf8')), s);
    await page.reload(); await ready(); assert.deepEqual(await state(), s); await dbEquals(s);
    assert.equal(await page.locator('.physical-eligible').count(), 5); await capture('physical-pending-reloaded');
    const expected = copy(s); E.grantPhysical(expected, uid);
    await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
    await page.reload(); await ready(); assert.deepEqual(await state(), expected); await dbEquals(expected);
  });
  for (const side of [0, 1]) await test(`Physical gain animates actual ally and cleans up, side ${side}`, async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const s = physicalPending(side), uid = s.players[side].board[2].uid;
    await importState(s); const dice = await diceBounds();
    await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
    const effect = page.locator('.combat-emblem[data-effect="buff_atk"]');
    await effect.waitFor({ state: 'attached' });
    assert.equal(await effect.evaluate(e => e.closest('.slot').dataset.unit), uid);
    assert.notEqual(uid, s.duel.attacker);
    await page.waitForFunction(() => Number(getComputedStyle(document.querySelector('.combat-emblem[data-effect="buff_atk"]')).opacity) > 0.5);
    await capture('physical-gain-side-' + side, page.locator(`.slot[data-unit="${uid}"]`));
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
    assert.equal(await page.locator('.combat-emblem,.effect-recipient,.combat-actor,.combat-target').count(), 0);
    sameDice(dice, await diceBounds());
    await page.emulateMedia({ reducedMotion: 'reduce' });
  });
  await test('Physical gain canceled by navigation leaves no stale effect or unintended grant', async () => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const s = physicalPending(), uid = s.players[0].board[2].uid;
    await importState(s); await page.locator(`.slot[data-unit="${uid}"] .slot-card`).click();
    await page.locator('.combat-emblem[data-effect="buff_atk"]').waitFor({ state: 'attached' });
    await page.locator('[data-view="collection"]').click();
    await page.waitForTimeout(100); assert.deepEqual(await state(), s);
    assert.equal(await page.locator('.combat-emblem,.effect-recipient').count(), 0);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.locator('[data-view="arena"]').click(); assert.equal((await state()).phase, 'physical');
  });
  await test('Automatic ward then luck then heart; reload after consumption preserves RNG and DB totals', async () => {
    await page.emulateMedia({ reducedMotion: 'reduce' }); await importState(ordering.before);
    const dice = await diceBounds(); await page.locator('[data-action="roll"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game'))?.duel?.autoDefense === true);
    assert.deepEqual(await state(), ordering.middle); await dbEquals(ordering.middle);
    // Collection view on a fresh navigation prevents scheduling until returning to the arena.
    await page.goto(url + '/site/index.html#collection'); await ready();
    assert.deepEqual(await state(), ordering.middle); await dbEquals(ordering.middle);
    const u = ordering.middle.players[1].board[3];
    assert.equal(u.ward, 0); assert.equal(u.luck, 0); assert.equal(u.reraise, 1);
    assert.equal(u.mana, 60); assert.equal(u.physical, 60); assert.equal(ordering.middle.duel.failedDefense.ward, 60);
    assert.equal(ordering.middle.match.events.length, ordering.before.match.events.length);
    await page.locator('[data-view="arena"]').click(); await capture('ordering-reloaded-before-auto-reroll');
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
    assert.deepEqual(await state(), ordering.after); await dbEquals(ordering.after);
    const after = ordering.after.players[1].board[3];
    for (const key of ['ward', 'luck', 'reraise']) assert.equal(after[key], 0);
    assert.equal(after.mana, 60); assert.equal(after.physical, 60);
    assert.equal(ordering.after.duel.formula.ward, 60); assert.equal(ordering.after.match.events.length, ordering.before.match.events.length + 1);
    sameDice(dice, await diceBounds());
    assert.equal(await page.locator(`.slot[data-unit="${after.uid}"] .trait-badge`).count(), 2);
    await capture('ordering-final-heart-consumed');
    await page.reload(); await ready(); assert.deepEqual(await state(), ordering.after); await dbEquals(ordering.after);
  });
  await test('Final archive rows and careers retain stack metrics; repeat save/import is idempotent', async () => {
    const final = complete(ordering.after), expected = copy(E.matchStats(final));
    await importState(final); await dbEquals(final); await closeDialogs();
    const result = await page.evaluate(async s => {
      const db = KALISTAR_DB; await db.saveGame(s); await db.saveGame(s);
      const backup = await db.exportBackup(), counts = db.counts();
      const rows = db.inspect('results').filter(r => r.matchId === s.matchId);
      const careers = KALISTAR_DATA.cards.map(c => ({ id: c.id, ...db.career(c.id) }));
      await db.importBackup(backup); await db.importBackup(backup);
      return { counts, afterCounts: db.counts(), rows, afterRows: db.inspect('results').filter(r => r.matchId === s.matchId), careers, afterCareers: KALISTAR_DATA.cards.map(c => ({ id: c.id, ...db.career(c.id) })) };
    }, final);
    assert.deepEqual(result.afterCounts, result.counts); assert.deepEqual(result.afterRows, result.rows); assert.deepEqual(result.afterCareers, result.careers);
    assert.equal(result.rows.length, 20);
    for (const u of expected.units) {
      const row = result.rows.find(r => r.instanceId === u.instanceId);
      for (const key of ['physical', 'guards', 'ward', 'clovers', 'hearts', 'potions', 'luckUsed', 'reraises', 'support', 'alliedSupport', 'refreshes', 'buff', 'defenseRolls']) assert.equal(row[key], u[key], key + ':' + u.uid);
    }
    report.archive = { summary: expected, counts: result.counts, rows: result.rows };
    await page.reload(); await ready(); await dbEquals(final); await closeDialogs();
  });
  await test('Nonblank central 3D dice and value animation', async () => {
    await importState(fresh(allStacked)); await page.locator('[data-action="focus-duel"]').click();
    const evidence = await page.evaluate(async () => {
      const host = document.querySelector('.dice-stage'), canvas = host.querySelector('canvas');
      const rolling = KalistarDice.play(Number(host.dataset.player), 3, false);
      await new Promise(r => setTimeout(r, 180)); const first = canvas.toDataURL();
      await new Promise(r => setTimeout(r, 180)); const second = canvas.toDataURL(); await rolling;
      const sample = document.createElement('canvas'); sample.width = canvas.width; sample.height = canvas.height;
      const ctx = sample.getContext('2d'); ctx.drawImage(canvas, 0, 0); const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const colors = new Set(); let opaque = 0;
      for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 100) { opaque++; colors.add(pixels.slice(i, i + 3).join(',')); }
      return { moving: first !== second, front: host.dataset.front, colors: colors.size, opaque };
    });
    report.dice = evidence; assert.ok(evidence.moving); assert.equal(evidence.front, '3'); assert.ok(evidence.colors > 30 && evidence.opaque > 100);
  });
  await test('Historical Elenion flail and rules stay archived under actual corrected Arc catalogue', async () => {
    const old = historicalData.cards.find(c => c.id === '30000036');
    assert.equal(old.weapon_index, 4, 'Supplied pre-rebuild snapshot must still contain historical flail');
    assert.equal(correctedElenion.weapon, 'Arc'); assert.equal(correctedElenion.weapon_index, 5);
    for (const key of ['id', 'positions', 'atk', 'defense', 'magic', 'barriers']) assert.deepEqual(old[key], correctedElenion[key]);
    const final = complete(base('ELENION-HISTORICAL-FLAIL', '30000036', historicalEngine), historicalEngine);
    const result = await page.evaluate(async ({ final, corrected, oldData }) => {
      const updated = structuredClone(KALISTAR_DATA);
      updated.cards[updated.cards.findIndex(c => c.id === corrected.id)] = corrected;
      const source = await KalistarLocalDB.open(oldData, { name: 'kalistar-v3-cards-buffs-history-old' });
      await source.saveGame(final); const backup = await source.exportBackup(), original = backup.matches[0]; source.close();
      let dest = await KalistarLocalDB.open(updated, { name: 'kalistar-v3-cards-buffs-history-current' });
      await dest.importBackup(backup); await dest.importBackup(backup); await dest.saveGame(final);
      const imported = dest.match(final.matchId), counts = dest.counts(); dest.close();
      dest = await KalistarLocalDB.open(updated, { name: 'kalistar-v3-cards-buffs-history-current' });
      const reopened = dest.match(final.matchId), live = dest.inspect('versions').find(c => c.id === corrected.id);
      const rows = dest.inspect('results'); dest.close();
      return { original, imported, reopened, live, counts, rows, backup };
    }, { final, corrected: correctedElenion, oldData: historicalData });
    for (const actual of [result.imported, result.reopened]) {
      for (const key of ['profiles', 'rules', 'arenas', 'state', 'summary']) assert.deepEqual(actual[key], result.original[key], 'Historical ' + key + ' changed');
      const historical = actual.profiles.find(c => c.id === old.id);
      assert.equal(historical.weapon, old.weapon); assert.equal(historical.weapon_index, 4);
    }
    assert.equal(result.live.weapon, 'Arc'); assert.equal(result.live.weapon_index, 5);
    assert.equal(result.counts.matches, 1); assert.equal(result.rows.length, 20);
    historicalBackup = result.backup;
    report.historicalElenion = { source: 'V3/donnees/cartes.json', sourceSHA256: hash(profileSource),
      suppliedWeapon: old.weapon, historicalWeapon: result.reopened.profiles.find(c => c.id === old.id).weapon,
      currentWeapon: result.live.weapon, profilesRetained: true, rulesRetained: true, scoresRetained: true, counts: result.counts };
  });
  await test('Opening a historical match resolves Elenion detail from its archived profile, not current Arc', async () => {
    assert.ok(historicalBackup, 'Historical DB setup must pass first');
    const current = copy(data); current.cards[current.cards.findIndex(c => c.id === correctedElenion.id)] = correctedElenion;
    // Only this separate context supplies the actual corrected profile from cartes.json.
    // Main tests continue to use the untouched supplied data.js snapshot.
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
    const historyPage = await context.newPage();
    historyPage.on('pageerror', error => report.browserErrors.push(error.message));
    await context.route('**/*', route => new URL(route.request().url()).origin === url ? route.continue() : route.abort());
    await historyPage.route('**/site/data.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.KALISTAR_DATA=' + JSON.stringify(current) }));
    try {
      await historyPage.goto(url + '/site/index.html');
      await historyPage.waitForFunction(() => window.KALISTAR_READY && window.KALISTAR_DB);
      await historyPage.evaluate(backup => KALISTAR_DB.importBackup(backup), historicalBackup);
      await historyPage.locator('[data-action="database"]').click();
      await historyPage.locator(`[data-action="history-match"][data-id="${historicalBackup.matches[0].id}"]`).click();
      await historyPage.locator('[data-action="stats-tab"][data-id="lineup"]').click();
      const findHistoricalRow = async () => {
        const row = historyPage.locator('.match-table [data-action="detail"][data-id="30000036"]');
        for (let n = 0; n < 20 && !await row.count(); n++) {
          const next = historyPage.locator('[data-action="stats-page"][aria-label="Page suivante"]:not(:disabled)');
          assert.equal(await next.count(), 1, 'Historical card missing from paginated report');
          await next.click();
        }
        assert.ok(await row.count(), 'Historical Elenion is reachable');
      };
      await findHistoricalRow();
      await historyPage.locator('.match-table [data-action="detail"][data-id="30000036"]').first().click();
      const actualWeapon = await historyPage.locator('#detail-dialog .detail-info > .muted').innerText();
      const historical = historicalBackup.matches[0].profiles.find(c => c.id === '30000036');
      const saved = await historyPage.evaluate(id => KALISTAR_DB.match(id), historicalBackup.matches[0].id);
      assert.equal(saved.profiles.find(c => c.id === historical.id).weapon, historical.weapon);
      const file = path.join(screenshots, 'historical-elenion-detail.png');
      await historyPage.screenshot({ path: file }); report.screenshots.push(path.relative(root, file).replaceAll('\\', '/'));
      report.historicalUi = { currentProfileSource: 'V3/donnees/cartes.json', archivedWeapon: historical.weapon, actualDisplayedWeapon: actualWeapon,
        archivedTitle: historical.title, actualDisplayedTitle: await historyPage.locator('#detail-dialog .detail-info > div > h2').first().innerText() };
      if (actualWeapon !== historical.weapon) report.risks.push({ severity: 'P2', title: 'Historical match detail resolves current catalogue instead of archived profile',
        locations: ['V3/site/app.js:374', 'V3/site/app.js:120', 'V3/site/match-report.js:3'], evidence: report.historicalUi,
        impact: 'Archive retains historical flail and scores, but opening its card shows current Arc and new narrative. No data loss or migration.' });
      assert.equal(actualWeapon, historical.weapon, 'Historical flail is stored correctly but UI resolves current Arc');
      assert.equal(report.historicalUi.actualDisplayedTitle, historical.title);
      assert.equal(await historyPage.locator('#detail-dialog .story').innerText(), historical.text);
      await historyPage.locator('#detail-dialog [data-action="toggle-art"]').click();
      assert.equal(await historyPage.locator('#detail-dialog .detail-info > .muted').innerText(), historical.weapon);
      await historyPage.locator('#detail-dialog [data-action="close"]').click();
      await historyPage.locator('[data-action="stats-sort"][data-id="kills"]').click();
      await findHistoricalRow();
      assert.equal(await historyPage.locator('.match-table [data-action="detail"][data-id="30000036"] small').first().innerText(), historical.title);
    } finally { await context.close(); }
  });
  await test('Isolated V2 sentinels untouched and no browser exceptions', async () => {
    const sentinel = await page.evaluate(async () => {
      const value = await new Promise((resolve, reject) => { const r = indexedDB.open('kalistar-v2-cards'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, q = db.transaction('sentinel').objectStore('sentinel').get('marker'); q.onsuccess = () => { db.close(); resolve(q.result); }; }; });
      return { value, local: localStorage.getItem('kalistar.v2.game') };
    });
    assert.deepEqual(sentinel, { value: 'UNCHANGED', local: 'STACK-TEST-V2-SENTINEL' }); assert.deepEqual(report.browserErrors, []);
  });
}
run().catch(error => { report.fatal = error.stack; process.exitCode = 1; }).finally(async () => {
  await browser?.close(); if (server.listening) await new Promise(resolve => server.close(resolve));
  report.changedDuringRun = sourceFiles.filter(f => hash(fs.readFileSync(path.join(site, f))) !== report.sourceHashes[f]);
  report.missingResources = [...new Set(report.missingResources)];
  report.passed = report.tests.filter(t => t.ok).length; report.failed = report.tests.filter(t => !t.ok).length;
  report.ok = !report.fatal && report.failed === 0;
  if (!report.ok) process.exitCode = 1;
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'report.md'), '# Stacked Buffs UI / IndexedDB Verification\n\n' +
    `Result: ${report.ok ? 'PASS' : 'FAIL'}; ${report.passed} passed, ${report.failed} failed.\n\n` +
    report.isolation + '\n\n' + report.fixtures + '\n\n' +
    report.tests.map(t => `- ${t.ok ? 'PASS' : 'FAIL'}: ${t.name}${t.ok ? '' : '\n  ' + t.error}`).join('\n') +
    '\n\n## Concrete Risks\n\n' + report.risks.map(r => `- ${r.severity}: ${r.title}${r.viewport ? ' at ' + r.viewport.width + 'px' : ''}. ${r.impact} Sources: ${r.locations.join(', ')}.`).join('\n') +
    '\n\nSource changes during run: ' + (report.changedDuringRun.join(', ') || 'none') +
    '\n\nSee report.json for complete state fixtures, metrics, source SHA256, geometry and screenshot paths.\n' + (report.fatal || ''));
  console.log(JSON.stringify({ ok: report.ok, passed: report.passed, failed: report.failed, fatal: report.fatal, changedDuringRun: report.changedDuringRun, report: path.join(output, 'report.json') }, null, 2));
});
