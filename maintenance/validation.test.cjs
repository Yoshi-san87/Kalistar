'use strict';
const {test} = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const {ROOT} = require('./check-organisation.cjs');
const config = require('./validation-suites.json');
const runner = require('./validate.cjs');
test('options are explicit and reject unknown/missing values', () => {
  assert.deepEqual(runner.parseArgs(['--suite', 'browser', '--list', '--only', 'collection-map.browser.test.cjs']), {
    suite: 'browser', list: true, only: 'collection-map.browser.test.cjs', help: false
  });
  for (const args of [['--suite'], ['--only', '--list'], ['--unknown']]) assert.throws(() => runner.parseArgs(args));
});
test('CI preserves the exact argument vectors; no command shell parsing', () => {
  assert.deepEqual(runner.commandsFor(ROOT, config, {suite: 'ci'}), config.suites.ci);
  assert.throws(() => runner.commandsFor(ROOT, config, {suite: 'missing'}), /Unknown suite/);
});
test('selection uses exact filename or path and preserves node-test mode', () => {
  assert.deepEqual(runner.commandsFor(ROOT, config, {suite: 'ci', only: 'equipment.test.cjs'}), [['--test', 'V4/site/equipment.test.cjs']]);
  assert.deepEqual(runner.commandsFor(ROOT, config, {suite: 'ci', only: 'V4/site/kalistel.test.cjs'}), [['V4/site/kalistel.test.cjs']]);
  assert.throws(() => runner.commandsFor(ROOT, config, {suite: 'ci', only: 'engine'}), /Test not found/);
  assert.throws(() => runner.commandsFor(ROOT, config, {suite: 'browser', only: 'browser.test.cjs'}), /Ambiguous test name/);
  assert.deepEqual(runner.commandsFor(ROOT, config, {suite: 'browser', only: 'V4/deploy/browser.test.cjs'}), [['V4/deploy/browser.test.cjs']]);
});
test('browser suite discovers conventional names and retains historical aliases', () => {
  const commands = runner.commandsFor(ROOT, config, {suite: 'browser'});
  assert.equal(new Set(commands.map(args => args[0])).size, commands.length);
  assert.ok(commands.some(args => args[0] === 'V4/site/collection-map.browser.test.cjs'));
  for (const file of config.browserAliases) assert.ok(commands.some(args => args[0] === file), file);
  for (const args of commands) assert.ok(fs.existsSync(path.join(ROOT, args[0])));
});
test('runner uses this Node, root cwd, no shell and a hidden window', () => {
  const calls = [];
  runner.execute([['--test', 'V4/site/equipment.test.cjs'], ['V4/site/kalistel.test.cjs']], {
    spawn: (...args) => { calls.push(args); return {status: 0}; }, environment: {CUSTOM: 'kept'}
  });
  assert.equal(calls.length, 2);
  for (const [executable, , options] of calls) {
    assert.equal(executable, process.execPath); assert.equal(options.cwd, ROOT);
    assert.equal(options.shell, false); assert.equal(options.windowsHide, true);
    assert.equal(options.env.CUSTOM, 'kept');
  }
});
test('a failing, signalled or unlaunchable test stops subsequent commands', () => {
  for (const result of [{status: 1}, {status: null, signal: 'SIGTERM'}, {error: Error('not available')}]) {
    let calls = 0;
    assert.throws(() => runner.execute([['a.cjs'], ['b.cjs']], {spawn: () => { calls++; return result; }}));
    assert.equal(calls, 1);
  }
});
test('browser output defaults to its own ignored work folder; explicit evidence path is preserved', () => {
  for (const override of [null, '/selected-evidence']) {
    let options;
    runner.execute([['V4/site/collection-map.browser.test.cjs']], {
      suite: 'browser', environment: override ? {KALISTAR_VERIFICATION_DIR: override} : {},
      spawn: (exe, args, supplied) => { options = supplied; return {status: 0}; }
    });
    assert.equal(options.env.KALISTAR_VERIFICATION_DIR, override || path.join(ROOT, 'work/qa/collection-map.browser.test'));
  }
});
