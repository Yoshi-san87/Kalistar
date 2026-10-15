'use strict';
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const L = require('../../atelier/lib.cjs');
const { createEngine } = require('../../site/engine.js');
const M = require('./model.cjs'), set = require('./set.json');
const { fs, path, crypto } = L;
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = path.join(__dirname, 'verification/live');
async function json(route) { const r = await fetch(url + route); assert.equal(r.status, 200); return r.json(); }
function step(e, s) {
  if (s.phase === 'choose') e.lock(s, ...e.aiChoice(s));
  else if (s.phase === 'attack') e.rollAttack(s);
  else if (s.phase === 'defense') e.rollDefense(s);
  else if (s.phase === 'result') e.next(s);
  else if (s.phase === 'replace') e.autoDeploy(s, s.replacing);
  else {
    const suffix = { guard: 'Guard', heart: 'Reraise', potion: 'Potion', physical: 'Physical', clover: 'Clover' }[s.phase];
    assert.ok(suffix, s.phase); e['grant' + suffix](s, e['ai' + suffix + 'Choice'](s));
  }
}
async function main() {
  fs.mkdirSync(output, { recursive: true });
  const data = await json('/api/game/catalogue'), status = await json('/api/status');
  assert.equal(data.cards.length, 49); assert.equal(data.cards.filter(c => c.faction === 'FF7').length, 10);
  assert.equal(status.integrity.state, 'intact'); assert.equal(status.gate.passed, true);
  const presets = M.validateGame(data, set, createEngine), e = createEngine(data), media = [], matches = [];
  for (const card of set.cards) {
    const r = await fetch(url + '/media/created/' + card.id + '.png'); assert.equal(r.status, 200);
    const hash = crypto.createHash('sha256').update(Buffer.from(await r.arrayBuffer())).digest('hex');
    assert.equal(hash, await L.hash(path.join(__dirname, 'cards', card.key, 'card.png'))); media.push(card.key);
  }
  for (const preset of presets) for (const arenaId of set.arenas) for (let n = 0; n < 6; n++) {
    const opponent = n % 2 ? data.decks.enemy : presets[1].cards;
    const s = e.newGame(preset.cards, opponent, { arenaId, seed: 'FF8-live-' + preset.id + '-' + n, deckCoverage: 2 });
    e.autoDeploy(s, 0); e.autoDeploy(s, 1); e.start(s);
    for (let i = 0; i < 10000 && s.phase !== 'over'; i++) { step(e, s); e.assertState(s); }
    assert.equal(s.phase, 'over'); matches.push({ preset: preset.id, arenaId, winner: s.winner, exchanges: s.round });
  }
  const modules = path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  const { chromium } = createRequire(path.join(modules, '__ff8_live__.cjs'))('playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const errors = [], badResponses = [];
  try {
    const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('pageerror', x => errors.push(x.message));
    page.on('response', r => { if (r.status() >= 400) badResponses.push(r.url()); });
    await page.goto(url + '/jeu/'); await page.waitForFunction(() => window.KALISTAR_READY === true);
    assert.deepEqual(await page.evaluate(() => [KALISTAR_DATA.cards.length, KALISTAR_DB.registry.owned('user-paris').length, KALISTAR_DB.registry.owned('user-tokyo').length]), [49, 49, 0]);
    await page.locator('[data-binder-action=scope][data-id=ff8]').click();
    await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth));
    await page.screenshot({ path: path.join(output, 'collection-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(() => [...document.images].filter(i => i.getClientRects().length).every(i => i.complete && i.naturalWidth));
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: path.join(output, 'collection-mobile.png') });
    assert.deepEqual(errors, []); assert.deepEqual(badResponses, []);
    L.write(path.join(output, 'report.json'), { passed: true, catalogue: data.cards.length, ff8: media, matches, integrity: status.integrity, gate: status.gate, errors, badResponses, storage: 'isolated fresh context', checkedAt: new Date().toISOString() });
    console.log(JSON.stringify({ passed: true, cards: data.cards.length, media: media.length, matches: matches.length, errors }));
  } finally { await browser.close(); }
}
main().catch(e => { console.error(e); process.exitCode = 1; });
