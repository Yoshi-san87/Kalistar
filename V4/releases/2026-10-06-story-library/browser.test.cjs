'use strict';
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const {DIST, inside} = require('../../deploy/build.cjs');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '_story_library_.cjs'))('playwright');
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, 'verification/pages');
const mime = {'.html':'text/html; charset=utf-8','.json':'application/json','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};

async function main() {
  const server = http.createServer((request, response) => {
    try {
      const url = new URL(request.url, 'http://localhost');
      if (!url.pathname.startsWith('/Kalistar/')) throw Error('Outside site');
      const relative = decodeURIComponent(url.pathname.slice('/Kalistar/'.length));
      const file = inside(DIST, relative.endsWith('/') ? relative + 'index.html' : relative);
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404); response.end(); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = process.env.KALISTAR_STORY_PAGES_URL || `http://127.0.0.1:${server.address().port}/Kalistar/jeu/`;
  let browser;
  try {
    browser = await chromium.launch({channel:'chrome', headless:true});
    fs.mkdirSync(output, {recursive:true});
    const context = await browser.newContext({viewport:{width:1440,height:1000}, reducedMotion:'reduce'});
    const page = await context.newPage(), errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(base + '#story');
    await page.locator('.story-library').waitFor();
    assert.equal(await page.evaluate(() => KalistarSite.online), true);
    await page.waitForFunction(() => document.querySelector('.story-volume-object img')?.naturalWidth === 1024);
    await page.screenshot({path:path.join(output, 'library-desktop.png')});
    await page.setViewportSize({width:412,height:1007});
    await page.screenshot({path:path.join(output, 'library-phone.png')});
    await page.locator('[data-story-action=open-book]').click();
    await page.locator('[data-story-select]').selectOption('17');
    assert.equal(await page.locator('.story-current-heading h2').textContent(), 'La promesse de Mennuyir');
    const deposition = page.locator('.story-text p').filter({hasText:'Ils déposèrent Lanio sur cette couche.'});
    assert.equal(await deposition.count(), 1);
    await deposition.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output, 'farewell-phone.png')});
    await page.setViewportSize({width:1440,height:1000});
    await deposition.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(output, 'farewell-desktop.png')});
    await page.locator('[data-story-action=library]').click();
    assert.match(await page.locator('.story-library-progress').textContent(), /Chapitre XVII/);
    assert.deepEqual(errors, []);
    await context.close();
    console.log(JSON.stringify({hosting:'Pages', volume:'Tome I', farewell:'Zarok', screenshots:output}));
  } finally {
    await browser?.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => {console.error(error);process.exitCode = 1;});
