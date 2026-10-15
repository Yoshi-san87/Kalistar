'use strict';
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs');
const { fs, path, assert } = L;
const specs = require('../../collaborations/nier-set-02/set.json').cards
  .filter(c => ['pascal', 'a2', 'adam', 'eve', 'anemone'].includes(c.key));
const out = path.join(__dirname, 'browser-review');

async function main() {
  const origin = new URL(L.read(path.join(L.DATA, 'runtime.json')).url).origin;
  assert.ok(['127.0.0.1', 'localhost'].includes(new URL(origin).hostname));
  const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__nier_art_review__.cjs'))('playwright');
  const report = { passed: false, origin, mode: 'isolated-ephemeral-get-only', media: [], views: [], errors: [] };
  fs.mkdirSync(out, { recursive: true });
  let browser, context;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    context = await browser.newContext({ reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const r = route.request();
      if (new URL(r.url()).origin === origin && r.method() === 'GET') return route.continue();
      report.errors.push('Blocked unexpected request: ' + r.url()); return route.abort();
    });
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
    for (const width of [1600, 390, 360]) {
      await page.setViewportSize({ width, height: width === 1600 ? 1000 : 844 });
      await page.goto(origin + '/jeu/#collection');
      await page.reload();
      await page.waitForFunction(() => window.KALISTAR_READY === true);
      const data = await page.evaluate(() => KALISTAR_DATA.cards);
      assert.equal(data.filter(c => c.faction === 'NieR').length, 8);
      assert.equal(data.find(c => c.id === '47023549').weapon, 'Orbe');
      for (const spec of specs) {
        const actual = data.find(c => c.id === spec.id);
        assert.ok(actual);
        for (const field of ['name', 'title', 'race', 'element', 'positions', 'role']) assert.deepEqual(actual[field], spec[field]);
        const png = path.join(L.ROOT, 'V4/creations', spec.id, 'card.png');
        const proof = L.read(path.join(path.dirname(png), 'verification.json'));
        assert.ok(proof.passed);
        const expected = await L.hash(png);
        assert.equal(proof.hashes['card.png'], expected);
        if (width === 1600) {
          const media = await page.evaluate(async id => {
            const r = await fetch('/media/created/' + id + '.png', { cache: 'no-store' });
            const hash = await crypto.subtle.digest('SHA-256', await r.arrayBuffer());
            return { status: r.status, sha256: [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('') };
          }, spec.id);
          assert.equal(media.status, 200); assert.equal(media.sha256, expected);
          report.media.push({ key: spec.key, ...media });
        }
        await page.locator('[data-binder-field=search]').fill(spec.id);
        await page.waitForFunction(id => document.querySelectorAll('.cb-card').length === 1 && document.querySelector('.cb-card')?.dataset.id === id, spec.id);
        await page.locator('.cb-card[data-id="' + spec.id + '"]').click();
        await page.locator('[data-binder-action=media][data-id=card]').click();
        await page.waitForFunction(() => {
          const img = document.querySelector('.cb-hero-image');
          return img?.complete && img.naturalWidth > 0 && img.src.startsWith('blob:');
        });
        assert.equal(await page.locator('.cb-card-heading h2').textContent(), spec.name);
        const bounds = await page.evaluate(() => ({ w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight, iw: innerWidth, ih: innerHeight }));
        assert.ok(bounds.w <= bounds.iw + 1 && bounds.h <= bounds.ih + 1, 'Viewport overflow');
        const file = spec.key + '-' + width + '.png';
        await page.screenshot({ path: path.join(out, file) });
        report.views.push({ key: spec.key, width, file, bounds });
        await page.locator('[data-binder-action=back]').click();
      }
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (e) { report.error = e.stack; throw e; }
  finally {
    if (context) await context.close();
    if (browser) await browser.close();
    L.write(path.join(out, 'report.json'), report);
  }
  return report;
}
if (require.main === module) main().then(r => console.log(JSON.stringify({ passed: r.passed, media: r.media.length, views: r.views.length }))).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { main };
