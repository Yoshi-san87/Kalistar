'use strict';
const assert = require('node:assert/strict');
const PARENT = '2026-09-21-ff8-refinements';
const parentHome = L => L.path.join(L.ROOT, 'V4/revisions', PARENT);

async function inherit({ L, R, home, revision, cards, targets, art }) {
  const { fs, path, read, write, hash, sharp } = L;
  const parent = parentHome(L), local = name => L.inside(home, name);
  const beforeFile = path.join(parent, 'before.json'), proofFile = path.join(parent, 'verified.json');
  assert.ok(!fs.existsSync(path.join(parent, 'transaction.json')), 'La transaction precedente ne doit pas etre publiee.');
  const previous = read(beforeFile), proof = read(proofFile);
  const beforeHash = await hash(beforeFile), proofHash = await hash(proofFile);
  assert.equal(previous.revision, PARENT); assert.equal(proof.revision, PARENT);
  assert.equal(proof.beforeHash, beforeHash); assert.equal(previous.referenceId, L.baseline().id);
  assert.equal(proof.publication?.added, 0); assert.equal(proof.publication?.reused, 12);
  assert.deepEqual(previous.cards, cards.map(c => ({ ...c, work: path.join(parent, 'work', c.key) })));
  assert.deepEqual(previous.changes.map(c => c.target), targets);
  assert.deepEqual(Object.keys(proof.staged), targets);
  const evidence = [];
  for (const c of previous.cards) {
    const hidden = c.key === 'seifer' ? 'without-art-description.png' : 'without-art.png';
    const special = c.key === 'zell' ? ['before-without-changes.png', 'after-without-changes.png', 'before-art-only.png', 'after-art-only.png'] : ['before-' + hidden, 'after-' + hidden];
    evidence.push(...['native.json', 'before-card.png', ...special, 'card.png', 'card.psd', 'reopened.png', 'without-text.png'].map(name => path.join(c.work, name)));
  }
  assert.deepEqual(Object.keys(proof.evidence).sort(), evidence.sort(), 'Preuves natives precedentes incompletes.');
  for (const [file, expected] of Object.entries(proof.evidence)) if (Object.hasOwn(previous.observed, file)) assert.equal(expected, previous.observed[file], 'Preuve incompatible avec le guard precedent.');
  const observed = { ...previous.observed, ...proof.evidence, [beforeFile]: beforeHash, [proofFile]: proofHash };
  for (const c of previous.changes) {
    assert.equal(c.beforeHash, previous.observed[c.target]);
    assert.equal(c.backup, path.join(parent, 'originals', c.beforeHash + path.extname(c.target)));
    assert.equal(c.stage, path.join(parent, 'staging', path.relative(L.ROOT, c.target)));
    observed[c.backup] = c.beforeHash; observed[c.stage] = proof.staged[c.target];
  }
  const check = async (file, expected) => {
    assert.ok(fs.lstatSync(file).isFile(), 'Fichier regulier requis : ' + file);
    assert.equal(await hash(file), expected, 'Empreinte precedente modifiee : ' + file);
  };
  for (const [file, expected] of Object.entries(observed)) await check(file, expected);
  // Keep the parent's entire guard. New inputs extend it; no old hash is replaced.
  const next = { revision, referenceId: previous.referenceId, cards, observed: { ...observed }, changes: [],
    continuation: { parent, beforeHash, proofHash, reusedNative: cards.filter(c => c.key !== 'irvine').map(c => c.key), rerender: ['irvine'] } };
  const remember = async file => { next.observed[file] = await hash(file); };
  const copy = async (source, target, expected) => {
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL); await check(target, expected); await remember(target);
  };
  const metadata = await sharp(art).metadata(), artHash = await hash(art);
  assert.ok(fs.lstatSync(art).isFile() && metadata.format === 'png' && metadata.width > 0 && metadata.height > 0 && (metadata.pages || 1) === 1, 'PNG Irvine simple requis.');
  assert.notEqual(artHash, previous.observed[path.join(parent, 'art/irvine.png')], 'Le nouveau fond Irvine est identique au fond rejete.');
  await copy(beforeFile, local('previous/before.json'), beforeHash);
  await copy(proofFile, local('previous/verified.json'), proofHash);
  for (const c of previous.changes) {
    const backup = local('originals/' + c.beforeHash + path.extname(c.target));
    if (!fs.existsSync(backup)) await copy(c.backup, backup, c.beforeHash);
    else await check(backup, c.beforeHash);
    next.changes.push({ target: c.target, backup, beforeHash: c.beforeHash, stage: local('staging/' + path.relative(L.ROOT, c.target)) });
  }
  for (const c of cards.filter(c => c.key !== 'irvine')) {
    const prefix = path.join(parent, 'work', c.key) + path.sep;
    for (const [file, expected] of Object.entries(observed)) if (file.startsWith(prefix)) await copy(file, L.inside(c.work, path.relative(prefix, file)), expected);
    const sourceArt = path.join(parent, 'art', c.key + '.png');
    if (c.key !== 'zell') await copy(sourceArt, local('art/' + c.key + '.png'), previous.observed[sourceArt]);
  }
  const irvine = cards.find(c => c.key === 'irvine'), newArt = local('art/irvine.png');
  if (path.resolve(art) !== path.resolve(newArt)) await copy(art, newArt, artHash);
  else { await check(newArt, artHash); await remember(newArt); }
  fs.mkdirSync(irvine.work, { recursive: true });
  await copy(newArt, path.join(irvine.work, 'illustration.png'), artHash);
  await sharp(newArt).resize(737, 921, { fit: 'cover' }).png().toFile(path.join(irvine.work, 'component-00.png'));
  const plan = read(path.join(irvine.source, 'render/composition.json'));
  assert.deepEqual(plan.layers[0], { file: 'component-00.png', name: 'ILLUSTRATION - cadrage', left: 80, top: 156, width: 737, height: 921 });
  const layers = plan.layers.map((l, i) => ({ ...l, input: i ? path.join(irvine.source, 'render', l.file) : path.join(irvine.work, l.file) }));
  await sharp(await R.composite(layers)).png().toFile(path.join(irvine.work, 'expected-components.png'));
  for (const name of ['component-00.png', 'expected-components.png']) await remember(path.join(irvine.work, name));
  for (const name of ['revise.cjs', 'replace.jsx', 'zell.cjs', 'seifer.cjs', 'inherit.cjs']) await remember(local(name));
  next.continuation.newArtSource = { file: art, hash: artHash };
  write(local('lineage.json'), next.continuation); await remember(local('lineage.json'));
  for (const [file, expected] of Object.entries(observed)) await check(file, expected);
  await check(art, artHash);
  return next;
}
module.exports = { inherit, parentHome };
