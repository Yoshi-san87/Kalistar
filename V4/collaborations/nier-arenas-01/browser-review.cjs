'use strict';
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs');
const { fs, path, assert, sharp } = L;
const manifest = require('./manifest.json');
const MODEL = '45862715';
const VIEWPORTS = [{ width: 1600, height: 1000 }, { width: 390, height: 844 }];

async function pixelCheck(bytes, label) {
  const metadata = await sharp(bytes).metadata(), stats = await sharp(bytes).stats();
  const rgb = stats.channels.slice(0, 3);
  assert.ok(metadata.width >= 40 && metadata.height >= 40, 'Capture trop petite : ' + label);
  assert.ok(rgb.some(c => c.stdev > 6 && c.max - c.min > 40), 'Capture vide ou uniforme : ' + label);
  return { width: metadata.width, height: metadata.height, stdev: rgb.map(c => +c.stdev.toFixed(2)) };
}

async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  await page.waitForFunction(() => [...document.images].filter(i => {
    const r = i.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
  }).every(i => i.complete && i.naturalWidth > 0));
  assert.equal(await page.locator('[data-v4-media-error]').count(), 0, 'Erreur de media V4.');
}

async function servedImage(page, image) {
  const actual = await page.evaluate(async url => {
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) throw Error('Media response: ' + response.status + ' ' + url);
    const bytes = await response.arrayBuffer();
    const sha256 = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
    const result = { sha256, width: bitmap.width, height: bitmap.height, contentType: response.headers.get('content-type') };
    bitmap.close(); return result;
  }, image.url);
  assert.equal(actual.sha256, image.sha256, 'Image servie differente de la publication : ' + image.url);
  assert.deepEqual([actual.width, actual.height], [image.width, image.height]);
  assert.match(actual.contentType || '', /^image\/png\b/i);
  return { url: image.url, ...actual };
}

async function layout(page, vertical = false) {
  const bounds = await page.evaluate(() => ({ width: innerWidth, height: innerHeight,
    scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  assert.ok(bounds.scrollWidth <= bounds.width + 1, 'Debordement horizontal : ' + JSON.stringify(bounds));
  if (vertical) assert.ok(bounds.scrollHeight <= bounds.height + 1, 'Debordement vertical : ' + JSON.stringify(bounds));
  return bounds;
}

async function openNewGame(page, mobile) {
  const menu = page.locator('[data-action=arena-menu]');
  if (mobile && await menu.isVisible()) {
    await menu.click();
    await page.locator('#mobile-dialog[open] [data-action=new-game]').click();
  } else await page.locator('[data-action=new-game]:visible').first().click();
  await page.locator('#new-game-dialog[open]').waitFor();
}

async function main() {
  const out = path.join(__dirname, 'browser-review');
  const report = { passed: false, mode: 'live-local-get-only-ephemeral', modelId: MODEL,
    startedAt: new Date().toISOString(), errors: [], views: [], sourcePreservation: false };
  const protectedFiles = new Map();
  let browser, activePage, stage = 'publication-preflight';
  fs.mkdirSync(out, { recursive: true });
  try {
    const url = new URL(process.env.KALISTAR_URL || L.read(path.join(L.DATA, 'runtime.json')).url);
    assert.ok(url.protocol === 'http:' && url.hostname === '127.0.0.1' && !url.username && !url.password, 'Serveur local 127.0.0.1 requis.');
    const origin = url.origin; report.origin = origin;
    const catalogue = L.read(path.join(L.ROOT, 'V4/donnees/catalogue.json'));
    const published = catalogue.cards.find(c => c.id === MODEL && c.kind === 'created');
    assert.ok(published && !published.testOnly && !published.profile?.testOnly, 'Publier Simone avant ce controle.');
    assert.equal(published.profile.characterId, 'simone-nier');
    assert.equal(published.profile.element, 'HEMATO');
    assert.ok(published.profile.positions.includes(4));
    assert.equal(published.pngUrl, '/media/created/' + MODEL + '.png');
    const registry = L.read(path.join(L.ROOT, 'V4/donnees/arenes-collaborations.json'));
    for (const a of manifest.arenas) assert.deepEqual(registry.find(entry => entry.id === a.entry.id), a.entry, 'Publier les deux arenes avant ce controle.');
    const mediaSpecs = [{ key: 'simone', url: published.pngUrl, file: 'V4/creations/' + MODEL + '/card.png' },
      ...manifest.arenas.map(a => ({ key: a.key, url: a.entry.image, file: 'V4/site/assets/arenes/' + a.entry.id + '.png' }))];
    const media = new Map();
    for (const image of mediaSpecs) {
      const file = path.join(L.ROOT, image.file), metadata = await sharp(file).metadata();
      assert.equal(metadata.format, 'png');
      if (image.key === 'simone') assert.deepEqual([metadata.width, metadata.height], [897, 1497]);
      else assert.ok(metadata.width > metadata.height);
      const sha256 = await L.hash(file);
      media.set(image.key, { ...image, sha256, width: metadata.width, height: metadata.height });
      protectedFiles.set(file, sha256);
    }
    for (const relative of ['V4/donnees/catalogue.json', 'V4/donnees/arenes-collaborations.json',
      'V4/atelier/data/references.json', 'V4/atelier/designer-assets/manifest.json',
      'V4/creations/' + MODEL + '/profile.json', 'V4/site/engine.js',
      ...manifest.arenas.map(a => a.source)]) {
      const file = path.join(L.ROOT, relative); protectedFiles.set(file, await L.hash(file));
    }
    const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const { chromium } = createRequire(path.join(runtime, '__nier_arena_review__.cjs'))('playwright');
    stage = 'launch';
    browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
    for (const viewport of VIEWPORTS) {
      const mobile = viewport.width === 390, view = { ...viewport, screenshots: [], arenas: [], requests: 0 };
      report.views.push(view);
      const context = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile,
        deviceScaleFactor: 1, reducedMotion: 'reduce', serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => {
          const request = route.request(), requested = new URL(request.url());
          if (requested.origin === origin && requested.protocol === 'http:' && request.method() === 'GET') {
            view.requests++; return route.continue();
          }
          report.errors.push('Blocked request: ' + request.method() + ' ' + request.url());
          return route.abort('blockedbyclient');
        });
        const page = await context.newPage(); activePage = page;
        page.setDefaultTimeout(20000); page.setDefaultNavigationTimeout(30000);
        page.on('dialog', async dialog => {
          if (dialog.type() === 'confirm' && dialog.message().startsWith('Remplacer cette partie ?')) return dialog.accept();
          report.errors.push('Unexpected dialog: ' + dialog.type() + ' ' + dialog.message());
          return dialog.dismiss();
        });
        page.on('pageerror', e => report.errors.push('JS: ' + e.message));
        page.on('response', r => { if (r.status() >= 400) report.errors.push('HTTP ' + r.status() + ' ' + r.url()); });
        page.on('requestfailed', request => {
          const message = request.failure()?.errorText;
          if (message !== 'net::ERR_ABORTED') report.errors.push('Network: ' + message + ' ' + request.url());
        });
        const capture = async (name, locator) => {
          const filename = name + '-' + viewport.width + '.png';
          const bytes = await (locator || page).screenshot({ path: path.join(out, filename), animations: 'disabled' });
          const pixels = await pixelCheck(bytes, filename);
          view.screenshots.push({ file: filename, ...pixels }); return filename;
        };

        stage = 'collection-' + viewport.width;
        await page.goto(origin + '/jeu/#collection'); await ready(page);
        const data = await page.evaluate(id => ({ card: window.KALISTAR_DATA.cards.find(c => c.id === id),
          arenas: window.KALISTAR_DATA.arenas.filter(a => a.id.startsWith('nier-')) }), MODEL);
        assert.equal(data.card?.characterId, 'simone-nier');
        assert.deepEqual(data.arenas, manifest.arenas.map(({ entry: { collaboration, ...entry } }) => entry));
        view.cardMedia = await servedImage(page, media.get('simone'));
        await page.locator('[data-binder-field=search]').fill(MODEL);
        await page.locator('.cb-card[data-id="' + MODEL + '"]').click();
        await page.waitForFunction(() => {
          const image = document.querySelector('.cb-hero-image');
          return image?.complete && image.naturalWidth > 0 && image.src.startsWith('blob:');
        });
        assert.equal(await page.locator('.cb-card-heading h2').textContent(), published.profile.name);
        view.collectionLayout = await layout(page, true);
        await capture('simone-collection'); await capture('simone-card', page.locator('.cb-hero-image'));
        await page.locator('.main-nav [data-view=arena]').click(); await ready(page);

        for (const a of manifest.arenas) {
          const arena = a.entry; stage = arena.id + '-' + viewport.width;
          const checked = { id: arena.id, media: await servedImage(page, media.get(a.key)) };
          view.arenas.push(checked);
          await openNewGame(page, mobile);
          const radio = page.locator('#new-game-form input[name=arena][value="' + arena.id + '"]');
          const option = page.locator('#new-game-form .arena-option:has(input[value="' + arena.id + '"])');
          await radio.check(); assert.equal(await radio.isChecked(), true);
          await option.scrollIntoViewIfNeeded();
          await option.locator('img').evaluate(image => image.decode());
          assert.equal(new URL(await option.locator('img').getAttribute('src'), origin).pathname, arena.image);
          await capture(arena.id + '-option', option); await capture(arena.id + '-picker');
          await page.locator('#game-mode').selectOption('local');
          await page.locator('#game-seed').fill('NIER-QA-' + a.key + '-' + viewport.width);
          const submit = page.locator('#new-game-form button[type=submit]');
          assert.equal(await submit.isEnabled(), true, 'Deck initial non jouable.');
          await submit.click();
          await page.waitForFunction(id => {
            const game = JSON.parse(localStorage.getItem('kalistar.v4.game'));
            return game?.arenaId === id && game.phase === 'setup' && game.mode === 'local';
          }, arena.id);
          await page.locator('#new-game-dialog').waitFor({ state: 'hidden' }); await ready(page);
          await page.locator('[data-action=start]').click();
          await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase === 'choose');
          await ready(page);
          await page.waitForFunction(() => [...document.querySelectorAll('.slot')].every(n => n.getAnimations().every(a => a.playState !== 'running')));
          checked.background = await page.locator('.battlefield').evaluate(n => getComputedStyle(n).backgroundImage);
          assert.ok(checked.background.includes(arena.image), 'Mauvais fond applique au plateau.');
          assert.equal(await page.locator('.formation .slot-card').count(), 10, 'Formation incomplete.');
          checked.layout = await layout(page);
          checked.phase = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).phase);
          await capture(arena.id + '-match');
          const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
          await page.reload(); await ready(page);
          assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))), JSON.parse(saved), 'Partie restauree differente.');
          checked.restored = true;
        }
      } catch (error) {
        if (activePage && !activePage.isClosed()) {
          view.failureDetails = await activePage.evaluate(() => ({ toast: document.querySelector('#toast')?.textContent,
            savedGame: JSON.parse(localStorage.getItem('kalistar.v4.game')), openDialogs: [...document.querySelectorAll('dialog[open]')].map(d => d.id) })).catch(() => null);
          await activePage.screenshot({ path: path.join(out, 'failure-' + viewport.width + '.png') }).catch(() => {});
        }
        throw error;
      } finally { activePage = undefined; await context.close(); }
    }
    assert.deepEqual(report.errors, []);
    report.passed = true;
  } catch (error) {
    report.failure = { stage, message: error.message }; throw error;
  } finally {
    try {
      if (browser) await browser.close();
      for (const [file, hash] of protectedFiles) assert.equal(await L.hash(file), hash, 'Source modifiee pendant le controle : ' + file);
      report.sourcePreservation = protectedFiles.size > 0;
    } catch (error) {
      report.passed = false; report.errors.push(error.message); throw error;
    } finally {
      report.finishedAt = new Date().toISOString();
      L.write(path.join(out, 'report.json'), report);
    }
  }
  return report;
}

module.exports = { main, pixelCheck };
if (require.main === module) {
  if (process.argv.length > 2) { console.error('Usage: node browser-review.cjs'); process.exitCode = 1; }
  else main().then(report => console.log(JSON.stringify(report, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
