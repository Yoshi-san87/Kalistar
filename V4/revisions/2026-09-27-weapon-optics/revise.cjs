'use strict';
const L = require('../../atelier/lib.cjs');
const R = require('../../atelier/designer-render.cjs');
const { fs, path, ROOT, DATA, assert, read, write, hash, sharp, crypto } = L;
const { REVISION, CHANGED } = require('./proposal.cjs');
const home = __dirname, file = n => L.inside(home, n), rel = f => path.relative(ROOT, f).replaceAll('\\', '/');
const control = ['V4/atelier/data/references.json', 'V4/atelier/data/regression.json',
  'V4/atelier/designer-assets/manifest.json', 'V4/atelier/designer-assets/manifest.raw.json',
  'V4/template-stable/icon-layouts.json', 'V4/donnees/catalogue.json'];
async function stable() { await L.protectedCheck(); await R.verifyAssets(); }
async function guard(b) {
  assert.equal(b.revision, REVISION); assert.equal(L.baseline().id, b.referenceId);
  for (const [target, expected] of Object.entries(b.observed)) assert.equal(await hash(path.join(ROOT, target)), expected, 'Changed since baseline: ' + target);
  for (const [target, expected] of Object.entries(b.backups)) assert.equal(await hash(file('originals/' + target)), expected, 'Changed backup: ' + target);
}
async function prepare() {
  if (fs.existsSync(file('before.json'))) { const b = read(file('before.json')); await guard(b); return { prepared: b.items.length, already: true }; }
  await stable();
  const refs = L.baseline(), manifest = read(path.join(ROOT, control[2])), cat = read(path.join(ROOT, control[5]));
  const items = cat.cards.filter(c => CHANGED.includes(c.profile.weapon)).map(c => {
    const ref = refs.cards.find(r => r.card.id === c.id), base = 'V4/creations/' + c.id;
    return { id: c.id, key: ref?.key || c.id, name: c.name, weapon: c.profile.weapon, kind: c.kind,
      psd: ref?.psd || base + '/card.psd', png: ref?.png || base + '/card.png', profile: ref?.profile || base + '/profile.json',
      layer: ref ? 'ARME - CONTENU' : 'ARME - ' + c.profile.weapon,
      ...(ref ? {} : { verification: base + '/verification.json', creation: base + '/creation.json' }) };
  });
  assert.equal(items.length, 6); assert.equal(refs.cards.length, 38);
  const b = { revision: REVISION, phase: 'originals-preserved-before-native', referenceId: refs.id,
    catalogueCount: cat.cards.length, referenceCount: refs.cards.length, observed: {}, backups: {}, items,
    inspectKeys: ['voloden', 'iliane'], changedWeapons: CHANGED, preparedAt: new Date().toISOString() };
  const targets = new Set(control);
  for (const i of items) for (const key of ['psd', 'png', 'profile', 'verification', 'creation']) if (i[key]) targets.add(i[key]);
  for (const weapon of CHANGED) {
    targets.add('V4/atelier/designer-assets/' + manifest.weapons[weapon].file);
    targets.add('V4/atelier/designer-assets/' + manifest.weapons[weapon].nativeExportFile);
  }
  for (const target of new Set([...Object.keys(refs.protectedFiles), ...targets])) b.observed[target] = await hash(path.join(ROOT, target));
  for (const c of cat.cards.filter(c => c.kind === 'created')) {
    for (const name of ['card.psd', 'card.png', 'profile.json', 'verification.json', 'creation.json']) {
      const target = 'V4/creations/' + c.id + '/' + name;
      b.observed[target] = await hash(path.join(ROOT, target));
    }
  }
  for (const target of targets) {
    const source = path.join(ROOT, target), backup = file('originals/' + target);
    fs.mkdirSync(path.dirname(backup), { recursive: true });
    if (!fs.existsSync(backup)) fs.copyFileSync(source, backup, fs.constants.COPYFILE_EXCL);
    assert.equal(await hash(backup), b.observed[target]); b.backups[target] = b.observed[target];
  }
  for (const item of items) fs.mkdirSync(file('staged/' + item.key), { recursive: true });
  fs.mkdirSync(file('inspection'), { recursive: true });
  write(file('before.json'), b); await guard(b);
  return { prepared: items.length, originals: targets.size, observed: Object.keys(b.observed).length, photoshopRun: false };
}
async function native(mode) {
  assert.ok(['inspect', 'pilot', 'bind', 'render-references', 'render-creations'].includes(mode));
  const b = read(file('before.json')); await guard(b); await stable();
  const lock = path.join(DATA, 'render.lock'), owner = crypto.randomUUID(); let fd;
  try {
    fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, JSON.stringify({ id: owner, pid: process.pid, revision: REVISION, phase: mode }));
    const keys = mode === 'render-references' ? ['thalie'] : mode === 'render-creations' ? b.items.filter(i => i.kind === 'created').map(i => i.key) : b.inspectKeys;
    write(file('native-request.json'), { revision: REVISION, mode, keys });
    const output = await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File', file('render.ps1'), '-Script', file('native.jsx')], file('native-' + mode + '.log'));
    await guard(b); return { mode, output };
  } finally { if (fd !== undefined) { fs.closeSync(fd); if (fs.existsSync(lock) && read(lock).id === owner) fs.unlinkSync(lock); } }
}
async function main(action) {
  if (action === 'prepare') return prepare();
  if (['inspect', 'pilot', 'bind', 'render-references', 'render-creations'].includes(action)) return native(action);
  throw Error('Explicit supported action required');
}
if (require.main === module) main(process.argv[2]).then(v => console.log(JSON.stringify(v))).catch(e => { console.error(e); process.exitCode = 1; });
module.exports = { prepare, guard, native, file, rel, control };
