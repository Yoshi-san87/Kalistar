'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {spawnSync} = require('node:child_process');
const {ROOT, check, validateSuites, isBrowserTest} = require('./check-organisation.cjs');
function parseArgs(args) {
  const result = {suite: 'ci', list: false, only: null, help: false};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--list') result.list = true;
    else if (arg === '--help') result.help = true;
    else if ((arg === '--suite' || arg === '--only') && args[i + 1] && !args[i + 1].startsWith('--')) result[arg.slice(2)] = args[++i];
    else throw Error('Unknown or incomplete option: ' + arg);
  }
  return result;
}
function commandsFor(root, config, {suite = 'ci', only = null} = {}) {
  validateSuites(config);
  let commands;
  if (suite === 'browser') {
    const files = new Set(config.browserAliases);
    for (const dir of ['V4/site', 'V4/deploy', 'V4/atelier']) {
      for (const entry of fs.readdirSync(path.join(root, dir), {withFileTypes: true})) {
        const file = dir + '/' + entry.name;
        if (entry.isFile() && isBrowserTest(file, config)) files.add(file);
      }
    }
    commands = [...files].sort().map(file => [file]);
  } else {
    if (!Object.hasOwn(config.suites, suite)) throw Error('Unknown suite: ' + suite);
    commands = config.suites[suite].map(args => [...args]);
  }
  if (only) {
    commands = commands.map(args => {
      const files = args.filter(file => file !== '--test' && (file === only || path.basename(file) === only));
      return files.length ? (args[0] === '--test' ? ['--test', ...files] : files) : null;
    }).filter(Boolean);
    if (!commands.length) throw Error('Test not found in ' + suite + ': ' + only);
    if (commands.length > 1) throw Error('Ambiguous test name; use its repository path: ' + only);
  }
  return commands;
}
function execute(commands, {root = ROOT, suite = 'ci', spawn = spawnSync, environment = process.env} = {}) {
  for (let i = 0; i < commands.length; i++) {
    const args = commands[i];
    console.log('[' + (i + 1) + '/' + commands.length + '] node ' + args.join(' '));
    const env = {...environment};
    if (suite === 'browser' && !env.KALISTAR_VERIFICATION_DIR) {
      env.KALISTAR_VERIFICATION_DIR = path.join(root, 'work/qa', path.basename(args[0], '.cjs'));
    }
    const result = spawn(process.execPath, args, {cwd: root, env, stdio: 'inherit', shell: false, windowsHide: true});
    if (result.error) throw result.error;
    if (result.signal) throw Error('Validation interrupted: ' + result.signal);
    if (result.status !== 0) throw Error('Validation failed (' + result.status + '): ' + args.join(' '));
  }
}
function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options.help) {
    console.log('node maintenance/validate.cjs --suite ci|organisation|local|browser [--list] [--only file.test.cjs]');
    return;
  }
  console.log('Organisation OK: ' + JSON.stringify(check()));
  const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'maintenance/validation-suites.json'), 'utf8'));
  const commands = commandsFor(ROOT, config, options);
  if (options.list) { console.log(commands.map(args => 'node ' + args.join(' ')).join('\n')); return; }
  execute(commands, {suite: options.suite});
}
module.exports = {parseArgs, commandsFor, execute, main};
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
