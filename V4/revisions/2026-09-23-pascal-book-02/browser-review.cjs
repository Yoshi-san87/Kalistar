'use strict';
const L = require('../../atelier/lib.cjs');
const { createRequire } = require('node:module');
const { fs, path, assert } = L;
async function main() {
  const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__pascal_review__.cjs'))('playwright');
  const origin = new URL(L.read(path.join(L.DATA, 'runtime.json')).url).origin;
  assert.equal(new URL(origin).hostname, '127.0.0.1');
  const out = path.join(__dirname, 'browser-review'); fs.mkdirSync(out, { recursive: true });
  const report = { passed: false, errors: [], views: [] };
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', r => {
      if (new URL(r.request().url()).origin === origin && r.request().method() === 'GET') return r.continue();
      report.errors.push('Unexpected request: ' + r.request().url()); return r.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
    for (const width of [1600, 390]) {
      await page.setViewportSize({ width, height: width === 1600 ? 1000 : 844 });
      await page.goto(origin + '/jeu/#collection'); await page.reload();
      await page.waitForFunction(() => window.KALISTAR_READY === true);
      const sha = await page.evaluate(async () => {
        const r = await fetch('/media/created/42650442.png', { cache: 'no-store' });
        if (!r.ok) throw Error('Media response: ' + r.status);
        return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await r.arrayBuffer()))].map(b => b.toString(16).padStart(2, '0')).join('');
      });
      assert.equal(sha, await L.hash(path.join(L.ROOT, 'V4/creations/42650442/card.png')));
      await page.locator('[data-binder-field=search]').fill('42650442');
      await page.locator('.cb-card[data-id="42650442"]').click();
      await page.waitForFunction(() => { const i = document.querySelector('.cb-hero-image'); return i?.complete && i.naturalWidth > 0 && i.src.startsWith('blob:'); });
      assert.equal(await page.locator('.cb-card-heading h2').textContent(), 'PASCAL');
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1 && document.documentElement.scrollHeight <= innerHeight + 1));
      await page.screenshot({ path: path.join(out, 'pascal-' + width + '.png') });
      report.views.push({ width, sha256: sha });
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } finally { await browser.close(); L.write(path.join(out, 'report.json'), report); }
  console.log(JSON.stringify(report));
}
main().catch(e => { console.error(e); process.exitCode = 1; });
