'use strict';
const fs = require('node:fs');
const path = require('node:path');
const {execFileSync} = require('node:child_process');
const ROOT = path.resolve(__dirname, '..');
const roles = new Set(['jeu', 'production', 'partage', 'outillage', 'documentation', 'lots', 'preuves', 'recherche', 'heritage', 'local']);
const retainedLogs = new Set(require('./organisation-2026-10-14/retained-evidence.json').files);
const retainedTests = new Set(require('./organisation-2026-10-14/retained-tests.json').files);
const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
function safePath(value) {
  return typeof value === 'string' && value.length > 0 && !value.includes('\\') &&
    !value.includes('\0') && !/^[A-Za-z]:|^\//.test(value) &&
    value.split('/').every(part => part && part !== '.' && part !== '..');
}
function under(file, prefix) { return file === prefix || file.startsWith(prefix + '/'); }
function validatePolicy(policy) {
  if (policy.version !== 1) throw Error('Unsupported organisation schema');
  for (const field of ['rootFiles', 'v4Files', 'localOnly', 'maintainedDocs', 'requiredFiles', 'testDirectories', 'testAreas']) {
    if (!Array.isArray(policy[field]) || !policy[field].every(safePath) ||
      new Set(policy[field]).size !== policy[field].length) throw Error('Invalid organisation field: ' + field);
  }
  for (const field of ['roots', 'v4']) {
    if (!policy[field] || typeof policy[field] !== 'object' || Array.isArray(policy[field])) throw Error('Invalid boundaries: ' + field);
    for (const [name, entry] of Object.entries(policy[field])) {
      if (!safePath(name) || name.includes('/') || !roles.has(entry.role) || !entry.purpose?.trim()) throw Error('Invalid boundary: ' + name);
    }
  }
  return policy;
}
function validatePaths(files, policy) {
  validatePolicy(policy);
  const errors = [];
  for (const file of files) {
    if (!safePath(file)) { errors.push('Unsafe repository path: ' + String(file)); continue; }
    const parts = file.split('/');
    if (parts.length === 1 && !policy.rootFiles.includes(file)) errors.push('Unclassified root file: ' + file);
    if (parts.length > 1 && !Object.hasOwn(policy.roots, parts[0])) errors.push('Unclassified root directory: ' + file);
    if (parts[0] === 'V4') {
      if (parts.length === 2 && !policy.v4Files.includes(parts[1])) errors.push('Unclassified V4 file: ' + file);
      if (parts.length > 2 && !Object.hasOwn(policy.v4, parts[1])) errors.push('Unclassified V4 directory: ' + file);
    }
    if (policy.localOnly.some(prefix => under(file, prefix)) ||
      under(file, 'work') && file !== 'work/README.md' ||
      parts.includes('node_modules') || parts.includes('__pycache__') ||
      parts.some(part => /^\.env(?:\.|$)/.test(part) && !['.env.example', '.env.sample'].includes(part)) ||
      /\.(?:tmp|pyc)$/i.test(file) || /\.log$/i.test(file) && !retainedLogs.has(file)) errors.push('Local/generated file must not be tracked: ' + file);
  }
  return [...new Set(errors)];
}
function validateSuites(config) {
  if (config.schemaVersion !== 1 || !config.suites || typeof config.suites !== 'object' ||
    !Array.isArray(config.browserAliases) || !config.browserAliases.every(safePath)) throw Error('Invalid validation registry');
  for (const [name, commands] of Object.entries(config.suites)) {
    if (!/^[a-z][a-z-]*$/.test(name) || !Array.isArray(commands) || !commands.length) throw Error('Invalid suite: ' + name);
    for (const args of commands) {
      if (!Array.isArray(args) || !args.length) throw Error('Empty validation command: ' + name);
      const files = args[0] === '--test' ? args.slice(1) : args;
      if (!files.length || args[0] !== '--test' && files.length !== 1 ||
        !files.every(file => safePath(file) && file.endsWith('.cjs'))) throw Error('Unsafe validation command: ' + name);
    }
  }
  return config;
}
function isBrowserTest(file, config) {
  return /(?:^|[./-])browser\.test\.cjs$/.test(file) || config.browserAliases.includes(file);
}
function validateTestCoverage(files, policy, config) {
  validateSuites(config);
  const registered = new Set(Object.values(config.suites).flat(2).filter(file => file !== '--test'));
  return files.filter(file => file.endsWith('.test.cjs') &&
    policy.testAreas.some(area => under(file, area)) && !retainedTests.has(file) &&
    !registered.has(file) && !config.browserAliases.includes(file) &&
    !(policy.testDirectories.includes(path.posix.dirname(file)) && isBrowserTest(file, config)))
    .map(file => 'Unassigned test: ' + file + ' (register CI/local or use .browser.test.cjs)');
}
function validateDocs(root, policy) {
  const errors = [];
  for (const file of [...new Set([...policy.maintainedDocs, ...policy.requiredFiles])]) {
    if (!fs.existsSync(path.join(root, file))) errors.push('Required entry is missing: ' + file);
  }
  for (const file of policy.maintainedDocs) {
    const absolute = path.join(root, file);
    if (!fs.existsSync(absolute)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    // Only the maintained entry guides are checked; dated evidence stays immutable.
    for (const link of text.matchAll(/\[[^\]\n]+\]\(([^)\n]+)\)/g)) {
      let target = link[1].trim();
      if (/^[a-z][a-z\d+.-]*:|^#/i.test(target)) continue;
      if (target.startsWith('<') && target.endsWith('>')) target = target.slice(1, -1);
      try { target = decodeURIComponent(target.split(/[?#]/)[0]); }
      catch { errors.push('Invalid link in ' + file + ': ' + link[1]); continue; }
      if (!target) continue;
      const resolved = path.resolve(path.dirname(absolute), target);
      const relative = path.relative(root, resolved);
      if (relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative) ||
        !fs.existsSync(resolved)) errors.push('Broken/outside link in ' + file + ': ' + target);
    }
  }
  return errors;
}
function trackedFiles(root = ROOT) {
  try {
    return execFileSync('git', ['ls-files', '-z'], {cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 ** 2, windowsHide: true})
      .split('\0').filter(Boolean);
  } catch (error) {
    throw Error('Organisation check needs the Git checkout and git on PATH: ' + error.message);
  }
}
function validateMediaPaths(files) {
  return files.filter(file => /\.(?:png|jpe?g|webp|gif|tiff?|ps[db]|pdf|zip|7z|rar|docx?|xlsx?|pptx?|woff2?|ttf|otf|pyd|mp[34]|wav|ogg)$/i.test(file))
    .map(file => 'Media stays local/Cloudflare, not Git LFS: ' + file);
}
function check({root = ROOT, files = trackedFiles(root)} = {}) {
  const policy = validatePolicy(readJson(path.join(root, 'maintenance/organisation.json')));
  const config = validateSuites(readJson(path.join(root, 'maintenance/validation-suites.json')));
  const errors = [...validatePaths(files, policy), ...validateTestCoverage(files, policy, config), ...validateDocs(root, policy)];
  if (policy.mediaStorage === 'local-cloudflare') errors.push(...validateMediaPaths(files));
  for (const file of new Set([...Object.values(config.suites).flat(2).filter(file => file !== '--test'), ...config.browserAliases])) {
    if (!fs.existsSync(path.join(root, file))) errors.push('Registered validation file missing: ' + file);
  }
  if (errors.length) throw Error(errors.join('\n'));
  return {trackedFiles: files.length, rootAreas: Object.keys(policy.roots).length, v4Areas: Object.keys(policy.v4).length, maintainedDocs: policy.maintainedDocs.length};
}
module.exports = {ROOT, safePath, under, validatePolicy, validatePaths, validateSuites, isBrowserTest, validateTestCoverage, validateDocs, trackedFiles, validateMediaPaths, check};
if (require.main === module) {
  try { console.log('Organisation OK: ' + JSON.stringify(check())); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
