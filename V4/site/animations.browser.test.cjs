'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const runtime = createRequire(path.join(process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'), '__animations__.cjs'));
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const output = path.resolve(process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, '../../work/qa/performance-20261020/animations'));
const ref = process.env.KALISTAR_ANIMATIONS_REF;
const useSource = process.env.KALISTAR_TEST_SOURCE === '1' || !!ref;
const baseline = process.env.KALISTAR_ANIMATIONS_BASELINE === '1';
const label = baseline ? 'before' : 'after';
const origin = 'https://animations-qa.invalid';
const names = ['elemental-roll.js', 'arena-ambience.js', 'home-screen.js', 'home-screen.css'];
const sources = new Map(names.map(name => [name, ref ? execFileSync('git', ['show', `${ref}:V4/site/${name}`], { cwd: path.join(__dirname, '../..') }) : fs.readFileSync(path.join(useSource ? __dirname : path.join(dist, 'jeu'), name))]));
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2' };

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await runtime('playwright').chromium.launch({ channel: 'chrome', headless: true });
  const report = { label, ref: ref || (useSource ? 'working-tree' : 'dist'), dist, sources: Object.fromEntries([...sources].map(([name, bytes]) => [name, createHash('sha256').update(bytes).digest('hex')])), profiles: [] };
  try {
    for (const [name, width, height] of [['desktop', 1440, 1000], ['phone', 412, 1007]]) {
      const context = await browser.newContext({ viewport: { width, height }, isMobile: name === 'phone', hasTouch: name === 'phone', serviceWorkers: 'block' });
      await context.route('**/*', route => {
        const url = new URL(route.request().url());
        if (url.origin !== origin) return route.abort();
        const relative = decodeURIComponent(url.pathname).replace(/^\//, '');
        const file = path.resolve(dist, relative.endsWith('/') ? relative + 'index.html' : relative);
        if (!file.startsWith(dist + path.sep)) return route.abort();
        const source = useSource && relative.startsWith('jeu/') && sources.get(relative.slice(4));
        return source || fs.existsSync(file) ? route.fulfill({ body: source || fs.readFileSync(file), contentType: mime[path.extname(file)] || 'application/octet-stream' }) : route.fulfill({ status: 404, body: relative });
      });
      await context.addInitScript(() => {
        Math.random = () => 0;
        window.animationCounts = { raf: 0, dice: 0, ambience: 0, focus: 0, bounds: 0 };
        const raf = window.requestAnimationFrame;
        window.requestAnimationFrame = fn => raf.call(window, now => { animationCounts.raf++; fn(now); });
        const clear = CanvasRenderingContext2D.prototype.clearRect;
        CanvasRenderingContext2D.prototype.clearRect = function (...args) {
          if (this.canvas.closest('.dice-stage')) animationCounts.dice++;
          if (this.canvas.matches('.arena-ambience')) animationCounts.ambience++;
          if (this.canvas.matches('.element-aura')) animationCounts.focus++;
          return clear.apply(this, args);
        };
        const bounds = Element.prototype.getBoundingClientRect;
        Element.prototype.getBoundingClientRect = function () { animationCounts.bounds++; return bounds.call(this); };
      });
      const page = await context.newPage(), errors = [], samples = [];
      page.setDefaultTimeout(20000);
      page.on('pageerror', error => errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Performance.enable');
      const metrics = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m => [m.name, m.value]));
      async function sample(state, idle = false, duration = 1600) {
        await page.waitForTimeout(250);
        await page.evaluate(() => { for (const key in animationCounts) animationCounts[key] = 0; });
        const before = await metrics();
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.start');
        await page.waitForTimeout(duration);
        const { profile } = await cdp.send('Profiler.stop');
        const after = await metrics();
        const activity = await page.evaluate(() => ({ ...animationCounts, runningCSS: document.getAnimations().filter(a => a.playState === 'running').length, ambienceState: KalistarAmbience.inspect() }));
        const entry = { state, ...activity, elapsedMs: (after.Timestamp - before.Timestamp) * 1000, taskMs: (after.TaskDuration - before.TaskDuration) * 1000, scriptMs: (after.ScriptDuration - before.ScriptDuration) * 1000, layoutMs: (after.LayoutDuration - before.LayoutDuration) * 1000, styleMs: (after.RecalcStyleDuration - before.RecalcStyleDuration) * 1000 };
        samples.push(entry);
        fs.writeFileSync(path.join(output, `${label}-${name}-${state}.cpuprofile`), JSON.stringify(profile));
        console.log(JSON.stringify({ name, ...entry }));
        if (!baseline && idle) {
          assert.equal(activity.dice, 0, state + ': no waiting crystal paint');
          assert.equal(activity.ambience, 0, state + ': no ambience paint');
          assert.equal(activity.focus, 0, state + ': no subscribed aura paint');
          assert.equal(activity.raf, 0, state + ': no idle frame wakeup');
        }
        return entry;
      }
      const ready = async () => {
        await page.waitForFunction(() => window.KALISTAR_READY);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForTimeout(1700);
      };
      const modal = async open => page.evaluate(open => {
        if (!open) { document.querySelector('#animation-modal')?.remove(); return; }
        const dialog = document.createElement('dialog');
        dialog.id = 'animation-modal'; dialog.textContent = 'Animation QA';
        // An already-open dialog inserted in one mutation must also suspend the view.
        dialog.open = true; document.body.append(dialog);
      }, open);
      const hidden = async value => page.evaluate(value => {
        // Synthetic visibility event exercises lifecycle deterministically in headless Chrome.
        if (value) Object.defineProperty(document, 'hidden', { configurable: true, value: true });
        else delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
      }, value);
      const offscreen = async value => page.evaluate(value => {
        document.querySelector('#app').style.transform = value ? 'translateY(20000px)' : '';
      }, value);
      await page.goto(origin + '/jeu/#home'); await ready();
      await sample('home-visible');
      await page.screenshot({ path: path.join(output, `${label}-${name}-home.png`) });
      await modal(true); const homeModal = await sample('home-modal', true);
      if (!baseline) assert.equal(homeModal.runningCSS, 0, 'all Home animations pause under a dialog');
      await modal(false); await offscreen(true); const homeOffscreen = await sample('home-offscreen', true);
      if (!baseline) assert.equal(homeOffscreen.runningCSS, 0, 'all Home animations pause offscreen');
      await offscreen(false); await hidden(true); await sample('home-hidden', true); await hidden(false);
      if (!baseline) {
        await page.waitForTimeout(100);
        assert.equal(await page.locator('#home-root').getAttribute('data-home-paused'), 'false');
      }
      await page.evaluate(async () => {
        const engine = KalistarEngine.createEngine(KALISTAR_DATA), teams = KalistarTeamComposition.create(engine);
        const team = teams.fromPreset({ name: 'Animations QA', cards: KALISTAR_DATA.decks.player });
        const game = engine.newGame(team, team, { mode: 'local', seed: 'ANIMATIONS-QA', turnOrder: 'ABBA' });
        engine.rollInitiative(game, [6, 1]);
        await KALISTAR_DB.saveGame(game); localStorage.setItem('kalistar.v4.game', JSON.stringify(game));
      });
      await page.goto(origin + '/jeu/?animations=1#arena'); await ready();
      await sample('arena-idle', false, 4000);
      await page.locator('.formation[data-player="0"] .slot:not([data-element="NONE"]) .slot-card:not(.empty)').first().click();
      await page.locator('.formation[data-player="1"] .slot:not([data-element="NONE"]) .slot-card:not(.empty)').first().click();
      await page.locator('[data-action=lock]').click();
      await page.waitForSelector('.dice-stage.is-engaging');
      const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
      const pixels = async () => page.locator('.dice-stage canvas,.arena-ambience').evaluateAll(canvases => canvases.map(c => {
        const data = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
        let hash = 0, alpha = 0;
        for (let i = 0; i < data.length; i += 4) { hash = (Math.imul(hash, 31) + data[i] + data[i + 1] + data[i + 2]) >>> 0; if (data[i + 3]) alpha++; }
        return { hash, alpha };
      }));
      const first = await pixels();
      const visible = await sample('arena-visible');
      const second = await pixels();
      assert(first.length >= 3 && first.every(p => p.alpha > 0), 'visible effects are nonblank');
      assert(first.every((p, i) => p.hash !== second[i].hash), 'visible effects keep moving');
      assert(visible.dice > 0 && visible.ambience > 0 && visible.focus > 0);
      await page.screenshot({ path: path.join(output, `${label}-${name}-arena.png`) });
      await modal(true); await sample('arena-modal', true); await modal(false);
      await offscreen(true); await sample('arena-offscreen', true); await offscreen(false);
      await hidden(true); await sample('arena-hidden', true); await hidden(false);
      const resumed = await sample('arena-resumed'); assert(resumed.dice > 0 && resumed.ambience > 0 && resumed.focus > 0);
      assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')), saved, 'waiting/visibility never changes game state or RNG');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await sample('arena-reduced', true);
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => document.querySelector('.main-nav [data-view=home],.brand').click());
      await page.waitForSelector('.home-card'); await page.waitForTimeout(1300);
      const exit = await sample('home-after-arena');
      assert.equal(exit.ambienceState.running, false); assert.equal(exit.ambienceState.subscribers, 0);
      assert.equal(exit.dice, 0); assert.equal(exit.ambience, 0); assert.equal(exit.focus, 0);
      if (!baseline) {
        const preload = await page.evaluate(() => {
          const initialCards = KALISTAR_DATA.cards.slice(3, 7), ids = initialCards.map(c => String(c.id));
          const root = document.createElement('div'); document.body.append(root);
          const home = KalistarHome.create({ data: KALISTAR_DATA, initialCards, image: KalistarCardMedia.image });
          home.mount(root);
          const current = () => root.querySelector('.home-card').dataset.homeDetail;
          const first = current(), neighbours = [...root.querySelectorAll('.home-satellite')].map(n => n.dataset.homeIndex);
          root.querySelector('[data-home-control=next]').click();
          const next = current(); home.mount(root); const remounted = current();
          home.destroy(); root.remove();
          return { ids, first, neighbours, next, remounted, unchanged: initialCards.map(c => String(c.id)) };
        });
        assert.equal(preload.first, preload.ids[0]); assert.deepEqual(preload.neighbours, ['3', '1']);
        assert.equal(preload.next, preload.ids[1]); assert.equal(preload.remounted, preload.next);
        assert.deepEqual(preload.unchanged, preload.ids, 'prepared pool is used unchanged and survives remount');
      }
      assert.deepEqual(errors, []);
      report.profiles.push({ name, width, height, samples, errors });
      fs.writeFileSync(path.join(output, `${label}.json`), JSON.stringify(report, null, 2) + '\n');
      await context.close();
    }
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
