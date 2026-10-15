'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createPublisher } = require('./publication-core.cjs');
const { buildCatalog } = require('../../atelier/game-catalog.cjs');
const { createEngine } = require('../../site/engine.js');
const references = require('../../atelier/data/references.json');
const set = require('./set.json');
const M = require('./model.cjs');
// Publication tests always start before FF10, even after this set is live.
function priorPublications(cards = existing) {
  return structuredClone(cards.filter(c => c.kind === 'created' && c.profile?.collaboration !== 'FF10'));
}
const existing = priorPublications(require('../../atelier/designer-core.cjs').catalogue().cards);
const designerCode = fs.readFileSync(path.join(__dirname, '../../atelier/designer-core.cjs'), 'utf8');
const digest = data => crypto.createHash('sha256').update(data).digest('hex');
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const NAMES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png'];

// All writes, including fake PSD sentinels and atomic renames, stay in these maps.
function fixture(published = existing) {
  const ROOT = path.resolve(path.parse(__dirname).root, '__ff10_publication_memory_only__');
  const home = path.join(ROOT, 'V4/collaborations/ff10-set-01'), DATA = path.join(ROOT, 'V4/atelier/data');
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
      assert.ok(flags === undefined || flags === 1); if (flags === 1 && files.has(target)) throw error('EEXIST', target);
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
  const specs = set.cards;
  const source = key => path.join(home, 'cards', key);
  const target = id => path.join(ROOT, 'V4/creations', id);
  const weapons = require('../../../V3/donnees/armes.json');
  const profiles = specs.map(spec => {
    const p = M.profile(spec, D, weapons);
    put(path.join(source(spec.key), 'profile.json'), p);
    put(path.join(source(spec.key), 'card.png'), { format: 'png', width: 897, height: 1497, key: spec.key });
    seed(path.join(source(spec.key), 'card.psd'), 'IN-MEMORY PSD SENTINEL ' + spec.key);
    put(path.join(source(spec.key), 'illustration.png'), { format: 'png', width: 1024, height: 1280, key: spec.key });
    return p;
  });
  const bank = path.join(ROOT, 'V4/atelier/designer-assets');
  put(path.join(bank, 'manifest.json'), { elements: { NONE: { crystal: { file: 'none-crystal.png' }, branch: { file: 'none-branch.png' } } } });
  for (const kind of ['crystal', 'branch']) put(path.join(bank, 'none-' + kind + '.png'), { format: 'png', width: 12, height: 12, unlit: kind });
  function verify(key) {
    const dir = source(key), profile = read(path.join(dir, 'profile.json'));
    put(path.join(dir, 'verification.json'), { passed: true, modelId: profile.id, referenceId: references.id,
      profileHash: digest(mem.readFileSync(path.join(dir, 'profile.json'))),
      hashes: Object.fromEntries(['card.png', 'card.psd'].map(name => [name, digest(mem.readFileSync(path.join(dir, name)))])),
      ...(profile.element === 'NONE' ? { none: { unlit: true,
        crystalHash: digest(mem.readFileSync(path.join(bank, 'none-crystal.png'))),
        branchHash: digest(mem.readFileSync(path.join(bank, 'none-branch.png'))) } } : {}),
      roundtrip: { changed: 0 }, barcode: { passed: true, expected: profile.id }, components: { fixedDifferences: 0, severePixels: 0 } });
  }
  specs.forEach(spec => verify(spec.key));
  const arena = id => path.join(ROOT, 'V4/site/assets/arenes', id + '.png');
  for (const id of ['ff10-luca-stadium', 'ff10-zanarkand-ruins']) put(arena(id), { format: 'png', width: 1536, height: 864 });
  const entry = p => ({ id: p.id, kind: 'created', name: p.name, title: p.title, element: p.element, profile: p,
    png: 'V4/creations/' + p.id + '/card.png', psd: 'V4/creations/' + p.id + '/card.psd',
    pngUrl: '/media/created/' + p.id + '.png', psdUrl: '/media/created/' + p.id + '.psd', createdAt: '2026-09-20T00:00:00Z' });
  const cat = D.catalogue();
  cat.cards.push(...priorPublications(published));
  put(D.CATALOGUE, cat);
  const publisher = createPublisher({ L, D, home, createEngine, buildCatalog: async options => catalogHook(await buildCatalog(options)) });
  const initial = new Map([...files].map(([key, value]) => [key, Buffer.from(value)]));
  return { publisher, L, D, home, files, dirs, ops, profiles, source, target, arena, lock, read, put, seed, verify, initial, bank, mem, encode,
    fault: fn => { fault = fn; }, catalogHook: fn => { catalogHook = fn; },
    changeProfile(key, change) { const file = path.join(source(key), 'profile.json'), p = read(file); change(p); put(file, p); verify(key); },
    assertOldFiles() { for (const [file, value] of initial) if (file !== D.CATALOGUE) assert.deepEqual(files.get(file), value, 'Existing file modified: ' + file); }
  };
}

module.exports = { fixture, priorPublications, digest, uuid, NAMES };
