'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const {createRequire} = require('node:module');
const ROOT = path.resolve(__dirname, '../../..');
const OUTPUT = path.join(__dirname, 'qa/browser');
const read = file => JSON.parse(fs.readFileSync(file, 'utf8').replace(/^\uFEFF/, ''));
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const hash = file => digest(fs.readFileSync(file));
const relative = file => path.relative(ROOT, file).replaceAll('\\', '/');
const VIEWPORTS = [{width:1600, height:1000}, {width:390, height:844}];
const PROFILE_FIELDS = ['name','title','job','element','race','weapon','faction','positions',
  'atk','defense','magic','barriers','role','characterId'];

function gameUrl(value) {
  const url = new URL(value);
  assert(['http:', 'https:'].includes(url.protocol), 'HTTP(S) review URL required');
  assert(!url.username && !url.password, 'Credentials are not allowed in the review URL');
  url.search = ''; url.hash = '';
  if (/\/jeu(?:\/(?:index\.html)?)?$/.test(url.pathname)) {
    url.pathname = url.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  } else {
    url.pathname = url.pathname.replace(/\/index\.html$/, '/').replace(/\/?$/, '/') + 'jeu/';
  }
  url.hash = 'collection';
  return url;
}

function publicationInputs() {
  const set = read(path.join(__dirname, 'set.json'));
  assert.equal(set.cards.length, 11);
  assert.equal(set.presets.length, 2);
  assert.equal(set.arenas.length, 2);
  const protectedFiles = new Set([
    path.join(ROOT, 'V4/donnees/catalogue.json'),
    path.join(ROOT, 'V4/atelier/data/references.json'),
    path.join(ROOT, 'V4/donnees/arenes-collaborations.json'),
    path.join(__dirname, 'set.json')
  ]);
  const cards = set.cards.map(spec => {
    const source = path.join(__dirname, 'cards', spec.key);
    const target = path.join(ROOT, 'V4/creations', spec.id);
    for (const name of ['profile.json', 'card.png', 'illustration.png']) {
      const a = path.join(source, name), b = path.join(target, name);
      assert(fs.existsSync(a) && fs.existsSync(b), 'Publish locally first: ' + spec.key + '/' + name);
      assert.equal(hash(a), hash(b), 'Local publication differs: ' + spec.key + '/' + name);
      protectedFiles.add(a); protectedFiles.add(b);
    }
    return {...spec, profile:read(path.join(target, 'profile.json')),
      file:path.join(target, 'card.png'), sha256:hash(path.join(target, 'card.png'))};
  });
  const kaylisRevision = path.join(ROOT, 'V4/revisions/2026-09-25-kaylis-training');
  const kaylis = path.join(ROOT, 'V4/creations/49055457');
  const proof = read(path.join(kaylisRevision, 'final-check.json'));
  const art = read(path.join(kaylisRevision, 'art/provenance.json'));
  assert.equal(proof.state, 'published', 'Latest Kaylis revision is not locally published');
  assert.equal(hash(path.join(kaylis, 'card.png')), proof.hashes['card.png'], 'Old Kaylis native PNG');
  assert.equal(hash(path.join(kaylis, 'illustration.png')), art.selectedSha256, 'Old Kaylis illustration');
  for (const file of ['card.png','illustration.png','profile.json']) protectedFiles.add(path.join(kaylis, file));
  protectedFiles.add(path.join(kaylisRevision, 'final-check.json'));
  protectedFiles.add(path.join(kaylisRevision, 'art/provenance.json'));
  cards.push({key:'kaylis-latest', id:'49055457', profile:read(path.join(kaylis, 'profile.json')),
    file:path.join(kaylis, 'card.png'), sha256:proof.hashes['card.png']});
  const arenas = set.arenas.map(id => {
    const source = path.join(__dirname, 'arenas', id + '.png');
    const file = path.join(ROOT, 'V4/site/assets/arenes', id + '.png');
    assert.equal(hash(source), hash(file), 'Arena not installed: ' + id);
    protectedFiles.add(source); protectedFiles.add(file);
    return {id, file, sha256:hash(file)};
  });
  const flag = path.join(ROOT, 'V4/site/assets/factions/FF10.png');
  const flagSource = path.join(__dirname, 'flag-FF10.png');
  assert.equal(hash(flag), hash(flagSource), 'Native FF10 flag not installed');
  protectedFiles.add(flag); protectedFiles.add(flagSource);
  return {set, cards, arenas, flag:{file:flag, sha256:hash(flag)},
    before:Object.fromEntries([...protectedFiles].map(file => [file, hash(file)]))};
}

async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  await page.waitForFunction(() => [...document.images].filter(img => {
    const r = img.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < innerHeight
      && r.right > 0 && r.left < innerWidth && getComputedStyle(img).visibility !== 'hidden';
  }).every(img => img.complete && img.naturalWidth > 0 && !img.src.includes('#v4-')));
  assert.equal(await page.locator('[data-v4-media-error]').count(), 0, 'Card-media crop failed');
}

async function layout(page, label) {
  const result = await page.evaluate(() => ({width:innerWidth, height:innerHeight,
    scrollWidth:document.documentElement.scrollWidth, scrollHeight:document.documentElement.scrollHeight}));
  assert(result.scrollWidth <= result.width + 1, label + ': horizontal viewport overflow');
  assert(result.scrollHeight <= result.height + 1, label + ': vertical viewport overflow');
  return result;
}

async function mediaUrl(page, value) {
  return page.evaluate(value => new URL(window.KalistarSite?.url(value) || value, location.href).href, value);
}

async function verifyRaw(page, url, expected, sharp, dimensions) {
  assert.equal(new URL(url).origin, new URL(page.url()).origin, 'Cross-origin media is forbidden');
  const response = await page.request.get(url, {maxRedirects:0, timeout:30000});
  assert.equal(response.status(), 200, 'GET ' + url);
  const bytes = await response.body();
  assert.equal(digest(bytes), expected, 'Raw image mismatch: ' + url);
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.format, 'png', 'Expected native PNG: ' + url);
  if (dimensions) assert.deepEqual([meta.width, meta.height], dimensions, 'Native card dimensions');
  return {url, sha256:expected, bytes:bytes.length, width:meta.width, height:meta.height};
}

async function verifyCatalogue(page, input) {
  const data = await page.evaluate(() => structuredClone(window.KALISTAR_DATA));
  assert.equal(data.cards.length, 100, 'Expected 89 previous cards plus 11 FF10 cards');
  assert.equal(new Set(data.cards.map(c => c.id)).size, 100, 'Duplicate model IDs');
  assert.equal(data.arenas.length, 25, 'Expected 23 previous arenas plus two FF10 arenas');
  const ff10 = data.cards.filter(c => c.faction === 'FF10');
  assert.deepEqual(ff10.map(c => c.id).sort(), input.set.cards.map(c => c.id).sort());
  for (const expected of input.cards) {
    const actual = data.cards.find(c => c.id === expected.id);
    assert(actual, 'Missing model: ' + expected.id);
    assert.equal(actual.edition, 'V4');
    for (const field of PROFILE_FIELDS) {
      assert.deepEqual(actual[field], expected.profile[field], expected.key + ': ' + field);
    }
    assert.equal(actual.description, expected.profile.description, expected.key + ': description');
  }
  const presets = await page.evaluate(ids => {
    const engine = KalistarEngine.createEngine(KALISTAR_DATA);
    return ids.map(id => {
      const preset = KALISTAR_DATA.decks.presets.find(p => p.id === id);
      return preset ? {...preset, errors:engine.validatePlayableDeck(preset.cards),
        coverage:engine.deckCoverage(preset.cards), lineup:engine.lineup(preset.cards)} : null;
    });
  }, input.set.presets.map(p => p.id));
  for (let i = 0; i < presets.length; i++) {
    const preset = presets[i], expected = input.set.presets[i];
    assert(preset, 'Missing FF10 preset: ' + expected.id);
    assert.deepEqual(preset.cards, expected.characters.map(key => input.set.cards.find(c => c.key === key).id));
    assert.deepEqual(preset.errors, [], preset.id + ': playable-deck validation');
    assert(preset.lineup?.length === 5 && Object.values(preset.coverage).every(n => n >= 2));
  }
  const collaboration = await page.evaluate(() => ({
    entry:KalistarCollaborations.entries.find(e => e.id === 'ff10'),
    matched:KALISTAR_DATA.cards.filter(c => KalistarCollaborations.matches(c, 'ff10')).map(c => c.id)
  }));
  assert.equal(collaboration.entry?.faction, 'FF10', 'FF10 collaboration not registered');
  assert.equal(collaboration.matched.length, 11);
  return {data, presets, collaboration};
}

async function verifyFaction(page, out, viewport, data) {
  const direct = page.locator('[data-binder-action="scope"][data-id="ff10"]');
  const grouped = page.locator('[data-binder-action="scope"][data-id="final-fantasy"]');
  let scope;
  if (await direct.count()) {
    await direct.click(); scope = 'ff10';
    assert.match(await page.locator('.cb-count').innerText(), /10 personnages.*11 versions/);
  } else {
    assert.equal(await grouped.count(), 1, 'Neither FF10 nor Final Fantasy scope is available');
    await grouped.click(); scope = 'final-fantasy';
    // The published UI groups FF universes; a faction filter must still expose all eleven.
    await page.locator('[data-binder-action="filters"]').click();
    await page.locator('[data-binder-filter="faction"]').selectOption('FF10');
    await page.locator('.cb-overlay[open] [data-binder-action="close-overlay"]').first().click();
    assert.match(await page.locator('.cb-count').innerText(), /10 personnages.*11 versions/,
      'Published Final Fantasy universe omits FF10: update its scope predicate, not this test');
  }
  await ready(page);
  const ids = await page.locator('.cb-card').evaluateAll(nodes => nodes.map(n => n.dataset.id));
  assert(ids.length > 0 && ids.every(id => data.cards.find(c => c.id === id)?.faction === 'FF10'));
  const view = await layout(page, 'FF10 collection');
  await page.screenshot({path:path.join(out, 'ff10-collection-' + viewport.width + '.png'), animations:'disabled'});
  await page.locator('[data-binder-action="scope"][data-id="catalogue"]').first().click();
  const reset = page.locator('[data-binder-action="reset"]:visible');
  if (await reset.count()) await reset.first().click();
  return {scope, visibleIds:ids, layout:view};
}

async function compareDisplayedPixels(page, url) {
  return page.evaluate(async url => {
    const hero = document.querySelector('.cb-hero-image');
    const rect = KalistarCardMedia.crop;
    if (!hero || hero.naturalWidth !== rect.width || hero.naturalHeight !== rect.height) {
      throw Error('Reader does not display the native card crop');
    }
    const native = new Image(); native.src = url; await native.decode();
    const canvas = document.createElement('canvas');
    canvas.width = rect.width; canvas.height = rect.height;
    const ctx = canvas.getContext('2d', {willReadFrequently:true});
    ctx.drawImage(native, rect.left, rect.top, rect.width, rect.height, 0, 0, rect.width, rect.height);
    const expected = ctx.getImageData(0, 0, rect.width, rect.height).data;
    ctx.clearRect(0, 0, rect.width, rect.height);
    ctx.drawImage(hero, 0, 0);
    const actual = ctx.getImageData(0, 0, rect.width, rect.height).data;
    let delta = 0;
    for (let i = 0; i < expected.length; i += 4) {
      delta += Math.abs(expected[i] - actual[i]) + Math.abs(expected[i+1] - actual[i+1])
        + Math.abs(expected[i+2] - actual[i+2]);
    }
    return {width:rect.width, height:rect.height, meanAbsoluteRGBDelta:delta / (rect.width * rect.height * 3),
      source:hero.currentSrc.startsWith('blob:') ? 'browser-cropped-blob' : hero.currentSrc};
  }, url);
}

async function verifyCard(page, expected, card, sharp, out, viewport) {
  await page.locator('[data-binder-field="search"]').fill(expected.id);
  const pocket = page.locator('.cb-card[data-id="' + expected.id + '"]');
  await pocket.waitFor({state:'visible'});
  await pocket.click(); await ready(page);
  assert.equal((await page.locator('.cb-card-heading h2').textContent()).trim(), expected.profile.name);
  assert.equal((await page.locator('.cb-card-heading p').textContent()).trim(), expected.profile.title);
  const download = page.locator('.cb-visual a[download]');
  const url = await mediaUrl(page, card.pngUrl);
  assert.equal(await download.evaluate(a => a.href), url, 'Reader points to wrong native card');
  const raw = await verifyRaw(page, url, expected.sha256, sharp, [897,1497]);
  const pixels = await compareDisplayedPixels(page, url);
  assert(pixels.meanAbsoluteRGBDelta < 6, expected.key + ': displayed card does not match native PNG');
  const dimensions = await layout(page, expected.key + ': collection reader');
  await page.screenshot({path:path.join(out, expected.key + '-' + viewport.width + '.png'), animations:'disabled'});
  const notes = page.locator('[data-binder-action="pane"][data-id="notes"]');
  if (await notes.isVisible()) await notes.click();
  await page.locator('[data-binder-action="tab"][data-id="profile"]').click();
  await ready(page);
  assert.equal(await page.locator('.cb-faces tbody td').count(), 12, 'Six ATK and six DEF faces required');
  assert.equal((await page.locator('.cb-identity b').first().textContent()).trim(), expected.profile.faction);
  const faces = await page.locator('.cb-faces tbody tr').evaluateAll(rows => rows.map(row =>
    [...row.querySelectorAll('td')].map(cell => ({
      value:cell.querySelector('img')?.alt || cell.textContent.trim(),
      magic:cell.classList.contains('is-magic')
    }))));
  const effect = {guard:'Garde', mana:'Potion', revive:'Reraise', death:'Mort',
    dodge:'Esquive', buff_atk:'Puissance physique'};
  const expectedFaces = ['atk','defense'].map((side, row) => expected.profile[side].map((value, i) => ({
    value:typeof value === 'number' ? value.toLocaleString('fr-FR') : value === 'retry'
      ? row ? 'Relance' : 'Tr\u00e8fle' : effect[value],
    magic:expected.profile[row ? 'barriers' : 'magic'].includes(6-i)
  })));
  assert.deepEqual(faces, expectedFaces, expected.key + ': displayed numerical/effect faces');
  assert((await page.locator('.cb-weapon').innerText()).includes(expected.profile.weapon));
  await layout(page, expected.key + ': card profile');
  await page.locator('[data-binder-action="back"]').click();
  return {id:expected.id, key:expected.key, viewport, raw, pixels, faces, layout:dimensions};
}

async function verifyDecksAndArenas(page, input, data, sharp, out, viewport) {
  await page.locator('[data-view="decks"]').first().click();
  await page.locator('#deck-builder-root').waitFor();
  const presets = [];
  for (const spec of input.set.presets) {
    const expected = data.decks.presets.find(p => p.id === spec.id);
    const option = page.locator('#deck-preset option[value="' + spec.id + '"]');
    assert.equal(await option.count(), 1, 'Missing preset selector: ' + spec.id);
    assert.equal(await option.isDisabled(), false, 'Invalid preset in UI: ' + spec.id);
    await page.locator('#deck-preset').selectOption(spec.id);
    await page.locator('[data-action="load-preset"]').click();
    await page.waitForFunction(ids => JSON.stringify([...document.querySelectorAll(
      '#deck-builder-root [data-deck-slot]')].map(n => n.dataset.deckPreview)) === JSON.stringify(ids), expected.cards);
    await ready(page);
    assert.equal(await page.locator('#deck-builder-root .kdb-play').isEnabled(), true);
    const dimensions = await layout(page, spec.id);
    await page.screenshot({path:path.join(out, spec.id + '-' + viewport.width + '.png'), animations:'disabled'});
    presets.push({id:spec.id, cards:expected.cards, layout:dimensions});
  }
  await page.locator('#deck-builder-root .kdb-play').click();
  await page.locator('#new-game-dialog[open]').waitFor();
  const arenas = [];
  for (const expected of input.arenas) {
    const arena = data.arenas.find(a => a.id === expected.id);
    assert(arena, 'Arena missing: ' + expected.id);
    const radio = page.locator('#new-game-dialog input[name="arena"][value="' + expected.id + '"]');
    assert.equal(await radio.count(), 1, 'Arena missing from selector: ' + expected.id);
    await radio.check({force:true});
    assert.equal(await radio.isChecked(), true);
    const image = radio.locator('..').locator('img');
    await page.waitForFunction(id => {
      const img = document.querySelector('#new-game-dialog input[value="' + id + '"]')?.closest('label')?.querySelector('img');
      return img?.complete && img.naturalWidth > 0;
    }, expected.id);
    const url = await mediaUrl(page, arena.image);
    assert.equal(await image.evaluate(img => img.src), url);
    const raw = await verifyRaw(page, url, expected.sha256, sharp);
    if (await page.locator('#match-arena-summary h3').count()) {
      assert.equal(await page.locator('#match-arena-summary h3').innerText(), arena.name);
    }
    arenas.push({id:expected.id, raw, selected:true});
  }
  await page.screenshot({path:path.join(out, 'ff10-arena-selector-' + viewport.width + '.png'), animations:'disabled'});
  await page.locator('#new-game-dialog [data-action="close"]').first().click();
  return {presets, arenas};
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const out = path.join(OUTPUT, stamp);
  fs.mkdirSync(out, {recursive:true});
  const report = {passed:false, startedAt:new Date().toISOString(), views:[], screens:[],
    errors:[], httpFailures:[], blockedRequests:[], mode:'Fresh non-persistent contexts; same-origin GET only; real browser storage untouched'};
  let browser, input;
  try {
    input = publicationInputs();
    const target = gameUrl(process.env.KALISTAR_REVIEW_URL ||
      read(path.join(ROOT, 'V4/atelier/data/runtime.json')).url);
    report.url = target.href;
    const modules = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE,
      '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const dependency = createRequire(path.join(modules, '_ff10_review.cjs'));
    const {chromium} = dependency('playwright'), sharp = dependency('sharp');
    browser = await chromium.launch({channel:'chrome', headless:true});
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({viewport, isMobile:viewport.width < 500,
        hasTouch:viewport.width < 500, reducedMotion:'reduce', serviceWorkers:'block'});
      try {
        await context.route('**/*', route => {
          const request = route.request(), url = new URL(request.url());
          if (request.method() === 'GET' && (url.origin === target.origin || ['blob:', 'data:'].includes(url.protocol))) {
            return route.continue();
          }
          report.blockedRequests.push({method:request.method(), url:request.url()});
          return route.abort();
        });
        const page = await context.newPage(); page.setDefaultTimeout(30000);
        page.on('pageerror', error => report.errors.push({viewport, message:error.message}));
        page.on('response', response => {
          if (response.status() >= 400) report.httpFailures.push({status:response.status(), url:response.url()});
        });
        await page.goto(target.href); await ready(page);
        const {data, presets, collaboration} = await verifyCatalogue(page, input);
        const faction = await verifyFaction(page, out, viewport, data);
        const flagUrl = await page.evaluate(() => new URL(KalistarCollaborations.asset('factions', 'FF10'), location.href).href);
        const flag = await verifyRaw(page, flagUrl, input.flag.sha256, sharp);
        for (const expected of input.cards) {
          report.views.push(await verifyCard(page, expected, data.cards.find(c => c.id === expected.id), sharp, out, viewport));
        }
        const ui = await verifyDecksAndArenas(page, input, data, sharp, out, viewport);
        report.screens.push({viewport, cards:data.cards.length, arenas:data.arenas.length,
          online:await page.evaluate(() => !!KalistarSite.online), presets, collaboration, faction, flag, ui});
      } finally { await context.close(); }
    }
    assert.equal(report.views.length, 24);
    assert.deepEqual(report.errors, []);
    assert.deepEqual(report.httpFailures, []);
    assert.deepEqual(report.blockedRequests, []);
    report.passed = true;
  } catch (error) {
    report.failure = error.stack; process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(error => {
      report.passed = false; report.closeFailure = error.message; process.exitCode = 1;
    });
    if (input) {
      report.preservation = {files:Object.keys(input.before).length, changed:[]};
      for (const [file, before] of Object.entries(input.before)) {
        if (!fs.existsSync(file) || hash(file) !== before) report.preservation.changed.push(relative(file));
      }
      if (report.preservation.changed.length) {
        report.passed = false; report.preservationFailure = 'Protected inputs changed during review'; process.exitCode = 1;
      }
    }
    report.finishedAt = new Date().toISOString();
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUTPUT, 'latest.json'), JSON.stringify({report:relative(path.join(out, 'report.json')),
      passed:report.passed, url:report.url || null}, null, 2));
    console.log(JSON.stringify({passed:report.passed, report:path.join(out, 'report.json'),
      cardViews:report.views.length, failure:report.failure || report.preservationFailure || report.closeFailure || null}));
  }
}
module.exports = {gameUrl, publicationInputs};
if (require.main === module) main().catch(error => {console.error(error); process.exitCode = 1;});
