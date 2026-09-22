'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__duel_stats_test__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification/mobile-duel-stats');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true, ignoreDefaultArgs: ['--hide-scrollbars'] });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 1007 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url + '/jeu/#arena'); await page.waitForFunction(() => window.KALISTAR_READY);
    const fixture = await page.evaluate(async () => {
      await KALISTAR_DB.idle();
      const e = KalistarEngine.createEngine(KALISTAR_DATA), deck = KALISTAR_DATA.decks.presets.find(d => d.id === 'z13').cards;
      const s = e.newGame(deck, deck, { mode: 'local', seed: 'MOBILE-STATS', deckCoverage: 2 });
      for (const side of [0, 1]) {
        e.autoDeploy(s, side);
        if (e.card(s.players[side].board[0]).element !== 'NONE') {
          e.recall(s, side, 0); e.deploy(s, side, s.players[side].reserve.find(u => e.card(u).element === 'NONE').uid, 0);
        }
      }
      e.start(s);
      // Two real non-lethal exchanges give both selected instances ATK, DEF and stops.
      for (let i = 0; i < 2; i++) {
        e.lock(s, 0, 0); e.rollAttack(s, 3); e.acceptAttack(s); e.rollDefense(s, 6); e.next(s);
      }
      e.assertState(s);
      await KALISTAR_DB.saveGame(s); localStorage.setItem('kalistar.v4.game', JSON.stringify(s));
      return s;
    });
    await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.locator('.mobile-duel-stats').count(), 0, 'no stale selection on reload');
    for (const side of [0, 1]) await page.locator(`.formation[data-player="${side}"] .slot-card`).first().tap();
    await page.waitForFunction(() => performance.getEntriesByType('resource').some(r => r.name.endsWith('/armes/03.png')));
    await page.waitForTimeout(150);
    assert.equal(await page.locator('.mobile-duel-stats').count(), 2);
    const values = async selector => page.locator(selector).evaluateAll(nodes => nodes.map(n => [...n.querySelectorAll('dd')].map(d => d.textContent)));
    assert.deepEqual(await values('.mobile-duel-stats .duel-match-stats'), await values('.slot .duel-match-stats'), 'PC and phone use exactly the same match values');
    assert.ok((await values('.mobile-duel-stats .duel-match-stats')).every(v => Number(v[2]) > 0 && Number(v[3]) > 0 && Number(v[1]) === 1));
    for (const stage of await page.locator('.dice-stage').all()) {
      assert.equal(await stage.getAttribute('data-crystal'), '');
      assert.match(await stage.getAttribute('data-weapon'), /armes\/03\.png$/);
      assert.match(await stage.getAttribute('aria-label'), /Poing/);
      assert.ok(await stage.locator('canvas').evaluate(c => {
        const pixels = c.getContext('2d').getImageData(0, 0, c.width, c.height * .75).data;
        return pixels.filter((a, i) => i % 4 === 3 && a > 240).length > 200;
      }), 'selected weapon is painted, not an empty stage');
    }
    // Stress only the rendered counters, never the engine state or saved profile.
    const original = await page.locator('.mobile-duel-stats').evaluateAll(nodes => nodes.map(n => n.innerHTML));
    await page.locator('.mobile-duel-stats dd').evaluateAll(nodes => nodes.forEach(n => {
      const key = n.parentElement.dataset.metric;
      n.textContent = ['attack','defense'].includes(key) ? '40\u202f000' : ['physical','guards'].includes(key) ? '6\u202f000' : '100';
    }));
    for (const [width, height] of [[412,1007], [390,844], [320,568], [699,900], [844,390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      const issues = await page.evaluate(() => {
        const result = [], overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
        const obstacles = [...document.querySelectorAll('.slot-card,.side-heading,.duel-actions,.match-scoreboard,[data-action=arena-menu]')].map(n => n.getBoundingClientRect());
        for (const dock of document.querySelectorAll('.mobile-duel-stats')) {
          const r = dock.getBoundingClientRect();
          if (obstacles.some(o => overlap(r, o))) result.push('overlap');
          if (r.left < 0 || r.right > innerWidth) result.push('outside viewport');
          const strip = dock.querySelector('.duel-match-stats');
          if (getComputedStyle(strip.querySelector('small')).display !== 'none') result.push('visible heading');
          for (const metric of strip.querySelectorAll('[data-metric]')) {
            const box = metric.getBoundingClientRect(), icon = metric.querySelector('dt').getBoundingClientRect(), number = metric.querySelector('dd').getBoundingClientRect();
            if (icon.left < box.left - 1 || number.right > box.right + 1) result.push('clipped metric ' + metric.dataset.metric);
          }
        }
        return result;
      });
      assert.deepEqual(issues, [], width + 'px layout');
      await page.screenshot({ path: path.join(output, `counters-${width}.png`), scale: 'css' });
    }
    await page.locator('.mobile-duel-stats').evaluateAll((nodes, original) => nodes.forEach((n, i) => n.innerHTML = original[i]), original);
    await page.setViewportSize({ width: 412, height: 1007 });
    await page.screenshot({ path: path.join(output, 'selected-412.png'), scale: 'css' });
    await page.setViewportSize({ width: 1440, height: 1000 });
    assert.equal(await page.locator('.mobile-duel-stats').first().isVisible(), false);
    assert.equal(await page.locator('.slot .duel-match-stats').first().isVisible(), true);
    await page.screenshot({ path: path.join(output, 'selected-desktop.png'), scale: 'css' });
    await page.setViewportSize({ width: 320, height: 568 });
    // Reproduce the long support result from the user's screenshot through the engine.
    await page.evaluate(async s => {
      const e = KalistarEngine.createEngine(KALISTAR_DATA);
      e.lock(s, 0, 0); e.rollAttack(s, 2); e.acceptAttack(s); e.grantGuard(s, s.players[0].board[0].uid); e.assertState(s);
      await KALISTAR_DB.saveGame(s); localStorage.setItem('kalistar.v4.game', JSON.stringify(s));
    }, fixture);
    await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
    const status = page.locator('.duel-status');
    assert.match(await status.textContent(), /60 DEF/);
    assert.equal(await status.evaluate(n => getComputedStyle(n).scrollbarWidth), 'none');
    assert.equal(await status.evaluate(n => getComputedStyle(n, '::-webkit-scrollbar').display), 'none');
    assert.equal(await status.locator('h2').evaluate(n => getComputedStyle(n).overflowY), 'visible');
    await status.focus(); await page.keyboard.press('End');
    await page.waitForFunction(() => { const n = document.querySelector('.duel-status'); return n.scrollHeight <= n.clientHeight + n.scrollTop + 1; });
    await page.screenshot({ path: path.join(output, 'support-no-scrollbar.png'), scale: 'css' });
    assert.deepEqual(errors, []);
    console.log('PASS: shared PC/mobile match stats, responsive docks, NONE weapon, no elemental aura, accessible support text without scrollbars.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
