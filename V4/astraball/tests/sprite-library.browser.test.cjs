const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const modules = process.env.KALISTAR_NODE_MODULES || 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modules, 'playwright'));
const sharp = require(path.join(modules, 'sharp'));
const repo = path.resolve(__dirname, '../../..'), out = process.env.KALISTAR_VERIFICATION_DIR || path.join(repo, 'work/astraball-sprites-v2/qa');
async function serveLibrary() {
  const dist = process.env.KALISTAR_DIST && path.resolve(process.env.KALISTAR_DIST);
  if (!dist && process.env.KALISTAR_SPRITE_LIBRARY_URL) return { url: process.env.KALISTAR_SPRITE_LIBRARY_URL };
  const mime = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.woff2':'font/woff2' };
  const server = require('node:http').createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let base = dist, relative = pathname.replace(/^\//, '');
      if (!dist) {
        if (pathname.startsWith('/jeu/astraball/')) { base = path.join(repo,'V4/astraball'); relative = pathname.slice(15); }
        else if (pathname === '/jeu/assets/lucide.min.js') { base = path.join(repo,'V3/site'); relative = 'assets/lucide.min.js'; }
        else if (pathname.startsWith('/jeu/')) { base = path.join(repo,'V4/site'); relative = pathname.slice(5); }
        else throw Error('Unsupported test route');
      }
      const file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error('Outside test root');
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'");
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0,'127.0.0.1',resolve); });
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/jeu/astraball/library.html' };
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const { server, url } = await serveLibrary(), results = [];
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    for (const [name,width,height] of [['desktop',1440,960],['razr',412,915],['compact',320,800]]) {
      const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce', isMobile: width < 600, hasTouch: width < 600 });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
      await page.goto(url); await page.waitForSelector('body[data-ready="true"]');
      assert.equal(await page.locator('.character').count(), 20);
      assert.equal(await page.locator('svg.lucide').count(), 5);
      assert.equal(await page.evaluate(() => SpriteGallery.metrics().running), false);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, name + ' no horizontal overflow');
      await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
      for (const pose of ['idle','run','throw','guard','charge','hit','celebrate']) {
        await page.selectOption('#pose', pose);
        assert.equal(await page.locator('.sprite').first().getAttribute('data-frame'), String({ idle:0,run:4,throw:8,guard:12,charge:8,hit:13,celebrate:14 }[pose]));
      }
      await page.selectOption('#zoom','3');
      assert.equal(await page.evaluate(() => [...document.querySelectorAll('.sprite')].every(sprite => sprite.getBoundingClientRect().width <= sprite.parentElement.getBoundingClientRect().width)), true, name + ' sprite fits at max zoom');
      await page.selectOption('#zoom','1'); await page.selectOption('#zoom','2');
      await page.click('#flip'); assert.equal(await page.getAttribute('#flip','aria-pressed'),'true');
      await page.click('#background'); assert.equal(await page.getAttribute('#background','aria-pressed'),'true');
      await page.fill('#search','Riko'); assert.equal(await page.locator('.character:visible').count(),1);
      await page.screenshot({ path: path.join(out,name + '-riko.png'), fullPage: true });
      await page.fill('#search','personnage-inconnu'); assert.equal(await page.locator('#empty').isVisible(),true);
      await page.fill('#search',''); await page.selectOption('#faction','Chroma'); assert.equal(await page.locator('.character:visible').count(),4);
      await page.selectOption('#faction','');
      await page.reload(); await page.waitForSelector('body[data-ready="true"]');
      assert.equal(await page.locator('.character').count(),20);
      assert.deepEqual(errors,[]);
      results.push({ name,width,height,characters:20,reducedMotion:true,filters:true,zoom:true,flip:true });
      await context.close();
    }
    const context = await browser.newContext({ viewport: { width:1440,height:960 } }), page = await context.newPage();
    await page.goto(url); await page.waitForSelector('body[data-ready="true"]');
    await page.selectOption('#pose','run');
    const frames = await page.evaluate(async () => {
      const seen = new Set();
      await new Promise(resolve => {
        let samples=0; const timer=setInterval(() => { seen.add(document.querySelector('.sprite').dataset.frame); if (++samples===32) { clearInterval(timer); resolve(); } },40);
      });
      return [...seen];
    });
    assert.deepEqual(frames.sort(),['4','5','6','7']);
    const first = await page.locator('.stage').first().screenshot();
    const { channels } = await sharp(first).stats(); assert.ok(channels.some(channel => channel.stdev > 15),'visible nonblank sprite');
    await page.click('#play'); const paused = await page.locator('.sprite').first().getAttribute('data-frame');
    await page.waitForTimeout(300); assert.equal(await page.locator('.sprite').first().getAttribute('data-frame'),paused);
    await page.selectOption('#pose','throw'); await page.waitForFunction(() => !SpriteGallery.metrics().running);
    assert.equal(await page.locator('.sprite').first().getAttribute('data-frame'),'11');
    await page.selectOption('#pose','run'); await page.setViewportSize({width:412,height:915});
    await page.screenshot({path:path.join(out,'running-resize.png'),fullPage:true});
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.waitForFunction(() => !SpriteGallery.metrics().running);
    assert.equal(await page.evaluate(() => SpriteGallery.metrics().running),false);
    await context.close();
    results.push({normalMotion:true,runFrames:frames,nonblank:true,pause:true,finiteThrow:true,resize:true});
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(results,null,2)+'\n');
    console.log(JSON.stringify(results,null,2));
  } finally { await browser?.close(); if (server) await new Promise(resolve => server.close(resolve)); }
}
main().catch(error => { console.error(error); process.exitCode=1; });
