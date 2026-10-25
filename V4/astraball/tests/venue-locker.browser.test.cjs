const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const modules = process.env.KALISTAR_NODE_MODULES || 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modules, 'playwright'));
const sharp = require(path.join(modules, 'sharp'));
const repo = path.resolve(__dirname, '../../..');
const out = process.env.KALISTAR_VERIFICATION_DIR || path.join(repo, 'work/astraball/venue-locker');

async function serveLocker() {
  const dist = process.env.KALISTAR_DIST && path.resolve(process.env.KALISTAR_DIST);
  if (!dist && process.env.KALISTAR_URL) return { url: process.env.KALISTAR_URL };
  const mime = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
  const server = require('node:http').createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let base = dist, relative = pathname.replace(/^\//, '');
      if (!dist) {
        if (pathname.startsWith('/jeu/astraball/')) { base = path.join(repo, 'V4/astraball'); relative = pathname.slice(15); }
        else if (pathname === '/jeu/assets/lucide.min.js') { base = path.join(repo, 'V3/site'); relative = 'assets/lucide.min.js'; }
        else if (pathname.startsWith('/jeu/')) { base = path.join(repo, 'V4/site'); relative = pathname.slice(5); }
        else throw Error('Unsupported test route');
      }
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(base, relative);
      if (!file.startsWith(base + path.sep)) throw Error('Outside test root');
      if (/(?:^|[\\/])(?:node_modules|tools|tests|sources)(?:[\\/]|$)/.test(relative)) throw Error('Private source');
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'");
      response.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: 'http://127.0.0.1:' + server.address().port + '/jeu/astraball/' };
}

async function setKind(page, kind) {
  if (await page.locator('#arena-kind-filter').isVisible()) await page.locator('#arena-kind-filter').selectOption(kind);
  else await page.locator('[data-arena-kind="' + kind + '"]').click();
  assert.equal(await page.locator('#arena-kind-filter').inputValue(), kind);
  assert.equal(await page.locator('[data-arena-kind="' + kind + '"]').getAttribute('aria-pressed'), 'true');
}

async function expectArenas(page, arenas) {
  const visible = await page.locator('.arena-choice:visible input').evaluateAll(inputs => inputs.map(input => input.value));
  assert.deepEqual(visible, arenas.map(arena => arena.id));
  assert.equal(await page.locator('#arena-count').innerText(), arenas.length + ' terrain' + (arenas.length === 1 ? '' : 's'));
  assert.equal(await page.locator('#arena-empty').isVisible(), arenas.length === 0);
}

async function selectArena(page, arena, view = 'horizontal') {
  await page.locator('.arena-choice').filter({ has: page.locator('input[value="' + arena.id + '"]') }).click();
  await expectPreview(page, arena, view);
}

async function expectPreview(page, arena, view) {
  assert.equal(await page.locator('input[name="arena"][value="' + arena.id + '"]').isChecked(), true);
  assert.equal(await page.locator('#arena-name').innerText(), arena.name);
  assert.equal(await page.locator('#arena-region').innerText(), arena.city || 'Astralia');
  assert.equal(await page.locator('#arena-preview').getAttribute('src'), arena.preview || arena[view]);
  assert.equal(await page.locator('#arena-preview').getAttribute('data-pixel'), String(Boolean(arena.pixel)));
  await page.waitForFunction(() => {
    const image = document.querySelector('#arena-preview');
    return image.complete && image.naturalWidth > 0;
  });
  for (const candidate of ['horizontal', 'isometric']) {
    const control = page.locator('#locker-panel-arena [data-view="' + candidate + '"]');
    const available = (arena.views || ['horizontal', 'isometric']).includes(candidate) && Boolean(arena[candidate]);
    assert.equal(await control.isEnabled(), available, arena.id + ' ' + candidate + ' availability');
    assert.equal(await control.getAttribute('aria-pressed'), String(available && candidate === view));
    const label = (candidate === 'horizontal' ? 'Vue HD-2D' : 'Vue isom\u00e9trique') + (available ? '' : ' indisponible pour ce terrain');
    assert.equal(await control.getAttribute('aria-label'), label);
    assert.equal(await control.getAttribute('title'), label);
  }
}

async function checkLayout(page, name, width, height) {
  await page.locator('#locker-panel-arena').evaluate(panel => { panel.scrollTop = 0; });
  await page.locator('.arena-options').evaluate(list => { list.scrollTop = 0; });
  const layout = await page.evaluate(() => {
    const panel = document.querySelector('#locker-panel-arena'), bottom = document.querySelector('.locker-bottom');
    const bounds = element => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const choices = [...document.querySelectorAll('.arena-choice:not([hidden])')];
    return {
      overflow: document.documentElement.scrollWidth > innerWidth || document.querySelector('#modal').scrollWidth > document.querySelector('#modal').clientWidth || panel.scrollWidth > panel.clientWidth,
      panel: bounds(panel), bottom: bounds(bottom), preview: bounds(document.querySelector('#arena-preview')),
      firstImage: bounds(choices[0].querySelector('img')),
      textFits: choices.every(choice => {
        const text = choice.querySelector('.arena-choice-name'), box = bounds(choice), textBox = bounds(text);
        return text.scrollWidth <= text.clientWidth + 1 && textBox.left >= box.left && textBox.right <= box.right && textBox.bottom <= box.bottom;
      }),
      cropped: getComputedStyle(document.querySelector('#arena-preview')).objectFit !== 'contain',
    };
  });
  await page.screenshot({ path: path.join(out, name + '-venues.png') });
  assert.equal(layout.overflow, false, name + ' no horizontal overflow');
  assert.equal(layout.textFits, true, name + ' venue names stay inside choices');
  assert.equal(layout.cropped, false, name + ' entire preview is inspectable');
  assert.ok(layout.panel.bottom <= layout.bottom.top + 1, name + ' footer does not cover list');
  assert.ok(layout.bottom.bottom <= height, name + ' match actions remain on screen');
  if (width < 761 && height >= 800) {
    assert.ok(layout.preview.height <= 180, name + ' bounded mobile preview');
    assert.ok(layout.firstImage.bottom <= layout.panel.bottom, name + ' a complete thumbnail appears without scrolling');
  }
  if (height >= 800) {
    const stats = await sharp(await page.locator('#arena-preview').screenshot()).stats();
    assert.ok(stats.channels.some(channel => channel.stdev > 15), name + ' nonblank venue preview');
  }
  return layout;
}

async function main() {
  const { ARENAS, BALLS } = await import('../src/appearance.mjs');
  const { createRoster } = await import('../src/roster.mjs');
  const roster = createRoster(require('../data/sprite-library.json'));
  const pixels = ARENAS.filter(arena => arena.pixel), classics = ARENAS.filter(arena => !arena.kind || arena.kind === 'classic');
  assert.equal(ARENAS.length, 21, '19 pixel venues and two preserved classics');
  assert.equal(pixels.length, 19);
  for (const arena of pixels) assert.deepEqual(arena.views, ['horizontal'], arena.id + ' dedicated HD-2D view');
  assert.equal(classics.length, 2);
  assert.ok(roster.entries.length >= 230, 'existing expanded roster remains available');
  // Fail before opening a browser when the concurrent venue asset production is incomplete.
  const mediaRoot = process.env.KALISTAR_DIST ? path.join(process.env.KALISTAR_DIST, 'jeu/astraball') : path.resolve(__dirname, '..');
  if (!process.env.KALISTAR_URL || process.env.KALISTAR_DIST) {
    for (const arena of ARENAS) {
      if (arena.preview) assert.ok(fs.existsSync(path.join(mediaRoot, arena.preview)), 'venue thumbnail not ready: ' + arena.id);
      for (const view of arena.views || ['horizontal', 'isometric']) {
        assert.ok(arena[view] && fs.existsSync(path.join(mediaRoot, arena[view])), 'venue asset not ready: ' + arena.id + ' ' + view);
      }
    }
  }
  fs.mkdirSync(out, { recursive: true });
  const { server, url } = await serveLocker(), reports = [];
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    for (const [name, width, height] of [['desktop',1440,900], ['razr',412,915], ['compact',320,800], ['landscape',915,412]]) {
      const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1, reducedMotion: 'reduce', isMobile: width < 761, hasTouch: width < 761 });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('response', response => { if (response.status() >= 400) errors.push(response.status() + ' ' + response.url()); });
      try {
        await page.goto(url); await page.waitForFunction(() => window.Astraball?.ready);
        const original = await page.evaluate(() => JSON.stringify(window.Astraball.snapshot()));
        assert.equal(await page.locator('.athlete-ratings meter').count(), 6);
        assert.ok(await page.locator('.character-choice').count() > 0);
        await page.locator('#character-search').fill('RIKO');
        await page.getByRole('button', { name: 'RIKO', exact: true }).click();
        await page.locator('#character-search').fill('');
        await page.locator('#locker-tab-ball').click();
        assert.equal(await page.locator('input[name="ball"]').count(), BALLS.length);
        await page.locator('.ball-choice').filter({ has: page.locator('input[value="orbital"]') }).click();
        await page.locator('#locker-tab-arena').click();
        assert.equal(await page.locator('input[name="arena"]').count(), 21);
        assert.equal(await page.locator('.arena-choice img[loading="lazy"]').count(), 21);
        assert.deepEqual(await page.locator('.arena-choice img').evaluateAll(images => images.map(image => image.getAttribute('src'))), ARENAS.map(arena => arena.preview || arena.horizontal));
        assert.equal(await page.locator('#arena-city-filter').inputValue(), '');
        assert.equal(await page.locator('#arena-kind-filter').inputValue(), '');
        assert.equal(await page.locator('#arena-kind-filter').isVisible(), width < 761);
        await expectArenas(page, ARENAS);
        const layout = await checkLayout(page, name, width, height);

        for (const city of new Set(ARENAS.map(arena => arena.cityId || 'astralia'))) {
          await page.locator('#arena-city-filter').selectOption(city);
          await expectArenas(page, ARENAS.filter(arena => (arena.cityId || 'astralia') === city));
        }
        await page.locator('#arena-city-filter').selectOption('');
        for (const kind of ['street', 'official', 'legendary', 'classic']) {
          await setKind(page, kind);
          await expectArenas(page, ARENAS.filter(arena => (arena.kind || 'classic') === kind));
        }
        await selectArena(page, classics[0]);
        assert.equal(await page.locator('#arena-kind').innerText(), 'Classiques');
        await page.locator('#locker-panel-arena [data-view="isometric"]').click();
        await expectPreview(page, classics[0], 'isometric');
        await selectArena(page, classics[1], 'isometric');
        await page.locator('#arena-city-filter').selectOption(pixels[0].cityId);
        await expectArenas(page, []);
        assert.equal(await page.locator('#arena-name').innerText(), classics[1].name, 'filtering keeps the selected venue');
        await page.locator('#arena-filter-reset').click();
        await expectArenas(page, ARENAS);
        assert.equal(await page.locator('#arena-filter-reset').isDisabled(), true);

        const horizontalOnly = pixels.find(arena => arena.views?.length === 1 && arena.views[0] === 'horizontal');
        assert.ok(horizontalOnly, 'pixel venue without an isometric view is covered');
        await selectArena(page, horizontalOnly);
        assert.equal(await page.locator('#locker-panel-arena [data-view="isometric"]').isDisabled(), true);
        assert.match(await page.locator('#locker-panel-arena [data-view="isometric"]').getAttribute('title'), /indisponible/);
        for (const arena of pixels) await selectArena(page, arena);
        if (height >= 800) {
          const previewInPanel = await page.locator('#arena-preview').evaluate(image => {
            const preview = image.getBoundingClientRect(), panel = document.querySelector('#locker-panel-arena').getBoundingClientRect();
            return preview.top >= panel.top && preview.bottom <= panel.bottom;
          });
          assert.equal(previewInPanel, true, name + ' preview stays visible while browsing the list');
        }

        // Native radio keyboard navigation still selects a venue after filtering.
        await setKind(page, 'classic');
        await selectArena(page, classics[0]);
        await page.locator('input[name="arena"][value="' + classics[0].id + '"]').focus();
        await page.keyboard.press('ArrowRight');
        await expectPreview(page, classics[1], 'horizontal');
        await page.locator('#arena-filter-reset').click();
        await selectArena(page, horizontalOnly);
        await page.locator('#arena-city-filter').selectOption(horizontalOnly.cityId);
        await setKind(page, horizontalOnly.kind);
        await expectArenas(page, ARENAS.filter(arena => arena.cityId === horizontalOnly.cityId && arena.kind === horizontalOnly.kind));
        await page.locator('#locker-tab-teams').click();
        assert.match(await page.locator('[data-position="meneur"]').innerText(), /RIKO/);
        assert.equal(await page.locator('.athlete-ratings meter').count(), 6);
        await page.locator('#locker-tab-ball').click();
        assert.equal(await page.locator('input[name="ball"][value="orbital"]').isChecked(), true);
        await page.locator('#locker-tab-arena').click();
        assert.equal(await page.locator('#arena-city-filter').inputValue(), horizontalOnly.cityId);
        await expectPreview(page, horizontalOnly, 'horizontal');
        await page.locator('#locker-panel-arena').evaluate(panel => { panel.scrollTop = 0; });
        await page.screenshot({ path: path.join(out, name + '-selected.png') });
        assert.equal(await page.evaluate(() => JSON.stringify(window.Astraball.snapshot())), original, 'draft leaves the match untouched');

        await page.locator('#new-match').click();
        await page.waitForFunction(() => !document.querySelector('#modal').open);
        const appearance = await page.evaluate(() => window.Astraball.metrics().appearance);
        assert.equal(appearance.arena, horizontalOnly.id);
        assert.equal(appearance.view, 'horizontal');
        assert.equal(appearance.ball, 'orbital');
        const saved = await page.evaluate(() => JSON.stringify(window.Astraball.snapshot()));
        assert.equal(JSON.parse(saved).units.find(unit => unit.team === 0 && unit.role === 'meneur').name, 'RIKO');
        await page.reload(); await page.waitForFunction(() => window.Astraball?.ready);
        assert.equal(await page.evaluate(() => JSON.stringify(window.Astraball.snapshot())), saved);
        assert.equal(await page.evaluate(() => window.Astraball.metrics().appearance.arena), horizontalOnly.id);
        await page.locator('#settings').click(); await page.locator('#locker-tab-arena').click();
        await expectPreview(page, horizontalOnly, 'horizontal');
        await expectArenas(page, ARENAS);
        await selectArena(page, classics[1]);
        await page.locator('#locker-panel-arena [data-view="isometric"]').click();
        await page.locator('#apply-options').click();
        await page.waitForFunction(() => !document.querySelector('#modal').open);
        assert.equal(await page.evaluate(() => JSON.stringify(window.Astraball.snapshot())), saved, 'resume preserves composed teams and match state');
        assert.equal(await page.evaluate(() => window.Astraball.metrics().appearance.arena), classics[1].id);
        assert.equal(await page.evaluate(() => window.Astraball.metrics().appearance.view), 'isometric');
        assert.deepEqual(errors, []);
        reports.push({ name, width, height, venues: ARENAS.length, pixelPreviews: pixels.length, filters: true, views: true, keyboard: true, persistence: true, layout, errors });
      } finally { await context.close(); }
    }
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(reports, null, 2) + '\n');
    console.log(JSON.stringify(reports, null, 2));
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
