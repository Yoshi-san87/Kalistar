'use strict';
const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs'), R = require('../../atelier/designer-render.cjs');
const B = require('../../collaborations/nier-pilot-01/build.cjs');
const { fs, path, assert, read, write, hash, ROOT, sharp, crypto } = L;
const REVISION = '2026-09-23-barret-cyborg', ID = '43698921', home = __dirname, file = n => L.inside(home, n);
const production = path.join(ROOT, 'V4/collaborations/ff7-set-01'), source = path.join(production, 'cards/barret'), published = path.join(ROOT, 'V4/creations', ID);
const local = n => path.join(source, n), work = n => file('work/' + n);
const icon = path.join(ROOT, 'V4/collaborations/nier-pilot-01/components/race-CYBORG.png');
const FILES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png'];
function raceOnly(before, after) {
  assert.equal(before.id, ID); assert.equal(before.race, 'HUMAIN');
  assert.deepEqual(after, { ...before, race: 'CYBORG' }, 'Seule la race peut changer.');
}
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function preflight(mapping = new Map()) {
  const resolve = f => mapping.get(f) || f, lock = path.join(L.DATA, 'render.lock');
  const overlay = { ...L, read: f => read(resolve(f)), hash: f => hash(resolve(f)), sharp: f => sharp(resolve(f)),
    fs: { ...fs, existsSync: f => f === lock ? false : fs.existsSync(resolve(f)), readFileSync: (f, ...args) => fs.readFileSync(resolve(f), ...args), lstatSync: f => fs.lstatSync(resolve(f)) } };
  const designer = { ...D, catalogue: () => mapping.has(D.CATALOGUE) ? read(resolve(D.CATALOGUE)) : D.catalogue() };
  const report = await require('../../collaborations/ff7-set-01/publish.cjs').createPublisher({ L: overlay, D: designer }).preflight();
  assert.equal(report.added, 0); assert.equal(report.reused, 10); return report;
}
async function guard(before, mutable = false) {
  assert.equal(before.revision, REVISION); assert.equal(before.referenceId, L.baseline().id);
  for (const [f, h] of Object.entries(before.observed)) if (!mutable || !before.changes.some(c => c.target === f)) assert.equal(await hash(f), h, 'Source modifiee : ' + f);
  for (const c of before.changes) { assert.equal(c.stage, file('staging/' + path.relative(ROOT, c.target))); assert.equal(await hash(c.backup), c.beforeHash); }
}
async function check() { return { revision: REVISION, modelId: ID, only: ['race-label', 'race-icon', 'profile.race'], iconReady: fs.existsSync(icon), prepared: fs.existsSync(file('before.json')) }; }
async function prepare() {
  return B.locked(async () => {
    assert.ok(!fs.existsSync(file('before.json')) && !fs.existsSync(file('originals')), 'Revision deja preparee ; conserver ses originaux.');
    await stable(); await preflight();
    const profile = read(local('profile.json')); raceOnly(profile, { ...profile, race: 'CYBORG' });
    const raceProof = read(path.join(ROOT, 'V4/collaborations/nier-pilot-01/race-components.json')).races.CYBORG;
    assert.equal(await hash(icon), raceProof.sha256); assert.equal(await hash(path.join(ROOT, raceProof.source)), raceProof.sourceHash);
    for (const name of FILES) assert.equal(await hash(local(name)), await hash(path.join(published, name)));
    const before = { revision: REVISION, referenceId: L.baseline().id, observed: {}, changes: [] };
    const observe = async f => { before.observed[f] = await hash(f); };
    for (const f of [icon, file('revise.cjs'), file('replace.jsx'), ...Object.keys(await B.snapshots())]) await observe(f);
    for (const c of D.catalogue().cards.filter(c => c.kind === 'created')) for (const name of [...FILES, 'creation.json']) await observe(path.join(ROOT, 'V4/creations', c.id, name));
    for (const key of ['cloud', ...read(path.join(production, 'set.json')).cards.map(c => c.key)]) for (const name of FILES) await observe(path.join(production, 'cards', key, name));
    const plan = read(local('render/composition.json')), race = plan.layers.find(l => l.name === 'RACE - HUMAIN');
    assert.deepEqual({ ...race, file: undefined, name: undefined }, { file: undefined, name: undefined, left: 711, top: 1116, width: 96, height: 95 });
    const targets = [D.CATALOGUE, path.join(production, 'set.json'), path.join(production, 'preparation.json'), path.join(production, 'verification.json'), path.join(published, 'creation.json'),
      ...[source, published].flatMap(dir => FILES.filter(n => n !== 'illustration.png').map(n => path.join(dir, n))),
      ...['composition.json', 'native.json', 'reopened.png', 'without-text.png', 'expected-components.png', race.file].map(n => local('render/' + n)),
      ...['preview.png', 'small-preview.png'].filter(n => fs.existsSync(local(n))).map(local)];
    for (const target of targets) {
      await observe(target); const beforeHash = before.observed[target], backup = file('originals/' + path.relative(ROOT, target));
      fs.mkdirSync(path.dirname(backup), { recursive: true }); fs.copyFileSync(target, backup, fs.constants.COPYFILE_EXCL);
      before.changes.push({ target, backup, beforeHash, stage: file('staging/' + path.relative(ROOT, target)) });
    }
    const prep = read(path.join(production, 'preparation.json'));
    for (const [f, h] of Object.entries(prep.snapshot)) assert.equal(await hash(path.join(ROOT, f)), h, 'Preparation FF7 obsolete.');
    fs.mkdirSync(work('render'), { recursive: true });
    for (const l of plan.layers) { await observe(local('render/' + l.file)); fs.copyFileSync(local('render/' + l.file), work('render/' + l.file)); }
    fs.copyFileSync(icon, work('render/' + race.file)); race.name = 'RACE - CYBORG';
    write(work('render/composition.json'), plan); write(work('profile.json'), { ...profile, race: 'CYBORG' });
    await sharp(await R.composite(plan.layers.map(l => ({ ...l, input: work('render/' + l.file) })))).png().toFile(work('render/expected-components.png'));
    for (const f of ['profile.json', 'render/composition.json', 'render/expected-components.png', ...plan.layers.map(l => 'render/' + l.file)]) await observe(work(f));
    await guard(before); write(file('before.json'), before); return { prepared: ID, productionUnchanged: true };
  });
}
async function render() {
  return B.locked(async () => {
    const before = read(file('before.json')); await guard(before); await stable();
    if (fs.existsSync(file('verified.json'))) fs.renameSync(file('verified.json'), file('verified.stale-' + crypto.randomUUID() + '.json'));
    write(file('render-request.json'), { original: before.changes.find(c => c.target === local('card.psd')).backup, native: local('render/native.json'), icon });
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', path.join(ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', file('replace.jsx')], file('photoshop.log'));
    await guard(before); return { rendered: ID, output };
  });
}
const unrelated = layers => layers.filter(l => !['RACE', 'RACE - HUMAIN', 'RACE - CYBORG'].includes(l.name)).map(({ id, ...l }) => l);
async function verify() {
  return B.locked(async () => {
    const before = read(file('before.json')); await guard(before); await stable();
    raceOnly(read(local('profile.json')), read(work('profile.json')));
    const n = read(work('race-state.json')); assert.deepEqual(unrelated(n.before), unrelated(n.after)); assert.deepEqual(unrelated(n.after), unrelated(n.layers));
    assert.deepEqual(unrelated(n.before), unrelated(read(local('render/native.json')).layers));
    const originalPixels = await L.diff(local('card.png'), work('before-card.png')), withoutRace = await L.diff(work('before-without-race.png'), work('after-without-race.png'));
    assert.equal(originalPixels.changed, 0); assert.equal(withoutRace.changed, 0);
    const text = [...n.before, ...n.after].filter(l => l.name === 'RACE').map(l => l.ink);
    const rectangles = [[711, 1116, 807, 1211], ...text.map(b => [Math.floor(b[0])-2, Math.floor(b[1])-2, Math.ceil(b[2])+2, Math.ceil(b[3])+2])];
    const outside = await L.diff(local('card.png'), work('card.png'), rectangles); assert.equal(outside.outside, 0); assert.ok(outside.changed > 0);
    const v = { ...await B.verifyNative(file('work'), read(work('profile.json'))), key: 'barret', revision: REVISION, raceOnly: { originalPixels, withoutRace, outside } };
    write(work('verification.json'), v);
    const mapping = new Map(), stage = (target, value, json = false) => {
      const c = before.changes.find(c => c.target === target); assert.ok(c, 'Cible hors perimetre : ' + target);
      fs.mkdirSync(path.dirname(c.stage), { recursive: true }); if (json) write(c.stage, value); else fs.copyFileSync(value, c.stage); mapping.set(target, c.stage);
    };
    for (const dir of [source, published]) for (const name of FILES.filter(n => n !== 'illustration.png')) stage(path.join(dir, name), work(name));
    const plan = read(work('render/composition.json')), race = plan.layers.find(l => l.name === 'RACE - CYBORG');
    for (const name of ['composition.json', 'native.json', 'reopened.png', 'without-text.png', 'expected-components.png', race.file]) stage(local('render/' + name), work('render/' + name));
    for (const name of ['preview.png', 'small-preview.png'].filter(n => fs.existsSync(local(n)))) {
      if (name === 'preview.png') stage(local(name), work('card.png'));
      else { await sharp(work('card.png')).extract({ left: 50, top: 50, width: 797, height: 1388 }).resize({ width: 320 }).png().toFile(work(name)); stage(local(name), work(name)); }
    }
    const set = read(path.join(production, 'set.json')); assert.equal(set.cards.find(c => c.key === 'barret').race, 'HUMAIN'); set.cards.find(c => c.key === 'barret').race = 'CYBORG'; stage(path.join(production, 'set.json'), set, true);
    const cat = read(D.CATALOGUE), entry = cat.cards.find(c => c.id === ID), p = read(work('profile.json'));
    raceOnly(entry.profile, p); entry.profile = p; stage(D.CATALOGUE, cat, true);
    const creation = read(path.join(published, 'creation.json'));
    for (const name of FILES.filter(n => n !== 'illustration.png')) creation.hashes[name] = await hash(work(name));
    creation.raceRevision = REVISION; stage(path.join(published, 'creation.json'), creation, true);
    const aggregate = read(path.join(production, 'verification.json')); aggregate.results = aggregate.results.map(r => r.key === 'barret' ? v : r); stage(path.join(production, 'verification.json'), aggregate, true);
    const prep = read(path.join(production, 'preparation.json'));
    prep.raceRevision = { id: REVISION, modelId: ID, changedFields: ['race'], profileHash: v.profileHash, componentHash: await hash(work('render/' + race.file)), setHash: await hash(mapping.get(path.join(production, 'set.json'))) };
    stage(path.join(production, 'preparation.json'), prep, true);
    assert.equal(mapping.size, before.changes.length); await preflight(mapping); await guard(before);
    write(file('verified.json'), { revision: REVISION, beforeHash: await hash(file('before.json')), staged: await B.hashes([...mapping.values()]), evidence: await B.hashes(['race-state.json', 'before-card.png', 'before-without-race.png', 'after-without-race.png'].map(work)) });
    return { verified: ID, onlyRaceChanged: true, ff7Reused: 10, productionUnchanged: true };
  });
}
async function publish() {
  return B.locked(async () => {
    const before = read(file('before.json')), proof = read(file('verified.json')); await guard(before); await stable();
    assert.equal(proof.beforeHash, await hash(file('before.json')));
    assert.deepEqual(await B.hashes(Object.keys(proof.staged)), proof.staged); assert.deepEqual(await B.hashes(Object.keys(proof.evidence)), proof.evidence);
    const mapping = new Map(before.changes.map(c => [c.target, c.stage])); await preflight(mapping); await guard(before);
    const transaction = { revision: REVISION, state: 'publishing', beforeHash: proof.beforeHash, staged: proof.staged }; write(file('transaction.json'), transaction);
    try {
      for (const c of before.changes) {
        assert.equal(await hash(c.target), c.beforeHash); const temp = c.target + '.' + crypto.randomUUID() + '.tmp';
        fs.copyFileSync(c.stage, temp, fs.constants.COPYFILE_EXCL); assert.equal(await hash(temp), proof.staged[c.stage]); fs.renameSync(temp, c.target);
      }
      await guard(before, true); await stable(); await preflight();
      for (const c of before.changes) assert.equal(await hash(c.target), proof.staged[c.stage]);
      write(file('transaction.json'), { ...transaction, state: 'published' }); return { published: ID, race: 'CYBORG', identityAndArtUnchanged: true };
    } catch (e) { await restore(before, transaction); throw e; }
  });
}
async function restore(before, transaction) {
  assert.equal(transaction.revision, REVISION); assert.equal(transaction.beforeHash, await hash(file('before.json'))); await guard(before, true);
  for (const c of before.changes) assert.ok([c.beforeHash, transaction.staged[c.stage]].includes(await hash(c.target)), 'Modification externe : rollback refuse.');
  for (const c of [...before.changes].reverse()) if (await hash(c.target) !== c.beforeHash) fs.copyFileSync(c.backup, c.target);
  await guard(before); await preflight(); write(file('transaction.json'), { ...transaction, state: 'rolled-back' }); return { rolledBack: true };
}
async function rollback() { return B.locked(() => restore(read(file('before.json')), read(file('transaction.json')))); }
module.exports = { check, prepare, render, verify, publish, rollback, raceOnly, unrelated };
if (require.main === module) {
  const action = process.argv[2] || 'check'; assert.ok(['check', 'prepare', 'render', 'verify', 'publish', 'rollback'].includes(action));
  module.exports[action]().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e); process.exitCode = 1; });
}
