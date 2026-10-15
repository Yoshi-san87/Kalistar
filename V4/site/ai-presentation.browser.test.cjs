'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__ai_presentation__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification/ai-presentation');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 1007 }, reducedMotion: 'no-preference' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => {
      window.presentationSteps = [];
      new MutationObserver(() => {
        const arena = document.querySelector('.duel-console');
        if (!arena) return;
        const step = { phase: arena.dataset.phase, attacker: document.querySelector('.team-right .challenger')?.dataset.unit || null,
          target: document.querySelector('.team-left .challenger')?.dataset.unit || null,
          setting: document.querySelectorAll('.is-setting').length, casting: arena.dataset.casting || null };
        const key = JSON.stringify(step);
        if (window.presentationSteps.at(-1)?.key !== key) window.presentationSteps.push({ ...step, key, time: performance.now() });
      }).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'data-phase', 'data-casting'] });
    });
    await page.goto(url + '/jeu/#arena'); await page.waitForFunction(() => window.KALISTAR_READY);
    await page.locator('[data-action=start]').click();
    const base = await page.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('kalistar.v4.game')); s.mode = 'ai'; s.turn = 1; return s;
    });
    const expected = await page.evaluate(s => {
      const e = KalistarEngine.createEngine(KALISTAR_DATA), pair = e.aiChoice(s);
      e.lock(s, ...pair); return s;
    }, base);
    async function stage() {
      await page.evaluate(async s => {
        await KALISTAR_DB.idle(); await KALISTAR_DB.saveGame(s); localStorage.setItem('kalistar.v4.game', JSON.stringify(s));
      }, base);
      await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
    }
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')));
    for (const [width, height] of [[412,1007], [1440,1000]]) {
      await page.setViewportSize({ width, height }); await stage();
      await page.waitForSelector('.team-right .challenger');
      assert.equal(await page.locator('.team-left .challenger').count(), 0, 'opponent card comes first');
      assert.deepEqual(await saved(), base, 'preview never changes RNG, history or combat state');
      if (width === 412) {
        await page.locator('.team-right .challenger .inspect').dispatchEvent('click');
        await page.waitForSelector('#detail-dialog[open]');
        await page.waitForTimeout(900);
        assert.equal(await page.locator('.team-left .challenger').count(), 0, 'inspection pauses the sequence');
        assert.deepEqual(await saved(), base);
        await page.locator('#detail-dialog [data-action=close]').click();
      }
      await page.waitForSelector('.team-left .challenger');
      assert.deepEqual(await saved(), base, 'both cards are previewed before locking');
      assert.equal(await page.locator('.team-right .challenger').getAttribute('data-unit'), expected.duel.attacker);
      assert.equal(await page.locator('.team-left .challenger').getAttribute('data-unit'), expected.duel.target);
      await page.waitForSelector('.is-setting');
      assert.deepEqual(await saved(), expected, 'same engine choice and locked duel as before');
      assert.equal(await page.locator('.ritual-flight').count(), 0, 'setting never launches a jet');
      await page.waitForTimeout(90);
      await page.screenshot({ path: path.join(output, `ignition-${width}.png`), scale: 'css' });
      await page.waitForSelector('.duel-console[data-casting=attack]');
      assert.equal(await page.locator('.is-setting').count(), 0, 'ignition completes before the automatic roll');
      const steps = await page.evaluate(() => window.presentationSteps);
      const first = steps.find(s => s.phase === 'choose' && s.attacker && !s.target);
      const target = steps.find(s => s.phase === 'choose' && s.attacker && s.target);
      const lock = steps.find(s => s.phase === 'attack' && s.setting);
      const roll = steps.find(s => s.casting === 'attack');
      assert.ok(target.time - first.time >= 600, 'first card settles before target selection');
      assert.ok(lock.time - target.time >= 600, 'target settles before crystal awakening');
      assert.ok(roll.time - lock.time >= 800 && roll.time - lock.time < 1700, 'brief readable awakening before the jet');
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).phase !== 'attack');
      // Pause the next AI decision to compare the first real roll exactly.
      await page.evaluate(() => { document.querySelector('#rules-dialog').showModal(); });
      const actual = await saved();
      const rolled = await page.evaluate(s => { const e = KalistarEngine.createEngine(KALISTAR_DATA); e.rollAttack(s); return s; }, expected);
      assert.deepEqual(actual, rolled, 'presentation leaves the original deterministic roll intact');
    }
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await stage(); await page.waitForSelector('.team-right .challenger');
    // Navigation cancels the timer, but retains the already visible first choice.
    await page.locator('[data-view=collection]').first().click(); await page.waitForTimeout(1000);
    assert.deepEqual(await saved(), base, 'no hidden lock or roll after leaving the arena');
    await page.locator('[data-view=arena]').first().click();
    await page.waitForFunction(() => document.querySelector('.duel-console')?.dataset.phase === 'attack');
    assert.equal(await page.locator('.is-setting').count(), 0, 'reduced motion skips the firework');
    assert.equal(await page.locator('.is-engaging').count(), 2, 'static elemental aura remains');
    assert.deepEqual(errors, []);
    console.log('PASS: sequential AI card selection, settled focus, one-shot ignition before roll, desktop/phone, modal/navigation pauses, reduced motion, unchanged decisions and RNG.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
