'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const L = require('../../atelier/lib.cjs');
const P = require('./revise.cjs'), { transactionIO } = require('./transaction.cjs');
const { fs, path, hash, write, read } = L;
const selection = read(path.join(__dirname, 'selection.json'));
const source = path.resolve(__dirname, '../../collaborations/nier-set-02');
function readOriginal(relative) {
  const backup = path.join(__dirname, 'originals/V4/collaborations/nier-set-02', relative);
  return read(fs.existsSync(backup) ? backup : path.join(source, relative));
}

test('Photoshop JSX avoids the reserved native identifier', () => {
  const jsx = fs.readFileSync(path.join(__dirname, 'replace.jsx'), 'utf8');
  assert.doesNotMatch(jsx, /\b(?:var\s+|,\s*)native\s*=/);
});
test('selection is exactly the five approved keys; paths and hidden extra fields are rejected', () => {
  assert.equal(P.selection(selection).length, 5);
  for (const bad of [
    { ...selection, cards: [...selection.cards, { key: 'emil', illustration: 'art/emil.png' }] },
    { ...selection, cards: selection.cards.map(c => c.key === 'a2' ? { ...c, illustration: '../a2.png' } : c) },
    { ...selection, cards: selection.cards.map(c => c.key === 'a2' ? { ...c, weapon: 'Gun' } : c) },
    { ...selection, cards: [...selection.cards.slice(0, 4), selection.cards[0]] }
  ]) assert.throws(() => P.selection(bad));
});
test('Adam changes to existing Orbe index only; the other five source profiles stay identical', () => {
  const original = read(path.join(source, 'set.json')), next = P.revisedSet(original);
  assert.equal(original.cards.find(c => c.key === 'adam').weapon, 'Poing');
  assert.equal(next.cards.find(c => c.key === 'adam').weapon, 'Orbe');
  for (const spec of original.cards) {
    const p = readOriginal('cards/' + spec.key + '/profile.json'), revised = P.revisedProfile(spec.key, p);
    P.assertProfileDelta(spec.key, p, revised);
    const expected = spec.key === 'adam' ? { ...p, weapon: 'Orbe', weapon_index: 14 } : p;
    assert.deepEqual(revised, expected);
    assert.throws(() => P.assertProfileDelta(spec.key, p, { ...revised, atk: revised.atk.map(v => typeof v === 'number' ? v + 1 : v) }));
  }
});
test('Orbe uses the locked bank and exactly the current Adam weapon footprint', () => {
  const m = read(path.resolve(source, '../../atelier/designer-assets/manifest.json'));
  const plan = readOriginal('cards/adam/render/composition.json');
  const p = plan.layers.find(l => l.name === 'ARME - Poing'), o = m.weapons.Orbe;
  assert.deepEqual([p.left, p.top, p.width, p.height], [o.left, o.top, o.width, o.height]);
  assert.equal(o.file, 'packed/banks/weapon-Orbe.png');
});
test('layer audit never ignores text, frame or geometry; IDs alone may differ', () => {
  const old = readOriginal('cards/adam/render/native.json').layers;
  const changed = structuredClone(old).map(l => l.name === 'ARME - Poing' ? { ...l, name: 'ARME - Orbe', path: 'ARME - Orbe', id: 999 } : l);
  assert.deepEqual(P.unchangedLayers(old, 'adam'), P.unchangedLayers(changed, 'adam'));
  P.unchangedLayerGeometry(old, changed, 'ARME - Poing', 'ARME - Orbe');
  const moved = structuredClone(changed); moved.find(l => l.name === 'ARME - Orbe').bounds[0]++;
  assert.throws(() => P.unchangedLayerGeometry(old, moved, 'ARME - Poing', 'ARME - Orbe'));
  const text = structuredClone(changed); text.find(l => l.name === 'NOM').text = 'WRONG';
  assert.notDeepEqual(P.unchangedLayers(old, 'adam'), P.unchangedLayers(text, 'adam'));
});
async function fixture(run) {
  const dir = fs.mkdtempSync(path.join(__dirname, '.test-transaction-'));
  try {
    const changes = [];
    for (const [i, name] of ['card.psd', 'profile.json', 'catalogue.json'].entries()) {
      const target = path.join(dir, name), backup = path.join(dir, name + '.before'), stage = path.join(dir, name + '.stage');
      fs.writeFileSync(target, 'old-' + i); fs.copyFileSync(target, backup); fs.writeFileSync(stage, 'new-' + i);
      changes.push({ target, backup, stage, beforeHash: await hash(target), afterHash: await hash(stage) });
    }
    const journalFile = path.join(dir, 'transaction.json');
    await run({ changes, journalFile, tx: transactionIO(L, journalFile) });
  } finally {
    const relative = path.relative(__dirname, path.resolve(dir));
    assert.ok(relative.startsWith('.test-transaction-') && !relative.includes(path.sep));
    fs.rmSync(dir, { recursive: true });
  }
}
test('transaction commits all files and explicit rollback restores every original', () => fixture(async ({ changes, tx, journalFile }) => {
  await tx.commit({ revision: 'test', changes }); assert.equal(read(journalFile).state, 'published');
  for (const c of changes) assert.equal(await hash(c.target), c.afterHash);
  await tx.rollback(read(journalFile)); assert.equal(read(journalFile).state, 'rolled-back');
  for (const c of changes) assert.equal(await hash(c.target), c.beforeHash);
}));
test('failure after each partial write rolls back the entire batch', async () => {
  for (let failAt = 0; failAt < 3; failAt++) await fixture(async ({ changes, tx, journalFile }) => {
    await assert.rejects(tx.commit({ changes }, { afterWrite: (_, i) => { if (i === failAt) throw Error('injected'); } }), /injected/);
    assert.equal(read(journalFile).state, 'rolled-back');
    for (const c of changes) assert.equal(await hash(c.target), c.beforeHash);
  });
});
test('post-publication validation failure also restores the original files', () => fixture(async ({ changes, tx, journalFile }) => {
  await assert.rejects(tx.commit({ changes }, { after: () => { throw Error('postcheck'); } }), /postcheck/);
  assert.equal(read(journalFile).state, 'rolled-back');
  for (const c of changes) assert.equal(await hash(c.target), c.beforeHash);
}));
test('stale target or stage prevents all publication writes', async () => {
  for (const field of ['target', 'stage']) await fixture(async ({ changes, tx, journalFile }) => {
    fs.writeFileSync(changes[1][field], 'external edit');
    await assert.rejects(tx.commit({ changes })); assert.equal(fs.existsSync(journalFile), false);
    assert.equal(await hash(changes[0].target), changes[0].beforeHash);
  });
});
test('interruption journal recovers a partially committed batch', () => fixture(async ({ changes, tx, journalFile }) => {
  const journal = { state: 'publishing', changes }; write(journalFile, journal);
  fs.copyFileSync(changes[0].stage, changes[0].target);
  await tx.rollback(journal);
  for (const c of changes) assert.equal(await hash(c.target), c.beforeHash);
}));
test('rollback refuses external edits without partially restoring other files', () => fixture(async ({ changes, tx, journalFile }) => {
  await tx.commit({ changes }); fs.writeFileSync(changes[1].target, 'external edit');
  await assert.rejects(tx.rollback(read(journalFile)), /Modification externe/);
  assert.equal(await hash(changes[0].target), changes[0].afterHash);
  assert.equal(fs.readFileSync(changes[1].target, 'utf8'), 'external edit');
}));
test('transaction does not overwrite a previous active journal', () => fixture(async ({ changes, tx, journalFile }) => {
  write(journalFile, { state: 'publishing', changes });
  await assert.rejects(tx.commit({ changes }), /Transaction existante/);
  for (const c of changes) assert.equal(await hash(c.target), c.beforeHash);
}));
