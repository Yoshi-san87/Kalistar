'use strict';
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
const M = require('./model.cjs'), set = require('./set.json');
const { fs, path, assert, ROOT } = L;
const viewports = [{ width: 1600, height: 1000 }, { width: 390, height: 844 }, { width: 360, height: 844 }];
const expectedIds = [...set.cards.map(c => c.id), '45911726', '42138845'].sort();
const output = path.join(__dirname, 'verification/browser');

async function navigate(page, url) {
  const sameDocument = page.url().split('#')[0] === url.split('#')[0];
  await page.goto(url);
  // The application reads the hash at startup, not on hashchange.
  if (sameDocument) await page.reload();
  await page.waitForFunction(() => window.KALISTAR_READY === true);
}

async function imagesReady(page) {
  await page.waitForFunction(() => [...document.images].filter(img => {
    const r = img.getBoundingClientRect(), style = getComputedStyle(img);
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight &&
      r.right > 0 && r.left < innerWidth && style.visibility !== 'hidden';
  }).every(img => img.complete && img.naturalWidth > 0));
  assert.equal(await page.locator('[data-v4-media-error]').count(), 0, 'Erreur de media V4.');
  await page.evaluate(() => document.fonts.ready);
}

async function cardImage(page, selector, id, kind = 'card') {
  await page.waitForFunction(({ selector, id, kind }) => {
    const img = document.querySelector(selector);
    const card = KALISTAR_DATA.cards.find(c => c.id === id);
    return img && img.complete && img.naturalWidth > 0 && img.getAttribute('src').startsWith('blob:') &&
      img.getAttribute('src') === KalistarCardMedia.image(card, kind);
  }, { selector, id, kind });
  const media = await page.locator(selector).evaluate((img, { id, kind }) => {
    const card = KALISTAR_DATA.cards.find(c => c.id === id);
    return { id, kind, width: img.naturalWidth, height: img.naturalHeight,
      boundToCard: img.getAttribute('src') === KalistarCardMedia.image(card, kind),
      cropped: img.dataset.v4Cropped || 'cached-blob', error: img.dataset.v4MediaError || null };
  }, { id, kind });
  assert.equal(media.boundToCard, true, 'Image attribuee a une autre carte : ' + id);
  assert.equal(media.error, null);
  assert.deepEqual([media.width, media.height], kind === 'card' ? [797, 1388] : [460, 880]);
  return media;
}

async function layout(page, label) {
  const result = await page.evaluate(() => {
    const visible = n => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(n).visibility !== 'hidden';
    };
    const issues = [], root = document.documentElement;
    if (Math.max(root.scrollWidth, document.body.scrollWidth) > innerWidth + 1) issues.push('viewport horizontal overflow');
    if (Math.max(root.scrollHeight, document.body.scrollHeight) > innerHeight + 1) issues.push('viewport vertical overflow');
    // The statistics table may scroll internally; its container must stay in the viewport.
    const selectors = '.cb-page,.cb-heading,.cb-toolbar,.cb-footer,.cb-spread,.cb-card-heading,.cb-reading-tabs,' +
      '.statistics-sheet,.sheet-heading,.sheet-toolbar,.sheet-tabs,.sheet-footer,.sheet-scroll';
    const bounds = [...document.querySelectorAll(selectors)].filter(visible).map(n => {
      const r = n.getBoundingClientRect();
      if (r.left < -1 || r.right > innerWidth + 1 || r.top < -1 || r.bottom > innerHeight + 1) issues.push(n.className + ': outside viewport');
      return { label: n.className, x: r.x, y: r.y, width: r.width, height: r.height };
    });
    const heading = document.querySelector('.cb-heading');
    if (heading) {
      const h = heading.getBoundingClientRect();
      for (const n of [...heading.querySelectorAll('h1,.cb-scopes button')].filter(visible)) {
        const r = n.getBoundingClientRect();
        if (r.left < h.left - 1 || r.right > h.right + 1 || r.top < h.top - 1 || r.bottom > h.bottom + 1 ||
            n.scrollWidth > n.clientWidth + 1 || n.scrollHeight > n.clientHeight + 1) issues.push(n.textContent.trim() + ': clipped heading');
      }
    }
    return { width: innerWidth, height: innerHeight, scrollWidth: root.scrollWidth, scrollHeight: root.scrollHeight, issues, bounds };
  });
  return { label, ...result };
}

async function collection(page, report, capture) {
  const scope = page.locator('[data-binder-action=scope][data-id=nier]');
  assert.equal((await scope.textContent()).replace(/\s+/g, ' ').trim(), 'NieR 8');
  await scope.click(); assert.equal(await scope.getAttribute('aria-pressed'), 'true');
  await page.waitForFunction(() => document.querySelector('.cb-count')?.textContent.includes('8 versions'));
  const seen = new Set(), pages = [];
  for (let number = 1; number <= 8; number++) {
    const ids = await page.locator('.cb-card').evaluateAll(nodes => nodes.map(n => n.dataset.id));
    assert.ok(ids.length && ids.every(id => expectedIds.includes(id)), 'Carte etrangere ou page vide.');
    assert.ok(ids.some(id => !seen.has(id)), 'Pagination sans progression.');
    const images = [];
    for (const id of ids) {
      images.push(await cardImage(page, '.cb-card[data-id="' + id + '"] img', id)); seen.add(id);
    }
    await imagesReady(page);
    const filename = 'nier-' + page.viewportSize().width + '-page-' + number;
    await capture(filename); pages.push({ number, ids, images });
    const next = page.locator('.cb-footer [data-binder-action=next-page]');
    if (await next.isDisabled()) break;
    await next.click();
    await page.waitForFunction(previous => [...document.querySelectorAll('.cb-card')].map(n => n.dataset.id).join(',') !== previous, ids.join(','));
  }
  assert.deepEqual([...seen].sort(), expectedIds, 'Les huit NieR doivent etre consultables sur chaque viewport.');
  set.cards.forEach(c => assert.ok(seen.has(c.id), c.key + ' absent'));
  report.collection.push({ viewport: page.viewportSize(), ids: [...seen].sort(), pages });
}

async function profiles(page, data, report, capture) {
  for (const spec of set.cards) {
    report.stage = 'profile-' + spec.key;
    await page.locator('[data-binder-field=search]').fill(spec.id);
    await page.waitForFunction(id => document.querySelectorAll('.cb-card').length === 1 && document.querySelector('.cb-card')?.dataset.id === id, spec.id);
    await page.locator('.cb-card[data-id="' + spec.id + '"]').click();
    assert.equal(await page.locator('.cb-card-heading h2').textContent(), spec.name);
    assert.equal(await page.locator('.cb-card-heading p').textContent(), spec.title);
    await page.locator('[data-binder-action=media][data-id=card]').click();
    await page.locator('[data-binder-action=tab][data-id=profile]').click();
    await imagesReady(page);
    const identity = await page.locator('.cb-identity > span').evaluateAll(ns => ns.map(n => ({
      name: n.querySelector('b').textContent, detail: n.querySelector('small').textContent
    })));
    assert.equal(identity[0].name, 'NieR'); assert.equal(identity[0].detail, spec.job); assert.equal(identity[1].name, spec.race);
    const positions = [...identity[1].detail.matchAll(/P([1-5])/g)].map(m => Number(m[1]));
    assert.deepEqual(positions, spec.positions, 'Ordre des positions imprimees : ' + spec.key);
    const crystal = data.elements[spec.element].label;
    assert.equal(await page.locator('.cb-weapon span').textContent(), crystal);
    assert.ok((await page.locator('.cb-weapon').textContent()).includes(spec.weapon));
    assert.ok((await page.locator('.cb-card-heading .cb-eyebrow').textContent()).startsWith(crystal));
    for (const suffix of ['/factions/NieR.png', '/races/' + spec.race + '.png']) {
      const icon = page.locator('#cb-read-content img[src$="' + suffix + '"]'); assert.equal(await icon.count(), 1);
      assert.ok(await icon.evaluate(img => img.complete && img.naturalWidth > 0));
    }
    const icon = page.locator('.cb-versions [data-id="' + spec.id + '"] img');
    assert.ok(new URL(await icon.getAttribute('src'), page.url()).pathname.endsWith('/cristaux/' + spec.element + '.png'));
    assert.equal(await icon.getAttribute('alt'), crystal);
    const card = await cardImage(page, '.cb-hero-image', spec.id);
    const link = new URL(await page.locator('.cb-visual a[download]').getAttribute('href'), page.url());
    assert.equal(link.pathname, '/media/created/' + spec.id + '.png');
    await capture(spec.key + '-profile-1600');
    await page.locator('[data-binder-action=media][data-id=art]').click();
    const art = await cardImage(page, '.cb-hero-image', spec.id, 'art');
    await capture(spec.key + '-art-1600');
    report.profiles.push({ key: spec.key, id: spec.id, title: spec.title, race: identity[1].name, element: spec.element, crystal, positions, card, art });
    await page.locator('[data-binder-action=back]').click();
  }
}

async function statistics(page, report, capture) {
  await navigate(page, report.origin + '/jeu/#statistics');
  await page.locator('.statistics-sheet').waitFor({ state: 'visible' });
  const filters = page.locator('.sheet-filters');
  if ((await filters.getAttribute('open')) === null) await filters.locator('summary').click();
  await page.locator('[data-sheet-field=collab]').selectOption('NieR');
  await page.waitForFunction(() => document.querySelectorAll('[data-sheet-row]').length === 8);
  const ids = await page.locator('[data-sheet-row] [data-sheet-action=detail]').evaluateAll(ns => ns.map(n => n.dataset.id).sort());
  assert.deepEqual(ids, expectedIds); assert.ok((await page.locator('.sheet-count').textContent()).startsWith('8 personnages'));
  if (page.viewportSize().width < 700) await filters.locator('summary').click();
  await imagesReady(page); await capture('statistics-nier-' + page.viewportSize().width);
  report.statistics.push({ viewport: page.viewportSize(), filter: 'NieR', ids });
}

async function main() {
  // No fixture catalogue or media fallback: fail before launching Chrome until publication is complete.
  M.validateSet(set);
  const catalogue = D.catalogue(), media = [];
  assert.equal(catalogue.cards.length, 57, 'Attendu apres publication : 57 versions.');
  for (const spec of set.cards) {
    const entry = catalogue.cards.find(c => c.id === spec.id);
    assert.ok(entry?.kind === 'created', 'Publier les six cartes avant ce test : ' + spec.key);
    M.validateProfile(entry.profile, spec);
    const file = L.inside(ROOT, entry.png), proof = L.read(path.join(path.dirname(file), 'verification.json'));
    const sha256 = await L.hash(file);
    assert.ok(proof.passed && proof.modelId === spec.id); assert.equal(proof.hashes['card.png'], sha256);
    media.push({ id: spec.id, url: entry.pngUrl, sha256 });
  }
  const protectedPaths = [D.CATALOGUE, path.join(L.DATA, 'references.json'), path.join(L.DATA, 'regression.json'),
    path.join(ROOT, 'V4/atelier/designer-assets/manifest.json'), path.join(__dirname, 'set.json'),
    ...media.map(m => path.join(ROOT, 'V4/creations', m.id, 'card.png'))];
  const before = new Map(); for (const file of protectedPaths) before.set(file, await L.hash(file));
  const origin = new URL(L.read(path.join(L.DATA, 'runtime.json')).url).origin;
  const address = new URL(origin);
  assert.ok(address.protocol === 'http:' && ['127.0.0.1', 'localhost', '[::1]'].includes(address.hostname), 'Serveur loopback requis.');
  const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(runtime, '__nier_set02_browser__.cjs'))('playwright');
  const report = { passed: false, mode: 'fresh-ephemeral-browser-get-only-local-server', origin, stage: 'launch',
    startedAt: new Date().toISOString(), collection: [], profiles: [], statistics: [], layouts: [], screenshots: [],
    media: [], errors: [], badResponses: [], blockedRequests: [], preservedSources: false };
  fs.mkdirSync(output, { recursive: true });
  let browser, context, page, failure;
  try {
    browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
    context = await browser.newContext({ viewport: viewports[0], reducedMotion: 'reduce', serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const request = route.request();
      if (new URL(request.url()).origin === origin && request.method() === 'GET') return route.continue();
      report.blockedRequests.push({ method: request.method(), url: request.url() }); return route.abort('blockedbyclient');
    });
    context.on('page', p => {
      p.on('pageerror', e => report.errors.push(e.message));
      p.on('response', r => { if (r.status() >= 400) report.badResponses.push({ status: r.status(), url: r.url() }); });
    });
    page = await context.newPage(); page.setDefaultTimeout(20000);
    const capture = async name => {
      await imagesReady(page);
      const observed = await layout(page, name); report.layouts.push(observed);
      await page.screenshot({ path: path.join(output, name + '.png') }); report.screenshots.push(name + '.png');
      assert.deepEqual(observed.issues, [], name + ': debordement du viewport.');
    };
    let data;
    for (const viewport of viewports) {
      report.stage = 'collection-' + viewport.width;
      await page.setViewportSize(viewport); await navigate(page, origin + '/jeu/#collection');
      const ownership = await page.evaluate(() => {
        const paris = KALISTAR_DB.registry.owned('user-paris'), tokyo = KALISTAR_DB.registry.owned('user-tokyo');
        return { cards: KALISTAR_DATA.cards.length, paris: paris.length, tokyo: tokyo.length,
          originals: paris.every(c => c.ownerId === 'user-paris' && c.status === 'owned' && c.legacyInstanceId === 'K4-' + c.cardId + '-001'),
          uniqueModels: new Set(paris.map(c => c.cardId)).size, uniqueCopies: new Set(paris.map(c => c.id)).size };
      });
      assert.deepEqual(ownership, { cards: 57, paris: 57, tokyo: 0, originals: true, uniqueModels: 57, uniqueCopies: 57 });
      report.ownership = ownership;
      data = await page.evaluate(() => KALISTAR_DATA);
      assert.deepEqual(data.cards.filter(c => c.faction === 'NieR').map(c => c.id).sort(), expectedIds);
      for (const spec of set.cards) {
        const card = data.cards.find(c => c.id === spec.id); assert.ok(card);
        for (const field of ['name', 'title', 'race', 'element', 'positions', 'role']) assert.deepEqual(card[field], spec[field]);
      }
      const barret = data.cards.find(c => c.id === '43698921'); assert.equal(barret?.name, 'BARRET'); assert.equal(barret.race, 'CYBORG');
      report.barret = { id: barret.id, name: barret.name, race: barret.race };
      if (viewport.width === 1600) for (const expected of media) {
        const actual = await page.evaluate(async url => {
          const response = await fetch(url, { method: 'GET', cache: 'no-store' }), bytes = await response.arrayBuffer();
          const hash = await crypto.subtle.digest('SHA-256', bytes);
          return { status: response.status, contentType: response.headers.get('content-type'), bytes: bytes.byteLength,
            sha256: [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, '0')).join('') };
        }, expected.url);
        assert.equal(actual.status, 200); assert.ok(actual.contentType?.startsWith('image/png')); assert.equal(actual.sha256, expected.sha256);
        report.media.push({ ...expected, ...actual });
      }
      await collection(page, report, capture);
      if (viewport.width === 1600) await profiles(page, data, report, capture);
      report.stage = 'statistics-' + viewport.width; await statistics(page, report, capture);
    }
    assert.equal(report.profiles.length, 6); assert.equal(report.media.length, 6);
    assert.deepEqual(report.errors, []); assert.deepEqual(report.badResponses, []); assert.deepEqual(report.blockedRequests, []);
  } catch (error) {
    failure = error; report.error = error.stack || error.message;
    if (page && !page.isClosed()) {
      try { await page.screenshot({ path: path.join(output, 'failure.png') }); report.screenshots.push('failure.png'); } catch (_) { /* Preserve the original failure. */ }
    }
  } finally {
    for (const resource of [context, browser]) {
      try { if (resource) await resource.close(); }
      catch (error) { failure ||= error; (report.cleanupErrors ||= []).push(error.stack || error.message); }
    }
    try {
      for (const [file, hash] of before) assert.equal(await L.hash(file), hash, 'Source modifiee pendant le test : ' + file);
      report.preservedSources = true;
    } catch (error) { failure ||= error; report.cleanupError = error.stack || error.message; }
    report.passed = !failure; report.finishedAt = new Date().toISOString();
    L.write(path.join(output, 'report.json'), report);
  }
  if (failure) throw failure;
  return report;
}
module.exports = { main };
if (require.main === module) {
  if (process.argv.length !== 2) { console.error('Usage: node browser.test.cjs'); process.exitCode = 1; }
  else main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
