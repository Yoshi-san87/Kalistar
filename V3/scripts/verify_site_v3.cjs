'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const http = require('node:http');
const { createRequire } = require('node:module');
const root = path.resolve(__dirname, '..');
const site = path.join(root, 'site');
const source = fs.readFileSync(path.join(site, 'data.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox);
const supplied = JSON.parse(JSON.stringify(sandbox.window.KALISTAR_DATA));
const engine = require(path.join(site, 'engine.js'));
const finalData = supplied.cards.length === 41 && new Set(supplied.cards.map(c => c.characterId)).size === 40 && supplied.cards.every(c => /^300000(?:0[1-9]|[1-3][0-9]|4[01])$/.test(c.id) && c.characterId) && supplied.arenas?.length;
if (process.argv.includes('--require-final')) assert.ok(finalData, 'Le roster/arènes final V3 est encore absent.');
const mocked = process.argv.includes('--mock') || !finalData;
const output = path.join(root, 'verification-site', ...(mocked ? ['mock'] : []));
function fixture() {
  const d = structuredClone(supplied);
  d.cards = Array.from({ length: 41 }, (_, i) => {
    const c = structuredClone(supplied.cards[i % supplied.cards.length]), role = i % 5 + 1;
    return { ...c, id: String(30000001 + i), characterId: i === 0 || i === 40 ? 'momo' : 'mock-' + i,
      name: i === 0 || i === 40 ? 'MOMO' : 'TEST ' + i, title: 'PROFIL DE TEST ' + i, role, positions: [role], sentry: true,
      canGuard: role === 1, canHeal: role === 5, element: i === 5 ? 'NONE' : 'ELECTRO',
      atk: [200, 180, 140, 120, 80, role === 1 ? 'guard' : role === 5 ? 'revive' : 'death'],
      defense: [220, 180, 140, 100, 'retry', 'dodge'], magic: role === 4 ? [6, 5, 4, 3, 2] : [], barriers: i === 5 ? [] : [6] };
  });
  d.elements.NONE = { id: 'NONE', label: 'SANS CRISTAL', color: '93AAA5', hue: 160 };
  d.demo = { ...d.demo, version: 'V3-test', copy_limit: 2, token_bonus: 60, max_turns: 200 };
  d.decks = { player: d.cards.slice(0, 10).map(c => c.id), enemy: d.cards.slice(10, 20).map(c => c.id) };
  d.arenas = [{ id: 'fixture-home', name: 'Terrain de test', subtitle: 'Affinités V3', image: 'assets/arena.webp', element: 'ELECTRO', elementBonus: 15, homeCharacters: ['momo'], homeAttack: 10, homeDefense: 10, source: 'Verification V3' }, { id: 'ruins', name: 'Ruines', subtitle: 'Neutre', image: 'assets/arena.webp', element: 'NONE', elementBonus: 0, homeCharacters: [], homeAttack: 0, homeDefense: 0, source: 'Verification V3' }];
  return d;
}
const data = mocked ? fixture() : supplied;
const E = engine.createEngine(data);
assert.equal(typeof E.grantGuard, 'function', 'Le moteur doit fournir le contrat V3.');
function deckFor(card) {
  const ids = [card.id];
  for (let role = 1; role <= 5; role++) {
    while (E.deckCoverage(ids)[role] < 2) ids.push(data.cards.find(c => c.positions.includes(role) && !ids.includes(c.id) && c.element !== 'RAINBOW').id);
  }
  for (const c of data.cards) if (ids.length < 10 && !ids.includes(c.id) && c.element !== 'RAINBOW') ids.push(c.id);
  assert.deepEqual(E.validatePlayableDeck(ids), []);
  return ids;
}
function scenario(kind, side = 0) {
  const guard = data.cards.find(c => c.canGuard && c.atk.includes('guard'));
  const none = data.cards.find(c => c.element === 'NONE');
  const attacks = kind === 'guard' ? [guard] : data.cards.filter(c => c.atk.some((v, i) => kind === 'death' ? v === 'death' : typeof v === 'number' && (kind === 'magic' ? c.magic.includes(6-i) : !c.magic.includes(6-i))));
  for (const a of attacks.filter(Boolean)) for (let seed = 0; seed < 200; seed++) {
    const b = none || data.cards[1], ds = [deckFor(a), deckFor(b)];
    if (side) ds.reverse();
    const arena = data.arenas.find(x => x.element === a.element) || data.arenas[0];
    const s = E.newGame(...ds, { mode: 'local', seed: 'UI-V3-' + seed, arenaId: arena.id, deckCoverage: 2 });
    E.autoDeploy(s, 0); E.autoDeploy(s, 1);
    const attacker = s.players[side].board.findIndex(u => u?.cardId === a.id), target = s.players[1-side].board.findIndex(u => u?.cardId === b.id);
    if (attacker < 0 || target < 0) continue;
    E.start(s); s.turn = side;
    if (kind !== 'guard') s.players[1-side].board[target].ward = 60;
    E.lock(s, attacker, target); E.rollAttack(s);
    if (kind === 'guard' && s.phase === 'guard') return s;
    if (s.phase !== 'defense') continue;
    if (kind === 'death' ? s.duel.attackValue !== 'death' : typeof s.duel.attackValue !== 'number') continue;
    if (kind !== 'death' && s.duel.magic !== (kind === 'magic')) continue;
    const next = E.clone(s); E.rollDefense(next);
    if (kind === 'dodge' ? next.duel.defenseValue === 'dodge' : kind === 'death' ? next.phase === 'result' && next.duel.defenseValue !== 'dodge' : !!next.duel.formula) return s;
  }
  throw new Error('Scénario indisponible : ' + kind);
}
function completedMatch() {
  const s = E.newGame(data.decks.player, data.decks.enemy, { mode: 'local', seed: 'V3-ARCHIVES', arenaId: data.arenas[0].id, deckCoverage: 2 });
  E.autoDeploy(s, 0); E.autoDeploy(s, 1); E.start(s);
  for (let n = 0; n < 6000 && s.phase !== 'over'; n++) {
    if (s.phase === 'choose') E.lock(s, ...E.aiChoice(s));
    else if (s.phase === 'attack') E.rollAttack(s);
    else if (s.phase === 'defense') E.rollDefense(s);
    else if (s.phase === 'guard') E.grantGuard(s, E.aiGuardChoice(s));
    else if (s.phase === 'clover') E.grantClover(s, E.aiCloverChoice(s));
    else if (s.phase === 'potion') E.grantPotion(s, E.aiPotionChoice(s));
    else if (s.phase === 'physical') E.grantPhysical(s, E.aiPhysicalChoice(s));
    else if (s.phase === 'heart') E.grantReraise(s, E.aiReraiseChoice(s));
    else if (s.phase === 'replace') E.autoDeploy(s, s.replacing);
    else if (s.phase === 'result') E.next(s);
  }
  assert.equal(s.phase, 'over'); E.assertState(s); return s;
}
function playwright() {
  try { return require('playwright'); } catch {}
  const bundle = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE || '', '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
  return createRequire(path.join(bundle, '__kalistar__.cjs'))('playwright');
}
const report = { testedAt: new Date().toISOString(), mode: mocked ? 'mock-data-real-v3-engine' : 'final-data-real-v3-engine', cards: data.cards.length, characters: new Set(data.cards.map(c => c.characterId)).size, arenas: data.arenas.length, tests: [], missingAssets: [], assetGeometryIssues: [], browserErrors: [], screenshots: [] };
for (const effect of new Set(data.cards.flatMap(c => [...c.atk, ...c.defense]).filter(v => typeof v === 'string'))) if (!fs.existsSync(path.join(root, 'assets/effets', effect + '.png'))) report.missingAssets.push('assets/effets/' + effect + '.png');
for (const c of data.cards) for (const file of [`site/assets/cards/${c.slug}.webp`, `site/assets/cards/${c.slug}-full.png`, `cartes/${c.slug}.png`]) if (!fs.existsSync(path.join(root, file))) report.missingAssets.push(file);
for (const a of data.arenas) if (!fs.existsSync(path.join(site, a.image))) report.missingAssets.push('site/' + a.image);
report.missingAssets = [...new Set(report.missingAssets)];
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/blank') { res.end('<!doctype html><title>Test V3</title>'); return; }
  const file = path.resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
  if (mocked && file === path.join(site, 'data.js')) { res.setHeader('Content-Type', 'text/javascript'); res.end('window.KALISTAR_DATA=' + JSON.stringify(data)); return; }
  try {
    const bytes = fs.readFileSync(file);
    res.setHeader('Content-Type', ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' })[path.extname(file)] || 'application/octet-stream');
    res.end(bytes);
  } catch { res.writeHead(404).end(); }
});
let browser;
async function run() {
  fs.mkdirSync(output, { recursive: true });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  browser = await playwright().chromium.launch({ channel: process.env.KALISTAR_BROWSER || 'chrome', headless: true, args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.on('pageerror', error => report.browserErrors.push(error.message));
  page.setDefaultTimeout(15000);
  await page.goto(url + '/blank');
  await page.evaluate(async () => {
    localStorage.setItem('kalistar.v2.game', 'V2-SENTINEL'); localStorage.setItem('kalistar.v2.favorites', '["00000001"]');
    await new Promise((resolve, reject) => { const r = indexedDB.open('kalistar-v2-cards', 1); r.onupgradeneeded = () => r.result.createObjectStore('sentinel'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('sentinel', 'readwrite'); tx.objectStore('sentinel').put('V2-UNCHANGED', 'marker'); tx.oncomplete = () => { db.close(); resolve(); }; }; });
  });
  const ready = () => page.waitForFunction(() => window.KALISTAR_READY && window.KALISTAR_DB);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('kalistar.v3.game')));
  const closeDialogs = () => page.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  const capture = async name => { const file = path.join(output, name + '.png'); await page.screenshot({ path: file, fullPage: false }); report.screenshots.push(file); };
  const importState = async value => {
    await closeDialogs();
    if (!await page.locator('#game-file').count()) await page.locator('[data-view="arena"]').click();
    await page.locator('#game-file').setInputFiles({ name: 'V3-test.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
    await page.waitForFunction(id => JSON.parse(localStorage.getItem('kalistar.v3.game'))?.matchId === id, value.matchId);
    await page.evaluate(() => window.KALISTAR_DB.idle());
  };
  await page.goto(url + '/site/index.html'); await ready();
  report.assetGeometryIssues = await page.evaluate(async cards => {
    const issues = [];
    for (const c of cards) for (const [src, width, height, thumbnail] of [[`assets/cards/${c.slug}.webp`, 797, 1388, true], [`assets/cards/${c.slug}-full.png`, 797, 1388, false], [`../cartes/${c.slug}.png`, 897, 1497, false]]) {
      const img = new Image(); img.src = src;
      try { await img.decode(); } catch { continue; }
      const valid = thumbnail ? Math.abs(img.naturalWidth / img.naturalHeight - width / height) < 0.002 : img.naturalWidth === width && img.naturalHeight === height;
      if (!valid) issues.push({ src, actual: [img.naturalWidth, img.naturalHeight], expected: thumbnail ? 'ratio 797/1388' : [width, height] });
    }
    return issues;
  }, data.cards);
  assert.match(await page.locator('.cb-count').innerText(), /40 personnages.*41 versions/);
  assert.equal(await page.locator('.cb-version-count').count(), 1);
  assert.match(await page.locator('.cb-pocket:has(.cb-version-count) h2').innerText(), /MOMO/i);
  assert.equal(await page.evaluate(() => { const c = KALISTAR_DATA.cards[0]; return KalistarCatalogue.key({ ...c, name: 'AUTRE NOM' }) === c.characterId; }), true);
  report.tests.push('41 cartes / 40 personnages ; regroupement par characterId ; Momo seul doublé');
  await capture('collection-desktop');
  const none = data.cards.find(c => c.element === 'NONE'); assert.ok(none, 'Profil NONE requis');
  await page.locator('[data-binder-field=search]').fill(none.id);
  await page.locator(`[data-binder-action="open"][data-id="${none.id}"]`).click();
  await page.locator('[data-binder-action=tab][data-id=profile]').click();
  assert.match(await page.locator('.cb-affinity').innerText(), /sans cristal/i);
  assert.equal(await page.locator('.cb-faces tbody tr:last-child .is-magic').count(), 0);
  assert.equal(await page.locator('.cb-hero-image').getAttribute('src'), `assets/cards/${none.slug}-full.png`);
  assert.equal(await page.locator('.cb-visual a[download]').getAttribute('href'), `../cartes/${none.slug}.png`);
  await page.locator('[data-binder-action=media][data-id=art]').click();
  assert.equal(await page.locator('.cb-hero-image').getAttribute('src'), `../${(none.art || 'assets/illustrations/' + none.slug + '.png').replace(/^V3[\\/]/, '')}`);
  await closeDialogs();
  await page.locator('[data-view="arena"]').click();
  await page.waitForSelector('.duel-console');
  await page.locator('[data-action="arena-picker"]').click();
  assert.equal(await page.locator('.arena-option').count(), data.arenas.length);
  const chosen = data.arenas.at(-1).id;
  await page.locator(`input[name="arena"][value="${chosen}"]`).check();
  await page.locator('#arena-form button[type="submit"]').click();
  assert.equal((await state()).arenaId, chosen);
  await page.locator('[data-action="start"]').click();
  assert.equal(await page.locator('[data-action="arena-picker"]').isDisabled(), true);
  report.tests.push('Arènes dynamiques ; choix setup et verrouillage après début');
  const diceBounds = () => page.locator('.dice-stage').evaluateAll(nodes => nodes.map(n => { const a = n.getBoundingClientRect(), b = n.closest('.duel-console').getBoundingClientRect(); return { x: a.x-b.x, y: a.y-b.y, width: a.width, height: a.height }; }));
  for (const self of [false, true]) {
    const s = scenario('guard'), ally = self ? s.players[0].board[s.duel.attackerSlot] : s.players[0].board.find(u => u.uid !== s.duel.attacker);
    ally.luck = 1; E.assertState(s); await importState(s);
    // Arena materials have different borders; compare within the same arena.
    const initialDice = await diceBounds();
    assert.equal(await page.locator('.guard-eligible').count(), 5);
    assert.match(await page.locator('.duel-centre').innerText(), /Garde/i);
    await page.locator(`.slot[data-unit="${ally.uid}"] .slot-card`).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
    const after = await state(), recipient = after.players[0].board.find(u => u?.uid === ally.uid);
    assert.equal(recipient.ward, 60); assert.equal(recipient.luck, 1);
    assert.equal(await page.locator(`.slot[data-unit="${ally.uid}"] .ward-badge b`).innerText(), '60');
    assert.deepEqual(await diceBounds(), initialDice);
  }
  const ai = scenario('guard', 1); ai.mode = 'ai'; await importState(ai);
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
  assert.equal((await state()).players[1].board.filter(u => u?.ward === 60).length, 1);
  report.tests.push('Guard allié/auteur/IA ; ward 60 coexiste avec le trèfle ; dés fixes');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  const animated = scenario('guard'), animatedUid = animated.players[0].board.find(u => u.uid !== animated.duel.attacker).uid;
  await importState(animated);
  await page.locator(`.slot[data-unit="${animatedUid}"] .slot-card`).click();
  await page.waitForSelector(`.slot[data-unit="${animatedUid}"] .combat-ward`);
  await page.locator(`.slot[data-unit="${animatedUid}"]`).screenshot({ path: path.join(output, 'guard-animation.png') });
  report.screenshots.push(path.join(output, 'guard-animation.png'));
  await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
  assert.equal(await page.locator('.combat-ward,.combat-emblem').count(), 0);
  assert.ok(await page.locator('.ward-badge img').evaluate(img => img.complete && img.naturalWidth > 0), 'Icône guard ou repli physique manquant');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  report.tests.push('Animation physique Guard sur le bon allié ; nettoyage des effets ; icône chargée');
  for (const kind of ['physical', 'magic', 'dodge', 'death']) {
    const s = scenario(kind), next = E.clone(s); E.rollDefense(next); await importState(s);
    const initialDice = await diceBounds();
    await page.locator('[data-action="roll"]').click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('kalistar.v3.game')).phase === 'result');
    const actual = await state();
    assert.deepEqual(actual.duel.formula, next.duel.formula);
    const target = actual.players[1].board.concat(actual.players[1].dead).find(u => u?.uid === s.duel.target);
    assert.equal(target.ward, kind === 'physical' ? 0 : 60);
    if (actual.duel.formula) {
      for (const key of ['arenaAttack', 'arenaDefense', 'ward']) assert.equal(Number((await page.locator(`.duel-recap [data-bonus="${key}"] b`).innerText()).replace('+', '')), actual.duel.formula[key]);
      assert.equal(Number(await page.locator('[data-total="attack"]').innerText()), actual.duel.formula.attack);
      assert.equal(Number(await page.locator('[data-total="defense"]').innerText()), actual.duel.formula.defense);
    }
    assert.equal(await page.locator('.slot[data-element="NONE"] .element-aura').count(), 0);
    assert.deepEqual(await diceBounds(), initialDice);
  }
  report.tests.push('Calcul moteur/UI concordant ; ward physique consommé, magie/esquive/Mort conservé ; NONE sans halo');
  const preview = scenario('physical'); preview.phase = 'choose'; preview.duel = null; preview.log = preview.log.filter(l => l.type !== 'target' && l.type !== 'roll');
  await importState(preview);
  const a = preview.players[0].board.findIndex(u => u), b = preview.players[1].board.findIndex(u => u?.ward);
  await page.locator(`.formation[data-player="0"] .slot[data-position="${a+1}"] .slot-card`).click();
  await page.locator(`.formation[data-player="1"] .slot[data-position="${b+1}"] .slot-card`).click();
  assert.equal(await page.locator('.preview-recap [data-bonus="ward"] b').innerText(), '+60 si physique');
  for (const c of data.cards.filter(c => c.characterId === data.cards.find(x => /MOMO/i.test(x.name)).characterId)) {
    const arena = data.arenas.find(a => a.homeCharacters.includes(c.characterId));
    assert.ok(arena, 'Arène du personnage Momo requise');
    const s = E.newGame(deckFor(c), deckFor(none), { mode: 'local', seed: 'MOMO-HOME', arenaId: arena.id, deckCoverage: 2 });
    E.autoDeploy(s, 0); E.autoDeploy(s, 1); E.start(s); await importState(s);
    const x = s.players[0].board.findIndex(u => u?.cardId === c.id), y = s.players[1].board.findIndex(u => u?.cardId === none.id);
    await page.locator(`.formation[data-player="0"] .slot[data-position="${x+1}"] .slot-card`).click();
    await page.locator(`.formation[data-player="1"] .slot[data-position="${y+1}"] .slot-card`).click();
    const bonus = E.arenaBonuses(s, s.players[0].board[x]);
    assert.equal(Number(await page.locator('.preview-recap [data-bonus="arenaAttack"] b').innerText()), bonus.attack);
    assert.ok(bonus.homeAttack > 0, 'Affinité perdue pour une version de Momo');
  }
  report.tests.push('Prévisualisation arène : les deux Momo partagent l’affinité characterId');
  const beforeImport = JSON.stringify(await state());
  await page.locator('#game-file').setInputFiles({ name: 'V2.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...preview, schema: 5 })) });
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Import V2 refusé'));
  assert.equal(JSON.stringify(await state()), beforeImport);
  await page.locator('[data-action="deck"]').click();
  const beforeDeckImport = await page.evaluate(() => localStorage.getItem('kalistar.v3.deck'));
  await page.locator('#deck-file').setInputFiles({ name: 'V2-deck.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ schema: 1, cards: Array(10).fill('00000001') })) });
  await page.waitForFunction(() => document.querySelector('#toast').textContent.includes('Import V2 refusé'));
  assert.equal(await page.evaluate(() => localStorage.getItem('kalistar.v3.deck')), beforeDeckImport);
  assert.equal(JSON.stringify(await state()), beforeImport);
  await closeDialogs();
  await page.evaluate(async () => {
    const db = KALISTAR_DB, before = JSON.stringify(db.counts());
    for (const value of [{ format: 'kalistar-local-library', schema: 1, versions: [], instances: [], matches: [], results: [] }, { ...(await db.exportBackup()), matches: [{ state: { schema: 5 } }] }]) {
      let error; try { await db.importBackup(value); } catch (e) { error = e; }
      if (!error?.message.includes('V2')) throw Error('Import V2 non refusé explicitement');
      if (JSON.stringify(db.counts()) !== before) throw Error('Import refusé non atomique');
    }
  });
  report.tests.push('Imports V2 partie/deck/BDD explicitement refusés sans écriture');
  const finished = completedMatch(); await importState(finished);
  await page.waitForSelector('#match-dialog[open]');
  await page.locator('[data-action="stats-tab"][data-id="definitions"]').click();
  assert.match(await page.locator('.match-definitions').textContent(), /ward/);
  await closeDialogs();
  await page.evaluate(async () => {
    const db = KALISTAR_DB; await db.idle(); const backup = await db.exportBackup(), counts = db.counts();
    if (backup.edition !== 'V3' || backup.gameSchema !== 6 || backup.database !== 'kalistar-v3-cards') throw Error('Mauvaise édition exportée');
    if (!backup.instances.every(i => /^K3-300000\d\d-00[1-4]$/.test(i.id))) throw Error('Instances non K3');
    await db.importBackup(backup); await db.importBackup(backup);
    if (JSON.stringify(counts) !== JSON.stringify(db.counts())) throw Error('Import non idempotent');
    const final = backup.matches.find(m => m.finalized), conflict = structuredClone(backup);
    conflict.matches = [{ ...final, state: { ...final.state, arenaId: KALISTAR_DATA.arenas.find(a => a.id !== final.state.arenaId).id } }];
    let rejected = false; try { await db.importBackup(conflict); } catch { rejected = true; }
    if (!rejected) throw Error('Arène finale modifiable par import');
    if (localStorage.getItem('kalistar.v2.game') !== 'V2-SENTINEL' || localStorage.getItem('kalistar.v2.favorites') !== '["00000001"]') throw Error('Stockage V2 modifié');
    const value = await new Promise((resolve, reject) => { const r = indexedDB.open('kalistar-v2-cards'); r.onerror = () => reject(r.error); r.onsuccess = () => { const db = r.result, tx = db.transaction('sentinel'), get = tx.objectStore('sentinel').get('marker'); get.onsuccess = () => resolve(get.result); tx.oncomplete = () => db.close(); }; });
    if (value !== 'V2-UNCHANGED') throw Error('BDD V2 modifiée');
  });
  report.tests.push('Archivage terminé ; export/import idempotent ; conflit arène finale refusé ; V2 intacte');
  await page.evaluate(async () => {
    const backup = await KALISTAR_DB.exportBackup(), archived = backup.matches.find(m => m.finalized);
    // A full ownership backup must retain the matches referenced by its binding events.
    const arena = archived.arenas.find(a => a.id === archived.state.arenaId);
    arena.subtitle = 'Historique conservé';
    arena.elementBonus = arena.elementBonus === 15 ? 12 : 15;
    arena.homeAttack = 7;
    archived.profiles[0].title = 'Profil historique';
    archived.rules.version = 'V3-historical-snapshot';
    const beforeState = JSON.stringify(archived.state), beforeSummary = JSON.stringify(archived.summary);
    const beforeArenas = JSON.stringify(archived.arenas), beforeProfiles = JSON.stringify(archived.profiles), beforeRules = JSON.stringify(archived.rules);
    const dest = await KalistarLocalDB.open(KALISTAR_DATA, { name: 'kalistar-v3-cards-historical-regression' });
    try {
      await dest.importBackup(backup); await dest.importBackup(backup);
      const restored = (await dest.exportBackup()).matches.find(m => m.id === archived.id);
      if (JSON.stringify(restored.arenas) !== beforeArenas || JSON.stringify(restored.profiles) !== beforeProfiles || JSON.stringify(restored.rules) !== beforeRules) throw Error('Snapshot historique remplacé');
      if (JSON.stringify(restored.state) !== beforeState || JSON.stringify(restored.summary) !== beforeSummary) throw Error('Scores historiques recalculés');
      const all = () => JSON.stringify(['versions', 'instances', 'matches', 'results'].map(s => dest.inspect(s))), unchanged = all();
      const invalid = [undefined, null, [], {}, [...archived.arenas, archived.arenas[0]], archived.arenas.filter(a => a.id !== archived.state.arenaId)];
      for (const [key, value] of [['elementBonus', 16], ['homeDefense', 11], ['homeAttack', -1], ['element', 'ABSENT'], ['homeCharacters', [30]], ['subtitle', {}]]) {
        const bad = structuredClone(archived.arenas); bad[0][key] = value; invalid.push(bad);
      }
      for (const arenas of invalid) {
        const bad = structuredClone(backup); bad.matches.find(m => m.id === archived.id).arenas = arenas;
        let rejected = false; try { await dest.importBackup(bad); } catch { rejected = true; }
        if (!rejected || all() !== unchanged) throw Error('Catalogue historique invalide accepté ou import non atomique');
      }
      arena.subtitle = 'Mutation après import';
      if (JSON.stringify(dest.match(archived.id).arenas) !== beforeArenas) throw Error('Snapshot non détaché de l’objet importé');
    } finally { dest.close(); }
  });
  report.tests.push('Snapshots d’arènes validés et préservés ; scores historiques inchangés ; imports invalides atomiques');
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }, { width: 2560, height: 1440 }, { width: 360, height: 800 }]) {
    await page.setViewportSize(viewport); await importState(preview);
    await page.locator('[data-action="focus-duel"]').click();
    const layout = await page.locator('.duel-centre').evaluate(el => ({ client: el.clientHeight, scroll: el.scrollHeight, status: el.querySelector('.duel-status').scrollHeight, statusClient: el.querySelector('.duel-status').clientHeight, recap: el.querySelector('.duel-recap').scrollHeight, recapClient: el.querySelector('.duel-recap').clientHeight }));
    assert.ok(layout.scroll <= layout.client+1 && layout.status <= layout.statusClient+1 && layout.recap <= layout.recapClient+1, JSON.stringify(layout));
    assert.equal(await page.locator('.dice-stage canvas').count(), 2);
    const pixels = await page.locator('.dice-stage').first().screenshot();
    const colors = await page.evaluate(async base64 => { const img = new Image(); img.src = 'data:image/png;base64,' + base64; await img.decode(); const c = document.createElement('canvas'); c.width = img.width; c.height = img.height; const x = c.getContext('2d'); x.drawImage(img, 0, 0); const p = x.getImageData(0, 0, c.width, c.height).data, set = new Set(); for (let i=0; i<p.length; i+=4) set.add(`${p[i]},${p[i+1]},${p[i+2]}`); return set.size; }, pixels.toString('base64'));
    assert.ok(colors > 30, 'Canvas dés vide');
    const motion = await page.evaluate(async () => {
      const host = document.querySelector('.dice-stage'), canvas = host.querySelector('canvas');
      const initialValue = Number(host.dataset.value) || 6;
      const playback = KalistarDice.play(Number(host.dataset.player), 3, false);
      await new Promise(resolve => setTimeout(resolve, 180));
      const first = canvas.toDataURL();
      await new Promise(resolve => setTimeout(resolve, 180));
      const second = canvas.toDataURL();
      await playback;
      const settled = host.dataset.front;
      const sample = document.createElement('canvas'); sample.width = canvas.width; sample.height = canvas.height;
      const ctx = sample.getContext('2d'); ctx.drawImage(canvas, 0, 0);
      const rgba = ctx.getImageData(0, 0, sample.width, sample.height).data;
      let top = sample.height, bottom = -1;
      for (let y = 0; y < sample.height; y++) for (let x = 0; x < sample.width; x++) if (rgba[(y * sample.width + x) * 4 + 3] > 100) { top = Math.min(top, y); bottom = Math.max(bottom, y); }
      const visibleHeight = (bottom - top + 1) * canvas.clientHeight / canvas.height;
      await KalistarDice.play(Number(host.dataset.player), initialValue, true);
      return { moving: first !== second, settled, visibleHeight };
    });
    assert.ok(motion.moving, 'Le de doit tourner pendant le lancer');
    assert.equal(motion.settled, '3');
    assert.ok(motion.visibleHeight >= 22, 'De trop petit : ' + JSON.stringify(motion));
    const ratio = await page.locator('.slot-card').first().evaluate(el => getComputedStyle(el).aspectRatio.replace(/\s/g, ''));
    assert.equal(ratio, '797/1388');
    await capture('arena-' + viewport.width);
  }
  report.tests.push('Desktop/mobile : centre sans scroll interne ; dés 3D non vides, lisibles et animés ; captures');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-view="collection"]').click(); await capture('collection-mobile');
  await page.locator('[data-binder-action="archives"]').click();
  assert.equal(await page.locator('.database-inspector details').count(), 4);
  await capture('archives-mobile');
  const fallback = await context.newPage();
  const noMetadata = structuredClone(data); delete noMetadata.elements.NONE;
  noMetadata.cards.find(c => c.id === none.id).art = 'V3/assets/illustrations/' + none.slug + '.png';
  await fallback.route('**/data.js', route => route.fulfill({ contentType: 'text/javascript', body: 'window.KALISTAR_DATA=' + JSON.stringify(noMetadata) }));
  fallback.on('pageerror', error => report.browserErrors.push(error.message));
  await fallback.goto(url + '/site/index.html'); await fallback.waitForFunction(() => window.KALISTAR_READY);
  await fallback.locator('[data-binder-field=search]').fill(none.id);
  await fallback.locator(`[data-binder-action="open"][data-id="${none.id}"]`).click();
  await fallback.locator('[data-binder-action=tab][data-id=profile]').click();
  assert.match(await fallback.locator('.cb-affinity').innerText(), /sans cristal/i);
  await fallback.locator('[data-binder-action=media][data-id=art]').click();
  assert.equal(await fallback.locator('.cb-hero-image').getAttribute('src'), '../assets/illustrations/' + none.slug + '.png');
  await fallback.close();
  report.tests.push('NONE sans métadonnées ; c.art avec préfixe V3 normalisé');
  if (!mocked) {
    const local = await context.newPage();
    local.on('pageerror', error => report.browserErrors.push(error.message));
    await local.goto(require('node:url').pathToFileURL(path.join(site, 'index.html')).href);
    await local.waitForFunction(() => window.KALISTAR_READY && window.KALISTAR_DB);
    assert.match(await local.locator('.cb-count').innerText(), /40 personnages.*41 versions/);
    await local.locator('[data-view="arena"]').click(); await local.waitForSelector('.duel-console');
    await local.close(); report.tests.push('Ouverture directe index.html sans serveur ; IndexedDB disponible');
  }
  assert.deepEqual(report.browserErrors, []);
  report.tests.push('BDD inspectable ; aucune exception navigateur');
  report.assetsReady = !report.missingAssets.length && !report.assetGeometryIssues.length;
  if (process.argv.includes('--require-assets')) assert.ok(report.assetsReady, 'Assets absents ou pas encore recadrés : voir report.json.');
}
run().then(() => { report.ok = true; }).catch(error => { report.ok = false; report.error = error.stack; process.exitCode = 1; }).finally(async () => {
  await browser?.close(); await new Promise(resolve => server.close(resolve));
  fs.mkdirSync(output, { recursive: true }); fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ ...report, missingAssets: report.missingAssets.length, assetGeometryIssues: report.assetGeometryIssues.length, report: path.join(output, 'report.json') }, null, 2));
});
