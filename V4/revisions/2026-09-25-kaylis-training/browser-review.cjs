'use strict';
const {createRequire} = require('node:module');
const L = require('../../atelier/lib.cjs');
const {fs, path, assert, sharp} = L;
const runtime = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__kaylis_review__.cjs'))('playwright');
async function main() {
  const out = path.join(__dirname, 'browser-review');
  fs.mkdirSync(out, {recursive:true});
  const report = {passed:false, views:[], errors:[], mode:'Isolated GET-only browser contexts; real collection untouched'};
  const origin = new URL(L.read(path.join(L.DATA, 'runtime.json')).url).origin;
  const cardPath = path.join(L.ROOT, 'V4/creations/49055457/card.png');
  const imageHash = await L.hash(cardPath);
  const provenance = L.read(path.join(__dirname, 'art/provenance.json'));
  assert.equal(await L.hash(path.join(L.ROOT, 'V4/creations/49055457/illustration.png')), provenance.selectedSha256, 'Final art not published');
  assert.equal(imageHash, await L.hash(path.join(__dirname, 'work/kaylis/card.png')), 'Final native card not published');
  const cataloguePath = path.join(L.ROOT, 'V4/donnees/catalogue.json');
  const catalogueHash = await L.hash(cataloguePath);
  const ready = async page => {
    await page.waitForFunction(() => window.KALISTAR_READY === true);
    await page.waitForFunction(() => [...document.images].filter(i => {
      const r = i.getBoundingClientRect(); return r.width && r.height && r.bottom > 0 && r.top < innerHeight;
    }).every(i => i.complete && i.naturalWidth));
    assert.equal(await page.locator('[data-v4-media-error]').count(), 0);
  };
  const browser = await chromium.launch({channel:'chrome', headless:true});
  try {
    for (const viewport of [{width:1600,height:1000},{width:390,height:844}]) {
      const context = await browser.newContext({viewport, isMobile:viewport.width < 500, hasTouch:viewport.width < 500, reducedMotion:'reduce', serviceWorkers:'block'});
      try {
        await context.route('**/*', route => new URL(route.request().url()).origin === origin && route.request().method() === 'GET' ? route.continue() : route.abort());
        const page = await context.newPage(); page.setDefaultTimeout(25000);
        page.on('pageerror', e => report.errors.push(e.message));
        page.on('response', r => { if (r.status() >= 400) report.errors.push(r.status() + ' ' + r.url()); });
        await page.goto(origin + '/jeu/#collection'); await ready(page);
        const data = await page.evaluate(() => KALISTAR_DATA);
        const baseline = L.read(path.join(__dirname, 'baseline-game.json'));
        assert.equal(data.cards.length, baseline.cards.length);
        const card = data.cards.find(c => c.id === '49055457'); assert(card);
        const response = await page.request.get(origin + card.pngUrl); assert.equal(response.status(), 200);
        const bytes = await response.body();
        assert.equal(L.crypto.createHash('sha256').update(bytes).digest('hex'), imageHash);
        const meta = await sharp(bytes).metadata(); assert.deepEqual([meta.width,meta.height], [897,1497]);
        await page.locator('[data-binder-field=search]').fill('49055457');
        await page.locator('.cb-card[data-id="49055457"]').click(); await ready(page);
        assert.equal(await page.locator('.cb-card-heading h2').textContent(), 'KAYLIS');
        const layout = await page.evaluate(() => ({w:innerWidth,h:innerHeight,sw:document.documentElement.scrollWidth,sh:document.documentElement.scrollHeight}));
        assert(layout.sw <= layout.w + 1 && layout.sh <= layout.h + 1, 'Viewport overflow');
        await page.screenshot({path:path.join(out, 'kaylis-' + viewport.width + '.png'), animations:'disabled'});
        report.views.push({viewport,layout,imageHash,cards:data.cards.length});
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []);
    assert.equal(await L.hash(cataloguePath), catalogueHash);
    report.passed = true;
  } catch (error) { report.failure = error.stack; throw error; }
  finally { await browser.close(); L.write(path.join(out, 'report.json'), report); }
  console.log(JSON.stringify(report));
}
if (require.main === module) main().catch(error => { console.error(error); process.exitCode = 1; });
