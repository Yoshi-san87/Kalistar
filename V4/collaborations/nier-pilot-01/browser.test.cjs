'use strict';
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs');
const { fs, path, assert } = L;
const set = require('./set.json');
const S = require('../../site/statistics.js');
async function main() {
  const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__nier_browser__.cjs'))('playwright');
  const origin = L.read(path.join(L.DATA, 'runtime.json')).url;
  const output = path.join(__dirname, 'verification/browser');
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], badResponses = [], layouts = [];
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const r = route.request();
      return new URL(r.url()).origin === origin && r.method() === 'GET' ? route.continue() : route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) badResponses.push([r.status(), r.url()]); });
    for (const width of [1600, 390, 360]) {
      await page.setViewportSize({ width, height: width === 1600 ? 1000 : 844 });
      await page.goto(origin + '/jeu/#collection');
      await page.waitForFunction(() => window.KALISTAR_READY === true);
      await page.locator('[data-binder-action=scope][data-id=nier]').click();
      await page.waitForFunction(() => document.querySelector('.cb-count')?.textContent.includes('2 versions'));
      assert.deepEqual((await page.locator('.cb-card').evaluateAll(ns => ns.map(n => n.dataset.id))).sort(), set.cards.map(c => c.id).sort());
      const layout = await page.locator('.cb-heading').evaluate(el => {
        const h = el.getBoundingClientRect();
        return [...el.querySelectorAll('.cb-scopes button')].map(n => {
          const r = n.getBoundingClientRect();
          return { text: n.textContent.trim(), inside: r.left >= h.left && r.right <= h.right + 1 && r.top >= h.top && r.bottom <= h.bottom + 1, fits: n.scrollWidth <= n.clientWidth + 1 };
        });
      });
      assert.ok(layout.every(n => n.inside && n.fits), width + 'px: ' + JSON.stringify(layout));
      layouts.push({ width, layout });
      await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth));
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
      await page.screenshot({ path: path.join(output, 'nier-' + width + '.png') });
      if (width === 1600) for (const c of set.cards) {
        await page.locator('.cb-card[data-id="' + c.id + '"]').click();
        assert.equal(await page.locator('.cb-card-heading h2').textContent(), c.name);
        await page.locator('[data-binder-action=tab][data-id=profile]').click();
        await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth));
        assert.ok(await page.locator('#cb-read-content img[src$="/factions/NieR.png"]').count());
        assert.ok(await page.locator('#cb-read-content img[src$="/races/ANDROID.png"]').count());
        await page.screenshot({ path: path.join(output, c.key + '-profile.png') });
        await page.locator('[data-binder-action=back]').click();
      }
    }
    const ownership = await page.evaluate(() => ({ cards: KALISTAR_DATA.cards.length, paris: KALISTAR_DB.registry.owned('user-paris').length, tokyo: KALISTAR_DB.registry.owned('user-tokyo').length }));
    assert.equal(ownership.paris, ownership.cards); assert.equal(ownership.tokyo, 0);
    const data = await page.evaluate(() => KALISTAR_DATA);
    const db = { instances: () => [{}], matches: () => [], career: () => ({ history: [] }) };
    assert.equal(S.rows(data, db, { ...S.defaults, collab: 'NieR' }).length, 2);
    assert.ok(S.rows(data, db, { ...S.defaults, collab: 'kalistar' }).every(r => r.card.faction !== 'NieR'));
    assert.equal(data.cards.find(c => c.name === 'BARRET').race, 'CYBORG');
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    const report = { passed: true, mode: 'fresh-ephemeral-browser-read-only-local-server', layouts, ownership, errors, badResponses };
    L.write(path.join(output, 'report.json'), report); return report;
  } finally { await browser.close(); }
}
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { main };
