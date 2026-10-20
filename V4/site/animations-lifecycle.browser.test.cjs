'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const { createRequire } = require('node:module');
const runtime = createRequire(path.join(process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'), '__animations_lifecycle__.cjs'));
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const useSource = process.env.KALISTAR_TEST_SOURCE === '1';
const origin = 'https://animations-lifecycle.invalid';
const output = path.resolve(process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, '../../work/qa/performance-20261020/animations'));
const html = `<!doctype html><html><head><link rel="stylesheet" href="/jeu/elemental-roll.css"><style>
body{margin:0}#field{position:relative;width:320px;height:600px}.duel-console{position:absolute;top:0;left:0;width:320px;height:100px}
.dice-stage{position:absolute;top:0;width:80px;height:80px}.dice-stage[data-player="1"]{left:100px}.formation{position:absolute;top:200px;width:100px;height:175px}.slot,.slot-card{width:100%;height:100%}.slot-card{position:relative}.arena-ambience,.arena-arrival,.arena-tension{position:absolute;inset:0;pointer-events:none;z-index:-1}
</style></head><body><div id="field"><div class="duel-console" data-phase="attack">
<div class="dice-stage" data-player="0" data-slot="1" data-role="ATK" data-selected="true" data-element="ELECTRO" data-color="#e5ce83" data-crystal="/jeu/shared/cristaux/ELECTRO.png"></div>
<div class="dice-stage" data-player="1" data-slot="1" data-role="DEF" data-selected="true" data-element="HYDRO" data-color="#99dbe4" data-crystal="/jeu/shared/cristaux/HYDRO.png"></div>
</div><div class="formation" data-player="0"><div class="slot" data-position="1"><div class="slot-card"></div></div></div></div>
<script src="/jeu/arena-ambience.js"></script><script src="/jeu/elemental-roll.js"></script></body></html>`;

async function main() {
  fs.mkdirSync(output, { recursive: true });
  const browser = await runtime('playwright').chromium.launch({ channel: 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 400, height: 800 }, serviceWorkers: 'block' });
    await context.route('**/*', route => {
      const url = new URL(route.request().url()); if (url.origin !== origin) return route.abort();
      if (url.pathname === '/') return route.fulfill({ body: html, contentType: 'text/html' });
      const file = path.resolve(dist, '.' + decodeURIComponent(url.pathname));
      assert(file.startsWith(dist + path.sep));
      const name = path.basename(file), source = useSource && ['elemental-roll.js', 'arena-ambience.js'].includes(name) ? path.join(__dirname, name) : file;
      return fs.existsSync(source) ? route.fulfill({ body: fs.readFileSync(source), contentType: { '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' }[path.extname(source)] || 'application/octet-stream' }) : route.fulfill({ status: 404, body: 'Missing fixture asset' });
    });
    await context.addInitScript(() => {
      window.counts = { raf: 0, paints: 0, subscriber: 0 };
      const raf = requestAnimationFrame;
      window.requestAnimationFrame = fn => raf(t => { counts.raf++; fn(t); });
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) { counts.paints++; this.canvas.paints = (this.canvas.paints || 0) + 1; return clear.apply(this, args); };
    });
    const page = await context.newPage(), errors = [], checks = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(origin);
    await page.evaluate(() => {
      window.mountAnimations = () => {
        KalistarDice.mount(document.querySelectorAll('.dice-stage'));
        KalistarAmbience.mount(document.querySelector('#field'), { arena: { element: 'HYDRO' } });
      };
      mountAnimations(); window.unsubscribe = KalistarAmbience.subscribe(() => counts.subscriber++);
    });
    const counts = () => page.evaluate(() => ({ ...window.counts, dice: [...document.querySelectorAll('.dice-stage canvas')].map(c => c.paints || 0) }));
    async function sample(name, idle = false) {
      await page.waitForTimeout(180); const before = await counts(); await page.waitForTimeout(450); const after = await counts();
      const delta = Object.fromEntries(['raf', 'paints', 'subscriber'].map(key => [key, after[key] - before[key]]));
      delta.dice = after.dice.map((n, i) => n - before.dice[i]); checks.push({ name, ...delta });
      if (idle) assert.deepEqual([delta.raf, delta.paints, delta.subscriber], [0, 0, 0], name);
      else assert(delta.paints > 0 && delta.subscriber > 0, name + ': effects resume');
      return delta;
    }
    await sample('visible');
    await page.evaluate(() => document.querySelector('[data-player="1"]').hidden = true);
    const partial = await sample('one-crystal-hidden'); assert(partial.dice[0] > 0); assert.equal(partial.dice[1], 0);
    await page.evaluate(() => document.querySelector('[data-player="1"]').hidden = false);
    assert((await sample('both-crystals-visible')).dice.every(n => n > 0));
    await page.evaluate(() => document.querySelector('#field').hidden = true); await sample('field-hidden', true);
    await page.evaluate(() => document.querySelector('#field').hidden = false); await sample('field-shown');
    await page.evaluate(() => { const dialog = document.createElement('dialog'); dialog.id = 'modal'; document.body.append(dialog); dialog.showModal(); });
    await sample('native-modal', true);
    await page.evaluate(() => document.querySelector('#modal').close()); await sample('native-modal-closed');
    await page.evaluate(() => { const dialog = document.querySelector('#modal'); dialog.remove(); dialog.open = true; document.body.append(dialog); });
    await sample('inserted-open-modal', true);
    await page.evaluate(() => document.querySelector('#modal').remove()); await sample('removed-open-modal');
    await page.emulateMedia({ reducedMotion: 'reduce' }); await sample('reduced', true);
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await sample('motion-restored');
    await page.evaluate(() => { window.detached = document.querySelector('#field'); detached.remove(); }); await sample('detached', true);
    await page.evaluate(() => document.body.append(detached)); await sample('reattached');
    await page.evaluate(() => { for (let i = 0; i < 8; i++) mountAnimations(); }); await sample('remounted');
    assert.equal(await page.locator('.arena-ambience').count(), 1); assert.equal(await page.locator('.dice-stage canvas').count(), 2);
    assert.equal(await page.evaluate(() => KalistarAmbience.inspect().subscribers), 1);
    assert.equal(await page.evaluate(() => KalistarDice.play(0, 4, false)), true);
    assert.equal(await page.locator('.ritual-result').getAttribute('data-face'), '4');
    await page.evaluate(() => { KalistarDice.mount(document.querySelectorAll('.dice-stage')); });
    assert.equal(await page.locator('.ritual-result').getAttribute('data-face'), '4', 'result survives remount');
    assert.equal(await page.evaluate(async () => { const controller = new AbortController(); const done = KalistarDice.play(0, 2, false, controller.signal); controller.abort(); return done; }), false);
    assert.equal(await page.evaluate(async () => { const done = KalistarDice.play(0, 2, false); KalistarDice.mount([]); return done; }), false);
    await page.evaluate(() => { unsubscribe(); KalistarDice.cancel(); KalistarAmbience.destroy(); }); await sample('destroyed', true);
    assert.equal(await page.locator('.arena-ambience,.ritual-flight,.ritual-result').count(), 0);
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'lifecycle.json'), JSON.stringify({ passed: true, source: useSource ? 'working-tree' : 'dist', dist, checks, errors }, null, 2) + '\n');
    console.log('PASS animation visibility, modal insertion/removal, partial culling, reduced motion, detach/reattach, remount, result, abort and cleanup.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
