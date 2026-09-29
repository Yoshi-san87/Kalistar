'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__elemental_test__.cjs'))('playwright');
const elements = require('../../V3/donnees/elements.json');
const momoCard = fs.readFileSync(path.join(__dirname, '../cartes/MOMO_V4_11_POSITIONS.png')).toString('base64');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(__dirname, 'verification');

async function pixels(page) {
  return page.locator('.dice-stage canvas').evaluateAll(canvases => canvases.map(canvas => {
    const ctx = canvas.getContext('2d'), data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let hash = 0, nonblank = 0, opaqueCore = 0;
    for (let i = 0; i < data.length; i += 4) {
      hash = (Math.imul(hash, 31) + data[i] + data[i + 1] + data[i + 2]) >>> 0;
      if (data[i + 3]) nonblank++;
    }
    const core = ctx.getImageData(canvas.width * .45, canvas.height * .35, canvas.width * .1, canvas.height * .2).data;
    for (let i = 3; i < core.length; i += 4) if (core[i] > 240) opaqueCore++;
    return { hash, nonblank, opaqueCore, paints: canvas.testPaints || 0 };
  }));
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 });
    const page = await context.newPage(), errors = [];
    page.on('dialog', dialog => dialog.accept());
    page.on('pageerror', e => errors.push(e.message));
    await page.route(url + '/jeu/elemental-roll.js', route => route.fulfill({ contentType: 'text/javascript', body: fs.readFileSync(path.join(__dirname, 'elemental-roll.js'), 'utf8') }));
    await page.route(url + '/jeu/elemental-roll.css', route => route.fulfill({ contentType: 'text/css', body: fs.readFileSync(path.join(__dirname, 'elemental-roll.css'), 'utf8') }));
    await page.route(url + '/__elemental_fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><head><link rel="stylesheet" href="/jeu/elemental-roll.css"><style>body{margin:24px;background:#111b19;color:#e9e3cc;font:14px Georgia}main{display:grid;grid-template-columns:repeat(7,160px);gap:20px}.dice-stage{width:160px;height:160px}h2{font:14px Georgia;text-align:center}button{font:inherit;padding:10px;margin-bottom:20px}</style></head><body><button id="engage">Engage</button><button id="roll">Roll</button><main class="duel-console" data-phase="choose">${Object.entries(elements).map(([element, info], i) => `<section><h2>${info.label}</h2><div class="dice-stage" data-player="${i}" data-selected="true" data-element="${element}" data-color="#${info.color}" data-crystal="${element === 'NONE' ? '' : '/jeu/shared/cristaux/' + element + '.png'}" data-role="${i === 1 ? 'DEF' : 'ATK'}" data-slot="1"></div></section>`).join('')}</main><script src="/jeu/elemental-roll.js"></script><script>
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function(...args) { this.canvas.testPaints=(this.canvas.testPaints||0)+1;return clear.apply(this,args); };
      const mount = () => KalistarDice.mount(document.querySelectorAll('.dice-stage'));
      document.querySelector('#engage').onclick = () => { document.querySelector('main').dataset.phase='attack';mount();KalistarDice.engage(); };
      document.querySelector('#roll').onclick = () => { window.rollFinished=KalistarDice.play(0,4,false).then(result => { document.querySelector('main').dataset.phase='kalistel';document.querySelector('.dice-stage[data-player="0"]').dataset.result='4';return result; }); };
      mount();
    </script></body></html>` }));
    await page.goto(url + '/__elemental_fixture');
    await page.evaluate(async imageData => {
      const formation = document.createElement('section'), slot = document.createElement('div'), card = document.createElement('div');
      formation.className = 'formation'; formation.dataset.player = '0';
      Object.assign(formation.style, { position: 'fixed', left: '50%', top: '230px', width: '240px', aspectRatio: '897 / 1497', transform: 'translateX(-50%)' });
      slot.className = 'slot'; slot.dataset.position = '1'; Object.assign(slot.style, { position: 'relative', width: '100%', height: '100%' });
      card.className = 'slot-card'; Object.assign(card.style, { position: 'relative', width: '100%', height: '100%', overflow: 'hidden', border: '1px solid #81949a', borderRadius: '8px', background: 'linear-gradient(145deg,#203b45,#5f5544 48%,#131d20)' });
      const cardArt = document.createElement('img'); cardArt.alt = ''; cardArt.width = 797; cardArt.height = 1388;
      Object.assign(cardArt.style, { position: 'absolute', inset: '0', width: '100%', height: '100%', objectFit: 'contain' });
      const source = new Image(); source.src = 'data:image/png;base64,' + imageData; await source.decode();
      const crop = document.createElement('canvas'); crop.width = 797; crop.height = 1388;
      crop.getContext('2d').drawImage(source, 50, 50, 797, 1388, 0, 0, 797, 1388);
      cardArt.dataset.v4Cropped = 'card'; cardArt.src = crop.toDataURL('image/png'); card.append(cardArt);
      slot.append(card); formation.append(slot); document.body.append(formation);
      const opponent = formation.cloneNode(true); opponent.dataset.player = '1'; opponent.style.left = 'calc(50% + 260px)'; document.body.append(opponent);
    }, momoCard);
    await page.evaluate(() => {
      document.querySelector('[data-element=NONE]').dataset.weapon = '/jeu/shared/armes/03.png';
      KalistarDice.mount(document.querySelectorAll('.dice-stage'));
    });
    await page.waitForFunction(() => performance.getEntriesByType('resource').filter(r => r.name.includes('/cristaux/')).length === 12);
    await page.waitForTimeout(200);
    const dormant = await pixels(page);
    assert.ok(dormant.every(p => p.nonblank > 400));
    await page.locator('#engage').click();
    await page.waitForFunction(() => document.querySelectorAll('.is-setting').length === 12);
    assert.equal(await page.locator('.is-setting').count(), 12, 'engagement starts one ignition per elemental crystal');
    assert.equal(await page.locator('[data-element=NONE].is-setting').count(), 0, 'no magical ignition for a weapon');
    await page.waitForTimeout(110);
    await page.screenshot({ path: path.join(output, 'elemental-setting-all.png'), scale: 'css' });
    await page.waitForTimeout(1700);
    assert.equal(await page.locator('.is-setting').count(), 0, 'one-shot ignition ends while the aura continues');
    const awake = await pixels(page);
    await page.screenshot({ path: path.join(output, 'elemental-awakening-all.png'), scale: 'css' });
    await page.waitForTimeout(650);
    const later = await pixels(page);
    for (let i = 0; i < 12; i++) {
      assert.notEqual(awake[i].hash, later[i].hash, `${Object.keys(elements)[i]} stays alive after 900ms`);
      assert.equal(awake[i].opaqueCore, dormant[i].opaqueCore, 'painted gem keeps its solid silhouette');
      assert.ok(later[i].paints - awake[i].paints < 26, `drawing is capped at 30 fps (${later[i].paints - awake[i].paints} frames)`);
    }
    assert.equal(awake[12].paints, later[12].paints, 'NONE stays neutral');
    assert.equal(awake[12].nonblank, later[12].nonblank, 'weapon silhouette stays fixed without elemental particles');
    assert.equal(await page.locator('[data-element=NONE].is-engaging').count(), 0);
    await page.locator('#roll').click();
    assert.equal(await page.locator('.is-engaging').count(), 12, 'aura remains during wind-up');
    await page.waitForFunction(() => document.querySelector('.dice-stage[data-player="0"].is-releasing'));
    assert.equal(await page.locator('.is-engaging').count(), 11, 'only the launching crystal stops waiting');
    const burst = (await pixels(page))[0];
    await page.waitForTimeout(80);
    assert.notEqual((await pixels(page))[0].hash, burst.hash, 'colored fragments move at release');
    await page.screenshot({ path: path.join(output, 'elemental-release-burst.png'), scale: 'css' });
    assert.equal(await page.evaluate(() => window.rollFinished), true);
    let marker = page.locator('.ritual-result');
    assert.equal(await marker.getAttribute('data-face'), '4', 'ATK marker lands on the printed face');
    assert.equal(await marker.getAttribute('data-role'), 'ATK');
    assert.equal(await marker.locator('.ritual-result-core').evaluate(node => getComputedStyle(node).animationName), 'ritual-token-impact', 'the landed token gets the new finish animation');
    assert.equal(await page.locator('.ritual-spark').count(), 8, 'the impact emits a restrained ring of sparks');
    assert.ok(await marker.evaluate(node => Math.abs(parseFloat(getComputedStyle(node).width) - node.parentElement.clientWidth * .13) < 1), 'travel marker keeps its original diameter');
    await page.evaluate(() => KalistarDice.mount(document.querySelectorAll('.dice-stage')));
    marker = page.locator('.ritual-result');
    assert.equal(await marker.locator('.ritual-spark').count(), 8, 'a game render preserves the in-flight impact');
    assert.match(await marker.locator('.ritual-result-core').evaluate(node => getComputedStyle(node).animationDelay), /^-\d+(?:\.\d+)?(?:ms|s)$/, 'the impact resumes at its current progress');
    assert.equal(await marker.locator('.ritual-spark').evaluateAll(nodes => nodes.filter(node => getComputedStyle(node).animationName === 'ritual-spark').length), 8, 'all impact particles resume');
    await page.waitForFunction(() => document.querySelector('.ritual-result')?.classList.contains('confirmed'), { timeout: 1500 });
    await page.waitForTimeout(450);
    assert.equal(await page.locator('.ritual-result.confirmed').count(), 1, 'the selected stat stays visibly marked while the duel continues');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const stopped = await pixels(page);
    assert.equal(stopped[0].opaqueCore, 0, 'released crystal does not reappear after the jet');
    await page.waitForTimeout(400);
    const afterRelease = await pixels(page);
    assert.equal(afterRelease[0].paints, stopped[0].paints, 'released crystal stops painting');
    assert.ok(afterRelease[1].paints > stopped[1].paints, 'other crystals remain alive');
    await page.locator('#engage').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => !document.querySelector('.is-setting'));
    assert.equal(await page.locator('.is-setting').count(), 0, 'reduced motion removes the burst');
    const reduced = await pixels(page);
    await page.waitForTimeout(400);
    assert.deepEqual((await pixels(page)).map(p => p.paints), reduced.map(p => p.paints), 'reduced motion is fully static');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.waitForTimeout(150);
    assert.notEqual((await pixels(page))[0].hash, reduced[0].hash, 'motion preference can change at runtime');
    await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable:true, value:true }); document.dispatchEvent(new Event('visibilitychange')); });
    const hidden = await pixels(page);
    await page.waitForTimeout(200);
    assert.deepEqual((await pixels(page)).map(p => p.paints), hidden.map(p => p.paints), 'hidden tab stops drawing');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await page.waitForTimeout(150);
    assert.notEqual((await pixels(page))[0].hash, hidden[0].hash);
    assert.equal(await page.evaluate(async () => {
      const pending = KalistarDice.play(0, 2, false); KalistarDice.mount([]); return pending;
    }), false, 'unmount cancels an in-flight reveal');
    assert.equal(await page.locator('.ritual-flight').count(), 0);
    await page.locator('#engage').click();
    await page.evaluate(() => KalistarDice.cancel());
    const cancelled = await pixels(page);
    await page.waitForTimeout(200);
    assert.deepEqual((await pixels(page)).map(p => p.paints), cancelled.map(p => p.paints), 'explicit navigation cancellation leaves no loop');
    await page.locator('#engage').click();
    await page.locator('#roll').click();
    assert.equal(await page.locator('.is-setting').count(), 12, 'an immediate roll preserves the ignition');
    assert.equal(await page.locator('.is-releasing').count(), 0, 'release waits until ignition and wind-up complete');
    assert.equal(await page.evaluate(() => window.rollFinished), true);
    await page.locator('#engage').click();
    assert.equal(await page.evaluate(() => KalistarDice.play(12, 3, false)), true);
    assert.equal((await pixels(page))[12].opaqueCore, 0, 'weapon disappears after its roll like the crystal');

    await page.evaluate(() => {
      KalistarDice.cancel();
      const stage = document.querySelector('.duel-console'); stage.dataset.phase = 'result';
      const attack = document.querySelector('.dice-stage[data-player="0"]'); attack.dataset.role = 'ATK'; attack.dataset.result = '4';
      KalistarDice.mount(document.querySelectorAll('.dice-stage'));
    });
    let retained = page.locator('.ritual-result[data-result-key="0:1:ATK"]');
    assert.equal(await retained.count(), 1, 'a saved result is restored after a full UI reload');
    assert.equal(await retained.evaluate(node => node.classList.contains('confirmed')), true, 'restored results show the persistent target ring without replaying the impact');
    await page.evaluate(() => {
      const defense = document.querySelector('.dice-stage[data-player="1"]'); defense.dataset.role = 'DEF'; defense.dataset.result = '2';
      KalistarDice.mount(document.querySelectorAll('.dice-stage'));
    });
    retained = page.locator('.ritual-result.confirmed');
    assert.equal(await retained.count(), 2, 'ATK and DEF results remain marked together');
    await page.screenshot({ path: path.join(output, 'elemental-result-hold.png'), scale: 'css' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    assert.equal(await page.evaluate(async () => await KalistarDice.play(0, 3, true)), true);
    retained = page.locator('.ritual-result[data-result-key="0:1:ATK"]');
    assert.equal(await retained.locator('.ritual-result-core').evaluate(node => getComputedStyle(node).animationName), 'none', 'reduced motion skips the flourish');
    assert.equal(await page.locator('.ritual-spark').count(), 0, 'reduced motion omits the sparks');
    assert.equal(await retained.evaluate(node => node.classList.contains('confirmed')), true, 'reduced motion keeps a clear static result marker');
    await page.evaluate(() => { document.querySelector('.duel-console').dataset.phase = 'choose'; KalistarDice.mount(document.querySelectorAll('.dice-stage')); });
    assert.equal(await page.locator('.ritual-result').count(), 0, 'result markers clear when the next duel begins');
    await page.evaluate(() => {
      document.querySelector('.duel-console').dataset.phase = 'result';
      const attack = document.querySelector('.dice-stage[data-player="0"]'), defense = document.querySelector('.dice-stage[data-player="1"]');
      attack.dataset.role = 'ATK'; attack.dataset.result = '6'; defense.dataset.role = 'DEF'; defense.dataset.result = '6';
      KalistarDice.mount(document.querySelectorAll('.dice-stage'));
    });
    await page.waitForFunction(() => [...document.querySelectorAll('.slot-card img')].every(image => image.complete && image.naturalWidth === 797));
    for (const cardWidth of [240, 106]) {
      await page.evaluate(width => {
        document.querySelectorAll('.formation').forEach(formation => { formation.style.width = width + 'px'; formation.style.aspectRatio = '797 / 1388'; });
        KalistarDice.mount(document.querySelectorAll('.dice-stage'));
      }, cardWidth);
      const geometry = await page.locator('.ritual-result[data-face="6"]').evaluateAll(markers => markers.map(marker => {
        const card = marker.parentElement, image = card.querySelector('img'), role = marker.dataset.role;
        const ratio = image.naturalWidth / image.naturalHeight, imageWidth = Math.min(card.clientWidth, card.clientHeight * ratio), imageHeight = Math.min(card.clientHeight, card.clientWidth / ratio);
        const anchorX = role === 'ATK' ? 146 : 754, anchorY = 147;
        const expectedLeft = (card.clientWidth - imageWidth) / 2 + imageWidth * (anchorX - 50) / 797;
        const expectedTop = (card.clientHeight - imageHeight) / 2 + imageHeight * (anchorY - 50) / 1388;
        const rect = marker.getBoundingClientRect();
        return { role, left: parseFloat(getComputedStyle(marker).left), top: parseFloat(getComputedStyle(marker).top), expectedLeft, expectedTop, imageSize: [image.clientWidth, image.clientHeight], cardSize: [card.clientWidth, card.clientHeight], errorX: Math.abs(parseFloat(getComputedStyle(marker).left) - expectedLeft), errorY: Math.abs(parseFloat(getComputedStyle(marker).top) - expectedTop), center: [rect.left + rect.width / 2, rect.top + rect.height / 2], ratio: parseFloat(getComputedStyle(marker).width) / card.clientWidth };
      }));
      assert.deepEqual(geometry.map(item => item.role).sort(), ['ATK', 'DEF'], `${cardWidth}px card keeps both D6 markers`);
      for (const item of geometry) {
        assert.ok(item.errorX < .6 && item.errorY < .6, `${cardWidth}px ${item.role} D6 is centered on the cropped card artwork: ${JSON.stringify(item)}`);
        assert.ok(Math.abs(item.ratio - (item.role === 'ATK' ? .155 : .18)) < .005, `${cardWidth}px ${item.role} D6 has its larger medallion-sized ring`);
      }
      const centerDrift = await page.locator('.ritual-result[data-face="6"]').evaluateAll(async markers => {
        const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
        const center = node => { const r = node.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; };
        const results = [];
        for (const marker of markers) {
          const before = center(marker);
          marker.classList.remove('confirmed'); marker.classList.add('settled');
          await pause(420);
          const during = center(marker);
          marker.classList.remove('settled'); marker.classList.add('confirmed');
          await pause(40);
          const after = center(marker);
          results.push({ role: marker.dataset.role, movement: Math.max(...before.map((v, i) => Math.abs(v - after[i]))), animationMovement: Math.max(...before.map((v, i) => Math.abs(v - during[i]))) });
        }
        return results;
      });
      for (const item of centerDrift) {
        assert.ok(item.movement < .5 && item.animationMovement < .5, `${cardWidth}px ${item.role} D6 anchor never drifts between impact and confirmed phases`);
      }
      await page.screenshot({ path: path.join(output, `elemental-d6-alignment-${cardWidth}.png`), scale: 'css' });
    }
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    if (process.env.KALISTAR_ROLL_FIXTURE_ONLY === '1') {
      assert.deepEqual(errors, []);
    console.log('PASS: real-card ATK/DEF D6 anchors, stable impact transition, persistent result, reload, duel cleanup and reduced motion.');
      return;
    }

    // Exercise the actual game UI and saved engine state in a disposable profile.
    await page.goto(url + '/jeu/');
    await page.waitForFunction(() => window.KALISTAR_READY);
    await page.locator('[data-view=arena]').click();
    await page.locator('[data-action=new-game]').first().click();
    await page.locator('#game-mode').selectOption('local');
    await page.locator('#game-seed').fill('AWAKENING-QA');
    await page.locator('#new-game-form button[type=submit]').click();
    await page.locator('[data-action=auto-formation]').first().click();
    await page.locator('[data-action=start]').click();
    await page.waitForFunction(() => document.querySelector('.duel-console')?.dataset.phase === 'choose');
    const base = await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')));
    await page.locator('.formation[data-player="0"] .slot-card:not(.empty)').first().click();
    await page.locator('.formation[data-player="1"] .slot-card:not(.empty)').first().click();
    await page.locator('[data-action=lock]').click();
    await page.waitForSelector('.dice-stage.is-engaging');
    const saved = await page.evaluate(() => localStorage.getItem('kalistar.v4.game'));
    await page.waitForTimeout(1800);
    const frame = await pixels(page);
    await page.waitForTimeout(350);
    assert.notEqual((await pixels(page))[0].hash, frame[0].hash);
    assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v4.game')), saved, 'waiting never changes game state or RNG');
    await page.screenshot({ path: path.join(output, 'elemental-awakening-desktop.png'), scale: 'css' });
    await page.reload();
    await page.waitForFunction(() => window.KALISTAR_READY);
    await page.waitForSelector('.dice-stage.is-engaging');
    await page.setViewportSize({ width: 412, height: 1007 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(output, 'elemental-awakening-phone.png'), scale: 'css' });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.locator('[data-action=roll]').click();
    assert.equal(await page.locator('.is-engaging').count(), 2, 'both remain awake until attack departure');
    await page.waitForFunction(() => document.querySelector('.dice-stage[data-role=ATK].is-releasing'));
    assert.equal(await page.locator('.dice-stage[data-role=DEF].is-engaging').count(), 1);
    assert.equal(await page.locator('.ritual-flight').count(), 1, 'burst and travelling jet start together');
    await page.screenshot({ path: path.join(output, 'elemental-release-phone.png'), scale: 'css' });
    await page.waitForFunction(() => !document.querySelector('#app').classList.contains('rolling'));
    assert.notEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v4.game')).phase), 'attack');
    assert.equal((await pixels(page))[0].opaqueCore, 0, 'phase remount preserves the empty ATK well');

    for (const side of [0, 1]) {
      await page.evaluate(async ({ base, side }) => {
        await KALISTAR_DB.idle();
        const e = KalistarEngine.createEngine(KALISTAR_DATA), s = structuredClone(base);
        s.turn = side;
        e.lock(s, 0, 0);
        const die = 6 - e.card(s.players[side].board[0]).atk.findIndex(v => typeof v === 'number');
        e.rollAttack(s, die); e.assertState(s);
        await KALISTAR_DB.saveGame(s); localStorage.setItem('kalistar.v4.game', JSON.stringify(s));
      }, { base, side });
      await page.reload(); await page.waitForFunction(() => window.KALISTAR_READY);
      const defender = page.locator(`.dice-stage[data-player="${1-side}"]`);
      const attackMarker = page.locator(`.ritual-result[data-result-key="${side}:1:ATK"]`);
      assert.equal(await page.locator('.is-engaging').count(), 1, 'only DEF reawakens in a saved Kalistel decision');
      assert.match(await defender.getAttribute('class'), /is-engaging/);
      assert.equal(await attackMarker.count(), 1, 'the landed ATK result is restored after reload');
      assert.equal(await attackMarker.evaluate(node => node.classList.contains('confirmed')), true);
      if (side === 0) await page.screenshot({ path: path.join(output, 'elemental-result-phone-live.png'), scale: 'css' });
      assert.equal((await pixels(page))[side].opaqueCore, 0, 'reload keeps the released crystal absent');
      await page.locator('[data-action=accept-attack]').click();
      assert.match(await defender.getAttribute('class'), /is-engaging/, 'DEF persists across phase remount');
      assert.equal(await attackMarker.count(), 1, 'the ATK marker survives the duel phase transition');
      const waiting = await pixels(page); await page.waitForTimeout(350);
      assert.notEqual((await pixels(page))[1-side].hash, waiting[1-side].hash);
      await page.locator('[data-action=roll]').click();
      assert.match(await defender.getAttribute('class'), /is-engaging/, 'DEF keeps its aura during its own wind-up');
      await page.waitForFunction(() => document.querySelector('.dice-stage[data-role=DEF].is-releasing'));
      assert.equal(await page.locator('.is-engaging').count(), 0);
      await page.waitForFunction(() => !document.querySelector('#app').classList.contains('rolling'));
      const resultState = await page.evaluate(() => ({ phase: document.querySelector('.duel-console')?.dataset.phase, markers: [...document.querySelectorAll('.ritual-result')].map(node => node.dataset.resultKey) }));
      assert.equal(resultState.phase, 'result');
      assert.ok(resultState.markers.includes(`${side}:1:ATK`), `the attacker’s chosen stat remains visible through resolution (${JSON.stringify(resultState)})`);
    }
    assert.deepEqual(errors, []);
    console.log('PASS: all elements, independent ATK/DEF awakening on both sides, wind-up, burst + flight, Kalistel/reload continuity, cancellation, reduced motion, phone, unchanged RNG.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
