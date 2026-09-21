'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {DIST, inside} = require('./build.cjs');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '_pages_test.cjs'))('playwright');
const output = path.join(__dirname, 'verification');
const mime = {'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
async function main() {
  const server = http.createServer((req,res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      if (!url.pathname.startsWith('/Kalistar/')) throw Error('Outside site');
      const rel = decodeURIComponent(url.pathname.slice('/Kalistar/'.length));
      const file = inside(DIST, rel.endsWith('/') || !rel ? rel + 'index.html' : rel);
      res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'no-store');
      res.end(fs.readFileSync(file));
    } catch {res.writeHead(404);res.end();}
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const local = 'http://127.0.0.1:' + server.address().port + '/Kalistar/';
  const base = process.env.KALISTAR_PAGES_URL || local;
  let browser;
  try {
    browser = await chromium.launch({channel: 'chrome', headless: true});
    fs.mkdirSync(output, {recursive:true});
    const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    const page = await context.newPage(), errors = [], failures = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => {if(r.status() >= 400) failures.push(r.status() + ' ' + r.url());});
    await page.goto(base);
    await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.locator('[data-view=atelier]').count(), 0);
    assert.equal(await page.evaluate(() => KalistarSite.online), true);
    const count = await page.evaluate(() => KALISTAR_DATA.cards.length);
    assert.equal(await page.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), count);
    await page.waitForFunction(() => [...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
    await page.screenshot({path:path.join(output,'collection-desktop.png')});
    await page.locator('.cb-card').first().click();
    await page.locator('.cb-reader').waitFor();
    const href = await page.locator('.cb-visual a[download]').getAttribute('href');
    assert.ok(href.includes('/Kalistar/media/'));
    assert.equal((await page.request.get(href)).status(),200);
    await page.locator('[data-binder-action=back]').click();
    await page.locator('[data-view=decks]').first().click();
    await page.locator('#deck-builder-root').waitFor();
    await page.locator('[data-view=arena]').first().click();
    await page.locator('[data-action=auto-formation]').first().click();
    await page.locator('[data-action=start]').first().click();
    const before = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId);
    await page.reload();
    await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId), before);
    await page.waitForFunction(() => [...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
    await page.screenshot({path:path.join(output,'arena-desktop.png')});
    await page.setViewportSize({width:412,height:1007});
    await page.waitForTimeout(500);
    assert.ok(await page.locator('.slot-card img').count() >= 10);
    await page.screenshot({path:path.join(output,'arena-phone.png')});
    // Reload into the collection with the same registry and match saved.
    await page.goto(base+'jeu/#collection');
    await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), count);
    await page.waitForFunction(() => [...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
    await page.screenshot({path:path.join(output,'collection-phone.png')});
    const expanded = await page.evaluate(() => structuredClone(KALISTAR_DATA));
    expanded.cards.push({...expanded.cards[0],id:'49999998',slug:'v4-49999998',origin:'published',title:'TEST ONLY'});
    await context.route(base+'jeu/catalogue.json', route => route.fulfill({json:expanded}));
    await page.reload();
    await page.waitForFunction(n => window.KALISTAR_READY && KALISTAR_DATA.cards.length===n, count+1);
    assert.equal(await page.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), count+1);
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId), before);
    await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.evaluate(() => KALISTAR_DB.registry.owned('user-paris').length), count+1);
    await page.goto(base+'jeu/#atelier');
    await page.waitForFunction(() => window.KALISTAR_READY);
    assert.equal(await page.locator('#atelier-frame').count(),0);
    assert.equal(await page.locator('.cb-spread').count(),1);
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);
    await context.close();
    console.log('PASS: '+count+' cards, desktop/phone, reader, PNG download, decks, arena, saved match, additive publication, no Atelier or HTTP errors: '+base);
  } finally {if(browser) await browser.close(); await new Promise(resolve => server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
