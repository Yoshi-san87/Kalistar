'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const root = path.resolve(__dirname, '..'), site = path.join(root, 'site');
const files = fs.readdirSync(site).filter(f => /\.(js|css|html)$/.test(f));
const sources = Object.fromEntries(files.map(f => [f, fs.readFileSync(path.join(site, f), 'utf8')]));
const sandbox = { window: {} }; vm.runInNewContext(sources['data.js'], sandbox);
const data = JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const E = require(path.join(site, 'engine.js')).createEngine(data);
const presets = [{ id: 'player', name: 'Deck initial joueur', cards: data.decks.player }, { id: 'enemy', name: 'Deck initial adverse', cards: data.decks.enemy }, ...data.decks.presets];
assert.equal(presets.length, 5); assert.equal(new Set(presets.flatMap(p => p.cards)).size, 41);
assert.deepEqual(data.decks, JSON.parse(fs.readFileSync(path.join(root, 'donnees/decks_demo.json'), 'utf8')), 'Canonical and bundled presets must match');
for (const preset of presets) assert.deepEqual(E.validatePlayableDeck(preset.cards), [], preset.id);
const cases = [], browserErrors = [];
async function test(name, run) { await run(); cases.push(name); console.log('PASS ' + name); }
function playwright() {
  try { return require('playwright'); } catch {}
  const modules = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  return createRequire(path.join(modules, '__presets__.cjs'))('playwright');
}
let browser;
async function pageFor(bundle = data) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  page.on('pageerror', error => browserErrors.push(error.message));
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname !== 'localhost') return route.fulfill({ status: 204, body: '' });
    if (url.pathname === '/blank') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Presets V3</title>' });
    // No asset QA while the parent is generating prints and illustrations.
    if (/\.(png|webp|svg|jpe?g)$/i.test(url.pathname)) return route.fulfill({ contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64') });
    const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
    if (!file.startsWith(root + path.sep)) return route.fulfill({ status: 403, body: '' });
    try {
      const name = path.basename(file), body = file === path.join(site, 'data.js') ? 'window.KALISTAR_DATA=' + JSON.stringify(bundle) : path.dirname(file) === site && sources[name] !== undefined ? sources[name] : fs.readFileSync(file);
      return route.fulfill({ body, contentType: { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }[path.extname(file)] || 'application/octet-stream' });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  });
  await page.goto('http://localhost:39873/blank');
  await page.evaluate(() => localStorage.setItem('kalistar.v2.enemyDeckPreset', 'V2-UNCHANGED'));
  return { page, context };
}
const ready = page => page.waitForFunction(() => window.KALISTAR_READY && window.KALISTAR_DB);
const saved = (page, key) => page.evaluate(key => JSON.parse(localStorage.getItem('kalistar.v3.' + key)), key);
const close = page => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
const arena = async page => { await close(page); await page.locator('[data-view="arena"]').click(); await page.locator('.game-shell').waitFor(); };
const roster = (state, side) => [...state.players[side].board.filter(Boolean), ...state.players[side].reserve, ...state.players[side].dead].sort((a, b) => a.uid.localeCompare(b.uid)).map(u => u.cardId);
async function run() {
  browser = await playwright().chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const { page, context } = await pageFor();
  await page.goto('http://localhost:39873/site/index.html'); await ready(page);
  await page.locator('[data-action="deck"]').click();
  await test('Five named canonical/bundled presets cover 41 cards and all pass validatePlayableDeck', async () => {
    assert.equal(await page.evaluate(() => location.hash), '#decks');
    assert.deepEqual(await page.locator('#deck-preset option').evaluateAll(nodes => nodes.map(n => ({ id: n.value, name: n.textContent, disabled: n.disabled }))), presets.map(p => ({ id: p.id, name: p.name, disabled: false })));
  });
  await test('Editing the initial draft cannot mutate source presets', async () => {
    await page.locator('[data-deck-action="remove"][data-slot="0"]').click();
    assert.equal((await saved(page, 'deck')).length, 9);
    assert.deepEqual(await page.evaluate(() => KALISTAR_DATA.decks), data.decks);
    await page.locator('[data-action="load-preset"]').click();
    assert.deepEqual(await saved(page, 'deck'), data.decks.player);
  });
  await close(page); await page.locator('[data-view="arena"]').click();
  await page.locator('[data-action="start"]').click();
  const running = await saved(page, 'game'); assert.equal(running.phase, 'choose'); assert.equal(running.deckCoverage, 2);
  await page.evaluate(() => KALISTAR_DB.idle());
  await test('Selecting is inert; Charger loads each draft without changing the active match', async () => {
    await page.locator('[data-action="deck"]').click();
    for (const preset of presets) {
      const before = await saved(page, 'deck');
      await page.locator('#deck-preset').selectOption(preset.id);
      assert.deepEqual(await saved(page, 'deck'), before);
      assert.deepEqual(await saved(page, 'game'), running);
      await page.locator('[data-action="load-preset"]').click();
      assert.deepEqual(await saved(page, 'deck'), preset.cards);
      assert.equal(await page.locator('[data-deck-action="name"]').inputValue(), preset.name);
      assert.equal(await page.locator('[data-deck-action="play"]').isEnabled(), true);
      assert.deepEqual(await saved(page, 'game'), running);
      assert.deepEqual(await page.evaluate(id => KALISTAR_DB.match(id).state, running.matchId), running);
    }
    assert.deepEqual(await page.evaluate(() => KALISTAR_DATA.decks), data.decks);
  });
  await test('Draft and preset preferences persist in V3; canceled IA choice preserves the match', async () => {
    await arena(page); await page.locator('[data-action="new-game"]').click();
    assert.equal(await page.locator('#enemy-deck-label').innerText(), 'Deck IA');
    assert.equal(await page.locator('#enemy-deck-preset option').count(), 5);
    await page.locator('#enemy-deck-preset').selectOption('cites');
    await page.locator('#new-game-dialog [data-action="close"]').first().click();
    assert.deepEqual(await saved(page, 'game'), running);
    await page.reload(); await ready(page);
    assert.equal(await saved(page, 'deckPreset'), 'frontieres');
    assert.equal(await saved(page, 'enemyDeckPreset'), 'cites');
    assert.deepEqual(await saved(page, 'deck'), presets.at(-1).cards);
    assert.deepEqual(await saved(page, 'game'), running);
    await page.locator('[data-action="deck"]').click();
    assert.equal(await page.locator('#deck-preset').inputValue(), 'frontieres');
    await arena(page); await page.locator('[data-action="new-game"]').click();
    assert.equal(await page.locator('#enemy-deck-preset').inputValue(), 'cites');
    await close(page);
  });
  await test('Each of the five IA decks is used only by the next confirmed match', async () => {
    const played = new Set();
    for (const preset of presets) {
      const previous = await saved(page, 'game');
      await page.locator('[data-action="new-game"]').click();
      await page.locator('#enemy-deck-preset').selectOption(preset.id);
      assert.deepEqual(await saved(page, 'game'), previous);
      await page.locator('#game-seed').fill('PRESET-' + preset.id);
      page.once('dialog', d => d.accept());
      await page.locator('#new-game-form button[type="submit"]').click();
      await page.locator('#new-game-dialog').waitFor({state:'hidden'});
      const next = await saved(page, 'game'); E.assertState(next);
      assert.equal(next.deckCoverage, 2);
      assert.notEqual(next.matchId, previous.matchId); assert.equal(next.phase, 'setup'); assert.equal(next.mode, 'ai');
      assert.deepEqual(roster(next, 0), presets.at(-1).cards); assert.deepEqual(roster(next, 1), preset.cards);
      for (const id of roster(next, 1)) played.add(id);
      await page.evaluate(() => KALISTAR_DB.idle());
      assert.deepEqual(await page.evaluate(id => KALISTAR_DB.match(id).state, previous.matchId), previous);
    }
    assert.equal(played.size, 41);
  });
  await test('Opponent selector remains coherent for local two-player matches', async () => {
    await page.locator('[data-action="new-game"]').click();
    await page.locator('#game-mode').selectOption('local');
    assert.equal(await page.locator('#enemy-deck-label').innerText(), 'Deck du joueur 2');
    await page.locator('#enemy-deck-preset').selectOption('z13');
    page.once('dialog', d => d.accept());
    await page.locator('#new-game-form button[type="submit"]').click();
    await page.locator('#new-game-dialog').waitFor({state:'hidden'});
    const s = await saved(page, 'game'); assert.equal(s.mode, 'local'); assert.equal(s.deckCoverage, 2);
    assert.deepEqual(roster(s, 1), presets.find(p => p.id === 'z13').cards);
  });
  await test('An invalid draft cannot replace an active game, even by forged form submission', async () => {
    const before = await saved(page, 'game');
    await page.locator('[data-action="deck"]').click();
    await page.locator('[data-deck-action="remove"][data-slot="0"]').click();
    assert.equal(await page.locator('[data-deck-action="play"]').isDisabled(), true);
    await arena(page); await page.locator('[data-action="new-game"]').click();
    assert.equal(await page.locator('#new-game-form button[type="submit"]').isDisabled(), true);
    page.once('dialog', d => d.accept());
    await page.evaluate(() => document.querySelector('#new-game-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    assert.deepEqual(await saved(page, 'game'), before);
    assert.equal(await page.locator('#new-game-dialog').evaluate(d => d.open), true);
    assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v2.enemyDeckPreset')), 'V2-UNCHANGED');
  });
  await test('Preset controls fit desktop and mobile deck page and new-game dialog without horizontal overflow', async () => {
    for (const width of [1280, 360]) {
      await close(page); await page.setViewportSize({ width, height: 900 });
      await page.locator('[data-action="deck"]').click();
      for (const selector of ['#deck-preset', '[data-action="load-preset"]']) {
        const control = page.locator(selector); await control.scrollIntoViewIfNeeded();
        assert.equal(await control.evaluate(node => {
          const box = node.getBoundingClientRect(), shell = node.closest('.decks-shell').getBoundingClientRect();
          return box.width > 0 && box.left >= shell.left && box.right <= shell.right && box.right <= innerWidth;
        }), true, selector + ' at ' + width);
      }
      await arena(page); await page.locator('[data-action="new-game"]').click();
      const select = page.locator('#enemy-deck-preset'); await select.scrollIntoViewIfNeeded();
      assert.equal(await select.evaluate(node => {
        const box = node.getBoundingClientRect(), dialog = node.closest('dialog').getBoundingClientRect();
        const style = getComputedStyle(node), canvas = document.createElement('canvas'), ctx = canvas.getContext('2d');
        ctx.font = style.font;
        const longest = Math.max(...Array.from(node.options, option => ctx.measureText(option.text).width));
        return box.left >= dialog.left && box.right <= dialog.right && box.right <= innerWidth && longest + 40 <= box.width;
      }), true, 'IA preset labels at ' + width);
    }
  });
  await context.close();
  const altered = structuredClone(data); altered.decks.presets[0].cards = [data.cards[0].id];
  const { page: bad, context: badContext } = await pageFor(altered);
  await bad.evaluate(id => {
    localStorage.setItem('kalistar.v3.deckPreset', JSON.stringify(id));
    localStorage.setItem('kalistar.v3.enemyDeckPreset', JSON.stringify(id));
  }, altered.decks.presets[0].id);
  await bad.goto('http://localhost:39873/site/index.html'); await ready(bad);
  await test('Invalid saved presets fall back; invalid presets are disabled and cannot bypass validation', async () => {
    assert.equal(await saved(bad, 'deckPreset'), 'player'); assert.equal(await saved(bad, 'enemyDeckPreset'), 'enemy');
    await bad.locator('[data-action="deck"]').click();
    assert.equal(await bad.locator('#deck-preset option[value="z13"]').evaluate(option => option.disabled), true, await bad.locator('#deck-preset').evaluate(select => select.outerHTML));
    const draft = await saved(bad, 'deck');
    await bad.evaluate(() => { document.querySelector('#deck-preset').value = 'z13'; });
    await bad.locator('[data-action="load-preset"]').click();
    assert.match(await bad.locator('#toast').innerText(), /Deck prédéfini invalide/);
    assert.deepEqual(await saved(bad, 'deck'), draft);
    await close(bad); await bad.locator('[data-view="arena"]').click();
    await bad.locator('.game-shell').waitFor();
    const before = await saved(bad, 'game');
    await bad.locator('[data-action="new-game"]').click();
    assert.equal(await bad.locator('#enemy-deck-preset option[value="z13"]').evaluate(option => option.disabled), true);
    await bad.evaluate(() => { document.querySelector('#enemy-deck-preset').value = 'z13'; });
    bad.once('dialog', d => d.accept());
    await bad.locator('#new-game-form button[type="submit"]').click();
    assert.deepEqual(await saved(bad, 'game'), before);
    assert.equal(await bad.locator('#new-game-dialog').evaluate(d => d.open), true);
  });
  await test('Unknown stored preference IDs are normalized without disturbing an existing game', async () => {
    const before = await saved(bad, 'game');
    await bad.evaluate(() => {
      localStorage.setItem('kalistar.v3.deckPreset', '"deleted-preset"');
      localStorage.setItem('kalistar.v3.enemyDeckPreset', '{"wrong":"type"}');
    });
    await bad.reload(); await ready(bad);
    assert.equal(await saved(bad, 'deckPreset'), 'player'); assert.equal(await saved(bad, 'enemyDeckPreset'), 'enemy');
    assert.deepEqual(await saved(bad, 'game'), before);
  });
  await badContext.close();
  assert.deepEqual(browserErrors, []);
  const changed = files.filter(f => fs.readFileSync(path.join(site, f), 'utf8') !== sources[f]);
  const report = { ok: true, checks: cases.length, cases, decks: presets.length, cards: 41, coverage: presets.map(p => ({id:p.id,counts:E.deckCoverage(p.cards)})), browserErrors, changedDuringTest: changed, sourceHashes: Object.fromEntries(files.map(f => [f, createHash('sha256').update(sources[f]).digest('hex').slice(0, 12)])) };
  const output = path.join(root, 'verification-presets'); fs.mkdirSync(output, {recursive:true});
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
run().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
