const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const source = file => fs.readFileSync(path.join(__dirname, file), 'utf8');

function legacyUI(count) {
  const elements = new Map(), calls = [];
  const element = () => ({
    value: '', textContent: '', innerHTML: '', children: [], handlers: {}, open: false,
    addEventListener(name, fn) { this.handlers[name] = fn; },
    replaceChildren() { this.children = []; }, append(child) { this.children.push(child); },
    close() { this.open = false; }
  });
  const get = id => { if (!elements.has(id)) elements.set(id, element()); return elements.get(id); };
  const status = { jobs: [], gate: { passed: true, count }, integrity: { state: 'intact', count: 176 } };
  const context = vm.createContext({
    document: { getElementById: get, createElement: element, querySelectorAll: () => [] },
    window: { addEventListener() {} }, ResizeObserver: class { observe() {} },
    matchMedia: () => ({ matches: false }), setTimeout: () => 0, clearTimeout() {}, structuredClone,
    fetch: async url => { calls.push(url); return { ok: true, json: async () => url === '/api/status' ? status : {} }; }
  });
  // Only the DOM and HTTP boundaries are mocked; no service or browser starts.
  vm.runInContext(source('public/app.js').replace(/^init\(\);$/m, ''), context);
  vm.runInContext(`state.cards=Array.from({length:${count}},(_,i)=>({key:'card-'+i}));state.mode='drafts';state.selected=state.cards[0];renderLibrary();`, context);
  return { get, status, calls, run: code => vm.runInContext(code, context) };
}

for (const count of [26, 27, 31]) test(`legacy labels follow a ${count}-card registry without relabelling historical jobs`, async () => {
  const ui = legacyUI(count);
  assert.equal(Number(ui.get('reference-count').textContent), count);
  await ui.run('poll()');
  assert.match(ui.get('status-detail').textContent, new RegExp('^' + count + ' references identiques'));
  assert.match(ui.get('integrity-text').textContent, new RegExp('^' + count + ' / ' + count + ' '));
  ui.run('renderIntegrity()');
  assert.ok(ui.get('integrity-report').innerHTML.includes(`<dd>${count} / ${count}</dd>`));
  ui.run("state.jobs=[{kind:'regression',state:'verified',message:'Old proof',progress:{total:25}},{kind:'regression',state:'verified',message:'No archived total'}];renderHistory();");
  const rows = ui.get('history-list').children;
  assert.ok(rows[0].innerHTML.includes('<strong>Reproduction de 25 references</strong>'));
  assert.ok(rows[1].innerHTML.includes('<strong>Reproduction des references</strong>'));
  await ui.get('rerun').handlers.click();
  assert.equal(ui.get('toast').textContent, `Verification des ${count} references lancee.`);
  assert.ok(ui.calls.includes('/api/regression'));
  ui.status.gate = { passed: false, count: count - 1 };
  await ui.run('poll();'); ui.run('renderIntegrity()');
  assert.ok(ui.get('integrity-report').innerHTML.includes(`<dd>${count - 1} / ${count}</dd>`));
  assert.equal(ui.get('compose').disabled, true);
});

async function acceptance(count, mutate = () => {}) {
  const written = new Map(), errors = [], processState = { argv: ['node', 'acceptance.cjs', 'fixture-job'] };
  const ref = { id: 'current-reference-id', cards: Array.from({ length: count }, (_, i) => ({ key: 'card-' + i })) };
  const proof = { passed: true, comparison: { changed: 10, outside: 0 }, fixed: { changed: 0 }, roundtrip: { changed: 0 }, barcode: { passed: true } };
  const regression = { passed: true, referenceId: ref.id, rendererHash: 'current-renderer', results: ref.cards.map(c => ({ ...proof, key: c.key, comparison: { changed: 0 } })) };
  mutate(regression);
  const request = { kind: 'draft', items: [{ key: 'momo', upload: '00000000-0000-4000-8000-000000000001', card: {
    name: 'MOMO ATELIER', title: 'ESSAI ATELIER', job: 'ARTISTE', positions: [1, 2, 3, 4, 5],
    atk: [210, 'mana', 'retry', 'buff_atk', 'mana', 42], defense: [200, 167, 130, 100, 59, 11], barriers: [4]
  } }] };
  const reads = { 'request.json': request, 'status.json': { state: 'verified' }, 'regression.json': regression, 'verification.json': proof, 'runtime.json': { url: 'http://test.invalid' } };
  const payload = Buffer.from('in-memory export fixture'), digest = crypto.createHash('sha256').update(payload).digest('hex');
  const local = {
    assert: { ...assert, deepEqual: (a, b, message) => assert.deepEqual(structuredClone(a), structuredClone(b), message) },
    fs: { writeFileSync: (file, data) => written.set(path.basename(file), data) }, path, DATA: '/isolated', crypto,
    read: file => { const value = reads[path.basename(file)]; assert.ok(value, file); return value; },
    write: (file, data) => written.set(path.basename(file), data), jobDir: () => '/isolated/job', baseline: () => ref,
    rendererHash: async () => 'current-renderer', hash: async () => digest, ID: /^[a-f0-9-]{36}$/,
    protectedCheck: async current => { assert.equal(current, ref); return 176; }
  };
  await vm.runInNewContext(source('acceptance.cjs'), {
    require: name => {
      if (name === './lib.cjs') return local;
      if (name === 'node:child_process') return { spawnSync: () => ({ status: 0, stdout: '# pass 1\n', stderr: '' }) };
      throw Error('Unexpected dependency ' + name);
    },
    process: processState, __dirname, console: { log() {}, error: error => errors.push(error) },
    fetch: async url => ({ status: 200, headers: { get: () => url.endsWith('.png') ? 'image/png' : 'image/vnd.adobe.photoshop' }, body: [payload] })
  });
  return { written, errors, exitCode: processState.exitCode };
}

test('acceptance uses the current registry count and exact reference identities', async () => {
  for (const count of [27, 31]) {
    const result = await acceptance(count);
    assert.deepEqual(result.errors, []);
    assert.equal(result.written.get('acceptance.json').references, count);
  }
  for (const mutate of [r => { r.results[0].key = r.results[1].key; }, r => { r.referenceId = 'obsolete'; }]) {
    const result = await acceptance(27, mutate);
    assert.equal(result.exitCode, 1); assert.equal(result.written.has('acceptance.json'), false);
  }
});

test('legacy static labels stay neutral and scripts compile without execution', () => {
  const html = source('public/index.html');
  assert.match(html, /id="reference-count">\.\.\.<\/span>/);
  assert.match(html, /V&eacute;rifier les cartes/);
  for (const file of ['server.cjs', 'public/app.js', 'smoke.cjs', 'acceptance.cjs']) {
    new vm.Script(source(file), { filename: file });
    assert.doesNotMatch(source(file), /\b26\b/);
  }
});
