'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createPublisher, main } = require('./publish.cjs');
const { buildCatalog } = require('../../atelier/game-catalog.cjs');
const { createEngine } = require('../../site/engine.js');
const references = require('../../atelier/data/references.json');
const set = require('./set.json');
const designerCode = fs.readFileSync(path.join(__dirname, '../../atelier/designer-core.cjs'), 'utf8');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const NAMES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png'];

// All writes, including fake PSD sentinels and atomic renames, stay in these maps.
function fixture({ cloud = true } = {}) {
  const ROOT = path.resolve(path.parse(__dirname).root, '__ff7_publication_memory_only__');
  const home = path.join(ROOT, 'V4/collaborations/ff7-set-01'), DATA = path.join(ROOT, 'V4/atelier/data');
  const files = new Map(), dirs = new Set([ROOT]), descriptors = new Map(), ops = [];
  let serial = 1, nextFd = 10, fault = () => {}, catalogHook = async data => data;
  const safe = file => {
    const resolved = path.resolve(file), rel = path.relative(ROOT, resolved);
    assert.ok(!rel.startsWith('..') && !path.isAbsolute(rel), 'Virtual path escaped.'); return resolved;
  };
  const error = (code, file) => Object.assign(Error(code + ': ' + file), { code });
  function mkdir(file) { const key = safe(file); if (dirs.has(key)) return; mkdir(path.dirname(key)); dirs.add(key); }
  const seed = (file, value) => { const key = safe(file); mkdir(path.dirname(key)); files.set(key, Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value)); };
  const encode = value => Buffer.from(JSON.stringify(value, null, 2).replaceAll('\n', '\r\n'));
  const put = (file, value) => seed(file, encode(value));
  const event = (op, from, to) => { const value = { op, from, to }; ops.push(value); fault(value); };
  const mem = {
    constants: { COPYFILE_EXCL: 1 },
    existsSync: file => files.has(safe(file)) || dirs.has(safe(file)),
    lstatSync(file) {
      const key = safe(file); if (!files.has(key) && !dirs.has(key)) throw error('ENOENT', key);
      return { isFile: () => files.has(key), size: files.get(key)?.length || 0 };
    },
    readFileSync(file, encoding) {
      const key = safe(file); if (!files.has(key)) throw error('ENOENT', key);
      return encoding ? files.get(key).toString(encoding) : Buffer.from(files.get(key));
    },
    mkdirSync(file) { event('mkdir', safe(file)); mkdir(file); },
    writeFileSync(file, value, options) {
      const key = typeof file === 'number' ? descriptors.get(file) : safe(file);
      event('write', key);
      if (options?.flag === 'wx' && files.has(key)) throw error('EEXIST', key);
      if (!dirs.has(path.dirname(key))) throw error('ENOENT', key);
      files.set(key, Buffer.isBuffer(value) ? Buffer.from(value) : Buffer.from(value));
    },
    openSync(file, flags) {
      const key = safe(file); event('open', key); assert.equal(flags, 'wx');
      if (files.has(key)) throw error('EEXIST', key);
      if (!dirs.has(path.dirname(key))) throw error('ENOENT', key);
      const fd = nextFd++; files.set(key, Buffer.alloc(0)); descriptors.set(fd, key); return fd;
    },
    closeSync(fd) { assert.ok(descriptors.delete(fd)); },
    unlinkSync(file) { const key = safe(file); event('unlink', key); assert.ok(files.delete(key)); },
    copyFileSync(from, to, flags) {
      const source = safe(from), target = safe(to); event('copy', source, target);
      assert.equal(flags, 1); if (files.has(target)) throw error('EEXIST', target);
      files.set(target, mem.readFileSync(source));
    },
    renameSync(from, to) {
      const source = safe(from), target = safe(to); event('rename', source, target);
      if (files.has(source)) { files.set(target, files.get(source)); files.delete(source); return; }
      if (!dirs.has(source)) throw error('ENOENT', source);
      if (dirs.has(target)) throw error('EEXIST', target);
      for (const key of [...dirs]) if (key === source || key.startsWith(source + path.sep)) { dirs.add(target + key.slice(source.length)); dirs.delete(key); }
      for (const [key, value] of [...files]) if (key.startsWith(source + path.sep)) { files.set(target + key.slice(source.length), value); files.delete(key); }
    }
  };
  const read = file => JSON.parse(mem.readFileSync(file, 'utf8'));
  const localCrypto = { ...crypto, randomUUID: () => uuid(serial++) };
  const L = {
    fs: mem, path, crypto: localCrypto, ROOT, DATA, read, baseline: () => structuredClone(references),
    inside(base, relative) {
      const target = path.resolve(base, relative), rel = path.relative(base, target);
      assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel)); return target;
    },
    hash: async file => digest(mem.readFileSync(file)),
    sharp: file => ({ metadata: async () => read(file) }),
    write(file, value) {
      mem.mkdirSync(path.dirname(file)); const temp = file + '.' + localCrypto.randomUUID() + '.tmp';
      mem.writeFileSync(temp, encode(value)); mem.renameSync(temp, file);
    }
  };
  const module = { exports: {} };
  vm.runInThisContext('(function(require,module){' + designerCode + '\n})')(
    name => { assert.equal(name, './lib.cjs'); return L; }, module);
  const D = module.exports, lock = path.join(DATA, 'render.lock'); mkdir(DATA);
  put(path.join(home, 'set.json'), set);
  const specs = [{ key: 'cloud', positions: [2], element: 'ELECTRO', atk: [286, 236, 186, 136, 86, 36], defense: [174, 142, 110, 78, 'retry', 22], magic: [4], barriers: [5] }, ...set.cards];
  const source = key => path.join(home, 'cards', key);
  const target = id => path.join(ROOT, 'V4/creations', id);
  const profiles = specs.map((spec, i) => {
    const base = structuredClone(references.cards[0].card);
    const p = { ...base, ...Object.fromEntries(Object.entries(spec).filter(([k]) => !['key', 'scene'].includes(k))),
      id: i ? String(49998000 + i) : '47208326', characterId: spec.key + '-ff7', faction: 'FF7', collaboration: 'FF7', testOnly: false,
      role: spec.atk.includes('revive') ? 5 : spec.atk.includes('guard') ? 1 : spec.positions[0],
      canGuard: spec.atk.includes('guard'), canHeal: spec.atk.includes('revive'), sentry: true };
    put(path.join(source(spec.key), 'profile.json'), p);
    put(path.join(source(spec.key), 'card.png'), { format: 'png', width: 897, height: 1497, key: spec.key });
    seed(path.join(source(spec.key), 'card.psd'), 'IN-MEMORY PSD SENTINEL ' + spec.key);
    put(path.join(source(spec.key), 'illustration.png'), { format: 'png', width: 1024, height: 1280, key: spec.key });
    return p;
  });
  function verify(key) {
    const dir = source(key), profile = read(path.join(dir, 'profile.json'));
    put(path.join(dir, 'verification.json'), { passed: true, modelId: profile.id, referenceId: references.id,
      profileHash: digest(mem.readFileSync(path.join(dir, 'profile.json'))),
      hashes: Object.fromEntries(['card.png', 'card.psd'].map(name => [name, digest(mem.readFileSync(path.join(dir, name)))])),
      roundtrip: { changed: 0 }, barcode: { passed: true, expected: profile.id }, components: { fixedDifferences: 0, severePixels: 0 } });
  }
  specs.forEach(spec => verify(spec.key));
  const arena = id => path.join(ROOT, 'V4/site/assets/arenes', id + '.png');
  for (const id of ['ff7-midgar', 'ff7-cosmo-canyon']) put(arena(id), { format: 'png', width: 1536, height: 864 });
  const entry = p => ({ id: p.id, kind: 'created', name: p.name, title: p.title, element: p.element, profile: p,
    png: 'V4/creations/' + p.id + '/card.png', psd: 'V4/creations/' + p.id + '/card.psd',
    pngUrl: '/media/created/' + p.id + '.png', psdUrl: '/media/created/' + p.id + '.psd', createdAt: '2026-09-20T00:00:00Z' });
  const cat = D.catalogue();
  const unrelated = { ...entry({ ...profiles[0], id: '49997000', characterId: 'untouched', faction: 'Chroma', collaboration: 'OTHER' }), creationJob: uuid(9000), keep: 'unchanged' };
  cat.cards.push(unrelated);
  if (cloud) {
    for (const name of NAMES) seed(path.join(target(profiles[0].id), name), mem.readFileSync(path.join(source('cloud'), name)));
    put(path.join(target(profiles[0].id), 'verification.json'), { passed: true, legacy: true });
    put(path.join(target(profiles[0].id), 'creation.json'), { kind: 'private-collaboration', modelId: profiles[0].id });
    cat.cards.push(entry(profiles[0]));
  }
  put(D.CATALOGUE, cat);
  const publisher = createPublisher({ L, D, home, createEngine, buildCatalog: async options => catalogHook(await buildCatalog(options)) });
  const initial = new Map([...files].map(([key, value]) => [key, Buffer.from(value)]));
  return { publisher, L, D, home, files, dirs, ops, profiles, source, target, arena, lock, read, put, seed, verify, initial, unrelated,
    fault: fn => { fault = fn; }, catalogHook: fn => { catalogHook = fn; },
    changeProfile(key, change) { const file = path.join(source(key), 'profile.json'), p = read(file); change(p); put(file, p); verify(key); },
    assertOldFiles() { for (const [file, value] of initial) if (file !== D.CATALOGUE) assert.deepEqual(files.get(file), value, 'Existing file modified: ' + file); }
  };
}

test('default CLI and preflight are read-only; --publish is the only write opt-in', async () => {
  const f = fixture(), result = await main([], f.publisher);
  assert.equal(result.mode, 'preflight'); assert.equal(result.added, 9); assert.equal(result.reused, 1);
  assert.deepEqual(result.jobUpgrades, ['47208326']); assert.ok(Object.values(result.coverage).every(n => n >= 2));
  assert.deepEqual(f.ops, []); assert.deepEqual(f.files, f.initial);
  await assert.rejects(main(['--pubish'], f.publisher), /Usage/);
  assert.deepEqual(f.ops, []);
});

test('atomic additive publication preserves historical Cloud and is idempotent', async () => {
  const f = fixture(), before = f.files.get(f.D.CATALOGUE);
  const result = await main(['--publish'], f.publisher), cat = f.D.catalogue();
  assert.equal(result.mode, 'published'); assert.equal(result.added, 9);
  assert.equal(cat.cards.length, references.cards.length + 11);
  assert.deepEqual(cat.cards.find(c => c.id === f.unrelated.id), f.unrelated);
  for (const p of f.profiles) {
    const c = cat.cards.find(c => c.id === p.id);
    assert.match(c.creationJob, f.D.UUID); assert.deepEqual(c.profile, p);
    for (const name of ['card.png', 'card.psd', 'illustration.png']) assert.deepEqual(f.files.get(path.join(f.target(p.id), name)), f.files.get(path.join(f.source(p.characterId.slice(0, -4)), name)));
  }
  f.assertOldFiles(); assert.deepEqual(f.files.get(result.backup), before); assert.ok(!f.files.has(f.lock));
  const committed = new Map(f.files), priorOps = f.ops.length;
  assert.equal((await f.publisher.publish()).mode, 'unchanged'); assert.deepEqual(f.files, committed);
  assert.ok(f.ops.slice(priorOps).every(e => e.from === f.lock), 'Rerun must not rewrite catalogue or cards.');
  const commits = f.ops.filter(e => e.op === 'rename' && e.to === f.D.CATALOGUE); assert.equal(commits.length, 1);
  assert.ok(f.ops.filter(e => e.op === 'copy').every(e => f.ops.indexOf(e) < f.ops.indexOf(commits[0])));
});

test('a fresh set creates all ten entries; an ID belonging to another collaboration is refused', async () => {
  const fresh = fixture({ cloud: false }); assert.equal((await fresh.publisher.publish()).added, 10);
  const f = fixture(), cat = f.D.catalogue(); cat.cards.find(c => c.id === '47208326').profile.collaboration = 'OTHER'; f.put(f.D.CATALOGUE, cat);
  const before = new Map(f.files);
  await assert.rejects(f.publisher.publish(), /autre carte/); assert.deepEqual(f.files, before);
});

test('proof flags, hashes, identity, positions and support roles fail closed', async () => {
  const mutations = [
    f => f.changeProfile('barret', p => { p.id = '47208326'; }),
    f => f.changeProfile('cloud', p => { p.id = '49999999'; }),
    f => f.changeProfile('barret', p => { p.faction = 'Chroma'; }),
    f => f.changeProfile('barret', p => { p.characterId = 'barret'; }),
    f => f.changeProfile('barret', p => { p.collaboration = 'OTHER'; }),
    f => f.changeProfile('barret', p => { p.testOnly = true; }),
    f => f.changeProfile('barret', p => { p.positions = [1, 5]; }),
    f => f.changeProfile('aeris', p => { p.role = 3; }),
    f => f.changeProfile('barret', p => { p.canGuard = false; }),
    f => f.changeProfile('aeris', p => { p.canHeal = false; }),
    f => f.seed(path.join(f.source('barret'), 'card.psd'), 'TAMPERED'),
    f => { const file = path.join(f.source('barret'), 'profile.json'), p = f.read(file); p.title = 'CHANGED'; f.put(file, p); },
    ...[v => { v.passed = false; }, v => { v.modelId = '49999999'; }, v => { v.referenceId = 'old'; },
      v => { v.testOnly = true; }, v => { v.roundtrip.changed = 1; }, v => { v.barcode.passed = false; },
      v => { v.barcode.expected = '49999999'; }, v => { v.components.fixedDifferences = 1; },
      v => { v.components.severePixels = 1; }, v => { delete v.hashes['card.png']; }, v => { delete v.profileHash; }]
      .map(change => f => { const file = path.join(f.source('barret'), 'verification.json'), v = f.read(file); change(v); f.put(file, v); })
  ];
  for (const mutate of mutations) {
    const f = fixture(); mutate(f); const before = new Map(f.files);
    await assert.rejects(f.publisher.preflight()); assert.deepEqual(f.ops, []); assert.deepEqual(f.files, before);
  }
});

test('all ten cards, real arena images and valid dimensions are required', async () => {
  for (const mutate of [
    f => { const value = structuredClone(set); value.cards.pop(); f.put(path.join(f.home, 'set.json'), value); },
    f => { const value = structuredClone(set); value.cards[0].key = '../escape'; f.put(path.join(f.home, 'set.json'), value); },
    f => f.files.delete(path.join(f.source('sephiroth'), 'illustration.png')),
    f => f.files.delete(f.arena('ff7-midgar')),
    f => f.put(f.arena('ff7-cosmo-canyon'), { format: 'jpeg', width: 1600, height: 900 }),
    f => f.put(f.arena('ff7-cosmo-canyon'), { format: 'png', width: 900, height: 1600 }),
    f => { f.put(path.join(f.source('barret'), 'card.png'), { format: 'png', width: 950, height: 1655 }); f.verify('barret'); },
    f => f.catalogHook(data => ({ ...data, arenas: data.arenas.filter(a => a.id !== 'ff7-midgar') }))
  ]) {
    const f = fixture(); mutate(f); await assert.rejects(f.publisher.preflight()); assert.deepEqual(f.ops, []);
  }
});

test('deck coverage and FF7/Chroma synergy are validated with the actual engine', async () => {
  const f = fixture(), manifest = structuredClone(set);
  for (const key of ['sephiroth', 'red-xiii']) {
    manifest.cards.find(c => c.key === key).positions = key === 'sephiroth' ? [1] : [2, 3];
    f.changeProfile(key, p => { p.positions = p.positions.filter(n => n !== 5); });
  }
  f.put(path.join(f.home, 'set.json'), manifest);
  await assert.rejects(f.publisher.preflight(), /couverture/);
  const mixed = fixture();
  mixed.catalogHook(data => ({ ...data, cards: data.cards.map(c => c.characterId === 'tifa-ff7' ? { ...c, faction: 'Chroma' } : c) }));
  await assert.rejects(mixed.publisher.preflight(), /Synergie FF7/);
});

test('lock contention never removes another owner, even after replacement during a transaction', async () => {
  const f = fixture(); f.put(f.lock, { id: 'someone-else' }); const lock = f.files.get(f.lock);
  await assert.rejects(f.publisher.publish(), /EEXIST/); assert.deepEqual(f.files.get(f.lock), lock);
  const stolen = fixture(); let replaced = false;
  stolen.fault(e => { if (!replaced && e.op === 'copy') { replaced = true; stolen.put(stolen.lock, { id: 'new-owner' }); } });
  await assert.rejects(stolen.publisher.publish(), /Verrou/);
  assert.equal(stolen.read(stolen.lock).id, 'new-owner');
  assert.deepEqual(stolen.files.get(stolen.D.CATALOGUE), stolen.initial.get(stolen.D.CATALOGUE));
});

test('copy and commit failures preserve the index and existing files; orphans can be reused', async () => {
  for (const phase of ['copy', 'install', 'commit']) {
    const f = fixture(); let installs = 0;
    f.fault(e => {
      if (phase === 'copy' && e.op === 'copy' && path.basename(e.from) === 'card.psd') throw Error('INJECTED COPY');
      if (phase === 'install' && e.op === 'rename' && e.from.includes(path.sep + 'staging' + path.sep) && ++installs === 3) throw Error('INJECTED INSTALL');
      if (phase === 'commit' && e.op === 'rename' && e.to === f.D.CATALOGUE) throw Error('INJECTED COMMIT');
    });
    await assert.rejects(f.publisher.publish(), /INJECTED/);
    assert.deepEqual(f.files.get(f.D.CATALOGUE), f.initial.get(f.D.CATALOGUE)); f.assertOldFiles(); assert.ok(!f.files.has(f.lock));
    assert.ok(f.ops.filter(e => e.op === 'unlink').every(e => e.from === f.lock));
    const installed = new Map([...f.files].filter(([file]) => file.startsWith(path.join(f.L.ROOT, 'V4/creations') + path.sep)));
    f.fault(() => {}); assert.equal((await f.publisher.publish()).mode, 'published');
    for (const [file, content] of installed) assert.deepEqual(f.files.get(file), content, 'Orphan must not be overwritten.');
  }
});

test('concurrent catalogue/source changes abort without overwriting another publication', async () => {
  for (const kind of ['catalogue', 'source']) {
    const f = fixture(); let changed = false;
    f.fault(e => {
      if (changed || e.op !== 'copy') return; changed = true;
      if (kind === 'catalogue') { const cat = f.D.catalogue(); cat.concurrent = 'keep me'; f.put(f.D.CATALOGUE, cat); }
      else f.seed(path.join(f.source('cloud'), 'card.psd'), 'CHANGED AFTER PREFLIGHT');
    });
    await assert.rejects(f.publisher.publish(), /modifiee|modifie/);
    if (kind === 'catalogue') assert.equal(f.read(f.D.CATALOGUE).concurrent, 'keep me');
    else assert.deepEqual(f.files.get(f.D.CATALOGUE), f.initial.get(f.D.CATALOGUE));
    assert.ok(!f.files.has(f.lock));
  }
});

test('reruns reject changed existing profiles, media and unowned orphan directories', async () => {
  for (const corrupt of ['profile', 'png', 'orphan']) {
    const f = fixture();
    if (corrupt === 'profile') { const p = structuredClone(f.profiles[0]); p.title = 'OTHER'; f.put(path.join(f.target(p.id), 'profile.json'), p); }
    if (corrupt === 'png') f.seed(path.join(f.target('47208326'), 'card.png'), 'OTHER PIXELS');
    if (corrupt === 'orphan') f.put(path.join(f.target(f.profiles[1].id), 'creation.json'), { job: uuid(7), setId: 'OTHER' });
    const before = new Map(f.files); await assert.rejects(f.publisher.publish()); assert.deepEqual(f.files, before);
  }
  const f = fixture(); await f.publisher.publish();
  f.put(path.join(f.target(f.profiles[1].id), 'verification.json'), { passed: false });
  const before = new Map(f.files); await assert.rejects(f.publisher.publish(), /Empreinte/); assert.deepEqual(f.files, before);
});
