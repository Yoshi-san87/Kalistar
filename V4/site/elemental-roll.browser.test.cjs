'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__elemental_test__.cjs'))('playwright');
const elements = require('../../V3/donnees/elements.json');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification');

async function pixels(page) {
  return page.locator('.dice-stage canvas').evaluateAll(canvases => canvases.map(canvas => {
    const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0, nonblank = 0, opaqueCore = 0;
    for (let i = 0; i < data.length; i += 4) {
      hash = (Math.imul(hash, 31) + data[i] + data[i + 1] + data[i + 2]) >>> 0;
      if (data[i + 3]) nonblank++;
    }
    const core = ctx.getImageData(canvas.width * .45, canvas.height * .35, canvas.width * .1, canvas.height * .2).data;
    for (let i = 3; i < core.length; i += 4) if (core[i] > 240) opaqueCore++;
    return { hash, nonblank, opaqueCore, paints: canvas.testPaints || 0 };
  }));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    const page = await context.newPage(), errors = [];
    page.on('dialog', dialog => dialog.accept());
    page.on('pageerror', e => errors.push(e.message));
    await page.route(url + '/__elemental_fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><link rel="stylesheet" href="/jeu/elemental-roll.css"><style>body{margin:24px;background:#111b19;color:#e9e3cc;font:14px Georgia}main{display:grid;grid-template-columns:repeat(7,160px);gap:20px}.dice-stage{width:160px;height:160px}h2{font:14px Georgia;text-align:center}button{font:inherit;padding:10px;margin-bottom:20px}</style></head><body><button id="engage">Engage</button><button id="roll">Roll</button><main class="duel-console" data-phase="choose">${Object.entries(elements).map(([element, info], i) => `<section><h2>${info.label}</h2><div class="dice-stage" data-player="${i}" data-selected="true" data-element="${element}" data-color="#${info.color}" data-crystal="${element === 'NONE' ? '' : '/jeu/shared/cristaux/' + element + '.png'}" data-role="ATK" data-slot="1"></div></section>`).join('')}</main><script src="/jeu/elemental-roll.js"></script><script>
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(...args) { this.canvas.testPaints=(this.canvas.testPaints||0)+1;return clear.apply(this,args); };
      const mount = () => KalistarDice.mount(document.querySelectorAll('.dice-stage'));
      document.querySelector('#engage').onclick = () => { document.querySelector('main').dataset.phase='attack';mount(); };
      document.querySelector('#roll').onclick = () => { window.rollFinished=KalistarDice.play(0,4,false); };
      mount();
    </script></body></html>` }));
    await page.goto(url + '/__elemental_fixture');
    await page.waitForFunction(() => performance.getEntriesByType('resource').filter(r => r.name.includes('/cristaux/')).length === 12);
    await page.waitForTimeout(200);
    const dormant = await pixels(page);
    assert.ok(dormant.every(p => p.nonblank > 400));
    await page.locator('#engage').click();
    await page.waitForTimeout(1700);
    const awake = await pixels(page);
    await page.screenshot({ path: path.join(output, 'elemental-awakening-all.png') });
    await page.waitForTimeout(650);
    const later = await pixels(page);
    for (let i = 0; i < 12; i++) {
      assert.notEqual(awake[i].hash, later[i].hash, `${Object.keys(elements)[i]} stays alive after 900ms`);
      assert.equal(awake[i].opaqueCore, dormant[i].opaqueCore, 'painted gem keeps its solid silhouette');
      assert.ok(later[i].paints - awake[i].paints < 26, 'drawing is capped at 30 fps');
    }
    assert.equal(awake[12].paints, later[12].paints, 'NONE stays neutral');
    await page.locator('#roll').click();
    assert.equal(await page.locator('.is-engaging').count(), 0, 'all crystals stop waiting at roll start');
    assert.equal(await page.evaluate(() => window.rollFinished), true);
    const stopped = await pixels(page);
    await page.waitForTimeout(400);
    assert.deepEqual((await pixels(page)).map(p => p.paints), stopped.map(p => p.paints), 'no idle paints after roll');
    await page.locator('#engage').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const reduced = await pixels(page);
    await page.waitForTimeout(400);
    assert.deepEqual((await pixels(page)).map(p => p.paints), reduced.map(p => p.paints), 'reduced motion is fully static');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150);
    assert.notEqual((await pixels(page))[0].hash, reduced[0].hash, 'motion preference can change at runtime');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, value:true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden = await pixels(page);
    await page.waitForTimeout(200);
    assert.deepEqual((await pixels(page)).map(p => p.paints), hidden.map(p => p.paints), 'hidden tab stops drawing');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(150);
    assert.notEqual((await pixels(page))[0].hash, hidden[0].hash);
    assert.equal(await page.evaluate(async () => {
      const pending = KalistarDice.play(0, 2, false); KalistarDice.mount([]); return pending;
    }), false, 'unmount cancels an in-flight reveal');
    assert.equal(await page.locator('.ritual-flight').count(), 0);
    await page.locator('#engage').click();
    await page.evaluate(() => KalistarDice.cancel());
    const cancelled = await pixels(page);
    await page.waitForTimeout(200);
    assert.deepEqual((await pixels(page)).map(p => p.paints), cancelled.map(p => p.paints), 'explicit navigation cancellation leaves no loop');

    // Exercise the actual game UI and saved engine state in a disposable profile.
    await page.goto(url + '/jeu/');
    await page.waitForFunction(() => window.KALISTAR_READY);
    await page.locator('[data-view=arena]').click();
    await page.locator('[data-action=new-game]').first().click();
    await page.locator('#game-mode').selectOption('local');
    await page.locator('#game-seed').fill('AWAKENING-QA');
    await page.locator('#new-game-form button[type=submit]').click();
    await page.locator('[data-action=auto-formation]').first().click();
    await page.locator('[data-action=start]').click();
    await page.waitForFunction(() => document.querySelector('.duel-console')?.dataset.phase === 'choose');
    await page.locator('.formation[data-player="0"] .slot-card:not(.empty)').first().click();
    await page.locator('.formation[data-player="1"] .slot-card:not(.empty)').first().click();
    await page.locator('[data-action=lock]').click();
    await page.waitForSelector('.dice-stage.is-engaging');
    const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
    await page.waitForTimeout(1800);
    const frame = await pixels(page);
    await page.waitForTimeout(350);
    assert.notEqual((await pixels(page))[0].hash, frame[0].hash);
    assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')), saved, 'waiting never changes game state or RNG');
    await page.screenshot({ path: path.join(output, 'elemental-awakening-desktop.png') });
    await page.reload();
    await page.waitForFunction(() => window.KALISTAR_READY);
    await page.waitForSelector('.dice-stage.is-engaging');
    await page.setViewportSize({ width: 412, height: 1007 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(output, 'elemental-awakening-phone.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('[data-action=roll]').click();
    assert.equal(await page.locator('.is-engaging').count(), 0);
    await page.waitForFunction(() => !document.querySelector('#app').classList.contains('rolling'));
    assert.notEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).phase), 'attack');
    assert.deepEqual(errors, []);
    console.log('PASS: 12 elemental auras + NONE, continuous waiting, stable gem, 30fps, roll/cancel, reduced motion, visibility, actual duel, reload, phone, unchanged RNG.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
