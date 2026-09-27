'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs');
const P = require('./publish.cjs');
const { transactionIO } = require('../2026-09-23-nier-art-refinement/transaction.cjs');
const REVISION = '2026-09-27-weapon-optics';
function fixture() {
  const ids = ['30000017', '30000028', '30000041', '42650442', '47689975', '43120563'];
  const baseline = { referenceId: 'original', items: ids.map(id => ({ id })) };
  const proof = { revision: REVISION, referenceId: baseline.referenceId, passed: true, phase: 'native-verified-awaiting-publication',
    results: ids.map(id => ({ id, comparison: { outside: 0, pixelCornersChecked: true }, roundtrip: { changed: 0 }, layers: { editableTextsPreserved: true },
      barcode: { expected: id, passed: true, cases: { a: [id], b: [id], c: [id], d: [id] } } })),
    future: ['iliane', 'voloden'].map(key => ({ key, actualProductionBind: true, motif: { changed: 0 }, bank: { changed: 0 } })) };
  return { baseline, proof };
}
test('preflight requires exactly the six existing identities and four barcode reads', () => {
  const { baseline, proof } = fixture(); P.validateProof(baseline, proof);
  proof.results[0].barcode.cases.a = ['wrong']; assert.throws(() => P.validateProof(baseline, proof));
});
test('pixels beyond the circular weapon mask block publication', () => {
  const { baseline, proof } = fixture(); proof.results[0].comparison.outside = 1;
  assert.throws(() => P.validateProof(baseline, proof));
});
test('future native authoring must reproduce both new banks exactly', () => {
  const { baseline, proof } = fixture(); proof.future[0].bank.changed = 1;
  assert.throws(() => P.validateProof(baseline, proof));
});
test('reference migration retains previous protections and all profiles', () => {
  const old = { id: 'old', cards: [{ key: 'model', card: { id: '123', atk: [100] } }], protectedFiles: { frame: 'a', weapon: 'b' } };
  const next = P.nextReferences(old, { weapon: 'c' }, { 'originals/weapon': 'b', proof: 'd' });
  assert.deepEqual(next.cards, old.cards); assert.equal(next.protectedFiles.frame, 'a'); assert.equal(next.protectedFiles.weapon, 'c');
  assert.equal(next.protectedFiles['originals/weapon'], 'b'); assert.equal(old.protectedFiles.weapon, 'b'); assert.equal(next.parentReferenceId, 'old');
});
test('an added protection cannot conceal an unaudited old-file replacement', () => {
  assert.throws(() => P.nextReferences({ id: 'old', cards: [], protectedFiles: { frame: 'a' } }, {}, { frame: 'changed' }), /without audit/);
});

test('published catalogue verification includes creations as well as references', async () => {
  const cards = [{ id: '30000017', kind: 'approved' }, { id: '42650442', kind: 'created' }];
  const build = async ({ published }) => {
    assert.deepEqual(published, [cards[1]]);
    return { cards: [cards[0], ...published] };
  };
  await P.verifyPublishedCatalogue({ cards }, { cardCount: 2 }, build);
  await assert.rejects(P.verifyPublishedCatalogue({ cards }, { cardCount: 2 }, async () => ({ cards: [cards[0]] })));
  await assert.rejects(P.verifyPublishedCatalogue({ cards }, { cardCount: 2 }, async () => ({ cards: [cards[0], { id: 'wrong' }] })));
});

async function transactionFixture() {
  const base = L.path.join(__dirname, 'tests', L.crypto.randomUUID()); L.fs.mkdirSync(base, { recursive: true });
  const changes = [];
  for (const n of ['first', 'second']) {
    const target = L.path.join(base, n + '.txt'), backup = L.path.join(base, n + '.before.txt'), stage = L.path.join(base, n + '.after.txt');
    L.fs.writeFileSync(target, n + ' original'); L.fs.copyFileSync(target, backup); L.fs.writeFileSync(stage, n + ' revised');
    changes.push({ target, backup, stage, beforeHash: await L.hash(target), afterHash: await L.hash(stage) });
  }
  const journal = L.path.join(base, 'transaction.json');
  return { changes, journal, tx: transactionIO(L, journal) };
}
test('transaction rolls back the entire batch after an interrupted first replacement', async () => {
  const { changes, journal, tx } = await transactionFixture();
  await assert.rejects(tx.commit({ revision: REVISION, changes }, { afterWrite: () => { throw Error('simulated interruption'); } }), /simulated interruption/);
  assert.equal(L.read(journal).state, 'rolled-back');
  for (const c of changes) assert.equal(await L.hash(c.target), c.beforeHash);
});
test('transaction refuses third-party changes before touching any target', async () => {
  const { changes, tx } = await transactionFixture(); L.fs.writeFileSync(changes[1].target, 'external edit');
  await assert.rejects(tx.commit({ revision: REVISION, changes }), /Source modifiee/);
  assert.equal(await L.hash(changes[0].target), changes[0].beforeHash);
  assert.equal(L.fs.readFileSync(changes[1].target, 'utf8'), 'external edit');
});
