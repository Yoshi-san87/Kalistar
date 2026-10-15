'use strict';
const L = require('../../atelier/lib.cjs'), S = require('./numeric-only.cjs');
const { fs, path, assert, read, write, hash, sharp, ROOT } = L;
const file = n => path.join(__dirname, n), rel = p => path.relative(ROOT, p).replaceAll('\\', '/');
async function capture() {
  const request = read(file('render-request.json')), first = request.cards[0].id, last = request.cards.at(-1).id;
  const home = file('render-batches/' + first + '-' + last); fs.mkdirSync(home, { recursive: true });
  const names = ['render-inputs.json', 'render-request.json', 'compose.jsx', 'render.ps1', 'revise.cjs', 'numeric-only.cjs', 'plan.cjs'];
  for (const n of names) {
    const source = file(n), target = path.join(home, n);
    if (fs.existsSync(target)) assert.equal(await hash(source), await hash(target), 'Never overwrite batch evidence.');
    else fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
  }
  return { captured: request.cards.map(c => c.id), evidence: rel(home) };
}
async function contact(name, cards) {
  const width = 240, height = Math.round(1497 * width / 897), footer = 24, cols = 4, rows = Math.ceil(cards.length / cols), inputs = [];
  for (const [i, card] of cards.entries()) {
    inputs.push({ input: await sharp(file('work/' + card.id + '/card.png')).resize({ width }).png().toBuffer(), left: (i % cols) * width, top: Math.floor(i / cols) * (height + footer) });
    const label = await sharp({ text: { text: card.id + '  ' + card.key, font: 'Arial 12', width: width - 12, height: 16, rgba: true } }).png().toBuffer();
    inputs.push({ input: label, left: (i % cols) * width + 6, top: Math.floor(i / cols) * (height + footer) + height + 4 });
  }
  const dest = file('qa/' + name + '.png'); fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp({ create: { width: cols * width, height: rows * (height + footer), channels: 4, background: '#d9dfe2' } }).composite(inputs).png().toFile(dest);
  return rel(dest);
}
async function complete() {
  await require('./revise.cjs').guard();
  const plan = read(file('plan.json')), proofs = [], evidence = {};
  for (const c of plan.cards) {
    const home = file('work/' + c.id), v = read(path.join(home, 'verification.json')), p = read(path.join(home, 'verified.json'));
    assert(v.passed && v.numericOnly && v.scope.outside === 0 && v.preservedNativeStyles && v.unchangedArtworkAndComponents);
    for (const [f, h] of Object.entries(p.evidence)) assert.equal(await hash(path.join(ROOT, f)), h, 'Changed verified evidence.');
    assert.equal(v.roundtrip.changed, 0); assert.equal(v.barcode.passed, true);
    S.assertNative(read(path.join(home, 'audit.json')), read(path.join(home, 'render/native.json')), read(file('originals/' + c.id + '/render/native.json')),
      read(file('originals/' + c.id + '/profile.json')), read(path.join(home, 'profile.json')));
    const proofFile = rel(path.join(home, 'verification.json')); evidence[proofFile] = await hash(path.join(ROOT, proofFile));
    proofs.push({ id: c.id, key: c.key, proof: proofFile, scope: v.scope, roundtrip: v.roundtrip, barcode: v.barcode.passed, nativeStyleAudit: v.nativeStyleAudit });
  }
  const op = plan.cards.filter(c => c.faction === 'ONEPIECE'), re = plan.cards.filter(c => c.faction.startsWith('RE')), mgs = plan.cards.filter(c => c.faction.startsWith('MGS'));
  const contacts = [await contact('one-piece', op), await contact('resident-evil-01', re.slice(0, 12)), await contact('resident-evil-02', re.slice(12)), await contact('metal-gear', mgs)];
  const result = { revision: S.REV, passed: true, verifiedCards: proofs.length, planHash: await hash(file('plan.json')), evidence, proofs, contacts,
    preservedNativeStyles: true, artworkUnchanged: true, zeroPixelsOutsideNumericCircles: true,
    publication: 'awaiting-parent-proof-review', checkedAt: new Date().toISOString() };
  write(file('verified.json'), result); return { verified: proofs.length, contacts, publication: result.publication };
}
async function published() {
  const before = read(file('before.json')), plan = read(file('plan.json')), record = read(file('published.json'));
  const aggregate = read(file('verified.json')), bounds = require('../../../V3/donnees/regles_demo.json').roleBounds;
  assert(record.numericOnly && aggregate.passed && aggregate.verifiedCards === 48);
  assert.equal(record.revision, S.REV); assert.equal(before.planHash, await hash(file('plan.json')));
  await L.protectedCheck(); await require('../../atelier/designer-render.cjs').verifyAssets();
  for (const entries of [before.backups, before.sources, before.protected, aggregate.evidence]) {
    for (const [f, h] of Object.entries(entries)) assert.equal(await hash(path.join(ROOT, f)), h, 'Changed frozen evidence: ' + f);
  }
  const catalogue = read(path.join(ROOT, 'V4/donnees/catalogue.json')), previous = read(file('catalogue-before-publication.json'));
  const profiles = plan.cards.map(c => read(path.join(ROOT, 'V4/creations', c.id, 'profile.json')));
  S.catalogueChange(previous, catalogue, profiles, bounds);
  for (const [i, c] of plan.cards.entries()) {
    const original = read(file('originals/' + c.id + '/profile.json')), profile = profiles[i];
    assert.deepEqual(profile, { ...original, ...c.after });
    for (const n of ['profile.json', 'card.png', 'card.psd', 'verification.json', 'creation.json']) {
      assert.equal(await hash(path.join(ROOT, 'V4/creations', c.id, n)), await hash(file('work/' + c.id + '/' + n)));
    }
    const illustration = 'V4/creations/' + c.id + '/illustration.png';
    assert.equal(await hash(path.join(ROOT, illustration)), before.observed[illustration]);
    const v = read(file('work/' + c.id + '/verified.json'));
    for (const [f, h] of Object.entries(v.evidence)) assert.equal(await hash(path.join(ROOT, f)), h);
  }
  const G = require('../../atelier/game-catalog.cjs');
  const oldGame = await G.buildCatalog({ published: previous.cards.filter(c => c.kind === 'created') });
  const currentGame = await G.buildCatalog({ published: catalogue.cards.filter(c => c.kind === 'created') });
  assert.equal(currentGame.cards.length, record.gameCount); assert.equal(currentGame.cards.length, oldGame.cards.length);
  for (const old of oldGame.cards) {
    const c = plan.cards.find(c => c.id === old.id), current = currentGame.cards.find(c => c.id === old.id);
    assert.deepEqual(current, c ? { ...old, atk: c.after.atk, defense: c.after.defense } : old, 'Unintended playable change.');
  }
  const testLog = fs.readFileSync(file('portable-tests.tap'), 'utf8');
  for (const [key, value] of Object.entries({ tests: 31, pass: 31, fail: 0, cancelled: 0, skipped: 0, todo: 0 })) {
    assert(new RegExp('^# ' + key + ' ' + value + '$', 'm').test(testLog), 'Incomplete final portable tests: ' + key);
  }
  const result = { revision: S.REV, passed: true, publishedCards: profiles.length, gameCount: currentGame.cards.length,
    creationFiles: record.changed.length - 1, changedNumericFaces: plan.cards.reduce((n, c) => n + c.numericChanges, 0),
    nativeVerifiedCards: aggregate.verifiedCards, maximumTransformDrift: Math.max(...aggregate.proofs.map(p => p.nativeStyleAudit.linearTransformDrift)),
    protectedFilesAndOriginalsUnchanged: true, artworkUnchanged: true, allUnrelatedCatalogueEntriesUnchanged: true,
    onlyPlayableChanges: ['atk', 'defense'], portableTests: { passed: 31, failed: 0, initialPolicies: 9, finalFocusedPolicies: 11,
      log: rel(file('portable-tests.tap')), logHash: await hash(file('portable-tests.tap')) }, checkedAt: new Date().toISOString() };
  write(file('completion.json'), result); return result;
}
const action = process.argv[2] || 'capture';
({ capture, complete, published }[action] || (() => { throw Error('Unknown action.'); }))().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
