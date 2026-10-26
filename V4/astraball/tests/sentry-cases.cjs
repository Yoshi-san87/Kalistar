const assert = require('node:assert/strict');
const path = require('node:path');

module.exports = async ({ browser, url, OUT, sharp }) => {
  const core = await import('../src/core/game.mjs');
  const { SENTRY_SKILLS, skillFor } = await import('../src/core/skills.mjs');
  const point = ({ x, y }) => ({ x, y });
  const byRole = (state, team, role) => state.units.find(u => u.team === team && u.role === role);
  const mirror = (team, x) => team === 0 ? x : 12 - x;
  const reports = [];

  function command(state, action) {
    const result = core.applyCommand(state, action);
    assert.equal(result.ok, true, `${JSON.stringify(action)}: ${result.error}`);
    assert.equal(core.validateState(state), true);
    return result;
  }

  function place(state, who, x, y) {
    Object.assign(who, { x, y });
    if (state.ball.holderId === who.id) Object.assign(state.ball, { x, y });
    return who;
  }

  function activate(state, who) {
    state.units.forEach(u => { u.acted = false; });
    for (const entry of core.getInitiative(state)) {
      if (entry.id === who.id) break;
      core.getUnit(state, entry.id).acted = true;
    }
    state.activeId = who.id;
    state.moved = false;
  }

  function fixture(team = 0, role = 'sentry') {
    const state = core.createMatch({ seed: 1, mode: 'hotseat' });
    while (state.phase === 'placement') command(state, { type: 'ready', team: state.placement.team });
    const columns = { meneur: 4, scoreur: 5, middle: 6, sentry: 7, pilier: 1 };
    for (const u of state.units) place(state, u, mirror(u.team, columns[u.role]), u.team === 0 ? 0 : 6);
    place(state, byRole(state, team, 'middle'), mirror(team, 6), 3);
    place(state, byRole(state, team, 'meneur'), mirror(team, 5), 2);
    place(state, byRole(state, team, 'scoreur'), mirror(team, 8), 3);
    place(state, byRole(state, 1 - team, 'middle'), mirror(team, 5), 4);
    const actor = byRole(state, team, role);
    place(state, actor, mirror(team, role === 'pilier' ? 3 : 4), 3);
    state.ball = { holderId: actor.id, ...point(actor) };
    activate(state, actor);
    assert.equal(core.validateState(state), true);
    return state;
  }

  async function boot(context, state, motion = false) {
    await context.addInitScript(({ state, motion }) => {
      if (!localStorage.getItem('kalistar.astraball.match.v1')) {
        localStorage.setItem('kalistar.astraball.match.v1', JSON.stringify(state));
      }
      localStorage.setItem('kalistar.astraball.options.v1', JSON.stringify({ mode: 'hotseat', motion, sound: false }));
    }, { state, motion });
    const page = await context.newPage(), errors = [], v2Requests = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    page.on('request', request => {
      if (/\/(?:animation-kit|sprites-v2)\//.test(request.url())) v2Requests.push(request.url());
    });
    await page.goto(url);
    await page.waitForFunction(() => window.Astraball?.ready);
    assert.deepEqual(await snapshot(page), state, 'engine fixture restored without roster replacement');
    return { page, errors, v2Requests };
  }

  async function snapshot(page) { return page.evaluate(() => window.Astraball.snapshot()); }
  async function idle(page) { await page.waitForFunction(() => !window.Astraball.metrics().busy); }
  async function reload(page, state) {
    assert.equal(core.validateState(state), true);
    await page.evaluate(s => localStorage.setItem('kalistar.astraball.match.v1', JSON.stringify(s)), state);
    await page.reload();
    await page.waitForFunction(() => window.Astraball?.ready);
    assert.deepEqual(await snapshot(page), state);
  }
  async function capture(page, name) {
    if (OUT) await page.screenshot({ path: path.join(OUT, `sentry-${name}.png`) });
  }
  async function choose(page, type, targetId) {
    await page.locator('[data-mode="skills"]').click();
    await page.locator(`[data-skill="${type}"]`).click();
    await page.locator(`[data-target-id="${targetId}"]`).click();
    assert.equal(await page.locator('#confirm-action').isEnabled(), true);
  }
  async function bounded(page) {
    await page.locator('#action-wheel').evaluate(async root => {
      await Promise.all(root.getAnimations({ subtree: true }).map(animation => animation.finished.catch(() => {})));
    });
    const layout = await page.evaluate(() => ({
      host: document.querySelector('.arena').getBoundingClientRect().toJSON(),
      buttons: [...document.querySelectorAll('#action-wheel .wheel-action,#action-toggle')]
        .filter(el => el.checkVisibility()).map(el => ({
          ...el.getBoundingClientRect().toJSON(), label: el.getAttribute('aria-label') || el.title,
          radius: getComputedStyle(el).borderTopLeftRadius,
        })),
      overflow: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight,
    }));
    assert.equal(layout.overflow, false, 'no page overflow');
    for (const b of layout.buttons) {
      assert.ok(b.label, 'accessible action name');
      assert.ok(b.width >= 44 && b.height >= 44, `${b.label}: ${b.width} x ${b.height}`);
      assert.ok(b.left >= layout.host.left - 1 && b.right <= layout.host.right + 1, `horizontal: ${b.label}`);
      assert.ok(b.top >= layout.host.top - 1 && b.bottom <= layout.host.bottom + 1, `vertical: ${b.label}`);
    }
    for (let i = 0; i < layout.buttons.length; i++) for (const b of layout.buttons.slice(i + 1)) {
      const a = layout.buttons[i];
      assert.equal(a.radius, '50%', 'wheel controls retain their circular hit area');
      assert.equal(b.radius, '50%');
      const separation = Math.hypot(a.left + a.width / 2 - b.left - b.width / 2,
        a.top + a.height / 2 - b.top - b.height / 2);
      assert.ok(separation >= (a.width + b.width) / 2 - 0.5, `overlapping controls: ${a.label} / ${b.label}`);
    }
  }

  for (const [name, width, height, team] of [
    ['desktop', 1440, 900, 0], ['wide', 1920, 1080, 1], ['razr', 412, 915, 0],
    ['compact', 360, 800, 1], ['landscape', 915, 412, 0],
  ]) {
    const context = await browser.newContext({
      viewport: { width, height }, reducedMotion: 'reduce', isMobile: width < 761, hasTouch: width < 761,
    });
    try {
      const initial = fixture(team), actor = core.activeUnit(initial);
      const { page, errors, v2Requests } = await boot(context, initial);
      const wheel = page.locator('#action-wheel');
      const input = await page.evaluate(() => window.Astraball.metrics().input.cellActivations);
      assert.equal(await page.locator('[data-mode="skills"]').isVisible(), true);
      await bounded(page);
      await page.locator('[data-mode="skills"]').click();
      assert.equal(await wheel.getAttribute('data-view'), 'skills');
      assert.deepEqual((await page.locator('#skill-options [data-skill]').evaluateAll(nodes => nodes.map(n => n.dataset.skill))).sort(),
        SENTRY_SKILLS.map(s => s.id).sort());
      await bounded(page);
      await capture(page, `${name}-menu`);
      await page.locator('#action-toggle').focus();
      await page.keyboard.press('ArrowRight');
      assert.equal(await page.locator('[data-skill="relay"]').evaluate(el => el === document.activeElement), true);
      for (const { id } of SENTRY_SKILLS) {
        await page.locator(`[data-skill="${id}"]`).click();
        assert.equal(await wheel.getAttribute('data-view'), id);
        const targets = initial.units.filter(u => core.previewAction(initial, { type: id, targetId: u.id }).legal);
        const actual = await page.locator('#target-options [data-target-id]').evaluateAll(nodes => nodes.map(n => n.dataset.targetId));
        assert.deepEqual(actual.sort(), targets.map(u => u.id).sort(), `${id} targets match the engine`);
        assert.equal(await page.locator('#confirm-action').isDisabled(), true);
        await page.locator(`[data-target-id="${targets[0].id}"]`).click();
        assert.equal(await page.locator('#confirm-action').isEnabled(), true);
        assert.match(await page.locator('#confirm-action').getAttribute('aria-label'), new RegExp(skillFor(id).label));
        assert.deepEqual(await snapshot(page), initial, 'selecting a target is not casting');
        await bounded(page);
        await capture(page, `${name}-${id}-preview`);
        await page.locator('#action-toggle').click();
        assert.equal(await wheel.getAttribute('data-view'), 'skills');
      }
      await page.keyboard.press('Escape');
      assert.equal(await wheel.getAttribute('data-view'), 'actions');
      assert.deepEqual(await snapshot(page), initial, 'all cancellations are read-only');
      assert.equal(await page.evaluate(() => window.Astraball.metrics().input.cellActivations), input, 'menu clicks do not hit the pitch');

      for (const { id } of SENTRY_SKILLS) {
        await reload(page, initial);
        const target = byRole(initial, id === 'jam' ? 1 - team : team, 'middle');
        const expected = structuredClone(initial);
        command(expected, { type: id, targetId: target.id });
        await choose(page, id, target.id);
        await page.locator('#confirm-action').click();
        await idle(page);
        assert.deepEqual(await snapshot(page), expected, 'confirmed browser action equals engine action');
        assert.equal(await page.evaluate(() => window.Astraball.metrics().effectCount), 0, 'finite cast cleaned up');
        assert.equal(await page.locator(`#initiative [data-unit="${target.id}"] [data-effect="${id}"]`).isVisible(), true);
        assert.equal(await page.evaluate(() => window.Astraball.metrics().ballCharged), id === 'charged-pass');
        await page.locator(`#initiative [data-unit="${target.id}"]`).click();
        assert.equal(await page.locator(`#dialog-content [data-effect="${id}"]`).isVisible(), true);
        assert.match(await page.locator('#dialog-content .unit-effects').textContent(), new RegExp(skillFor(id).label));
        assert.deepEqual(await snapshot(page), expected, 'inspecting an effect is read-only');
        await capture(page, `${name}-${id}-effect`);
        await page.locator('#close-dialog').click();
        await page.reload();
        await page.waitForFunction(() => window.Astraball?.ready);
        assert.deepEqual(await snapshot(page), expected, 'effects and charge survive a real reload');
        assert.equal(await page.evaluate(() => window.Astraball.metrics().effectCount), 0);
        await bounded(page);
      }

      const noBall = structuredClone(initial), carrier = byRole(noBall, team, 'middle');
      noBall.ball = { holderId: carrier.id, ...point(carrier) };
      await reload(page, noBall);
      await page.locator('[data-mode="skills"]').click();
      assert.equal(await page.locator('[data-skill="charged-pass"]').isDisabled(), true);
      assert.match(await page.locator('[data-skill="charged-pass"]').getAttribute('title'), /ballon/i);
      assert.equal(await page.locator('[data-skill="relay"]').isEnabled(), true);
      const charged = structuredClone(initial);
      charged.ball.charge = { team, sourceId: actor.id };
      await reload(page, charged);
      assert.equal(await page.locator('[data-mode="pass"]').isEnabled(), true);
      await page.locator('[data-mode="skills"]').click();
      assert.equal(await page.locator('[data-skill="charged-pass"]').isDisabled(), true);
      assert.match(await page.locator('[data-skill="charged-pass"]').getAttribute('title'), /Ballon d.j. charg/);

      const interception = fixture(team);
      place(interception, byRole(interception, 1 - team, 'middle'), mirror(team, 5), 3);
      const target = byRole(interception, team, 'middle');
      await reload(page, interception);
      await choose(page, 'charged-pass', target.id);
      assert.match(await page.locator('#target-description').textContent(), /Interception.*aucun bonus/i);
      await page.locator('#confirm-action').click();
      await idle(page);
      command(interception, { type: 'charged-pass', targetId: target.id });
      assert.deepEqual(await snapshot(page), interception);
      assert.equal(await page.locator('[data-effect="charged-pass"]').count(), 0);
      assert.equal(await page.evaluate(() => window.Astraball.metrics().ballCharged), false);

      for (const role of ['meneur', 'scoreur', 'middle', 'pilier']) {
        await reload(page, fixture(team, role));
        assert.equal(await page.locator('[data-mode="skills"]').isVisible(), false, `${role}: original action menu`);
      }
      await reload(page, core.createMatch({ mode: 'hotseat', seed: 1 }));
      assert.equal(await page.locator('[data-mode="skills"]').isVisible(), false, 'no skills during placement');
      await reload(page, initial);
      const canvasStats = await sharp(await page.locator('canvas').screenshot()).stats();
      assert.ok(canvasStats.channels[0].stdev > 20, 'real rendered legacy sprites and pitch');
      const renders = await page.evaluate(() => window.Astraball.metrics().renders);
      await page.waitForTimeout(800);
      assert.ok(await page.evaluate(() => window.Astraball.metrics().renders) - renders <= 2, 'reduced motion has no permanent cast loop');
      assert.deepEqual(errors, []);
      assert.deepEqual(v2Requests, []);
      reports.push({ name, team, menus: true, casts: 4, reload: true, interception: true, errors });
    } finally { await context.close(); }
  }

  for (const [name, width, height, types] of [
    ['animated-desktop', 1440, 900, SENTRY_SKILLS.map(s => s.id)], ['animated-razr', 412, 915, ['cover']],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, isMobile: width < 761, hasTouch: width < 761 });
    try {
      const initial = fixture(), actor = core.activeUnit(initial);
      const { page, errors, v2Requests } = await boot(context, initial, true);
      for (const type of types) {
        await reload(page, initial);
        const target = byRole(initial, type === 'jam' ? 1 : 0, 'middle');
        await choose(page, type, target.id);
        const beforePixels = await sharp(await page.locator('canvas').screenshot()).removeAlpha().raw().toBuffer();
        const started = Date.now();
        await page.locator('#confirm-action').click();
        await page.waitForFunction(id => {
          const m = window.Astraball.metrics();
          return m.busy && m.effectCount > 0 && m.sprites.units.find(u => u.id === id)?.pose === 'guard';
        }, actor.id);
        await page.evaluate(() => {
          Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await page.waitForTimeout(100);
        const paused = await page.evaluate(() => window.Astraball.metrics());
        assert.ok(paused.effectCount >= 2, 'glyph and caption exist during cast');
        assert.ok(paused.sprites.units.every(u => u.frame >= 0 && u.frame < 16), 'no future atlas indices');
        await page.waitForTimeout(800);
        const hidden = await page.evaluate(() => window.Astraball.metrics());
        assert.equal(hidden.busy, true, 'hidden time must not finish the cast');
        assert.equal(hidden.renders, paused.renders, 'hidden casting and idle are both paused');
        assert.equal(hidden.sprites.frameChanges, paused.sprites.frameChanges);
        const activePixels = await sharp(await page.locator('canvas').screenshot()).removeAlpha().raw().toBuffer();
        assert.equal(activePixels.length, beforePixels.length);
        let changed = 0;
        for (let i = 0; i < activePixels.length; i++) if (Math.abs(activePixels[i] - beforePixels[i]) > 20) changed++;
        assert.ok(changed > 100, 'the cast changes actual canvas pixels');
        await capture(page, `${name}-${type}-cast`);
        await page.evaluate(() => {
          delete document.hidden;
          document.dispatchEvent(new Event('visibilitychange'));
        });
        await idle(page);
        assert.ok(Date.now() - started < 15000, 'cast completes after visibility resumes');
        const expected = structuredClone(initial);
        command(expected, { type, targetId: target.id });
        assert.deepEqual(await snapshot(page), expected);
        assert.equal(await page.evaluate(() => window.Astraball.metrics().effectCount), 0, 'no glyph, caption or trail leaks');
        assert.equal(await page.evaluate(() => window.Astraball.metrics().ballCharged), type === 'charged-pass');
        const renderStart = await page.evaluate(() => window.Astraball.metrics().renders);
        await page.waitForTimeout(800);
        const idleRenders = await page.evaluate(() => window.Astraball.metrics().renders) - renderStart;
        assert.ok(idleRenders >= 2 && idleRenders <= 5, `only the ordinary 4 Hz idle remains: ${idleRenders}`);
        await page.locator('#help').click();
        const modalRenders = await page.evaluate(() => window.Astraball.metrics().renders);
        await page.waitForTimeout(500);
        assert.equal(await page.evaluate(() => window.Astraball.metrics().renders), modalRenders, 'modal pauses idle after magic');
        await page.locator('#close-dialog').click();
        await bounded(page);
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(v2Requests, []);
      reports.push({ name, casts: types, finiteCleanup: true, hiddenPause: true, legacySprites: true, errors });
    } finally { await context.close(); }
  }
  return reports;
};
