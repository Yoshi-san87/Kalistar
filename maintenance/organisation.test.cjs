'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const guard = require('./check-organisation.cjs');
const policy = require('./organisation.json');
const config = require('./validation-suites.json');

test('policy assigns every retained root and V4 area without moving sources', () => {
  assert.equal(guard.validatePolicy(policy), policy);
  assert.deepEqual(guard.validatePaths([
    'V1/scripts/vendor/reader.py', 'V3/assets/armes/source.png',
    'V4/site/engine.js', 'V4/template-stable/current.json',
    'V4/creations/49902501/card.psd', 'V4/expansions/2026-10-14-kaylis-edris/art.png',
    'V4/revisions/2026-09-20-weapon-rim/originals/source.psd',
    'Templates/source.psd', 'main/story.docx', 'docs/historique/2026-10-14/README-site.md',
    'work/README.md', 'package.json'
  ], policy), []);
});
test('new unclassified boundaries fail instead of silently becoming production', () => {
  const errors = guard.validatePaths(['quick-fix.js', 'new-game/engine.js', 'V4/something/card.png', 'V4/debug.cjs'], policy);
  assert.equal(errors.length, 4);
  assert.ok(errors.every(error => error.includes('Unclassified')));
});
test('unsafe paths cannot escape the repository', () => {
  for (const file of ['../outside', '/outside', 'C:/outside', 'V4/../outside', 'V4\\site\\x.js', '', 'V4//x', 'V4/./x', 'V4/x\0']) {
    assert.equal(guard.safePath(file), false, JSON.stringify(file));
    assert.match(guard.validatePaths([file], policy)[0], /Unsafe/);
  }
});
test('private and generated files are rejected even inside classified areas', () => {
  const files = [
    'work/qa/capture.png', 'work/scratch/tool.cjs', 'V4/deploy/dist/jeu/index.html',
    'V4/deploy/verification/capture.png', 'V4/atelier/data/jobs/draft.json',
    'V4/story-work/manuscript.docx', 'paquets-transfert/copy.zip', 'lfs/cache.png',
    'V4/site/node_modules/lib.js', 'V4/site/debug.log', 'V4/site/temp.tmp', 'V4/site/.env.production'
  ];
  for (const file of files) assert.ok(guard.validatePaths([file], policy).some(error => error.includes('must not be tracked')), file);
});
test('historical proofs and original graphical sources are not banned as temporary', () => {
  assert.deepEqual(guard.validatePaths([
    'V4/site/verification/old-proof.png', 'V4/releases/2026-10-14-v4.6.61/qa/result.png',
    'V4/propositions/2026-10-14-six-new-directions/06-edris-7f-03.png',
    'maintenance/cleanup-2026-09-19/cleanup-journal.json'
  ], policy), []);
  const historical = require('./organisation-2026-10-14/retained-evidence.json').files;
  assert.ok(historical.length > 0);
  assert.deepEqual(guard.validatePaths(historical, policy), []);
  assert.ok(guard.validatePaths(['V4/releases/2026-10-15-v4.6.63/new.log'], policy).length);
});
test('invalid classification changes are refused', () => {
  for (const change of [
    p => { p.version = 2; }, p => { p.roots.future = {role: 'unknown', purpose: 'x'}; },
    p => { p.maintainedDocs.push('../outside'); }, p => { p.requiredFiles.push(p.requiredFiles[0]); }
  ]) {
    const copy = structuredClone(policy); change(copy);
    assert.throws(() => guard.validatePolicy(copy));
  }
});
test('direct unit tests must be assigned; browser suffix is an explicit automatic assignment', () => {
  assert.deepEqual(guard.validateTestCoverage(['V4/site/equipment.test.cjs', 'V4/site/new.browser.test.cjs', 'V4/site/collection-versions.test.cjs'], policy, config), []);
  assert.match(guard.validateTestCoverage(['V4/site/new-rule.test.cjs'], policy, config)[0], /Unassigned test/);
  assert.match(guard.validateTestCoverage(['maintenance/new-check.test.cjs'], policy, config)[0], /Unassigned test/);
  assert.match(guard.validateTestCoverage(['V4/expansions/2026-10-15-new/integration.test.cjs'], policy, config)[0], /Unassigned test/);
  assert.match(guard.validateTestCoverage(['V4/expansions/2026-10-15-new/demo.browser.test.cjs'], policy, config)[0], /Unassigned test/);
  assert.deepEqual(guard.validateTestCoverage(require('./organisation-2026-10-14/retained-tests.json').files, policy, config), []);
});
test('validation registry cannot contain shell commands, paths outside or missing test files', () => {
  for (const args of [['--test'], ['../outside.cjs'], ['--test', 'V4/site/engine.test.cjs', '&&'], ['npm', 'test']]) {
    const copy = structuredClone(config); copy.suites.new = [args];
    assert.throws(() => guard.validateSuites(copy));
  }
});
test('all 84 previous publication invocations remain in order', () => {
  const previous = require('./organisation-2026-10-14/ci-before.json').commands;
  assert.equal(previous.length, 84);
  let next = 0;
  for (const invocation of config.suites.ci) {
    if (JSON.stringify(invocation) === JSON.stringify(previous[next])) next++;
  }
  assert.equal(next, previous.length, 'no earlier CI command was removed, rewritten or reordered');
});
test('maintained documentation catches broken/outside links without inspecting frozen evidence', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-organisation-'));
  assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
  try {
    fs.mkdirSync(path.join(root, 'docs'));
    fs.writeFileSync(path.join(root, 'docs/guide.md'), '[valid](next.md) [online](https://example.test/) [section](#inside)');
    fs.writeFileSync(path.join(root, 'docs/next.md'), 'ok');
    const fixture = {...policy, maintainedDocs: ['docs/guide.md'], requiredFiles: []};
    assert.deepEqual(guard.validateDocs(root, fixture), []);
    fs.appendFileSync(path.join(root, 'docs/guide.md'), ' [missing](missing.md) [outside](../../escape.md) [bad](%XX)');
    assert.equal(guard.validateDocs(root, fixture).length, 3);
    fs.writeFileSync(path.join(root, 'docs/old.md'), '[old reference](missing-source.md)');
    assert.equal(guard.validateDocs(root, fixture).length, 3, 'historical documents are outside maintained scope');
  } finally {
    assert.equal(path.dirname(root), path.resolve(os.tmpdir()));
    assert.ok(path.basename(root).startsWith('kalistar-organisation-'));
    fs.rmSync(root, {recursive: true});
  }
});
test('current guides, source entries and registered tests exist', () => {
  assert.deepEqual(guard.validateDocs(guard.ROOT, policy), []);
  for (const file of config.browserAliases.concat(Object.values(config.suites).flat(2).filter(file => file !== '--test'))) {
    assert.ok(fs.existsSync(path.join(guard.ROOT, file)), file);
  }
});
test('public CI validates code without downloading media or publishing the game', () => {
  const workflow = fs.readFileSync(path.join(guard.ROOT, '.github/workflows/pages.yml'), 'utf8');
  assert.match(workflow, /node maintenance\/check-organisation\.cjs/);
  assert.match(workflow, /node maintenance\/validate\.cjs --suite repository/);
  assert.doesNotMatch(workflow, /git lfs pull|upload-pages-artifact|deploy-pages/);
  assert.doesNotMatch(workflow, /node --test V4\//);
  assert.ok(fs.existsSync(path.join(guard.ROOT, '.github/workflows/organisation.yml')));
});

test('media cannot silently return to Git after the Cloudflare migration', () => {
  assert.equal(policy.mediaStorage,'local-cloudflare');
  for (const file of ['V4/creations/1/card.psd','V4/site/assets/card.PNG','V3/assets/a.webp','main/a.docx','V1/vendor/lib.pyd']) assert.equal(guard.validateMediaPaths([file]).length,1);
  assert.deepEqual(guard.validateMediaPaths(['V4/site/app.js','V4/template-stable/current.json','V4/site/assets/a.svg']),[]);
});
test('work outputs are ignored but the entry guide remains tracked', () => {
  const {execFileSync} = require('node:child_process');
  const ignored = execFileSync('git', ['check-ignore', '--no-index', 'work/qa/example.png', 'work/staging/example.js'], {cwd: guard.ROOT, encoding: 'utf8', windowsHide: true});
  assert.equal(ignored.trim().split(/\r?\n/).length, 2);
  const packageFile = require('../package.json');
  assert.equal(packageFile.private, true);
  assert.equal(packageFile.dependencies, undefined);
  assert.equal(packageFile.scripts.check, 'node maintenance/check-organisation.cjs');
});
