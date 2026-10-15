'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), path = require('node:path');
const S = require('./numeric-only.cjs'), rows = require('./plan.cjs'), bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
const root = path.resolve(__dirname, '../../..');
const read = f => JSON.parse(fs.readFileSync(f, 'utf8').replace(/^\uFEFF/, ''));
const before = id => read(path.join(__dirname, 'originals', id, 'profile.json'));
const after = row => ({ ...before(row.id), atk: row.atk, defense: row.defense });
const sum = p => S.SIDES.flatMap(side => p[side]).reduce((n, v) => n + (typeof v === 'number' ? v : 0), 0);
test('all 11 OP, all 25 RE and 12 justified MGS revisions, never Skull Face or Rikka', () => {
  assert.equal(rows.length, 48); assert.equal(new Set(rows.map(r => r.id)).size, 48);
  assert.equal(rows.filter(r => r.id.startsWith('498')).length, 11);
  assert.equal(rows.filter(r => r.id.startsWith('497')).length, 25);
  assert.equal(rows.filter(r => r.id.startsWith('496')).length, 12);
  assert(!rows.some(r => ['49600118', '40000042', '45951088'].includes(r.id)));
  assert(rows.every(r => r.reason.length > 35));
});
test('every numeric face respects its original role interval and every special is preserved', () => {
  for (const r of rows) {
    const p = before(r.id), next = after(r); S.numericOnly(p, next, bounds);
    assert(S.changes(p, next).length >= 8, 'Meaningful numeric personality, not one-number jitter.');
    assert.equal(new Set([JSON.stringify(r.atk), JSON.stringify(r.defense)]).size, 2);
    for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) assert(next[field].every(d => typeof next[side][6 - d] === 'number'));
    if (next.element === 'NONE') assert.equal(next.magic.length + next.barriers.length, 0);
  }
});
test('unique numeric signatures and tradeoffs, not a blanket power increase', () => {
  assert.equal(new Set(rows.map(r => JSON.stringify([r.atk, r.defense]))).size, rows.length);
  for (const prefix of ['498', '497', '496']) {
    const family = rows.filter(r => r.id.startsWith(prefix));
    const oldTotal = family.reduce((n, r) => n + sum(before(r.id)), 0), newTotal = family.reduce((n, r) => n + sum(after(r)), 0);
    assert(Math.abs(newTotal - oldTotal) / oldTotal < 0.01, 'Total numeric budget moved by more than 1%.');
    assert(family.some(r => sum(after(r)) < sum(before(r.id))));
    assert(family.some(r => sum(after(r)) > sum(before(r.id))));
  }
  for (const r of rows) {
    const p = before(r.id), next = after(r), deltas = S.SIDES.flatMap(side => p[side].flatMap((v, i) => typeof v === 'number' ? [next[side][i] - v] : []));
    assert(deltas.some(d => d > 0) && deltas.some(d => d < 0), r.id + ' needs an explicit per-face tradeoff.');
  }
});
test('rejects nonnumeric drift, special relocation, missing faces and role overflow/underflow', () => {
  const r = rows[0], p = before(r.id), next = after(r);
  const mutations = [a => a.id = '40000042', a => a.role = 1, a => a.positions = [2], a => a.characterId = 'new', a => a.race = 'CYBORG',
    a => a.faction = 'MGS5', a => a.element = 'PYRO', a => a.magic = [6], a => a.canGuard = true, a => a.crop.zoom = 1.2,
    a => a.artworkSource = 'regenerated.png', a => a.description = 'changed', a => a.atk[5] = 10, a => a.atk.pop(), a => a.atk[0] = 301, a => a.defense[0] = 149];
  for (const mutate of mutations) { const bad = structuredClone(next); mutate(bad); assert.throws(() => S.numericOnly(p, bad, bounds)); }
  assert.throws(() => S.numericOnly(p, p, bounds), /No numeric revision/);
});
test('publication preserves concurrent Kaine/Rikka additions and all unrelated metadata', () => {
  const r = rows[0], p = before(r.id), next = after(r), base = { schemaVersion: 4, referenceId: 'unchanged', cards: [
    { id: r.id, name: p.name, profile: p, nativeRevision: { id: 'old' } }, { id: '45951088', profile: { crop: { zoom: 1.15 } } }, { id: 'new-rikka', profile: { id: 'new-rikka' } }] };
  const result = structuredClone(base); result.cards[0].profile = next; result.cards[0].nativeRevision = { id: S.REV };
  S.catalogueChange(base, result, [next], bounds);
  for (const mutate of [a => a.cards[1].profile.crop.zoom = 1, a => a.cards.pop(), a => a.cards.reverse(), a => a.cards[0].name = 'NEW', a => a.referenceId = 'fake']) {
    const bad = structuredClone(result); mutate(bad); assert.throws(() => S.catalogueChange(base, bad, [next], bounds));
  }
});
test('first numeric revision accepts absent historical nativeRevision, not other absent metadata', () => {
  const r = rows.find(r => r.id === '49600101'), p = before(r.id), next = after(r);
  const base = { cards: [{ id: r.id, kind: 'created', profile: p, name: p.name }] };
  const result = structuredClone(base); result.cards[0].profile = next; result.cards[0].nativeRevision = { id: S.REV };
  S.catalogueChange(base, result, [next], bounds);
  const bad = structuredClone(result); bad.cards[0].unexpected = undefined;
  assert.throws(() => S.catalogueChange(base, bad, [next], bounds));
  delete bad.cards[0].unexpected; delete bad.cards[0].name;
  assert.throws(() => S.catalogueChange(base, bad, [next], bounds));
});
function fixture() {
  const r = rows[0], p = before(r.id), next = after(r), old = read(path.join(__dirname, 'originals', r.id, 'render/native.json'));
  const edits = S.changes(p, next), layers = structuredClone(old.layers);
  for (const e of edits) layers.find(l => l.name === e.name).text = e.after;
  const text = [{ path: 'NOM', nativeStyleRuns: 'unchanged', linearTransform: 'unchanged' }], effects = [{ path: 'ATK D6 - valeur', effects: 'same' }];
  const embedded = [{ path: 'ILLUSTRATION - cadrage', linked: false, nativeObject: 'same' }];
  const audit = { before: old.layers, after: layers, reopened: structuredClone(layers), textsBefore: text, textsAfter: structuredClone(text), textsReopened: structuredClone(text),
    effectsBefore: effects, effectsAfter: structuredClone(effects), effectsReopened: structuredClone(effects), embeddedBefore: embedded, embeddedAfter: structuredClone(embedded), embeddedReopened: structuredClone(embedded) };
  const native = { layers: structuredClone(layers), typography: structuredClone(old.typography), expected: old.expected.map(e => ({ ...e, value: edits.find(c => c.name === e.name)?.after || e.value })) };
  return { old, audit, native, p, next };
}
test('native audit rejects hidden style, effects, artwork, font and frame changes', () => {
  const good = fixture(); S.assertNative(good.audit, good.native, good.old, good.p, good.next);
  const mutations = [f => f.audit.after.find(l => l.name === 'DESCRIPTION').text = 'changed', f => f.audit.after.find(l => l.name === 'ATK D6 - valeur').font = 'Arial',
    f => f.audit.after.find(l => l.name === 'ATK D6 - valeur').sizePt++, f => f.audit.after.find(l => l.name === 'ILLUSTRATION - cadrage').bounds[0]++,
    f => f.audit.textsAfter[0].nativeStyleRuns = 'changed', f => f.audit.effectsAfter[0].effects = 'changed', f => f.audit.embeddedAfter[0].linked = true,
    f => f.audit.embeddedReopened[0].nativeObject = 'changed', f => f.native.expected[0].value = 'changed', f => f.native.typography.NOM.tracking = 2];
  for (const mutate of mutations) { const f = fixture(); mutate(f); assert.throws(() => S.assertNative(f.audit, f.native, f.old, f.p, f.next)); }
});
test('circular pixel scope rejects rectangle corners and any changed frame pixel', () => {
  const a = Buffer.alloc(20 * 20 * 4, 255), b = Buffer.from(a), circles = [{ x: 10, y: 10, radius: 4 }];
  b[(10 * 20 + 10) * 4] = 0;
  assert.deepEqual(S.diffPixels(a, b, 20, 20, circles), { changed: 1, outside: 0 });
  b[(6 * 20 + 6) * 4] = 0;
  assert.deepEqual(S.diffPixels(a, b, 20, 20, circles), { changed: 2, outside: 1 });
  assert.equal(S.circlesFor([{ name: 'ATK D6 - valeur' }])[0].radius, 64);
  assert.equal(S.circlesFor([{ name: 'DEF D1 - valeur' }])[0].radius, 44);
});
test('matrix tolerance accepts only IEEE rounding on edited numeric text, never real scaling', () => {
  const encode = values => {
    const pieces = [Buffer.from('00000010000000010000000000006e756c6c00000004', 'hex')];
    ['xx','xy','yx','yy'].forEach((key, i) => { const d = Buffer.alloc(8); d.writeDoubleBE(values[i]); pieces.push(Buffer.from('00000002' + Buffer.from(key).toString('hex') + '646f7562', 'hex'), d); });
    return [...Buffer.concat(pieces)].map(v => v.toString(16).padStart(4, '0')).join('');
  };
  const before = [{ path: 'ATK D6 - valeur', nativeStyleRuns: 'exact', linearTransform: encode([1,0,0,1]) }];
  const tiny = [{ ...before[0], linearTransform: encode([1+3e-15,0,0,1]) }];
  assert(S.textStates(before, tiny, new Set(['ATK D6 - valeur'])) <= 1e-12);
  assert.throws(() => S.textStates(before, tiny, new Set()));
  const scaling = [{ ...before[0], linearTransform: encode([1.000001,0,0,1]) }];
  assert.throws(() => S.textStates(before, scaling, new Set(['ATK D6 - valeur'])));
  assert.throws(() => S.textStates(before, [{ ...tiny[0], nativeStyleRuns: 'changed' }], new Set(['ATK D6 - valeur'])));
});
test('native renderer requires exact existing Photoshop, process lock, shared mutex and explicit grant', () => {
  const bridge = fs.readFileSync(path.join(__dirname, 'render.ps1'), 'utf8'), jsx = fs.readFileSync(path.join(__dirname, 'compose.jsx'), 'utf8');
  assert.match(bridge, /GetActiveObject\('Photoshop.Application.190'\)/); assert.match(bridge, /26\.11\.7/);
  assert.match(bridge, /Local\\KalistarV4AtelierRender/); assert.match(bridge, /render.lock/); assert.match(bridge, /KALISTAR_STATS_PS_GRANTED/);
  assert.doesNotMatch(bridge, /New-Object -ComObject/); assert.doesNotMatch(jsx, /placedLayerReplaceContents|\.flatten\(/);
  assert.match(jsx, /K\.text\(layer, change.after/); assert.match(jsx, /reopened-without-numbers/);
});
test('frozen originals and plan JSON agree with authored choices', () => {
  const plan = read(path.join(__dirname, 'plan.json'));
  assert.equal(plan.cards.length, 48);
  for (const row of rows) {
    const c = plan.cards.find(c => c.id === row.id), p = before(row.id);
    assert.deepEqual(c.before, { atk: p.atk, defense: p.defense }); assert.deepEqual(c.after, { atk: row.atk, defense: row.defense });
    assert.equal(c.reason, row.reason);
  }
  assert(fs.existsSync(path.join(root, 'V4/site/engine.js')));
});
