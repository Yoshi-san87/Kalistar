'use strict';
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs');
const { fs, path, assert, sharp } = L;
const { pixelCheck } = require('../../collaborations/nier-arenas-01/browser-review.cjs');
const home = __dirname, local = n => path.join(home, n);
async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  await page.waitForFunction(() => [...document.images].filter(i => {
    const r = i.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight;
  }).every(i => i.complete && i.naturalWidth));
  assert.equal(await page.locator('[data-v4-media-error]').count(), 0);
}
async function main() {
  const set = L.read(local('set.json')), arena = L.read(local('arena/spec.json')).entry;
  const out = local('browser-review'); fs.mkdirSync(out, { recursive: true });
  const report = { passed: false, startedAt: new Date().toISOString(), errors: [], views: [], mode: 'GET-only isolated browser contexts' };
  const origin = new URL(L.read(path.join(L.DATA, 'runtime.json')).url).origin;
  assert.match(origin, /^http:\/\/127\.0\.0\.1:\d+$/);
  const guarded = ['V4/donnees/catalogue.json', 'V4/donnees/arenes-collaborations.json', 'V4/atelier/data/references.json', 'V4/atelier/designer-assets/manifest.json'];
  const before = new Map(); for (const f of guarded) before.set(f, await L.hash(path.join(L.ROOT, f)));
  const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__return_review__.cjs'))('playwright');
  let browser, page;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const viewport of [{ width: 1600, height: 1000 }, { width: 390, height: 844 }]) {
      const mobile = viewport.width < 500, view = { ...viewport, cards: [], screenshots: [] }; report.views.push(view);
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, reducedMotion: 'reduce', serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => {
          const request = route.request(), u = new URL(request.url());
          if (u.origin === origin && request.method() === 'GET') return route.continue();
          report.errors.push('Blocked ' + request.method() + ' ' + request.url()); return route.abort();
        });
        page = await context.newPage(); page.setDefaultTimeout(25000);
        page.on('pageerror', e => report.errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
        page.on('dialog', d => d.type() === 'confirm' && d.message().startsWith('Remplacer cette partie ?') ? d.accept() : d.dismiss());
        const capture = async name => {
          const file = name + '-' + viewport.width + '.png';
          const bytes = await page.screenshot({ path: path.join(out, file), animations: 'disabled' });
          view.screenshots.push({ file, ...await pixelCheck(bytes, file) });
        };
        await page.goto(origin + '/jeu/#collection'); await ready(page);
        const data = await page.evaluate(() => window.KALISTAR_DATA);
        assert.equal(data.cards.length, 80); assert.equal(data.arenas.length, 23);
        view.counts = { cards: data.cards.length, arenas: data.arenas.length };
        const specs = mobile ? set.cards.filter(c => ['commander', 'kaine', 'devola-replicant', 'popola-replicant', 'gen-electro', 'xiaomi'].includes(c.key)) : set.cards;
        for (const c of specs) {
          const served = data.cards.find(p => p.id === c.id); assert.ok(served, c.key);
          assert.equal(served.characterId, c.characterId); assert.equal(served.faction, c.faction);
          const response = await page.request.get(origin + served.pngUrl); assert.equal(response.status(), 200);
          const bytes = await response.body(), digest = L.crypto.createHash('sha256').update(bytes).digest('hex');
          assert.equal(digest, await L.hash(local('cards/' + c.key + '/card.png')));
          const meta = await sharp(bytes).metadata(); assert.deepEqual([meta.width, meta.height], [897, 1497]);
          await page.locator('[data-binder-field=search]').fill(c.id);
          await page.locator('.cb-card[data-id="' + c.id + '"]').click();
          await page.waitForFunction(() => { const i = document.querySelector('.cb-hero-image'); return i?.complete && i.naturalWidth > 0; });
          assert.equal(await page.locator('.cb-card-heading h2').textContent(), c.name);
          const layout = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
          assert.ok(layout.scrollWidth <= layout.width + 1); assert.ok(layout.scrollHeight <= layout.height + 1);
          view.cards.push({ key: c.key, id: c.id, hash: digest, layout });
          if (['commander', 'devola-replicant', 'gen-electro', 'xiaomi'].includes(c.key)) await capture(c.key);
          await page.locator('[data-binder-action=back]').click();
        }
        await page.locator('[data-binder-field=search]').fill('');
        await page.locator('[data-binder-action=scope][data-id=replicant]').click();
        view.replicantVersions = [];
        view.replicantPages = 0;
        for (;;) {
          await ready(page);
          const ids = await page.locator('.cb-card').evaluateAll(nodes => nodes.map(n => n.dataset.id));
          assert.ok(ids.length > 0 && ids.every(id => !view.replicantVersions.includes(id)));
          view.replicantVersions.push(...ids);
          assert.ok(++view.replicantPages <= 4, 'Replicant pagination must terminate');
          await capture('replicant-binder-page-' + view.replicantPages);
          const next = page.locator('.cb-footer [data-binder-action=next-page]');
          if (await next.isDisabled()) break;
          await next.click();
          await page.waitForFunction(previous => {
            const current = [...document.querySelectorAll('.cb-card')].map(n => n.dataset.id);
            return current.length && current.join(',') !== previous.join(',');
          }, ids);
        }
        assert.deepEqual([...view.replicantVersions].sort(), set.cards.filter(c => c.faction === 'Replicant').map(c => c.id).sort());
        await page.locator('.main-nav [data-view=arena]').click(); await ready(page);
        if (mobile) {
          await page.locator('[data-action=arena-menu]').click();
          await page.locator('#mobile-dialog[open] [data-action=new-game]').click();
        } else await page.locator('[data-action=new-game]:visible').first().click();
        await page.locator('#new-game-dialog[open]').waitFor();
        await page.locator('#game-mode').selectOption('local');
        await page.locator('#new-game-form input[name=arena][value="' + arena.id + '"]').check();
        await page.locator('#game-seed').fill('RETURN-REPLICANT-' + viewport.width);
        await page.locator('#new-game-form button[type=submit]').click();
        await page.waitForFunction(id => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.arenaId === id, arena.id);
        await page.locator('#new-game-dialog').waitFor({ state: 'hidden' }); await ready(page);
        await page.locator('[data-action=start]').click();
        await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase === 'choose'); await ready(page);
        view.arenaBackground = await page.locator('.battlefield').evaluate(n => getComputedStyle(n).backgroundImage);
        assert.ok(view.arenaBackground.includes(arena.image)); assert.equal(await page.locator('.formation .slot-card').count(), 10);
        await capture('replicant-match');
        const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
        await page.reload(); await ready(page);
        assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))), JSON.parse(saved));
        view.restored = true;
      } catch (error) {
        if (page && !page.isClosed()) await page.screenshot({ path: path.join(out, 'failure-' + viewport.width + '.png') }).catch(() => {});
        throw error;
      } finally { page = null; await context.close(); }
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally {
    if (browser) await browser.close();
    for (const [f, h] of before) assert.equal(await L.hash(path.join(L.ROOT, f)), h, f + ' changed during QA');
    report.preservedSources = true; report.finishedAt = new Date().toISOString(); L.write(path.join(out, 'report.json'), report);
  }
  return { passed: report.passed, views: report.views.length, cards: report.views.map(v => v.cards.length), errors: report.errors };
}
module.exports = { main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
