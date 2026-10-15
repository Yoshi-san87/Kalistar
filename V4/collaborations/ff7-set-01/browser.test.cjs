'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createEngine } = require('../../site/engine.js');
const modules = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(modules, '__ff7_check__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification');
const arenas = ['ff7-midgar', 'ff7-cosmo-canyon'];
const errors = [], badResponses = [], matches = [];
let browser;

function step(e, s) {
  if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
  else if (s.phase === 'attack') e.rollAttack(s);
  else if (s.phase === 'defense') e.rollDefense(s);
  else if (s.phase === 'result') e.next(s);
  else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
  else {
    const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase];
    assert.ok(suffix, 'Phase non geree : ' + s.phase);
    e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s));
  }
}
async function readyImages(page) {
  await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth > 0));
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const response = await fetch(url + '/api/game/catalogue'); assert.equal(response.status, 200);
  const data = await response.json(), engine = createEngine(data);
  const ff7 = data.cards.filter(c => c.faction === 'FF7'); assert.equal(ff7.length, 10);
  const preset = data.decks.presets.find(p => p.id === 'ff7-set-01');
  assert.ok(preset); assert.deepEqual(engine.validatePlayableDeck(preset.cards), []);
  for (const arenaId of arenas) {
    for (let n = 0; n < 6; n++) {
      const opponent = n % 2 ? data.decks.enemy : preset.cards;
      const state = engine.newGame(preset.cards, opponent, { arenaId, seed: 'FF7-QA-' + n, deckCoverage: 2 });
      engine.autoDeploy(state, 0); engine.autoDeploy(state, 1); engine.start(state);
      for (let i = 0; i < 10000 && state.phase !== 'over'; i++) { step(engine, state); engine.assertState(state); }
      assert.equal(state.phase, 'over');
      matches.push({ arenaId, seed: state.seed, winner: state.winner, exchanges: state.round });
    }
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => { if (r.status() >= 400) badResponses.push(r.url() + ': ' + r.status()); });
  page.on('dialog', d => d.accept());
  await page.goto(url + '/jeu/');
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  assert.deepEqual(await page.evaluate(() => [KALISTAR_DATA.cards.length, KALISTAR_DB.registry.owned('user-paris').length, KALISTAR_DB.registry.owned('user-tokyo').length]), [data.cards.length, data.cards.length, 0]);
  await page.locator('[data-binder-field=search]').fill('Aeris');
  await page.locator('.cb-card').first().click();
  await readyImages(page);
  assert.equal(await page.locator('.cb-card-heading h2').textContent(), 'AERIS');
  await page.screenshot({ path: path.join(output, 'aeris-collection.png') });
  await page.locator('[data-view=decks]').click();
  await page.locator('#deck-preset').selectOption('ff7-set-01');
  await page.locator('[data-action=load-preset]').click();
  await readyImages(page);
  await page.screenshot({ path: path.join(output, 'ff7-deck.png') });
  await page.locator('[data-view=arena]').click();
  for (const arenaId of arenas) {
    await page.locator('[data-action=new-game]').first().click();
    await page.locator('#new-game-dialog').waitFor({ state: 'visible' });
    await page.locator('input[name=arena][value="' + arenaId + '"]').check();
    await page.locator('#enemy-deck-preset').selectOption('ff7-set-01');
    await page.locator('#new-game-form button[type=submit]').click();
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.arenaId === id, arenaId);
    const game = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')));
    assert.equal(game.phase, 'setup');
    await page.locator('[data-action=start]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase === 'choose');
    await readyImages(page);
    assert.ok((await page.locator('.game-shell').getAttribute('style')).includes(arenaId + '.png'));
    await page.screenshot({ path: path.join(output, arenaId + '-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await readyImages(page);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Debordement mobile.');
    await page.screenshot({ path: path.join(output, arenaId + '-mobile.png') });
    await page.setViewportSize({ width: 1600, height: 1000 });
  }
  assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
  const report = { passed: true, catalogue: data.cards.length, ff7: ff7.length, ownedParis: data.cards.length, ownedTokyo: 0, preset: preset.id, arenas, matches, errors, badResponses, storage: 'isolated-browser-context', checkedAt: new Date().toISOString() };
  fs.writeFileSync(path.join(output, 'browser-report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
  await context.close();
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
