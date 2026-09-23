'use strict';
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const { buildCatalog } = require('../../atelier/game-catalog.cjs');
const { createEngine } = require('../../site/engine.js');
const M = require('./model.cjs'), set = require('./set.json');
const { fs, path, ROOT, sharp } = L;
const origin = 'http://127.0.0.1:43878'; // Intercepted in full; no server or persistent browser profile.
const output = path.join(__dirname, 'verification/browser');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const viewports = [{ width: 1600, height: 1000 }, { width: 390, height: 844 }];

async function checkHeading(page) {
  const layout = await page.locator('.cb-heading').evaluate(heading => {
    const issues = [], box = heading.getBoundingClientRect();
    const visible = node => node.getClientRects().length && getComputedStyle(node).visibility !== 'hidden';
    const children = [...heading.children].filter(visible);
    if (box.left < -1 || box.right > innerWidth + 1) issues.push('heading outside viewport');
    for (const node of [heading, ...children, ...heading.querySelectorAll('h1, .cb-scopes button')].filter(visible)) {
      const rect = node.getBoundingClientRect(), label = node.className || node.tagName;
      if (rect.left < box.left - 1 || rect.right > box.right + 1 || rect.top < box.top - 1 || rect.bottom > box.bottom + 1) issues.push(label + ': outside heading');
      if (node.scrollWidth > node.clientWidth + 1 || node.scrollHeight > node.clientHeight + 1) issues.push(label + ': clipped content');
    }
    for (let i = 0; i < children.length; i++) for (let j = i + 1; j < children.length; j++) {
      const a = children[i].getBoundingClientRect(), b = children[j].getBoundingClientRect();
      if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) {
        issues.push(children[i].className + ' overlaps ' + children[j].className);
      }
    }
    const bounds = node => {
      const rect = node.getBoundingClientRect();
      return { label: node.className || node.tagName, x: rect.x, y: rect.y, width: rect.width, height: rect.height,
        scrollWidth: node.scrollWidth, clientWidth: node.clientWidth, scrollHeight: node.scrollHeight, clientHeight: node.clientHeight };
    };
    return { issues, viewport: innerWidth, bounds: [heading, ...children].map(bounds) };
  });
  if (layout.issues.length) {
    await page.screenshot({ path: path.join(output, 'heading-overflow-' + layout.viewport + '.png') });
    fs.writeFileSync(path.join(output, 'heading-overflow-' + layout.viewport + '.json'), JSON.stringify(layout, null, 2) + '\n');
  }
  assert.deepEqual(layout.issues, [], 'Collection heading at ' + page.viewportSize().width + 'px');
}

async function checkScope(page, data, id, count) {
  const button = page.locator('[data-binder-action=scope][data-id="' + id + '"]');
  assert.equal(await button.textContent().then(s => s.replace(/\s+/g, ' ').trim()), id.toUpperCase() + ' ' + count);
  await button.click(); assert.equal(await button.getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(n => document.querySelector('.cb-count')?.textContent.includes(n + ' versions'), count);
  const expected = data.cards.filter(c => c.faction === id.toUpperCase()).map(c => c.id).sort(), seen = new Set();
  assert.equal(expected.length, count);
  for (let n = 0; n < count; n++) {
    const visible = await page.locator('.cb-card').evaluateAll(nodes => nodes.map(node => node.dataset.id));
    assert.ok(visible.length && visible.every(cardId => expected.includes(cardId)), 'Foreign card in ' + id);
    visible.forEach(cardId => seen.add(cardId));
    const next = page.locator('.cb-footer [data-binder-action=next-page]');
    await next.waitFor({ state: 'visible' });
    if (await next.isDisabled()) break;
    await next.click();
    await page.waitForFunction(previous => [...document.querySelectorAll('.cb-card')].map(node => node.dataset.id).join(',') !== previous, visible.join(','));
  }
  assert.deepEqual([...seen].sort(), expected, 'Missing cards in ' + id);
  await checkHeading(page);
}

async function main({ requireMedia = false } = {}) {
  const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__ff8_browser__.cjs'))('playwright');
  const protectedPaths = [D.CATALOGUE, path.join(L.DATA, 'references.json'), path.join(ROOT, 'V4/atelier/designer-assets/manifest.json')];
  const before = new Map(); for (const file of protectedPaths) before.set(file, await L.hash(file));
  const current = D.catalogue().cards, ids = new Set(set.cards.map(c => c.id));
  const publications = set.cards.map(spec => ({ id: spec.id, profile: M.profile(spec, D, require('../../../V3/donnees/armes.json')),
    pngUrl: '/media/created/' + spec.id + '.png' }));
  const data = await buildCatalog({ published: [...current.filter(c => c.kind === 'created' && !ids.has(c.id)), ...publications] });
  const presets = M.validateGame(data, set, createEngine), errors = [], badResponses = [], mocked = new Set();
  const ff8Media = new Map(set.cards.map(c => ['/media/created/' + c.id + '.png', path.join(__dirname, 'cards', c.key, 'card.png')]));
  for (const id of set.arenas) ff8Media.set('/jeu/assets/arenes/' + id + '.png', path.join(ROOT, 'V4/site/assets/arenes', id + '.png'));
  ff8Media.set('/jeu/assets/factions/FF8.png', path.join(ROOT, 'V4/site/assets/factions/FF8.png'));
  const placeholder = await sharp({ create: { width: 897, height: 1497, channels: 4, background: '#397568' } }).png().toBuffer();
  const browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url()), pathname = decodeURIComponent(url.pathname);
      if (url.origin !== origin || request.method() !== 'GET') return route.abort('blockedbyclient');
      if (pathname === '/api/game/catalogue') return route.fulfill({ json: data });
      if (pathname === '/') return route.fulfill({ contentType: 'text/html', body: '<!doctype html><title>Atelier fixture</title>' });
      let file = ff8Media.get(pathname);
      if (file && !fs.existsSync(file)) {
        mocked.add(pathname);
        return route.fulfill({ contentType: 'image/png', body: placeholder });
      }
      if (!file && pathname.startsWith('/media/')) {
        const card = current.find(c => c.pngUrl === pathname); if (card) file = path.join(ROOT, card.png);
      }
      if (!file && pathname.startsWith('/jeu/shared/')) file = L.inside(path.join(ROOT, 'V3/assets'), pathname.slice('/jeu/shared/'.length));
      if (!file && pathname.startsWith('/jeu/')) {
        file = L.inside(path.join(ROOT, 'V4/site'), pathname.slice('/jeu/'.length) || 'index.html');
        if (!fs.existsSync(file) && pathname.startsWith('/jeu/assets/')) file = L.inside(path.join(ROOT, 'V3/site'), pathname.slice('/jeu/'.length));
      }
      if (!file || !fs.existsSync(file)) return route.fulfill({ status: 404, body: pathname });
      return route.fulfill({ contentType: mime[path.extname(file)] || 'application/octet-stream', body: fs.readFileSync(file) });
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) badResponses.push(response.url() + ': ' + response.status()); });
    page.on('dialog', dialog => dialog.accept());
    const ready = async () => {
      await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth > 0));
      assert.equal(await page.locator('[data-v4-media-error]').count(), 0);
    };
    await page.goto(origin + '/jeu/'); await page.waitForFunction(() => window.KALISTAR_READY === true);
    assert.deepEqual(await page.evaluate(() => [KALISTAR_DATA.cards.filter(c => c.faction === 'FF8').length,
      KALISTAR_DB.registry.owned('user-paris').length, KALISTAR_DB.registry.owned('user-tokyo').length]), [12, data.cards.length, 0]);
    fs.mkdirSync(output, { recursive: true });
    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      for (const [scope, count] of [['ff8', 12], ['ff7', 10]]) {
        await checkScope(page, data, scope, count); await ready();
        await page.screenshot({ path: path.join(output, scope + '-scope-' + viewport.width + '.png') });
      }
    }
    await page.locator('[data-binder-action=scope][data-id=owned]').click();
    await page.setViewportSize(viewports[0]);
    for (const spec of set.cards) {
      await page.locator('[data-binder-field=search]').fill(spec.id);
      await page.locator('.cb-card[data-id="' + spec.id + '"]').click();
      assert.equal(await page.locator('.cb-card-heading h2').textContent(), spec.name);
      assert.equal(await page.locator('.cb-card-heading p').textContent(), spec.title);
      assert.equal(await page.locator('.cb-story p').textContent(), spec.description);
      await ready();
      if (spec.key === 'selphie') {
        await page.locator('[data-binder-action=tab][data-id=profile]').click();
        assert.ok((await page.locator('#cb-read-content').textContent()).includes('Fl\u00e9au'));
        assert.equal(new URL(await page.locator('#cb-read-content img[src$="/factions/FF8.png"]').getAttribute('src'), page.url()).pathname, '/jeu/assets/factions/FF8.png');
        for (const viewport of viewports) { await page.setViewportSize(viewport); await checkHeading(page); }
        await page.setViewportSize(viewports[0]);
        await page.screenshot({ path: path.join(output, 'selphie-collection.png') });
        await page.locator('[data-binder-action=tab][data-id=story]').click();
      }
      await page.locator('[data-binder-action=back]').click();
    }
    for (const [index, preset] of presets.entries()) {
      await page.locator('[data-view=decks]').click();
      await page.locator('#deck-preset').selectOption(preset.id);
      await page.locator('[data-action=load-preset]').click(); await ready();
      assert.deepEqual(await page.locator('.kdb-slot').evaluateAll(nodes => nodes.map(n => n.dataset.deckPreview)), preset.cards);
      assert.equal(await page.locator('.kdb-coverage .is-missing').count(), 0);
      await page.screenshot({ path: path.join(output, preset.id + '.png') });
      await page.locator('[data-view=arena]').click();
      const arenaId = set.arenas[index];
      await page.locator('[data-action=new-game]').first().click();
      await page.locator('#new-game-dialog').waitFor({ state: 'visible' });
      await page.locator('input[name=arena][value="' + arenaId + '"]').check();
      await page.locator('#enemy-deck-preset').selectOption(presets[1 - index].id);
      await page.locator('#game-mode').selectOption('local');
      await page.locator('#new-game-form button[type=submit]').click();
      await page.waitForFunction(id => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.arenaId === id, arenaId);
      await page.locator('[data-action=start]').click();
      await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase === 'choose');
      for (const viewport of viewports) {
        await page.setViewportSize(viewport); await ready();
        assert.ok((await page.locator('.game-shell').getAttribute('style')).includes(arenaId + '.png'));
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Debordement horizontal.');
        await page.screenshot({ path: path.join(output, arenaId + '-' + viewport.width + '.png') });
      }
      await page.setViewportSize({ width: 1600, height: 1000 });
      await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY === true);
      assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game'))?.arenaId), arenaId);
    }
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    if (requireMedia) assert.deepEqual([...mocked], [], 'Medias reels manquants ; aucune validation native.');
    const report = { passed: true, mode: 'isolated-offline-catalogue', nativeMediaComplete: mocked.size === 0,
      placeholderMedia: [...mocked], cards: 12, scopes: { ff8: 12, ff7: 10 }, headingViewports: viewports.map(v => v.width),
      factionAsset: '/jeu/assets/factions/FF8.png', presets: presets.map(p => p.id), arenas: set.arenas, errors, badResponses };
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
    return report;
  } catch (error) {
    fs.mkdirSync(output, { recursive: true });
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ passed: false, mode: 'isolated-offline-catalogue',
      error: error.message, placeholderMedia: [...mocked], errors, badResponses }, null, 2) + '\n');
    throw error;
  } finally {
    await browser.close();
    for (const [file, hash] of before) assert.equal(await L.hash(file), hash, 'Source globale modifiee : ' + file);
  }
}
module.exports = { main };
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--require-media')) { console.error('Usage: node browser.test.cjs [--require-media]'); process.exitCode = 1; }
  else main({ requireMedia: args.includes('--require-media') }).then(v => console.log(JSON.stringify(v, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
