const fs = require('node:fs/promises');
const path = require('node:path');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const { createHash } = require('node:crypto');
const { chromium } = require(path.join(process.argv[2], 'playwright'));
const sharp = require(path.join(process.argv[2], 'sharp'));
const root = path.resolve(__dirname, '..');
const sha = bytes => createHash('sha256').update(bytes).digest('hex');

async function main() {
  const selection = JSON.parse(await fs.readFile(path.join(root, 'selection.json'), 'utf8'));
  assert.equal(selection.characters.length, 7);
  const report = { images: [], viewports: [], filters: {}, status: 'pending' };
  for (const c of selection.characters) {
    const bytes = await fs.readFile(path.join(root, c.file));
    const meta = await sharp(bytes).metadata();
    assert(meta.width >= 1000 && meta.height > meta.width);
    const digest = sha(bytes);
    assert.equal(digest, sha(await fs.readFile(c.generatedSource)));
    report.images.push({ key: c.key, width: meta.width, height: meta.height, sha256: digest });
  }
  const browser = await chromium.launch({ headless: true, channel: 'msedge' });
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
    await page.evaluate(async () => {
      for (const img of document.images) { img.loading = 'eager'; await img.decode(); }
      await document.fonts.ready;
    });
    assert.equal(await page.locator('figure').count(), 7);
    assert(await page.evaluate(() => document.fonts.check('20px Cinzel')));
    for (const width of [1440, 412, 320]) {
      await page.setViewportSize({ width, height: 980 });
      const result = await page.evaluate(() => ({
        viewport: innerWidth,
        width: document.documentElement.scrollWidth,
        unclipped: [...document.querySelectorAll('h1,h2,p,output')].every(e => e.scrollWidth <= e.clientWidth + 2),
        imagesLoaded: [...document.images].every(i => i.naturalWidth > 0 && getComputedStyle(i).objectFit === 'contain')
      }));
      assert.equal(result.width, width);
      assert(result.unclipped && result.imagesLoaded);
      report.viewports.push(result);
      await page.screenshot({ path: path.join(__dirname, 'gallery-' + width + '.png') });
    }
    await page.locator('#faction').selectOption('Durane');
    assert.equal(await page.locator('figure:visible').count(), 2);
    await page.locator('#search').fill('maedrine');
    assert.equal(await page.locator('figure:visible').count(), 1);
    assert.equal(await page.locator('figure:visible').getAttribute('id'), 'maedrine');
    report.filters.accentInsensitive = true;
    await page.locator('#search').fill('not-in-gallery');
    assert.equal(await page.locator('figure:visible').count(), 0);
    assert(await page.locator('.empty').isVisible());
    await page.locator('#faction').selectOption('');
    await page.locator('#search').fill('');
    assert.equal(await page.locator('figure:visible').count(), 7);
    for (const c of selection.characters) {
      assert.equal(await page.locator('#' + c.key + ' .art').getAttribute('href'), c.file);
    }
    const wait = page.waitForEvent('popup');
    await page.locator('#kaylis .art').click();
    const popup = await wait;
    await popup.waitForLoadState();
    assert(popup.url().endsWith(path.basename(selection.characters.find(c => c.key === 'kaylis').file)));
    await popup.close();
    assert.deepEqual(errors, []);
    report.status = 'passed';
    report.originalImageLinks = 7;
    report.pageErrors = errors;
    await fs.writeFile(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
