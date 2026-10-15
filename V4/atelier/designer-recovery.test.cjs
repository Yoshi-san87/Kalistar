'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

// These are the only real filesystem reads. Both modules run against memory below.
const sources = Object.fromEntries(['designer-core.cjs', 'designer-api.cjs'].map(name =>
  [name, fs.readFileSync(path.join(__dirname, name), 'utf8')]));
const uuid = n => '00000000-0000-4000-8000-' + String(n).padStart(12, '0');
const plain = value => JSON.parse(JSON.stringify(value));
const elements = ['ELECTRO', 'HYDRO', 'AERO', 'PYRO', 'CRYO', 'LUXO', 'MINERO', 'HERBO', 'RAINBOW', 'GEO', 'HEMATO', 'NECRO', 'NONE'];

function isolated(t) {
  const root = path.resolve(path.parse(__dirname).root, '__kalistar_recovery_memory_only__');
  const data = path.join(root, 'data');
  const files = new Map(), directories = new Set([root]), operations = [], timers = [];
  const executions = [], publications = [], probes = [], livePids = new Set(), deniedPids = new Set();
  const renderFailures = new Set();
  let nextId = 1, nextModel = 40001000, fault = null, injectedEntries = [];
  function safe(file) {
    const resolved = path.resolve(file), relative = path.relative(root, resolved);
    assert.ok(relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Virtual path escaped: ' + file);
    return resolved;
  }
  function missing(file) { return Object.assign(new Error('ENOENT: ' + file), { code: 'ENOENT' }); }
  function mkdir(file) {
    const dir = safe(file);
    if (directories.has(dir)) return;
    mkdir(path.dirname(dir)); directories.add(dir);
  }
  function read(file) {
    const key = safe(file); operations.push({ op: 'read', file: key });
    if (!files.has(key)) throw missing(key);
    return JSON.parse(files.get(key));
  }
  function write(file, value) {
    const key = safe(file), event = { op: 'write', file: key, committed: false };
    operations.push(event);
    const interrupted = fault?.file === key ? fault : null;
    if (interrupted) fault = null;
    if (interrupted && !interrupted.after) throw new Error('SIMULATED INTERRUPTION');
    mkdir(path.dirname(key)); files.set(key, JSON.stringify(value)); event.committed = true;
    if (interrupted?.after) throw new Error('SIMULATED INTERRUPTION');
  }
  const fakeFs = {
    existsSync(file) {
      const key = safe(file); operations.push({ op: 'exists', file: key });
      return files.has(key) || directories.has(key);
    },
    mkdirSync: mkdir,
    readdirSync(file) {
      const dir = safe(file); operations.push({ op: 'list', file: dir });
      if (!directories.has(dir)) throw missing(dir);
      const children = [...new Set([...directories, ...files.keys()]
        .filter(key => key !== dir && path.dirname(key) === dir).map(key => path.basename(key)))];
      return dir === path.join(data, 'designer', 'jobs') ? [...children, ...injectedEntries] : children;
    },
    unlinkSync(file) {
      const key = safe(file); operations.push({ op: 'unlink', file: key });
      if (!files.delete(key)) throw missing(key);
    },
  };
  const localLib = {
    fs: fakeFs, path, ROOT: root, DATA: data, read, write,
    crypto: { createHash: crypto.createHash, randomUUID: () => uuid(nextId++), randomInt: () => nextModel++ },
    baseline: () => ({ id: 'isolated-reference', cards: elements.map((element, index) => ({
      key: 'approved-' + index, png: 'approved.png', psd: 'approved.psd',
      card: { id: String(30000001 + index), element, color: '99AA88', hue: 100,
        name: 'APPROVED', title: 'VERSION', job: 'ARTISTE', race: 'ROBOT', weapon: 'Instrument',
        faction: 'Chroma', weapon_index: 11 },
    })) }),
  };
  function load(name, modules) {
    const module = { exports: {} };
    vm.runInNewContext(sources[name], {
      module, exports: module.exports, __dirname: path.join(root, 'atelier'),
      require(id) {
        assert.ok(Object.hasOwn(modules, id), 'Real module import forbidden: ' + id);
        return modules[id];
      },
      process: { kill(pid, signal) {
        assert.equal(signal, 0); probes.push(pid);
        if (deniedPids.has(pid)) throw Object.assign(new Error('EPERM'), { code: 'EPERM' });
        if (!livePids.has(pid)) throw Object.assign(new Error('ESRCH'), { code: 'ESRCH' });
      } },
      setInterval(run, delay) { const timer = { run, delay, active: true, unref() {} }; timers.push(timer); return timer; },
      clearInterval(timer) { timer.active = false; },
    }, { filename: name });
    return module.exports;
  }
  const D = load('designer-core.cjs', { './lib.cjs': localLib });
  // Publication and rendering are deliberately not imported, even for verified jobs.
  D.publish = async id => { publications.push(id); return D.setStatus(id, 'published'); };
  const renderer = { async execute(id) {
    executions.push(id);
    if (renderFailures.has(id)) throw new Error('Simulated renderer failure');
    return D.setStatus(id, 'published');
  } };
  const makeDesigner = load('designer-api.cjs', {
    './lib.cjs': localLib, './designer-core.cjs': D, './designer-render.cjs': renderer,
  }).makeDesigner;
  const api = makeDesigner({
    token: 'isolated-token', body: async req => req.payload,
    json(res, status, value) { res.status = status; res.value = plain(value); },
    file() { assert.fail('Media serving is outside recovery tests'); },
    getIntegrity: () => ({ state: 'intact' }),
  });
  t.after(() => { api.close(); assert.ok(timers.every(timer => !timer.active)); });
  const input = (requestId = uuid(90000)) => ({ requestId, profile: {
    ...plain(D.defaults()), name: 'REPRISE', title: 'VERSION DE TEST', job: 'ARTISTE',
    atk: [321, 'retry', 120, 'mana', 42, 0], defense: [222, 160, 'dodge', 80, 40, 0],
    magic: [6, 4], barriers: [6, 3], positions: [3, 5],
  } });
  const requestFile = id => path.join(D.HOME, 'requests', id + '.json');
  const jobFile = (id, name) => path.join(D.folder(id), name + '.json');
  return {
    D, api, root, data, files, directories, operations, executions, publications, probes, livePids, deniedPids, renderFailures,
    input, requestFile, jobFile, read, write,
    lock: path.join(data, 'render.lock'),
    crashNext(file, after = false) { fault = { file: safe(file), after }; },
    raw(file, text) { const key = safe(file); mkdir(path.dirname(key)); files.set(key, text); },
    remove(file) { files.delete(safe(file)); },
    injectDirectoryEntries(entries) { injectedEntries = entries; },
    async tick(count = 1) { for (let i = 0; i < count; i++) for (const timer of timers) if (timer.active) await timer.run(); },
    create(requestId) { const request = input(requestId); return { request, job: D.create(request) }; },
  };
}

test('Reservation commits before queued and keeps an immutable custom-stat snapshot', t => {
  const h = isolated(t), { request, job } = h.create();
  const saved = h.read(h.jobFile(job.id, 'request'));
  const writes = h.operations.filter(op => op.op === 'write' && op.committed).map(op => op.file);
  assert.ok(writes.indexOf(h.requestFile(request.requestId)) < writes.indexOf(h.jobFile(job.id, 'status')));
  assert.deepEqual(saved.profile, request.profile);
  for (const field of ['atk', 'defense', 'magic', 'barriers', 'positions']) assert.deepEqual(saved.card[field], request.profile[field]);
  request.profile.atk[0] = 999;
  assert.equal(h.read(h.jobFile(job.id, 'request')).profile.atk[0], 321);
  assert.match(saved.card.id, /^4\d{7}$/);
});

test('An interruption before the reservation never recovers a duplicate of the retried request', async t => {
  const h = isolated(t), request = h.input();
  h.crashNext(h.requestFile(request.requestId));
  assert.throws(() => h.D.create(request), /SIMULATED INTERRUPTION/);
  const orphan = uuid(1), retry = h.D.create(request);
  assert.notEqual(retry.id, orphan);
  h.api.recover();
  assert.equal(h.D.status(orphan).state, 'failed');
  await h.tick(3);
  assert.deepEqual(h.executions, [retry.id]);
  assert.equal(h.read(h.requestFile(request.requestId)).id, retry.id);
});

test('Retry after reservation but before status keeps the reserved job and model IDs', t => {
  const h = isolated(t), request = h.input();
  h.crashNext(h.jobFile(uuid(1), 'status'));
  assert.throws(() => h.D.create(request), /SIMULATED INTERRUPTION/);
  const reservation = h.read(h.requestFile(request.requestId));
  const retry = h.D.create(request);
  assert.equal(retry.id, reservation.id);
  assert.equal(retry.state, 'queued');
  assert.equal(h.read(h.jobFile(retry.id, 'request')).card.id, reservation.modelId);
  assert.equal(h.D.create(request).id, retry.id);
  assert.equal([...h.directories].filter(dir => path.dirname(dir) === path.join(h.D.HOME, 'jobs')).length, 1);
});

test('Recovery recreates a missing status from its committed reservation without a client retry', async t => {
  const h = isolated(t), request = h.input();
  h.crashNext(h.jobFile(uuid(1), 'status'));
  assert.throws(() => h.D.create(request), /SIMULATED INTERRUPTION/);
  h.api.recover(); h.api.recover();
  assert.equal(h.D.status(uuid(1)).state, 'queued');
  await h.tick(4);
  assert.deepEqual(h.executions, [uuid(1)]);
  assert.equal(h.D.create(request).state, 'published');
});

test('An interruption after queued is committed does not duplicate the retried job', async t => {
  const h = isolated(t), request = h.input();
  h.crashNext(h.jobFile(uuid(1), 'status'), true);
  assert.throws(() => h.D.create(request), /SIMULATED INTERRUPTION/);
  const retry = h.D.create(request);
  assert.equal(retry.id, uuid(1));
  h.api.recover(); h.api.recover(); await h.tick(3);
  assert.deepEqual(h.executions, [retry.id]);
});

test('A missing status cannot be used to replace the reserved profile', t => {
  const h = isolated(t), request = h.input();
  h.crashNext(h.jobFile(uuid(1), 'status'));
  assert.throws(() => h.D.create(request), /SIMULATED INTERRUPTION/);
  const original = h.read(h.jobFile(uuid(1), 'request'));
  assert.throws(() => h.D.create({ ...request, profile: { ...request.profile, name: 'AUTRE' } }), /deja/);
  assert.deepEqual(h.read(h.jobFile(uuid(1), 'request')), original);
  assert.equal(h.files.has(h.jobFile(uuid(1), 'status')), false);
});

test('Recovery isolates missing/corrupt requests and statuses instead of blocking later jobs', async t => {
  const h = isolated(t);
  h.crashNext(h.jobFile(uuid(1), 'request'));
  assert.throws(() => h.create(uuid(90001)), /SIMULATED INTERRUPTION/);
  const corruptRequest = h.create(uuid(90002)).job;
  h.raw(h.jobFile(corruptRequest.id, 'request'), '{broken');
  const corruptStatus = h.create(uuid(90003)).job;
  h.raw(h.jobFile(corruptStatus.id, 'status'), '{broken');
  const good = h.create(uuid(90004)).job;
  assert.doesNotThrow(() => h.api.recover());
  for (const id of [uuid(1), corruptRequest.id, corruptStatus.id]) assert.equal(h.D.status(id).state, 'failed');
  await h.tick(3);
  assert.deepEqual(h.executions, [good.id]);
});

test('Queued/rendering jobs execute once, verified jobs only publish, terminal and test-only jobs stay idle', async t => {
  const h = isolated(t), jobs = {};
  for (const [index, state] of ['queued', 'rendering', 'verified', 'published', 'failed', 'testOnly'].entries()) {
    const job = h.create(uuid(90100 + index)).job; jobs[state] = job.id;
    if (state === 'testOnly') {
      const file = h.jobFile(job.id, 'request'), request = h.read(file); request.testOnly = true; h.write(file, request);
    } else h.D.setStatus(job.id, state);
  }
  h.api.recover(); h.api.recover();
  assert.equal(h.D.status(jobs.rendering).state, 'queued');
  await h.tick(6);
  assert.deepEqual(h.executions, [jobs.queued, jobs.rendering]);
  assert.deepEqual(h.publications, [jobs.verified]);
  assert.equal(h.D.status(jobs.failed).state, 'failed');
  assert.equal(h.D.status(jobs.testOnly).state, 'queued');
  assert.equal(h.api.busy(), false);
});

test('A recovered renderer failure cannot block the next queued job', async t => {
  const h = isolated(t), bad = h.create(uuid(90201)).job, good = h.create(uuid(90202)).job;
  h.renderFailures.add(bad.id); h.api.recover(); await h.tick(4);
  assert.equal(h.D.status(bad.id).state, 'failed');
  assert.match(h.D.status(bad.id).error, /Simulated renderer failure/);
  assert.equal(h.D.status(good.id).state, 'published');
  assert.deepEqual(h.executions, [bad.id, good.id]);
});

test('Unsafe and non-v4 directory IDs are ignored before any job-file access', async t => {
  const h = isolated(t), good = h.create().job;
  const invalid = ['../outside', '..\\outside', '/outside', 'C:\\outside', 'not-a-uuid',
    '00000000-0000-1000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-7aaa-aaaaaaaaaaaa', '.staging-' + uuid(7)];
  h.injectDirectoryEntries(invalid); h.operations.length = 0;
  h.api.recover(); await h.tick(2);
  assert.deepEqual(h.executions, [good.id]);
  const jobRoot = path.join(h.D.HOME, 'jobs') + path.sep;
  for (const op of h.operations.filter(op => op.file.startsWith(jobRoot))) {
    assert.equal(path.relative(jobRoot, op.file).split(path.sep)[0], good.id);
  }
  for (const id of invalid) assert.throws(() => h.D.folder(id), /Identifiant invalide/);
});

for (const [name, mutate] of [
  ['unsafe requestId', (h, job, request) => { request.requestId = '../outside'; h.write(h.jobFile(job.id, 'request'), request); }],
  ['unknown reservation UUID', (h, job, request) => { request.requestId = uuid(99999); h.write(h.jobFile(job.id, 'request'), request); }],
  ['missing reservation', (h, job, request) => h.remove(h.requestFile(request.requestId))],
  ['malformed reservation', (h, job, request) => h.raw(h.requestFile(request.requestId), '{broken')],
  ['reservation for another job', (h, job, request) => {
    const file = h.requestFile(request.requestId), reservation = h.read(file); reservation.id = uuid(99999); h.write(file, reservation);
  }],
  ['reservation for another model', (h, job, request) => {
    const file = h.requestFile(request.requestId), reservation = h.read(file); reservation.modelId = '40009999'; h.write(file, reservation);
  }],
]) {
  test('Recovery rejects ' + name + ' and continues with a valid job', async t => {
    const h = isolated(t), bad = h.create(uuid(90301)).job;
    const good = h.create(uuid(90302)).job;
    mutate(h, bad, h.read(h.jobFile(bad.id, 'request')));
    h.api.recover(); await h.tick(3);
    assert.equal(h.D.status(bad.id).state, 'failed');
    assert.deepEqual(h.executions, [good.id]);
    assert.deepEqual(h.publications, []);
  });
}

test('Retry rejects unsafe or unknown job IDs stored in the reservation', t => {
  const h = isolated(t), { request, job } = h.create();
  const file = h.requestFile(request.requestId), original = h.read(file);
  for (const id of ['../outside', 'C:\\outside', uuid(99999)]) {
    h.write(file, { ...original, id });
    assert.throws(() => h.D.create(request), /Identifiant invalide|ENOENT/);
    assert.equal(h.D.status(job.id).state, 'queued');
  }
  assert.equal([...h.directories].filter(dir => path.dirname(dir) === path.join(h.D.HOME, 'jobs')).length, 1);
});

test('Unknown or unsafe job-status routes do not create or recover jobs', async t => {
  const h = isolated(t), original = h.create().job, before = [...h.files.entries()];
  await assert.rejects(() => h.api.handle({ method: 'GET' }, {}, '/api/designer/jobs/' + uuid(99999)), /ENOENT/);
  await assert.rejects(() => h.api.handle({ method: 'GET' }, {}, '/api/designer/jobs/00000000-0000-1000-8000-000000000001'), /Identifiant invalide/);
  for (const value of ['../outside', '%2e%2e%2foutside', 'C:\\outside', 'not-a-uuid']) {
    assert.equal(await h.api.handle({ method: 'GET' }, {}, '/api/designer/jobs/' + value), false);
  }
  const response = {};
  assert.equal(await h.api.handle({ method: 'GET' }, response, '/api/designer/jobs/' + original.id), true);
  assert.equal(response.status, 200); assert.equal(response.value.id, original.id);
  assert.deepEqual([...h.files.entries()], before);
  assert.deepEqual(h.executions, []);
});

for (const mode of ['live server', 'live worker', 'permission denied', 'legacy lock', 'malformed lock']) {
  test('Recovery preserves a ' + mode + ' without starting work', async t => {
    const h = isolated(t); h.create();
    h.write(h.lock, { kind: mode === 'legacy lock' ? 'legacy' : 'designer', pid: 101, workerPid: 102, id: uuid(1) });
    if (mode === 'live server') h.livePids.add(101);
    if (mode === 'live worker') h.livePids.add(102);
    if (mode === 'permission denied') h.deniedPids.add(101);
    if (mode === 'malformed lock') h.raw(h.lock, '{broken');
    const before = h.files.get(h.lock);
    h.api.recover(); await h.tick(2);
    assert.equal(h.files.get(h.lock), before);
    assert.deepEqual(h.executions, []); assert.deepEqual(h.publications, []);
    assert.equal(h.operations.some(op => op.op === 'unlink' && op.file === h.lock), false);
  });
}

test('A dead designer lock is removed once and never routes work through its untrusted id', async t => {
  const h = isolated(t), { job } = h.create();
  h.write(h.lock, { kind: 'designer', pid: 101, workerPid: 102, id: '../outside' });
  h.api.recover(); await h.tick(3);
  assert.equal(h.files.has(h.lock), false);
  assert.deepEqual(h.probes, [101, 102]);
  assert.deepEqual(h.executions, [job.id]);
  assert.equal(h.operations.filter(op => op.op === 'unlink' && op.file === h.lock).length, 1);
});
