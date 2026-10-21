'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { createHash } = require('node:crypto');
const entries = require('./arenas.json');
const media = require('./media.json');
const root = path.resolve(__dirname, '../../..');
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(root, 'V4/deploy/dist'));
const out = path.resolve(process.env.KALISTAR_VERIFICATION_DIR || path.join(root, 'work/qa/arenas-20261021'));
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '_arena-review.cjs'))('playwright');
const origin = 'https://arena-review.invalid';
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg' };
async function ready(page) {
  await page.waitForFunction(() => window.KALISTAR_READY);
  if (await page.locator('.li-skip').isVisible()) await page.locator('.li-skip').click();
  await page.locator('.lineup-intro').waitFor({ state: 'detached' });
  await page.evaluate(() => document.fonts.ready);
}
async function main() {
  fs.mkdirSync(out, { recursive: true });
  const report = { passed: false, screens: [], errors: [] };
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const profile of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'razr', width: 412, height: 1007, mobile: true }]) {
      const context = await browser.newContext({ viewport: { width: profile.width, height: profile.height }, isMobile: !!profile.mobile, hasTouch: !!profile.mobile, reducedMotion: 'reduce', serviceWorkers: 'block' });
      try {
        await context.route('**/*', route => {
          const url = new URL(route.request().url());
          if (url.origin !== origin) { report.errors.push('Unexpected network: ' + url.origin); return route.abort(); }
          let relative = decodeURIComponent(url.pathname).slice(1);
          if (relative.endsWith('/')) relative += 'index.html';
          const file = path.resolve(dist, relative);
          if (!file.startsWith(dist + path.sep) || !fs.existsSync(file)) { report.errors.push('Missing: ' + relative); return route.fulfill({ status: 404 }); }
          return route.fulfill({ path: file, contentType: mime[path.extname(file)] || 'application/octet-stream' });
        });
        const page = await context.newPage();
        page.on('pageerror', error => report.errors.push(error.message));
        await page.goto(origin + '/jeu/#decks'); await ready(page);
        await page.locator('[data-deck-action=captain][data-slot="0"]').click();
        await page.locator('#deck-builder-root .kdb-play').click();
        await page.locator('#new-game-form').waitFor();
        for (const arena of entries) {
          await page.locator('#match-arena').selectOption(arena.id);
          assert.equal(await page.locator('#match-arena-summary h3').innerText(), arena.name);
          await page.waitForFunction(() => { const i = document.querySelector('#match-arena-summary img'); return i.complete && i.naturalWidth > 1000; });
          const text = await page.locator('#match-arena-summary').innerText();
          assert(text.includes('+10 ATK / +10 DEF'));
          assert.equal(text.includes('+15 ATK'), !!arena.element);
          const width = await page.locator('#new-game-dialog .pre-match-form').evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
          assert(width.scroll <= width.client + 1, 'Lobby overflow: ' + arena.id);
          const asset = await page.evaluate(async image => Array.from(new Uint8Array(await (await fetch(KalistarSite.url(image))).arrayBuffer())), arena.image);
          assert.equal(createHash('sha256').update(Buffer.from(asset)).digest('hex'), media.find(m => m.id === arena.id).sha256);
          await page.screenshot({ path: path.join(out, profile.name + '-' + arena.id + '-lobby.png') });
        }
        await page.locator('#new-game-dialog [data-action=close]').first().click();
        for (const arena of entries) {
          const saved = await page.evaluate(async arenaId => {
            const E = KalistarEngine.createEngine(KALISTAR_DATA);
            const team = KalistarTeamComposition.create(E).fromPreset({ name: 'Arena QA', cards: KALISTAR_DATA.decks.player });
            const state = E.newGame(team, team, { arenaId, seed: 'ARENAS-20261021', mode: 'local', turnOrder: 'ABBA' });
            E.rollInitiative(state, [6, 1]);
            await KALISTAR_DB.idle(); await KALISTAR_DB.saveGame(state);
            localStorage.setItem('kalistar.v4.game', JSON.stringify(state));
            return { arenaId: state.arenaId, matchId: state.matchId };
          }, arena.id);
          await page.goto(origin + '/jeu/#arena'); await page.reload(); await ready(page);
          await page.locator('.game-shell').waitFor();
          const rendered = await page.evaluate(() => {
            const el = document.querySelector('.game-shell');
            return { background: getComputedStyle(el).getPropertyValue('--arena-image'), width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewport: [innerWidth, innerHeight], state: JSON.parse(localStorage.getItem('kalistar.v4.game')), cards: document.querySelectorAll('.formation .slot-card').length };
          });
          assert(rendered.background.includes(arena.id + '.webp'));
          assert(rendered.width <= rendered.viewport[0] + 1 && rendered.height <= rendered.viewport[1] + 1, 'Arena overflow: ' + arena.id);
          assert.equal(rendered.cards, 10);
          assert.equal(rendered.state.arenaId, saved.arenaId); assert.equal(rendered.state.matchId, saved.matchId);
          await page.screenshot({ path: path.join(out, profile.name + '-' + arena.id + '-combat.png') });
          report.screens.push({ profile: profile.name, arena: arena.id, imageHash: true, bonusText: true, overflow: false, restored: true });
        }
      } finally { await context.close(); }
    }
    assert.deepEqual(report.errors, []); report.passed = true;
  } catch (error) { report.failure = error.stack; process.exitCode = 1; }
  finally { await browser.close(); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2)); console.log(JSON.stringify(report)); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
