// Standalone: node V4/astraball/tests/camera-goals.browser.test.cjs
// KALISTAR_CAMERA_ARENA=resonances explicitly tests legacy art while pixel exports are pending.
// KALISTAR_URL (loopback only), KALISTAR_DIST, KALISTAR_NODE_MODULES and
// KALISTAR_VERIFICATION_DIR follow the other Astraball browser tests.
// KALISTAR_CAMERA_CAPTURE_ONLY=1 runs only the 19 desktop + 3 Razr venue captures.
const fs = require('node:fs'), path = require('node:path'), assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const modules = process.env.KALISTAR_NODE_MODULES || 'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const { chromium } = require(path.join(modules, 'playwright'));
const sharp = require(path.join(modules, 'sharp'));
const repo = path.resolve(__dirname, '../../..');
const dist = process.env.KALISTAR_DIST && path.resolve(process.env.KALISTAR_DIST);
const gameRoot = dist ? path.join(dist, 'jeu/astraball') : path.resolve(__dirname, '..');
const out = process.env.KALISTAR_VERIFICATION_DIR || path.join(repo, 'work/astraball/camera-goals');
const arenaId = process.env.KALISTAR_CAMERA_ARENA || 'kalistopolis-official';
const close = (actual, expected, label, tolerance = 0.05) =>
  assert.ok(Math.abs(actual - expected) <= tolerance, `${label}: ${actual} != ${expected}`);

async function serve() {
  if (process.env.KALISTAR_URL) {
    assert.ok(!dist, 'Use either KALISTAR_URL or KALISTAR_DIST, not both');
    const url = new URL(process.env.KALISTAR_URL);
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Camera QA only seeds disposable local contexts');
    return { url: url.href };
  }
  const types = { '.html':'text/html', '.mjs':'text/javascript', '.js':'text/javascript', '.css':'text/css',
    '.json':'application/json', '.webp':'image/webp', '.png':'image/png', '.woff2':'font/woff2', '.svg':'image/svg+xml' };
  const server = require('node:http').createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      let base = dist, relative = pathname.replace(/^\//, '');
      if (!dist) {
        if (pathname.startsWith('/jeu/astraball/')) { base = gameRoot; relative = pathname.slice('/jeu/astraball/'.length); }
        else if (pathname === '/jeu/assets/lucide.min.js') { base = path.join(repo, 'V3/site'); relative = 'assets/lucide.min.js'; }
        else if (pathname.startsWith('/jeu/')) { base = path.join(repo, 'V4/site'); relative = pathname.slice(5); }
        else throw Error('Unsupported route');
      }
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(base, relative);
      assert.ok(file.startsWith(base + path.sep), 'Outside test root');
      assert.ok(!/(?:^|[\\/])(?:node_modules|sources|tools|tests)(?:[\\/]|$)/.test(relative), 'Authoring is not served');
      response.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'");
      response.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
      response.setHeader('Cache-Control', 'no-store');
      response.end(fs.readFileSync(file));
    } catch { response.writeHead(404).end(); }
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, url: `http://127.0.0.1:${server.address().port}/jeu/astraball/` };
}

async function settled(page) {
  await page.waitForFunction(() => window.Astraball?.ready && !Astraball.metrics().busy && !Astraball.metrics().aiRunning);
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function observe(page) {
  await settled(page);
  const result = await page.evaluate(() => {
    const metrics = Astraball.metrics(), state = Astraball.snapshot();
    const canvas = document.querySelector('#canvas-host canvas'), rect = canvas.getBoundingClientRect();
    return { metrics, width: canvas.clientWidth, height: canvas.clientHeight,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      samples: state.units.map(unit => ({ screen: Astraball.cell(unit.x, unit.y),
        world: metrics.sprites.units.find(sprite => sprite.id === unit.id) })),
      goals: [0, 12].flatMap(x => [2, 3, 4].map(y => Astraball.cell(x, y))),
      scroll: { x: scrollX, y: scrollY, scale: visualViewport?.scale ?? 1 },
    };
  });
  assert.equal(typeof result.metrics.reducedMotion, 'boolean', 'effective reducedMotion metric is required');
  assert.ok(Number.isInteger(result.metrics.arenaTextures) && result.metrics.arenaTextures >= 1 && result.metrics.arenaTextures <= 2,
    'arena texture cache must contain one or two venues');
  assert.ok([0, 2].includes(result.metrics.flagCount), 'flagCount must explicitly report zero or two');
  assert.ok(result.metrics.input, 'read-only input counters are required');
  for (const key of ['cellActivations', 'unitActivations', 'activePointers']) {
    assert.ok(Number.isInteger(result.metrics.input[key]) && result.metrics.input[key] >= 0, `input.${key} must be a nonnegative integer`);
  }
  assert.ok(['idle', 'press', 'pan', 'pinch', 'release'].includes(result.metrics.input.gesture), 'input gesture is explicit');
  // Infer the actual scene transform from two independent axes, not the fit algorithm.
  const byX = [...result.samples].sort((a, b) => a.world.x - b.world.x);
  const byY = [...result.samples].sort((a, b) => a.world.y - b.world.y);
  const sx = (byX.at(-1).screen.x - byX[0].screen.x) / (byX.at(-1).world.x - byX[0].world.x);
  const sy = (byY.at(-1).screen.y - byY[0].screen.y) / (byY.at(-1).world.y - byY[0].world.y);
  assert.ok(Number.isFinite(sx) && sx > 0 && Number.isFinite(sy) && sy > 0, 'finite positive scene scale');
  close(sx, sy, 'uniform scale', 1e-7);
  result.scale = sx;
  result.x = byX[0].screen.x - byX[0].world.x * sx;
  result.y = byY[0].screen.y - byY[0].world.y * sx;
  for (const sample of result.samples) {
    close(sample.screen.x, result.x + sample.world.x * sx, 'same X transform for every sprite');
    close(sample.screen.y, result.y + sample.world.y * sx, 'same Y transform for every sprite');
  }
  const viewport = result.metrics.viewport;
  assert.ok(viewport?.spec && viewport.sceneScale, 'read-only viewport instrumentation is required');
  close(viewport.x, result.x, 'reported viewport X'); close(viewport.y, result.y, 'reported viewport Y');
  close(viewport.scale, result.scale, 'reported viewport scale', 1e-7);
  close(viewport.sceneScale.x, result.scale, 'applied scene X scale', 1e-7);
  close(viewport.sceneScale.y, result.scale, 'applied scene Y scale', 1e-7);
  close(viewport.spec.width, result.width, 'viewport CSS width'); close(viewport.spec.height, result.height, 'viewport CSS height');
  for (const [axis, size] of [['x', result.width], ['y', result.height]]) {
    const { min, max } = viewport.limits[axis];
    assert.ok(viewport.pan[axis] >= min - 1e-7 && viewport.pan[axis] <= max + 1e-7, 'normalized applied pan');
    close(viewport[axis], size / 2 - viewport.center[axis] * viewport.scale + viewport.pan[axis], 'pan base ' + axis);
  }
  return result;
}

function assertVenueMetrics(metrics, arena, reducedMotion) {
  assert.equal(metrics.reducedMotion, reducedMotion, 'effective motion preference');
  const expectedFlags = arena.pixel && !['kalistopolis', 'velane'].includes(arena.cityId) ? 2 : 0;
  assert.equal(metrics.flagCount, expectedFlags, `flag count for ${arena.id}`);
}

async function assertInput(page, activePointers, gesture) {
  const input = await page.evaluate(() => Astraball.metrics().input);
  assert.equal(input.activePointers, activePointers, 'renderer active pointer count');
  assert.equal(input.gesture, gesture, 'renderer gesture state');
}

function assertBounds(observation, art) {
  for (const [axis, size, start, end] of [['x', observation.width, art.left, art.right], ['y', observation.height, art.top, art.bottom]]) {
    const first = observation[axis] + start * observation.scale, last = observation[axis] + end * observation.scale;
    if ((end - start) * observation.scale <= size) close(first, size - last, `equal ${axis} bars`);
    else assert.ok(first <= 0.05 && last >= size - 0.05, `no blank ${axis} edge: ${first}, ${last}, ${size}`);
  }
}

function assertWorldRectVisible(observation, bounds, label) {
  for (const [axis, size, start, end] of [['x', observation.width, bounds.left, bounds.right], ['y', observation.height, bounds.top, bounds.bottom]]) {
    const first = observation[axis] + start * observation.scale, last = observation[axis] + end * observation.scale;
    assert.ok(first >= -0.05 && last <= size + 0.05, `${label}: clipped ${axis} range ${first}..${last} in ${size}`);
  }
}

function assertOverview(observation) {
  close(observation.metrics.zoom, 1, 'overview zoom', 1e-8);
  assertWorldRectVisible(observation, observation.metrics.viewport.spec.focusBounds, 'full overview focus');
  for (const point of observation.goals) {
    assert.ok(point.x >= 0 && point.x <= observation.width && point.y >= 0 && point.y <= observation.height, 'six U targets visible');
  }
  assert.ok(Array.isArray(observation.metrics.goals), 'read-only goal instrumentation is required');
  {
    assert.equal(observation.metrics.goals.length, 2, 'two U shapes');
    for (const goal of observation.metrics.goals) {
      assert.equal(goal.kind,'image','goals must be actual sprites, not procedural lines');
      assert.equal(goal.rendered,true,'goal texture is loaded');
      assert.match(goal.url,/^assets\/goals-v1\/[a-z-]+\.webp$/);
      assert.ok(goal.scale>0&&[1,-1].includes(goal.direction),'uniform image scale and mirror');
      close(Math.abs(goal.imageScale.x),goal.imageScale.y,'goal image is not stretched',1e-9);
      close(goal.imageScale.y,goal.scale,'actual goal scale',1e-9);
      assert.equal(goal.posts.length, 4, 'four U vertices');
      assert.ok(goal.height > 0 && typeof goal.material === 'string', 'goal height and material are explicit');
      for (const point of goal.posts) {
        const x = observation.x + point.x * observation.scale, y = observation.y + point.y * observation.scale;
        assert.ok(x >= 0 && x <= observation.width && y >= 0 && y <= observation.height, 'complete U visible');
      }
    }
  }
}

async function activity(page) {
  return page.evaluate(() => {
    const metrics = Astraball.metrics();
    return { state: Astraball.snapshot(), selectedId: metrics.sprites.selectedId,
      pending: [...document.querySelectorAll('#target-options [aria-pressed="true"]')].map(button => button.textContent),
      confirmVisible: !document.querySelector('#confirm-action').hidden,
      modalOpen: document.querySelector('#modal').open,
      callbacks: { cell: metrics.input.cellActivations, unit: metrics.input.unitActivations } };
  });
}

async function noAction(page, before, label) {
  await settled(page);
  assert.deepEqual(await activity(page), before, label + ': no game action, selection, target or dialog change');
}

async function reset(page) {
  await page.locator('#zoom-reset').click();
  const result = await observe(page);
  assertOverview(result);
  return result;
}

async function capture(page, name, report) {
  await page.screenshot({ path: path.join(out, name + '.png'), fullPage: true });
  const pixels = await page.locator('#canvas-host canvas').screenshot({ path: path.join(out, name + '-canvas.png') });
  const { channels } = await sharp(pixels).stats();
  const variance = Math.max(...channels.slice(0, 3).map(channel => channel.stdev));
  assert.ok(variance > 12, 'canvas is nonblank: ' + name);
  report.captures.push({ name, variance, sha256: require('node:crypto').createHash('sha256').update(pixels).digest('hex') });
  return pixels;
}

async function fixedPlaneChecks(page, arena, baseline, report) {
  if (!arena.pixel) return;
  const neutralFocus = baseline.metrics.viewport.spec.focusBounds;
  assert.equal(baseline.metrics.appearance.height, 60, 'neutral pitch/headroom reference');
  report.overviewHeights = [];
  await page.locator('#camera-toggle').click();
  for (const height of [0, 100, 60]) {
    await page.locator('#camera-height').fill(String(height));
    await page.locator('#camera-height').dispatchEvent('input');
    const current = await observe(page);
    assert.equal(current.metrics.appearance.height, height);
    assertOverview(current);
    assertWorldRectVisible(current, neutralFocus, `height ${height} preserves neutral pitch/headroom`);
    const focus = current.metrics.viewport.spec.focusBounds;
    assert.ok(focus.left <= neutralFocus.left && focus.right >= neutralFocus.right &&
      focus.top <= neutralFocus.top && focus.bottom >= neutralFocus.bottom, `height ${height} may expand, never shift away from neutral focus`);
    assert.deepEqual(current.metrics.viewport.spec.bounds, { left: 0, top: 0, right: 1536, bottom: 1024 });
    assert.deepEqual(current.samples.map(sample => ({ x: sample.world.x, y: sample.world.y })),
      baseline.samples.map(sample => ({ x: sample.world.x, y: sample.world.y })), 'framing height never deforms the pitch');
    assert.deepEqual(current.metrics.goals, baseline.metrics.goals, 'framing height never deforms the U shapes');
    report.overviewHeights.push({ height, zoom: current.metrics.zoom, focusBounds: focus,
      scale: current.scale, x: current.x, y: current.y, completePitchHeadroomAndGoals: true });
    await capture(page, `${report.name}-height-${height}`, report);
  }
  await page.locator('#camera-toggle').click();
  report.checks.push('pixel-fixed-plane-at-all-framing-heights', 'overview-height-0-and-100-keeps-pitch-headroom-and-goals');
}

async function clearCanvasPoint(page, preferred, offsets = [{ x: 0, y: 0 }]) {
  return page.evaluate(({ point, offsets }) => {
    const canvas = document.querySelector('#canvas-host canvas'), box = canvas.getBoundingClientRect();
    const candidates = [point];
    for (const x of [.3, .4, .5, .6, .7]) for (const y of [.35, .45, .55, .65]) candidates.push({ x: box.width * x, y: box.height * y });
    candidates.sort((a, b) => Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y));
    // Leave room for native pointer rounding and the controls' painted borders.
    const clear = candidates.find(p => offsets.every(offset => [-5, 0, 5].every(dx => [-5, 0, 5].every(dy =>
      document.elementFromPoint(box.x + p.x + offset.x + dx, box.y + p.y + offset.y + dy) === canvas))));
    if (!clear) throw Error('No unobstructed canvas point for camera gesture');
    return clear;
  }, { point: preferred, offsets });
}

async function wheel(page, delta, point) {
  const box = await page.locator('#canvas-host canvas').boundingBox();
  // Contextual controls move with the camera and can cover a former test point.
  point = await clearCanvasPoint(page, point);
  await page.mouse.move(box.x + point.x, box.y + point.y);
  const before = await page.evaluate(() => window.__cameraTrace.wheels);
  await page.mouse.wheel(0, delta);
  await page.waitForFunction(count => window.__cameraTrace.wheels > count, before);
  return observe(page);
}

async function mouseDrag(page, dx, dy) {
  const box = await page.locator('#canvas-host canvas').boundingBox();
  const point = await clearCanvasPoint(page, { x: box.width * 0.5, y: box.height * 0.55 });
  const x = box.x + point.x, y = box.y + point.y;
  await page.mouse.move(x, y);
  await page.mouse.down();
  try {
    await assertInput(page, 1, 'press');
    await page.mouse.move(x + dx, y + dy, { steps: 8 });
    await assertInput(page, 1, 'pan');
  }
  finally { await page.mouse.up(); }
  await assertInput(page, 0, 'idle');
  return observe(page);
}

async function legalTarget(page, core) {
  const state = await page.evaluate(() => Astraball.snapshot()), moves = core.legalMoves(state);
  return page.evaluate(candidates => {
    const metrics = Astraball.metrics(), canvas = document.querySelector('#canvas-host canvas'), r = canvas.getBoundingClientRect();
    for (const cell of candidates) {
      const p = Astraball.cell(cell.x, cell.y);
      if (p.x < 28 || p.x > r.width - 28 || p.y < 28 || p.y > r.height - 28) continue;
      const state = Astraball.snapshot();
      const blockedBySprite = metrics.sprites.units.some(sprite => {
        const unit = state.units.find(u => u.id === sprite.id), foot = Astraball.cell(unit.x, unit.y);
        const other = metrics.sprites.units.find(u => Math.abs(u.x - sprite.x) > 100);
        const otherUnit = state.units.find(u => u.id === other.id);
        const scale = (Astraball.cell(otherUnit.x, otherUnit.y).x - foot.x) / (other.x - sprite.x);
        const sizing = sprite.sizing, dx = (p.x - foot.x) / scale * sprite.direction, dy = (p.y - foot.y) / scale;
        return sizing && dx >= sizing.hitLeft && dx <= sizing.hitRight && dy >= -sizing.standingHeight && dy <= 10;
      });
      if (!blockedBySprite && document.elementFromPoint(r.x + p.x, r.y + p.y) === canvas) return { cell, x: r.x + p.x, y: r.y + p.y };
    }
    return null;
  }, moves);
}

async function touch(session, type, points = []) {
  await session.send('Input.dispatchTouchEvent', { type,
    touchPoints: points.map(point => ({ radiusX: 4, radiusY: 4, force: 1, ...point })) });
}

async function touchChecks(page, context, core, report) {
  const session = await context.newCDPSession(page);
  try {
    await reset(page);
    await page.locator('#zoom-in').click({ clickCount: 3 });
    let before = await activity(page), layout = await observe(page);
    const start = await legalTarget(page, core);
    assert.ok(start, 'visible playable tile for touch drag');
    await touch(session, 'touchStart', [{ id: 1, x: start.x, y: start.y }]);
    await assertInput(page, 1, 'press');
    for (let i = 1; i <= 8; i++) await touch(session, 'touchMove', [{ id: 1, x: start.x + i * 6, y: start.y + i * 3 }]);
    await assertInput(page, 1, 'pan');
    await touch(session, 'touchEnd');
    await assertInput(page, 0, 'idle');
    const dragged = await observe(page);
    assert.ok(Math.hypot(dragged.x - layout.x, dragged.y - layout.y) > 2, 'one-finger drag changes camera');
    assertBounds(dragged, dragged.metrics.viewport.spec.bounds);
    await noAction(page, before, 'touch drag');

    for (const remainingId of [1, 2]) {
      await reset(page);
      before = await activity(page); layout = await observe(page);
      const clear = await clearCanvasPoint(page, { x: layout.width * 0.5, y: layout.height * 0.55 }, [{ x: -25, y: 0 }, { x: 25, y: 0 }]);
      const center = { x: layout.rect.x + clear.x, y: layout.rect.y + clear.y };
      const pair = distance => [{ id: 1, x: center.x - distance, y: center.y }, { id: 2, x: center.x + distance, y: center.y }];
      await touch(session, 'touchStart', pair(25));
      await assertInput(page, 2, 'pinch');
      for (let distance = 30; distance <= 60; distance += 5) await touch(session, 'touchMove', pair(distance));
      const pinched = await observe(page);
      assert.ok(pinched.metrics.zoom > layout.metrics.zoom + 0.5, 'two-finger spread zooms in');
      assertBounds(pinched, pinched.metrics.viewport.spec.bounds);
      await noAction(page, before, 'pinch in progress');
      await capture(page, `${report.name}-pinch-${remainingId}`, report);
      for (let distance = 55; distance >= 30; distance -= 5) await touch(session, 'touchMove', pair(distance));
      assert.ok((await observe(page)).metrics.zoom < pinched.metrics.zoom - 0.4, 'two-finger contraction zooms out');
      // CDP touchEnd targets the released point; an empty list releases all.
      const last = pair(30).find(point => point.id === remainingId);
      const released = pair(30).find(point => point.id !== remainingId);
      await touch(session, 'touchEnd', [released]);
      await assertInput(page, 1, 'release');
      await touch(session, 'touchMove', [{ ...last, x: last.x + 12, y: last.y + 9 }]);
      await touch(session, 'touchEnd');
      await assertInput(page, 0, 'idle');
      await noAction(page, before, `pinch release order, remaining ${remainingId}`);
      close((await observe(page)).scroll.scale, layout.scroll.scale, 'pinch must not zoom the browser', 1e-7);
    }

    await reset(page);
    const cancelTarget = await legalTarget(page, core);
    assert.ok(cancelTarget, 'playable tile for cancellation');
    before = await activity(page);
    await touch(session, 'touchStart', [{ id: 1, x: cancelTarget.x, y: cancelTarget.y }]);
    await touch(session, 'touchCancel');
    await assertInput(page, 0, 'idle');
    await noAction(page, before, 'touch cancellation over a legal move');
    const trace = await page.evaluate(() => window.__cameraTrace);
    assert.ok(trace.touchDown >= 6 && trace.touchUp >= 5 && trace.touchCancel >= 1, 'native touch lifecycle delivered');
    assert.equal(trace.untrusted, 0, 'gestures must not use synthetic DOM events');
    assert.deepEqual(trace.active, [], 'all native pointers released');

    await page.touchscreen.tap(cancelTarget.x, cancelTarget.y);
    assert.deepEqual(await page.evaluate(() => Astraball.snapshot()), before.state, 'tap only prepares the move');
    await page.locator('#confirm-action').click();
    await page.waitForFunction(() => Astraball.snapshot().moved && !Astraball.metrics().busy);
    const state = await page.evaluate(() => Astraball.snapshot()), actor = state.units.find(u => u.id === before.state.activeId);
    assert.deepEqual({ x: actor.x, y: actor.y }, { x: cancelTarget.cell.x, y: cancelTarget.cell.y }, 'ordinary tap still moves after pinch/cancel');
    assert.equal(state.activeId, before.state.activeId, 'tap does not spend an extra activation');
    const input = await page.evaluate(() => Astraball.metrics().input);
    assert.equal(input.cellActivations, before.callbacks.cell + 1, 'ordinary tap invokes exactly one cell callback');
    assert.equal(input.unitActivations, before.callbacks.unit, 'ordinary move tap does not invoke a unit callback');
    await assertInput(page, 0, 'idle');
    report.touch = { drag: true, spread: true, contract: true, bothReleaseOrders: true, cancel: true, tapAfterGesture: true };
  } finally { await touch(session, 'touchCancel').catch(() => {}); await session.detach(); }
}

async function runCase(browser, url, fixture, core, arena, scenario) {
  const report = { ...scenario, captures: [], checks: [], errors: [] };
  const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height },
    deviceScaleFactor: scenario.touch ? 2 : 1, isMobile: scenario.touch, hasTouch: scenario.touch,
    reducedMotion: scenario.reduced ? 'reduce' : 'no-preference' });
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') report.errors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) report.errors.push(`${response.status()} ${response.url()}`); });
  try {
    await context.addInitScript(({ state, arena }) => {
      localStorage.setItem('kalistar.astraball.match.v1', JSON.stringify(state));
      localStorage.setItem('kalistar.astraball.options.v1', JSON.stringify({ mode: 'hotseat', motion: true, sound: false,
        arena, view: 'horizontal', height: 60, ball: 'founders' }));
      const trace = window.__cameraTrace = { wheels: 0, ctrlWheels: 0, touchDown: 0, touchUp: 0, touchCancel: 0, untrusted: 0, active: [] };
      for (const type of ['pointerdown', 'pointerup', 'pointercancel', 'wheel']) document.addEventListener(type, event => {
        if (event.target.tagName !== 'CANVAS') return;
        if (!event.isTrusted) trace.untrusted++;
        if (type === 'wheel') {
          const rect = event.target.getBoundingClientRect();
          trace.lastWheel = { x: event.clientX - rect.x, y: event.clientY - rect.y };
          trace.wheels++; if (event.ctrlKey) trace.ctrlWheels++; return;
        }
        if (type === 'pointerdown') trace.active.push(event.pointerId);
        else trace.active = trace.active.filter(id => id !== event.pointerId);
        if (event.pointerType === 'touch') trace[{ pointerdown:'touchDown', pointerup:'touchUp', pointercancel:'touchCancel' }[type]]++;
      }, { capture: true, passive: true });
    }, { state: fixture, arena: arena.id });
    await page.goto(url);
    await settled(page);
    assert.equal(await page.evaluate(() => Astraball.snapshot().mode), 'hotseat');
    assert.equal(await page.locator('#modal').isVisible(), false, 'seeded match bypasses kickoff asset previews');
    if (scenario.name === 'mobile') {
      const initial = await observe(page);
      close(initial.metrics.zoom, 1.7, 'mobile default zoom before any reset', 1e-8);
      assertBounds(initial, initial.metrics.viewport.spec.bounds);
      await assertInput(page, 0, 'idle');
      await capture(page, 'mobile-default-1.7', report);
      report.defaultMobileView = { zoom: initial.metrics.zoom, viewport: initial.metrics.viewport, beforeAnyReset: true };
    }
    const base = await reset(page), baseline = await activity(page);
    assertVenueMetrics(base.metrics, arena, scenario.reduced);
    await assertInput(page, 0, 'idle');
    report.metricsKeys = Object.keys(base.metrics);
    report.overview = { scale: base.scale, x: base.x, y: base.y, width: base.width, height: base.height };
    report.viewport = base.metrics.viewport;
    report.goals = base.metrics.goals;
    report.diagnostics = { reducedMotion: base.metrics.reducedMotion, arenaTextures: base.metrics.arenaTextures, flagCount: base.metrics.flagCount };
    report.goalVerification = 'targets-and-complete-posts';
    assertBounds(base, base.metrics.viewport.spec.bounds);
    await capture(page, scenario.name + '-overview', report);
    await fixedPlaneChecks(page, arena, base, report);
    await reset(page);

    await page.locator('#zoom-in').click({ clickCount: 4 });
    let before = await observe(page);
    const point = { x: before.width * 0.53, y: before.height * 0.55 };
    const after = await wheel(page, -100, point);
    const receivedPoint = await page.evaluate(() => window.__cameraTrace.lastWheel);
    assert.ok(after.metrics.zoom > before.metrics.zoom, 'plain wheel zooms without Ctrl');
    let freeAxes = 0;
    const art = after.metrics.viewport.spec.bounds;
    for (const [axis, size, start, end] of [['x', after.width, art.left, art.right], ['y', after.height, art.top, art.bottom]]) {
      const anchor = (receivedPoint[axis] - before[axis]) / before.scale;
      const desired = receivedPoint[axis] - anchor * after.scale;
      const min = size - end * after.scale, max = -start * after.scale;
      if (min <= max && desired > min + 0.1 && desired < max - 0.1) {
        close(after[axis] + anchor * after.scale, receivedPoint[axis], `wheel anchor ${axis}`); freeAxes++;
      }
    }
    assert.ok(freeAxes > 0, 'wheel exercise has at least one unclamped anchor axis');
    assertBounds(after, art);
    assert.deepEqual(after.scroll, before.scroll, 'wheel does not scroll or browser-zoom');
    for (let i = 0; i < 10; i++) await wheel(page, -500, point);
    close((await observe(page)).metrics.zoom, 3, 'maximum wheel zoom', 1e-8);
    for (const sign of [1, -1]) {
      const dragged = await mouseDrag(page, sign * 12000, sign * 12000);
      const edges = dragged.metrics.viewport.spec.bounds;
      assertBounds(dragged, edges);
      for (const [axis, size, start, end] of [['x', dragged.width, edges.left, edges.right], ['y', dragged.height, edges.top, edges.bottom]]) {
        if ((end - start) * dragged.scale > size) {
          close(dragged[axis], sign > 0 ? -start * dragged.scale : size - end * dragged.scale, `drag reaches ${axis} edge`);
        }
      }
      const again = await mouseDrag(page, sign * 12000, sign * 12000);
      close(again.x, dragged.x, 'X drag saturation'); close(again.y, dragged.y, 'Y drag saturation');
    }
    await noAction(page, baseline, 'wheel and bounded mouse drag');
    await capture(page, scenario.name + '-drag-clamped', report);
    for (let i = 0; i < 10; i++) await wheel(page, 500, point);
    close((await observe(page)).metrics.zoom, 0.85, 'minimum wheel zoom', 1e-8);
    const restored = await reset(page);
    close(restored.x, base.x, 'reset X'); close(restored.y, base.y, 'reset Y'); close(restored.scale, base.scale, 'reset scale', 1e-8);
    await noAction(page, baseline, 'reset');
    const trace = await page.evaluate(() => window.__cameraTrace);
    assert.ok(trace.wheels >= 21); assert.equal(trace.ctrlWheels, 0); assert.equal(trace.untrusted, 0);
    report.checks.push('plain-wheel-anchor', 'zoom-limits', 'bounded-drag', 'reset', 'no-accidental-action');

    if (scenario.touch) await touchChecks(page, context, core, report);
    await reset(page);
    await page.mouse.move(2, 2);
    await page.waitForTimeout(300);
    const resting = await page.evaluate(() => Astraball.metrics());
    await page.waitForTimeout(900);
    const idle = await page.evaluate(() => Astraball.metrics());
    assertVenueMetrics(idle, arena, scenario.reduced);
    report.idle = { renders: idle.renders - resting.renders, frames: idle.sprites.frameChanges - resting.sprites.frameChanges };
    if (scenario.reduced) {
      assert.equal(report.idle.frames, 0, 'reduced-motion freezes idle sprite poses');
      assert.ok(report.idle.renders <= 1, 'reduced-motion has no idle render loop');
    } else {
      assert.ok(report.idle.frames > 0, 'normal-motion sprites remain animated');
      assert.ok(report.idle.renders >= 2 && report.idle.renders <= 5, 'normal idle stays bounded at about 4fps');
    }
    const overflow = await page.evaluate(() => ({ x: document.documentElement.scrollWidth > innerWidth,
      y: document.documentElement.scrollHeight > innerHeight }));
    assert.deepEqual(overflow, { x: false, y: false }, 'page fits viewport');
    await capture(page, scenario.name + '-final', report);
    report.inputTrace = await page.evaluate(() => window.__cameraTrace);
    report.inputFinal = await page.evaluate(() => Astraball.metrics().input);
    await assertInput(page, 0, 'idle');
    assert.deepEqual(report.errors, [], 'no console, page or failed resource errors');
    report.passed = true;
  } catch (error) {
    report.passed = false; report.failure = error.stack;
    await page.screenshot({ path: path.join(out, scenario.name + '-failure.png'), fullPage: true }).catch(() => {});
    report.lastMetrics = await page.evaluate(() => window.Astraball?.metrics()).catch(() => null);
  } finally { await context.close(); }
  return report;
}

async function captureVenues(browser, url, fixture, arenas, results) {
  const venues = arenas.filter(arena => arena.pixel);
  assert.equal(venues.length, 19, 'capture the full set of 19 pixel venues');
  for (const device of [
    { name: 'desktop', width: 1440, height: 900, touch: false, venues },
    { name: 'razr', width: 412, height: 915, touch: true,
      venues: ['kalistopolis-official', 'astrium', 'zarok-official'].map(id => venues.find(arena => arena.id === id)) },
  ]) {
    assert.ok(device.venues.every(Boolean), 'all requested Razr venues exist');
    const context = await browser.newContext({ viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.touch ? 2 : 1, isMobile: device.touch, hasTouch: device.touch, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [], responses = [];
    let navigations = 0;
    const cacheSession = { device: device.name, changes: 0, mainFrameNavigations: 0, readings: [], passed: false };
    results.arenaCacheSessions.push(cacheSession);
    page.on('framenavigated', frame => { if (frame === page.mainFrame()) navigations++; });
    page.setDefaultTimeout(15000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('response', response => {
      responses.push({ url: response.url(), status: response.status() });
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    try {
      await context.addInitScript(({ state, arena }) => {
        localStorage.setItem('kalistar.astraball.match.v1', JSON.stringify(state));
        if (!localStorage.getItem('kalistar.astraball.options.v1')) {
          localStorage.setItem('kalistar.astraball.options.v1', JSON.stringify({ arena, view: 'horizontal', height: 60,
            mode: 'hotseat', motion: true, sound: false, ball: 'founders' }));
        }
      }, { state: fixture, arena: device.venues[0].id });
      for (const [index, arena] of device.venues.entries()) {
        const name = `venue-${device.name}-${arena.id}`;
        const report = { name, arena: arena.id, title: arena.name, device: device.name, ground: arena.ground,
          captures: [], visualReview: 'pending-parent-inspection', passed: false };
        const errorStart = errors.length, responseStart = responses.length;
        try {
          if (index) {
            await page.locator('#settings').click();
            await page.locator('#locker-tab-arena').click();
            await page.locator('.arena-choice').filter({ has: page.locator(`input[value="${arena.id}"]`) }).click();
            await page.locator('#apply-options').click();
            await page.waitForFunction(id => !document.querySelector('#modal').open && Astraball.metrics().appearance.arena === id, arena.id);
            cacheSession.changes++;
          } else await page.goto(url);
          await settled(page);
          const observation = await reset(page);
          assert.equal(observation.metrics.appearance.arena, arena.id);
          assert.equal(observation.metrics.appearance.view, 'horizontal');
          assert.equal(observation.metrics.sprites.count, 10);
          assertVenueMetrics(observation.metrics, arena, true);
          cacheSession.mainFrameNavigations = navigations;
          cacheSession.readings.push({ arena: arena.id, changes: cacheSession.changes, arenaTextures: observation.metrics.arenaTextures });
          assert.equal(navigations, 1, 'arena browsing must not reload or navigate the document');
          assert.equal(observation.metrics.arenaTextures, Math.min(index + 1, 2), 'continuous venue switches keep only current and previous arena');
          await assertInput(page, 0, 'idle');
          assert.equal(observation.metrics.input.cellActivations, 0, 'venue controls do not activate cells');
          assert.equal(observation.metrics.input.unitActivations, 0, 'venue controls do not activate units');
          assert.deepEqual(await page.evaluate(() => Astraball.snapshot()), fixture, 'capture leaves the match untouched');
          assert.deepEqual(observation.metrics.viewport.spec.bounds, { left: 0, top: 0, right: 1536, bottom: 1024 });
          assertBounds(observation, observation.metrics.viewport.spec.bounds);
          assertOverview(observation);
          assert.ok(responses.slice(responseStart).some(response => response.status === 200 && response.url === new URL(arena.horizontal, url).href),
            'the requested venue texture loaded successfully');
          await page.mouse.move(2, 2);
          await settled(page);
          const pixels = await capture(page, name, report), metadata = await sharp(pixels).metadata();
          const rx = metadata.width / observation.width, ry = metadata.height / observation.height;
          const left = Math.max(0, Math.floor(observation.x * rx)), top = Math.max(0, Math.floor(observation.y * ry));
          const right = Math.min(metadata.width, Math.ceil((observation.x + 1536 * observation.scale) * rx));
          const bottom = Math.min(metadata.height, Math.ceil((observation.y + 1024 * observation.scale) * ry));
          assert.ok(right > left && bottom > top, 'artwork has a visible canvas area');
          const art = sharp(pixels).extract({ left, top, width: right - left, height: bottom - top });
          const stats = await art.clone().stats();
          const { data, info } = await art.clone().resize(64, 64, { fit: 'fill' }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
          const colors = new Set();
          for (let i = 0; i < data.length; i += info.channels) colors.add(`${data[i] >> 4}:${data[i + 1] >> 4}:${data[i + 2] >> 4}`);
          const variance = Math.max(...stats.channels.slice(0, 3).map(channel => channel.stdev));
          assert.ok(variance > 12 && colors.size >= 24, 'visible artwork is nonblank, excluding letterbox bars');
          report.pixelQA = { canvasWidth: metadata.width, canvasHeight: metadata.height, artVariance: variance,
            sampledColors: colors.size, visibleArt: { left, top, width: right - left, height: bottom - top } };
          report.viewport = observation.metrics.viewport;
          report.goals = observation.metrics.goals;
          report.diagnostics = { reducedMotion: observation.metrics.reducedMotion, arenaTextures: observation.metrics.arenaTextures,
            flagCount: observation.metrics.flagCount, input: observation.metrics.input };
          report.errors = errors.slice(errorStart);
          assert.deepEqual(report.errors, [], 'venue boot and rendering have no resource or page errors');
          report.passed = true;
        } catch (error) {
          report.failure = error.stack; report.errors = errors.slice(errorStart);
          await page.screenshot({ path: path.join(out, name + '-failure.png'), fullPage: true }).catch(() => {});
        }
        results.venueCaptures.push(report);
        console.log(`${report.passed ? 'PASS' : 'FAIL'} ${name}${report.failure ? ': ' + report.failure.split('\n')[0] : ''}`);
      }
      const reports = results.venueCaptures.filter(report => report.device === device.name);
      if (device.name === 'desktop') assert.ok(cacheSession.changes >= 4, 'exercise at least four arena changes in the same document');
      cacheSession.maxArenaTextures = Math.max(...cacheSession.readings.map(reading => reading.arenaTextures));
      cacheSession.passed = reports.length === device.venues.length && reports.every(report => report.passed) &&
        cacheSession.mainFrameNavigations === 1 && cacheSession.changes === device.venues.length - 1 && cacheSession.maxArenaTextures <= 2;
    } finally { await context.close(); }
  }
  const desktop = results.venueCaptures.filter(report => report.device === 'desktop' && report.passed);
  if (desktop.length === 19) assert.equal(new Set(desktop.map(report => report.captures[0].sha256)).size, 19, 'each desktop venue renders a distinct canvas');
}

function venueIndex(reports) {
  const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));
  return '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Astraball - inspection des 19 terrains</title><style>body{font:16px system-ui;margin:24px;background:#f3f5f6;color:#172629}' +
    'main{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,440px),1fr));gap:24px}h2{font-size:18px}img{width:100%;height:auto}' +
    'a{color:#006b66}article{min-width:0}p{line-height:1.5}</style><h1>Terrains Astraball</h1>' +
    '<p>19 vues desktop et 3 vues Razr. Inspection visuelle du parent requise. Les controles techniques ne valent pas approbation artistique.</p><main>' +
    reports.map(report => `<article><h2>${escape(report.title)} / ${escape(report.device)}</h2><p>${escape(report.arena)} | ground ${escape(report.ground.join('-'))} | QA ${report.passed ? 'PASS' : 'FAIL'}</p>` +
      (report.captures.length ? `<a href="${escape(report.name)}.png"><img loading="lazy" src="${escape(report.name)}.png" alt="${escape(report.title)} ${escape(report.device)}"></a><p><a href="${escape(report.name)}-canvas.png">Canvas seul</a></p>` : `<p>${escape(report.failure || 'Capture indisponible')}</p>`) + '</article>').join('') + '</main></html>';
}

async function main() {
  fs.mkdirSync(out, { recursive: true });
  const results = { arena: arenaId,
    scope: 'Functional camera/input QA only. Captures do not approve venue artwork/ground calibration.',
    textures: [], cases: [], venueCaptures: [], arenaCacheSessions: [], venueSwitches: 'UI without reload; validates two-arena cache bound',
    cameraGestures: process.env.KALISTAR_CAMERA_CAPTURE_ONLY === '1' ? 'not-run-capture-only' : 'included',
    visualReview: { status: 'pending-parent-inspection', index: 'venues.html' }, passed: false };
  let browser, server;
  try {
    const core = await import(pathToFileURL(path.join(gameRoot, 'src/core/game.mjs')));
    const { ARENAS } = await import(pathToFileURL(path.join(gameRoot, 'src/appearance.mjs')));
    const arena = ARENAS.find(candidate => candidate.id === arenaId);
    assert.ok(arena, `Unknown QA arena: ${arenaId}`);
    results.ground = arena.ground;
    const serving = await serve(); server = serving.server; results.url = serving.url;
    for (const asset of new Set([arena.horizontal, arena.isometric])) {
      const response = await fetch(new URL(asset, serving.url));
      assert.equal(response.status, 200, `Arena export unavailable: ${asset}; no fallback or synthetic texture is substituted`);
      const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
      results.textures.push({ asset, width: metadata.width, height: metadata.height, pixel: !!arena.pixel });
      if (arena.pixel) {
        assert.equal(metadata.width, 1536, 'pixel artwork width'); assert.equal(metadata.height, 1024, 'pixel artwork height');
      }
    }
    const fixture = core.createMatch({ seed: 7, mode: 'hotseat' });
    while (fixture.phase === 'placement') assert.equal(core.applyCommand(fixture, { type: 'ready', team: fixture.placement.team }).ok, true);
    core.validateState(fixture);
    browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--ignore-gpu-blocklist'] });
    for (const scenario of process.env.KALISTAR_CAMERA_CAPTURE_ONLY === '1' ? [] : [
      { name: 'desktop', width: 1440, height: 900, touch: false, reduced: false },
      { name: 'wide-reduced', width: 1920, height: 1080, touch: false, reduced: true },
      { name: 'mobile', width: 412, height: 915, touch: true, reduced: false },
      { name: 'compact-reduced', width: 360, height: 800, touch: true, reduced: true },
      { name: 'landscape-reduced', width: 915, height: 412, touch: true, reduced: true },
    ]) {
      const report = await runCase(browser, serving.url, fixture, core, arena, scenario);
      results.cases.push(report);
      console.log(`${report.passed ? 'PASS' : 'FAIL'} ${scenario.name}${report.failure ? ': ' + report.failure.split('\n')[0] : ''}`);
    }
    await captureVenues(browser, serving.url, fixture, ARENAS, results);
    results.passed = results.cases.every(report => report.passed) && results.venueCaptures.length === 22 &&
      results.venueCaptures.every(report => report.passed) && results.arenaCacheSessions.length === 2 && results.arenaCacheSessions.every(report => report.passed);
    if (!results.passed) process.exitCode = 1;
  } catch (error) {
    results.failure = error.stack; process.exitCode = 1; console.error(error);
  } finally {
    await browser?.close();
    if (server) await new Promise(resolve => server.close(resolve));
    fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(results, null, 2) + '\n');
    fs.writeFileSync(path.join(out, 'venues.html'), venueIndex(results.venueCaptures));
    console.log('Camera QA: ' + path.join(out, 'results.json'));
  }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
