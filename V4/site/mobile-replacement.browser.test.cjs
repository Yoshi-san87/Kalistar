'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__replacement_test__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification/mobile-replacement');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 412, height: 1007 }, hasTouch: true, isMobile: true, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(url + '/jeu/#arena'); await page.waitForFunction(() => window.KALISTAR_READY);
    await page.locator('[data-action=start]').tap();
    const base = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')));
    for (const side of [0, 1]) {
      const staged = await page.evaluate(async ({ base, side }) => {
        await KALISTAR_DB.idle();
        const e = KalistarEngine.createEngine(KALISTAR_DATA);
        let chosen;
        // Reach replacement through a real lethal duel, without inventing engine state.
        for (let attacker = 0; attacker < 5 && !chosen; attacker++) for (let target = 0; target < 5 && !chosen; target++) {
          if (!base.players[side].reserve.some(u => e.card(u).positions.includes(target + 1))) continue;
          for (let atk = 1; atk <= 6 && !chosen; atk++) for (let def = 1; def <= 6 && !chosen; def++) {
            const s = structuredClone(base); s.mode = 'local'; s.turn = 1 - side;
            e.lock(s, attacker, target); e.rollAttack(s, atk);
            if (s.phase === 'kalistel') e.acceptAttack(s);
            if (s.phase !== 'defense') continue;
            e.rollDefense(s, def);
            if (s.phase !== 'result' || s.players[side].board[target]) continue;
            e.next(s);
            if (s.phase === 'replace' && s.replacing === side) chosen = { state: s, slot: target };
          }
        }
        if (!chosen) throw new Error('No lethal replacement fixture');
        e.assertState(chosen.state);
        await KALISTAR_DB.saveGame(chosen.state);
        localStorage.setItem('kalistar.v4.game', JSON.stringify(chosen.state));
        return { ...chosen, compatible: chosen.state.players[side].reserve.filter(u => e.card(u).positions.includes(chosen.slot + 1)).map(u => u.uid) };
      }, { base, side });
      await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
      const target = page.locator(`.formation[data-player="${side}"] .slot[data-position="${staged.slot + 1}"]`);
      assert.match(await target.getAttribute('class'), /replacement-target/);
      await target.locator('.slot-card').tap();
      const dialog = page.locator('#detail-dialog[open]');
      await dialog.waitFor();
      assert.match(await dialog.locator('.dialog-head').textContent(), new RegExp('P' + (staged.slot + 1)));
      const options = dialog.locator('[data-action=deploy-reserve]');
      assert.deepEqual((await options.evaluateAll(nodes => nodes.map(n => n.dataset.uid))).sort(), staged.compatible.sort());
      assert.ok(await options.evaluateAll((nodes, slot) => nodes.every(n => Number(n.dataset.slot) === slot), staged.slot));
      assert.equal(await dialog.locator('figure').count(), staged.compatible.length, 'only compatible cards are offered');
      await page.screenshot({ path: path.join(output, `reserve-player-${side + 1}.png`) });
      await dialog.locator('[data-action=close]').tap();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))), staged.state, 'opening or cancelling changes no game data');
      await target.locator('.slot-card').tap();
      const uid = await options.first().getAttribute('data-uid');
      await options.first().tap();
      assert.equal(await page.locator('#detail-dialog').evaluate(n => n.open), false);
      assert.equal(await target.getAttribute('data-unit'), uid);
      const after = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')));
      assert.deepEqual(after.players[1-side].board, staged.state.players[1-side].board, 'other team is unchanged');
      assert.equal(after.players[side].reserve.length, staged.state.players[side].reserve.length - 1);
      assert.equal(await page.locator('.replacement-target').count(), 0);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: mobile replacement opens compatible reserves for either player, cancel is inert, deployment fills the selected slot only.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
