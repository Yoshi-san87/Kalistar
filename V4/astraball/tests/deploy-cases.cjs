'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const fsp = require('node:fs/promises');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const {createRequire} = require('node:module');
const {
  ROOT, DIST, inside, plan, releaseVersion, versionStaticAssets, versionModuleImports,
} = require('../../deploy/build.cjs');

const base = path.resolve(__dirname, '..');
const allowlist = JSON.parse(fs.readFileSync(path.join(base, 'runtime-files.json'), 'utf8'));
const read = relative => fs.readFileSync(path.join(base, relative), 'utf8');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const imports = source => [...source.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*(['"])([^'"]+)\1/gm)].map(match => match[2]);
const excluded = [
  'tools/prepare-assets.cjs', 'sources/arena.png', 'tests/core.test.mjs',
  'tests/deploy-cases.cjs', 'tests/astraball.test.cjs', 'node_modules/pixi.js/index.mjs',
  'runtime-files.json', 'package.json', 'README.md',
  'assets/vendor/pixi-csp-v8.22.0.mjs.map',
];

test('Astraball integration cases run through the registered wrapper without an unassigned standalone test', () => {
  const guard = require('../../../maintenance/check-organisation.cjs');
  const policy = require('../../../maintenance/organisation.json');
  const config = require('../../../maintenance/validation-suites.json');
  const wrapper = 'V4/astraball/tests/astraball.test.cjs';
  const cases = 'V4/astraball/tests/deploy-cases.cjs';
  for (const suite of ['ci', 'repository']) {
    assert.ok(config.suites[suite].some(args => args.includes(wrapper)), suite + ' must execute the wrapper');
  }
  assert.deepEqual(guard.validatePaths([wrapper, cases], policy), []);
  assert.deepEqual(guard.validateTestCoverage([wrapper, cases], policy, config), []);
  assert.ok(read('tests/astraball.test.cjs').includes("require('./deploy-cases.cjs')"));
  assert.equal(fs.existsSync(path.join(__dirname, 'deploy.test.cjs')), false, 'no unregistered standalone alias');
});

test('frozen release seeds exactly the Astraball runtime manifest, not authoring or runtime sources', () => {
  const {isMetadata, isRuntimeTree} = require('../../deploy/prepare-release.cjs');
  assert.equal(isMetadata('V4/astraball/runtime-files.json'), true, 'builder.plan needs the allowlist before remaining text is copied');
  const rejected = new Set([
    ...allowlist, ...excluded,
    'tools/runtime-files.json', 'authoring/runtime-files.json',
    'source/runtime-files.json', 'sources/runtime-files.json', 'sources/arena.psd',
    'src/runtime-files.json', 'data/runtime-files.json',
    'runtime-files.json.bak', 'runtime-files.json/child.json', 'runtime-files.JSON',
  ]);
  rejected.delete('runtime-files.json');
  for (const relative of rejected) {
    const file = 'V4/astraball/' + relative;
    assert.equal(isMetadata(file), false, 'not initial metadata: ' + file);
    assert.equal(isRuntimeTree(file), false, 'not an automatically copied runtime tree: ' + file);
  }
});

test('Astraball publication plan is exactly the runtime allowlist without local CI media', {timeout: 15000}, async t => {
  assert.equal(new Set(allowlist).size, allowlist.length);
  for (const relative of allowlist) {
    assert.equal(typeof relative, 'string');
    assert.equal(path.posix.normalize(relative), relative);
    assert.doesNotMatch(relative, /[\\?#]|(?:^|\/)(?:\.\.|tools|sources|tests|node_modules)(?:\/|$)|\.map$/i);
    assert.ok(relative === 'data/sprite-library.json' || /\.(?:html|css|mjs|webp|png|txt)$/.test(relative));
    assert.equal(inside(base, relative), path.join(base, relative));
  }
  for (const required of ['index.html', 'style.css', 'src/app.mjs', 'src/core/game.mjs', 'src/core/ai.mjs']) {
    assert.ok(allowlist.includes(required), required);
  }
  assert.ok(allowlist.some(file => /^assets\/vendor\/pixi-csp-[^/]+\.mjs$/.test(file)));
  assert.ok(allowlist.includes('assets/vendor/PIXI-LICENSE.txt'));

  // Model a text-only checkout in memory. No asset is moved, opened or created.
  const media = require('../../deploy/runtime-media.json');
  const mediaPaths = new Set(media.files.map(file => path.resolve(ROOT, file.source)));
  const textReads = [];
  const readFile = fsp.readFile.bind(fsp);
  t.mock.method(fsp, 'readFile', async (file, ...args) => {
    const absolute = path.resolve(String(file));
    assert.ok(!mediaPaths.has(absolute), 'plan must not read local runtime media: ' + absolute);
    assert.match(absolute, /\.(?:[cm]?js|json|md|css|html|webmanifest)$/i, 'plan must read text only');
    textReads.push(absolute);
    return readFile(file, ...args);
  });
  const readdir = fsp.readdir.bind(fsp);
  t.mock.method(fsp, 'readdir', async (directory, options) => {
    assert.equal(path.resolve(String(directory)), path.join(ROOT, 'V4/site'), 'registered media must not require asset-directory scans');
    assert.equal(options?.withFileTypes, true);
    return (await readdir(directory, options)).filter(entry => entry.isFile() && /\.(?:[cm]?js|json|md|css|html|webmanifest)$/i.test(entry.name));
  });
  for (const method of ['stat', 'lstat', 'access', 'open']) {
    const original = fsp[method].bind(fsp);
    t.mock.method(fsp, method, async (file, ...args) => {
      const absolute = path.resolve(String(file));
      assert.ok(!mediaPaths.has(absolute) && !/[\\/]assets(?:[\\/]|$)/i.test(absolute), 'plan must not depend on media existence: ' + absolute);
      return original(file, ...args);
    });
  }
  // Exercise the exported real planner; never build(), which replaces dist/.
  const {files} = await plan();
  assert.ok(textReads.includes(path.join(base, 'runtime-files.json')));
  assert.ok(textReads.includes(path.join(ROOT, 'V4/deploy/runtime-media.json')));
  const published = files.filter(file => file.target.startsWith('jeu/astraball/'));
  assert.deepEqual(published.map(file => file.target).sort(), allowlist.map(file => 'jeu/astraball/' + file).sort());
  for (const file of published) {
    const relative = file.target.slice('jeu/astraball/'.length);
    assert.equal(file.source, 'V4/astraball/' + relative);
    assert.equal(file.card, false);
    if (relative.startsWith('assets/')) assert.match(file.expectedHash, /^[a-f0-9]{64}$/, 'registered runtime media: ' + relative);
  }
  for (const file of excluded) {
    assert.ok(!allowlist.includes(file), file);
    assert.ok(!files.some(entry => entry.source === 'V4/astraball/' + file), file);
  }
});

test('build path guard rejects traversal and absolute paths without accessing output', () => {
  for (const root of [base, DIST]) {
    for (const relative of ['', '../outside.mjs', '..\\outside.mjs', 'src/../../outside.mjs', path.resolve(ROOT, 'AGENTS.md')]) {
      assert.throws(() => inside(root, relative), /Unsafe build path|escapes root/, relative);
    }
  }
});

test('HTML cache token includes the Astraball module entry point and shared guard scripts', () => {
  const html = read('index.html');
  const version = 'audit release/+&?';
  const transformed = versionStaticAssets(html, version);
  const token = '?v=' + encodeURIComponent(version);
  assert.ok(transformed.includes('src="./src/app.mjs' + token + '"'));
  assert.ok(transformed.includes('href="./style.css' + token + '"'));
  for (const script of ['cloud-config', 'cloud-session', 'auth-guard']) {
    assert.ok(transformed.includes('src="/jeu/' + script + '.js' + token + '"'));
  }
  assert.ok(transformed.includes('href="/jeu/#home"'));
  assert.equal(versionStaticAssets(transformed, version), transformed, 'no duplicate cache parameters');
  assert.equal(read('index.html'), html, 'source HTML is unchanged');
});

test('module import versioning handles quoted, multiline and re-exported relative mjs paths', () => {
  const source = [
    "import { createMatch } from './core/game.mjs';",
    'import * as PIXI from "../assets/vendor/pixi-csp-v8.22.0.mjs";',
    "import {\n  chooseTurn\n} from '../core/ai.mjs';",
    "export { pick } from './projection.mjs';",
    'export * from "../data/teams.mjs";',
    "import x from 'pixi.js';",
    "import y from 'https://example.test/external.mjs';",
    "import z from '/jeu/absolute.mjs';",
    "import legacy from './legacy.js';",
    "import pinned from './pinned.mjs?v=existing';",
  ].join('\n');
  const version = 'audit release/+&?';
  const original = imports(source);
  const transformed = versionModuleImports(source, version);
  assert.deepEqual(imports(transformed), original.map(url => /^\.\.?\/.*\.mjs$/.test(url) ? url + '?v=' + encodeURIComponent(version) : url));
  assert.equal(versionModuleImports(transformed, version), transformed);
});

test('every current source-module dependency is allowlisted and receives the same cache token', () => {
  const token = 'astraball-regression';
  const origin = 'https://example.test/jeu/astraball/';
  let edges = 0;
  for (const file of allowlist.filter(file => file.endsWith('.mjs') && !file.startsWith('assets/'))) {
    const source = read(file);
    const dependencies = imports(source);
    const transformed = imports(versionModuleImports(source, token));
    assert.equal(transformed.length, dependencies.length);
    for (const [i, dependency] of dependencies.entries()) {
      assert.match(dependency, /^\.\.?\/[^?#]+\.mjs$/, 'local browser-native module: ' + file);
      const url = new URL(transformed[i], new URL(file, origin));
      assert.equal(url.searchParams.get('v'), token, file + ' -> ' + dependency);
      assert.ok(url.href.startsWith(origin), 'dependency must remain under Astraball');
      const target = decodeURIComponent(url.pathname.slice('/jeu/astraball/'.length));
      assert.ok(allowlist.includes(target), file + ' -> ' + target);
      edges++;
    }
    assert.equal(read(file), source, 'source module is unchanged');
  }
  assert.ok(edges >= 8, 'walk the app, renderer, AI and engine import graph');
});

test('release fingerprint includes mjs source bytes, with no asset mutations', async t => {
  const previous = process.env.GITHUB_SHA;
  delete process.env.GITHUB_SHA;
  t.after(() => { if (previous === undefined) delete process.env.GITHUB_SHA; else process.env.GITHUB_SHA = previous; });
  const entry = {source: 'V4/astraball/src/core/game.mjs', target: 'jeu/astraball/src/core/game.mjs'};
  const bytes = fs.readFileSync(inside(ROOT, entry.source));
  const expected = crypto.createHash('sha256').update(entry.target).update(bytes).digest('hex').slice(0, 12);
  assert.equal(await releaseVersion([entry]), expected);
  assert.notEqual(await releaseVersion([entry]), await releaseVersion([]), 'mjs cannot be omitted from the release hash');
  assert.equal(sha256(fs.readFileSync(inside(ROOT, entry.source))), sha256(bytes));
});

function routeHarness(t) {
  const filename = path.join(ROOT, 'V4/atelier/designer-api.cjs');
  const localRequire = createRequire(filename);
  const module = {exports: {}};
  const pending = new Set();
  // Execute the real exported router with no native renderer, job queue, timers or writes.
  const context = {
    module, __dirname: path.dirname(filename),
    require(id) {
      if (id === './lib.cjs') return {fs, path, ROOT, DATA: path.join(ROOT, 'V4/atelier/data'), inside};
      if (id === './designer-core.cjs') return Object.freeze({});
      assert.equal(id, '../astraball/runtime-files.json', 'unexpected authoring dependency');
      return localRequire(id);
    },
    setInterval() { const timer = {unref() {}}; pending.add(timer); return timer; },
    clearInterval(timer) { pending.delete(timer); },
  };
  vm.runInNewContext(fs.readFileSync(filename, 'utf8'), context, {filename, timeout: 1000});
  const router = module.exports.makeDesigner({
    token: 'test-only',
    json(res, status, value) { res.status = status; res.value = value; },
    file(res, filename, mime) { res.status = 200; res.filename = filename; res.mime = mime; },
    body() { assert.fail('read-only route test must not read a request body'); },
    getIntegrity() { assert.fail('read-only route test must not invoke authoring integrity'); },
  });
  t.after(() => { router.close(); assert.equal(pending.size, 0); });
  return async pathname => {
    const res = {writeHead(status, headers) { this.status = status; this.headers = headers; }, end() { this.ended = true; }};
    assert.equal(await router.handle({method: 'GET'}, res, pathname), true, pathname);
    return res;
  };
}

test('Atelier redirects the Astraball root and resolves every allowlisted resource with its MIME', async t => {
  const route = routeHarness(t);
  const redirect = await route('/jeu/astraball');
  assert.equal(redirect.status, 302);
  assert.equal(redirect.headers.Location, '/jeu/astraball/');
  assert.equal(redirect.ended, true);
  const home = await route('/jeu/astraball/');
  assert.equal(home.filename, path.join(base, 'index.html'));
  const mimes = {'.mjs': 'text/javascript; charset=utf-8', '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.webp': 'image/webp', '.png': 'image/png', '.txt': 'text/plain; charset=utf-8', '.json': 'application/json'};
  for (const file of allowlist) {
    const response = await route('/jeu/astraball/' + file);
    assert.equal(response.status, 200, file);
    assert.equal(response.filename, path.join(base, file));
    assert.equal(response.mime, mimes[path.extname(file)]);
  }
  const encoded = await route('/jeu/astraball/src%2Fapp.mjs');
  assert.equal(encoded.filename, path.join(base, 'src/app.mjs'));
});

test('Atelier denies non-runtime files, source maps and encoded traversal before file serving', async t => {
  const route = routeHarness(t);
  for (const file of [...excluded, 'data/private.json', 'sources/sprites-v2/prompts.json', 'sources/sprites-v2/riko.png', 'src/unlisted.mjs', '../index.html', '..%2Findex.html', '%2e%2e%5Cindex.html', '%252e%252e%252findex.html', 'src/../index.html', '/index.html']) {
    const response = await route('/jeu/astraball/' + file);
    assert.equal(response.status, 404, file);
    assert.equal(response.filename, undefined, 'file callback must not run: ' + file);
  }
});

test('application navigation opens the standalone Astraball route and provides a return link', () => {
  const app = fs.readFileSync(path.join(ROOT, 'V4/site/app.js'), 'utf8');
  assert.match(app, /menuItem\('data-action="astraball"','Astraball','<img class="kalistar-nav-icon" src="astraball\/assets\/balls-v1\/founders\.webp" alt="" width="40" height="40">'/);
  assert.match(app, /if\s*\(\s*action\s*===\s*['"]astraball['"]\s*\)\s*\{\s*window\.location\.assign\(\s*['"]\/jeu\/astraball\/['"]\s*\);\s*return;/);
  assert.match(read('index.html'), /<a\b[^>]*href="\/jeu\/#home"/);
});
