'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = createRequire(path.join(process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE,
  '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'), '__arena_viewport__.cjs'));
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const out = path.resolve(process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, '../../work/qa/performance-20261020/arena'));
const base = 'https://arena-viewport.invalid';
const useSource = process.env.KALISTAR_TEST_SOURCE === '1';
assert(!(useSource && process.env.KALISTAR_DIST), 'Use KALISTAR_DIST for an exact frozen build, or KALISTAR_TEST_SOURCE=1 for local CSS, not both');
const css = new Set(['arena.css', 'mobile.css', 'navigation.css', 'journey-game.css']);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.mp4': 'video/mp4' };
const profiles = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'razr', width: 412, height: 1007, mobile: true },
  { name: 'landscape', width: 1007, height: 412, mobile: true },
  { name: 'compact-landscape', width: 844, height: 390, mobile: true },
  { name: 'compact', width: 320, height: 568, mobile: true },
  { name: 'razr-safe', width: 412, height: 1007, mobile: true, safe: { top: 24, bottom: 24, left: 0, right: 0 } },
  { name: 'landscape-safe', width: 1007, height: 412, mobile: true, safe: { top: 0, bottom: 16, left: 32, right: 32 } }
].filter(p => !process.env.KALISTAR_VIEWPORT_PROFILE || process.env.KALISTAR_VIEWPORT_PROFILE.split(',').includes(p.name));
const results = [], errors = [];
async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY);
  if (await page.locator('.li-skip').isVisible()) await page.locator('.li-skip').click();
  await page.locator('.lineup-intro').waitFor({ state: 'detached' });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function load(page, state) {
  await page.evaluate(async state => {
    await KALISTAR_DB.idle();
    await KALISTAR_DB.saveGame(state);
    localStorage.setItem('kalistar.v4.game', JSON.stringify(state));
  }, state);
  await page.reload();
  await ready(page);
}
async function geometry(page, label) {
  const value = await page.evaluate(() => {
    const box = node => {
      if (!node) return null;
      const r = node.getBoundingClientRect();
      return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height,
        scrollWidth: node.scrollWidth, scrollHeight: node.scrollHeight, clientWidth: node.clientWidth, clientHeight: node.clientHeight };
    };
    const exit = document.querySelector('.arena-toolbar [data-action=exit-arena]');
    const r = exit.getBoundingClientRect();
    return { viewport: [innerWidth, innerHeight], root: box(document.documentElement), app: box(document.querySelector('#app')),
      shell: box(document.querySelector('.game-shell')), layout: box(document.querySelector('.arena-layout')),
      board: box(document.querySelector('.battlefield-viewport')), exit: box(exit),
      exitHit: exit.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)),
      navVisible: !!document.querySelector('.main-nav').getClientRects().length,
      headerVisible: !!document.querySelector('.masthead').getClientRects().length,
      cards: [...document.querySelectorAll('.formation .slot-card')].map(box),
      inspect: [...document.querySelectorAll('.formation .inspect')].map(box),
      dock: box(document.querySelector('.arena-reference-dock')),
      console: box(document.querySelector('.duel-console')), finale: !!document.querySelector('.arena-finale'),
      stripVisible: !!document.querySelector('.journey-arena-strip')?.getClientRects().length };
  });
  results.push({ label, ...value });
  fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: false, results, errors }, null, 2));
  await page.screenshot({ path: path.join(out, label + '.png'), scale: 'css' });
  assert(!value.navVisible && !value.headerVisible, label + ': general navigation hidden');
  assert(value.exitHit && value.exit.width >= 38 && value.exit.height >= 38, label + ': visible clickable exit');
  assert(value.exit.x >= 0 && value.exit.right <= value.viewport[0] && value.exit.y >= 0 && value.exit.bottom <= value.viewport[1], label + ': exit in viewport');
  for (const name of ['root', 'app', 'shell']) {
    const r = value[name];
    assert(r.scrollWidth <= r.clientWidth + 1, label + ': no horizontal overflow in ' + name);
    assert(r.scrollHeight <= r.clientHeight + 1, label + ': no vertical overflow in ' + name);
  }
  if (!value.finale) {
    assert(value.board.scrollHeight <= value.board.clientHeight + 1, label + ': board fits vertically');
    assert(value.board.scrollWidth <= value.board.clientWidth + 1, label + ': board fits horizontally');
    for (const r of value.cards) assert(r.x >= -1 && r.right <= value.viewport[0] + 1 && r.y >= -1 && r.bottom <= value.viewport[1] + 1, label + ': card contained');
    assert(value.console.bottom <= value.viewport[1] + 1, label + ': console contained');
    const dock = value.dock;
    if (dock?.width && dock?.height) for (const r of [...value.cards, ...value.inspect]) {
      assert(r.right <= dock.x + 1 || r.x >= dock.right - 1 || r.bottom <= dock.y + 1 || r.y >= dock.bottom - 1,
        label + ': reference dock does not cover a card or its inspection control');
    }
  }
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const browser = await runtime('playwright').chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const profile of profiles) {
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height },
        isMobile: !!profile.mobile, hasTouch: !!profile.mobile, reducedMotion: 'reduce', serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.origin !== base) { errors.push('Unexpected network: ' + url.origin); return route.abort(); }
        let relative = decodeURIComponent(url.pathname).slice(1);
        if (relative.endsWith('/')) relative += 'index.html';
        const name = path.basename(relative);
        const source = useSource && relative === 'jeu/' + name && css.has(name);
        const root = source ? __dirname : dist;
        const file = path.resolve(root, source ? name : relative);
        if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
          errors.push('Missing asset: ' + relative); return route.fulfill({ status: 404, body: 'Missing QA asset' });
        }
        return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
      });
      await context.addInitScript(() => {
        const open = IDBFactory.prototype.open;
        IDBFactory.prototype.open = function(name, version) {
          return version === undefined ? open.call(this, name + '-arena-viewport-qa') : open.call(this, name + '-arena-viewport-qa', version);
        };
      });
      const page = await context.newPage();
      if (profile.safe) {
        const cdp = await context.newCDPSession(page);
        await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: profile.safe });
      }
      page.setDefaultTimeout(15000);
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(base + '/jeu/#arena');
      await ready(page);
      const states = await page.evaluate(() => {
        const E = KalistarEngine.createEngine(KALISTAR_DATA);
        const team = KalistarTeamComposition.create(E).fromPreset({ name: 'Viewport QA', cards: KALISTAR_DATA.decks.player });
        const s = E.newGame(team, team, { seed: 'ARENA-VIEWPORT-QA', mode: 'local', turnOrder: 'ABBA' });
        const states = { setup: E.clone(s) };
        E.rollInitiative(s, [6, 1]); states.choose = E.clone(s);
        for (let i = 0; i < 4000 && s.phase !== 'over'; i++) {
          if (s.phase === 'result') states.result ??= E.clone(s);
          if (s.phase === 'choose') E.lock(s, ...E.aiChoice(s));
          else if (s.phase === 'attack') E.rollAttack(s);
          else if (s.phase === 'kalistel') E.acceptAttack(s);
          else if (s.phase === 'defense') E.rollDefense(s);
          else if (s.phase === 'result') E.next(s);
          else if (s.phase === 'replace') E.autoDeploy(s, s.replacing);
          else { const k = { clover: 'Clover', potion: 'Potion', physical: 'Physical', heart: 'Reraise', guard: 'Guard' }[s.phase]; E['grant' + k](s, E['ai' + k + 'Choice'](s)); }
        }
        E.assertState(s); states.over = E.clone(s); return states;
      });
      assert.equal(states.over.phase, 'over');
      await load(page, states.setup); await geometry(page, profile.name + '-setup');
      if (profile.safe) {
        const app = results.at(-1).app;
        assert.equal(app.x, profile.safe.left, 'left safe area');
        assert.equal(app.y, profile.safe.top, 'top safe area');
        assert.equal(app.right, profile.width - profile.safe.right, 'right safe area');
        assert.equal(app.bottom, profile.height - profile.safe.bottom, 'bottom safe area');
      }
      await load(page, states.choose); await geometry(page, profile.name + '-choose');
      await page.locator('.team-left .slot-card').first().click({ position: { x: 5, y: 5 } });
      await page.locator('.team-right .slot-card').first().click({ position: { x: 5, y: 5 } });
      await geometry(page, profile.name + '-selection');
      await load(page, states.result); await geometry(page, profile.name + '-result');
      {
        await page.locator('[data-action=arena-menu]').click();
        await page.locator('#mobile-dialog[open]').waitFor();
        for (const action of ['duel-details', 'match-stats', 'journal', 'fullscreen', 'rules', 'save-game', 'load-game', 'new-game']) {
          const button = page.locator('#mobile-dialog [data-action=' + action + ']');
          assert(await button.isEnabled(), action + ': enabled in arena menu');
          await button.scrollIntoViewIfNeeded();
          assert(await button.evaluate(node => {
            const r = node.getBoundingClientRect();
            return node.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2));
          }), action + ': reachable in arena menu');
        }
        await page.locator('#mobile-dialog [data-action=fullscreen]').scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(out, profile.name + '-menu-fullscreen.png'), scale: 'css' });
        await page.locator('#mobile-dialog [data-action=close]').first().click();
        await page.locator('.arena-toolbar [data-action=exit-arena]').click();
        await page.locator('body.collection-view').waitFor();
        assert(await page.locator('.main-nav').isVisible(), 'navigation restored after exit');
        await page.locator('.main-nav [data-view=arena]').click();
        await page.locator('.battlefield').waitFor();
        // Use the real arena command, not a synthetic fullscreen class.
        await page.locator('[data-action=arena-menu]').click();
        await page.locator('#mobile-dialog [data-action=fullscreen]').click();
        await page.waitForFunction(() => !!document.fullscreenElement);
        await ready(page);
        await geometry(page, profile.name + '-fullscreen');
        await page.evaluate(async () => { if (document.fullscreenElement) await document.exitFullscreen(); });
        await ready(page);
        await geometry(page, profile.name + '-resume');
        assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId), states.result.matchId);
        if (profile.name === 'razr') {
          await page.setViewportSize({ width: 1007, height: 412 }); await ready(page);
          await geometry(page, 'razr-rotated-landscape');
          await page.setViewportSize({ width: 412, height: 1007 }); await ready(page);
          await geometry(page, 'razr-rotated-portrait');
        }
      }
      const journey = structuredClone(states.choose);
      journey.journey = { version: 1, attemptId: 'viewport-preview', bookId: 'momo-petits-bonheurs', stage: 0, revision: 1, sequence: 1, preview: true };
      await load(page, journey); await geometry(page, profile.name + '-fragment-preview');
      await load(page, states.over); await page.locator('.arena-finale').waitFor();
      await geometry(page, profile.name + '-finale');
      await page.locator('.finale-actions [data-action=match-stats]').scrollIntoViewIfNeeded();
      await page.locator('.finale-actions [data-action=match-stats]').click();
      await page.locator('#match-dialog[open]').waitFor();
      await page.locator('#match-dialog [data-action=close]').first().click();
      {
        await page.locator('.arena-toolbar [data-action=exit-arena]').click();
        await page.locator('body.collection-view').waitFor();
        assert(await page.locator('.main-nav').isVisible(), 'navigation restored after finale');
      }
      await context.close();
      console.log('PASS ' + profile.name);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ passed: true,
      sourceCSS: useSource ? [...css] : [], runtime: dist, fragment: 'Disposable admin-preview fixture; no cloud progression', results, errors }, null, 2));
    console.log(JSON.stringify({ passed: true, profiles: profiles.length, snapshots: results.length, errors }));
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
