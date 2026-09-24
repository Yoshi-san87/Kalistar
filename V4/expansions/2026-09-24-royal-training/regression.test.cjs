'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const P = require('./reference-plan.cjs'), R = require('./regression.cjs'), M = require('./model.cjs');
const { validateCatalogue } = require('./publish.cjs');
function native() {
  const card = { name: 'NAME', title: 'TITLE', job: 'JOB', race: 'RACE', description: 'One line', positions: [3, 5],
    atk: [150, 'retry', 80, 60, 40, 'revive'], defense: [200, 160, 120, 90, 60, 30], magic: [6, 2], barriers: [6] };
  const layers = [];
  for (const [side, values, modes] of [['ATK', card.atk, card.magic], ['DEF', card.defense, card.barriers]]) for (let d = 1; d <= 6; d++) {
    const v = values[6 - d], numeric = typeof v === 'number';
    layers.push({ name: side + ' D' + d + ' - valeur', kind: 'LayerKind.TEXT', visible: numeric, text: String(v) });
    if (!numeric) layers.push({ name: side + ' D' + d + ' - effet ' + v, visible: true });
    layers.push({ name: side + ' D' + d + (side === 'ATK' ? ' - HALO MAGIQUE' : ' - BARRIERE'), visible: numeric && modes.includes(d) });
  }
  for (const [name, field] of [['NOM', 'name'], ['TITLE', 'title'], ['JOB', 'job'], ['RACE', 'race'], ['DESCRIPTION', 'description']]) layers.push({ name, text: card[field], kind: 'LayerKind.TEXT' });
  for (let p = 1; p <= 5; p++) layers.push({ name: 'POSITION SLOT ' + p, text: String(card.positions[p - 1]), kind: 'LayerKind.TEXT', visible: p <= 2 });
  return { item: { key: 'fixture', card }, report: { key: 'fixture', width: 897, height: 1497, resolution: 300, layers } };
}
test('native identity, all faces, numeric modes and positions validate', () => { const f = native(); R.validateNative(f.report, f.item); });
test('flattened text, changed stats or shifted position identities fail', () => {
  for (const [name, field, value] of [['NOM', 'kind', 'LayerKind.NORMAL'], ['ATK D6 - valeur', 'text', '999'], ['POSITION SLOT 2', 'text', '4'], ['DEF D6 - BARRIERE', 'visible', false]]) {
    const f = native(); f.report.layers.find(x => x.name === name)[field] = value; assert.throws(() => R.validateNative(f.report, f.item));
  }
});
test('missing or duplicate native fields fail', () => {
  const f = native(); f.report.layers.push({ ...f.report.layers[0] }); assert.throws(() => R.validateNative(f.report, f.item));
  const g = native(); g.report.layers = g.report.layers.filter(x => x.name !== 'RACE'); assert.throws(() => R.validateNative(g.report, g.item));
});
test('runner cannot launch Photoshop without explicit authorization', async () => { await assert.rejects(R.run(), /Autorisation/); });
test('exact 80 target allowlist excludes V3, public UI and non-target legacy cards', () => {
  const base = { revisions: require('./baseline/revisions.json').map(x => ({ ...x, id: x.id || x.entry.id })) };
  const set = require('./set.json'), targets = P.targets(base, set);
  assert.equal(targets.length, 80); assert.equal(new Set(targets).size, 80);
  assert.ok(targets.every(f => f.startsWith('V4/') && !f.startsWith('V4/site/')));
  assert.equal(targets.filter(f => f.endsWith('.psd')).length, 16);
  assert.equal(targets.filter(f => f.startsWith('V4/template-stable/')).length, 1);
  assert.ok(targets.includes('V4/template-stable/return-20260923/capitaine-skully/card.json'));
  assert.ok(!targets.some(f => /MOMO|TAULIO|V3\//.test(f)));
});
function catalogue() {
  const before = structuredClone(require('./baseline/references.json')), cat = structuredClone(require('./baseline/catalogue.json'));
  const revisions = require('./baseline/revisions.json').map(x => ({ ...x, id: x.id || x.entry.id }));
  const base = { before, cat, revisions }, next = structuredClone(before), out = structuredClone(cat), specs = require('./set.json').cards;
  for (const v of revisions.filter(x => x.crop)) {
    out.cards.find(c => c.id === v.id).profile.crop = v.crop;
    const ref = next.cards.find(c => c.card.id === v.id); if (ref) ref.card.crop = v.crop;
  }
  out.cards.push(...specs.map(c => ({ id: c.id, kind: 'created' }))); return { base, next, out, specs };
}
test('nine additions remain editions; reference count and crop metadata preserved', () => { const f = catalogue(); validateCatalogue(f.base, f.next, f.out, f.specs); });
test('unchanged old identity, URLs, registry and gameplay enforced exactly', () => {
  for (const mutate of [f => { f.out.cards[0].png = 'foreign.png'; }, f => { f.out.cards.find(c => c.key === 'ruby').profile.name = 'OTHER'; }, f => { f.next.cards[0].registry.elements = ['NONE']; }]) {
    const f = catalogue(); mutate(f); assert.throws(() => validateCatalogue(f.base, f.next, f.out, f.specs));
  }
});
test('new edition collision is refused rather than filtered', () => { const f = catalogue(); f.out.cards[88].id = f.out.cards[0].id; assert.throws(() => validateCatalogue(f.base, f.next, f.out, f.specs)); });
test('stale regression candidate is refused before accepting a report', () => {
  const r = { read: () => ({ passed: true, baseReferenceId: 'base', candidateDigest: 'stale' }) };
  assert.throws(() => R.inspect(r, { baseReferenceId: 'base', digest: 'expected' }));
});
test('publisher and regression modules are outside captured native CODE lists', () => {
  const lists = [require('./build.cjs').CODE, require('./revisions.cjs').CODE, require('./solaria.cjs').CODE];
  for (const list of lists) for (const file of ['publish.cjs', 'reference-plan.cjs', 'transaction.cjs', 'regression.cjs', 'regression.jsx']) assert.ok(!list.includes(file));
});
