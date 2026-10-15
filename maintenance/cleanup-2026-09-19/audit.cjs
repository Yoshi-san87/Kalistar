'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const ROOT = path.resolve(__dirname, '../..');
const SELF = path.relative(ROOT, __dirname).replaceAll('\\', '/');
const read = file => JSON.parse(fs.readFileSync(path.join(ROOT, file), 'utf8').replace(/^\uFEFF/, ''));
const write = (name, value) => fs.writeFileSync(path.join(__dirname, name), JSON.stringify(value, null, 2) + '\n');
async function hash(file) {
  const h = crypto.createHash('sha256');
  for await (const buffer of fs.createReadStream(path.join(ROOT, file))) h.update(buffer);
  return h.digest('hex');
}
async function main() {
  assert.ok(!fs.existsSync(path.join(__dirname, 'plan.json')), 'Audit already exists');
  assert.ok(!fs.existsSync(path.join(ROOT, 'V4/atelier/data/render.lock')), 'Native render active');
  const refs = read('V4/atelier/data/references.json');
  const protectedPaths = new Set(Object.keys(refs.protectedFiles).map(file => file.toLowerCase()));
  const regressions = new Set();
  for (const id of fs.readdirSync(path.join(ROOT, 'V4/atelier/data/jobs'))) {
    const dir = 'V4/atelier/data/jobs/' + id;
    if (!fs.existsSync(path.join(ROOT, dir, 'request.json'))) continue;
    const request = read(dir + '/request.json'), status = read(dir + '/status.json');
    assert.ok(!['queued', 'checking', 'rendering', 'verifying'].includes(status.state), 'Job active');
    if (request.kind === 'regression' && status.state === 'verified') regressions.add(dir);
  }
  const files = [], errors = [], links = [];
  function scan(relative = '') {
    let entries;
    try { entries = fs.readdirSync(path.join(ROOT, relative), {withFileTypes: true}); }
    catch (error) { errors.push({path: relative, code: error.code}); return; }
    for (const entry of entries) {
      const file = (relative ? relative + '/' : '') + entry.name;
      if (file === SELF || entry.name === '.git') continue;
      if (entry.isSymbolicLink()) { links.push(file); continue; }
      if (entry.isDirectory()) scan(file);
      else if (entry.isFile()) {
        const stat = fs.statSync(path.join(ROOT, file));
        files.push({path: file, bytes: stat.size, modified: stat.mtime.toISOString()});
      }
    }
  }
  scan();
  for (const file of files) {
    try { file.sha256 = await hash(file.path); }
    catch (error) { errors.push({path: file.path, code: error.code}); }
  }
  write('inventory-before.json', files);
  const indexed = new Map(files.map(file => [file.path.toLowerCase(), file]));
  for (const [file, expected] of Object.entries(refs.protectedFiles)) {
    assert.equal(indexed.get(file.toLowerCase())?.sha256, expected, 'Protected source: ' + file);
  }
  const pack = read('V4/atelier/designer-assets/manifest.json');
  for (const [file, expected] of Object.entries(pack.hashes)) {
    const relative = 'V4/atelier/designer-assets/' + file;
    protectedPaths.add(relative.toLowerCase());
    assert.equal(indexed.get(relative.toLowerCase())?.sha256, expected, relative);
  }
  function candidate(file) {
    if (protectedPaths.has(file.path.toLowerCase()) || !/\.(png|psd|jpg|jpeg|tif|tiff)$/i.test(file.path)) return false;
    return /^V4\/revisions\/[^/]+\/(staged|transaction)\//.test(file.path)
      || [...regressions].some(dir => file.path.startsWith(dir + '/'));
  }
  const stable = new Map();
  const keepers = files.filter(file => file.sha256 && !candidate(file)
    && !/^V4\/atelier\/data\//.test(file.path));
  keepers.sort((a, b) => Number(protectedPaths.has(b.path.toLowerCase())) - Number(protectedPaths.has(a.path.toLowerCase())) || a.path.length - b.path.length);
  for (const file of keepers) if (!stable.has(file.sha256)) stable.set(file.sha256, file.path);
  const duplicates = files.filter(candidate).filter(file => stable.has(file.sha256)).map(file => ({
    path: file.path, bytes: file.bytes, sha256: file.sha256, retained: stable.get(file.sha256)
  }));
  const moves = ['export_kalistar_clean_preview.jsx', 'inspect_kalistar_clean_psd.jsx', 'inspect_kalistar_psd.jsx', 'organize_kalistar_psd.jsx'].map(from => ({
    from, to: 'maintenance/scripts-historiques/' + from, sha256: files.find(f => f.path === from).sha256
  }));
  moves.push({from: 'V4/README.md', to: 'V4/docs/HISTORIQUE_AVANT_2026-09-19.md', sha256: files.find(f => f.path === 'V4/README.md').sha256});
  for (const move of moves) assert.ok(!fs.existsSync(path.join(ROOT, move.to)));
  const totals = {};
  for (const file of files) { const key = file.path.split('/')[0]; totals[key] = (totals[key] || 0) + file.bytes; }
  const plan = {root: ROOT, referenceId: refs.id, createdAt: new Date().toISOString(),
    inventoryFiles: files.length, inventoryBytes: files.reduce((n, f) => n + f.bytes, 0),
    duplicates, bytesRecoverable: duplicates.reduce((n, f) => n + f.bytes, 0), moves,
    removeEmptyDirectories: ['Delivery/V1/FR', 'Delivery/V1', 'Delivery', 'Test'], errors, links, totals,
    protectedFiles: refs.protectedFiles, packHashes: pack.hashes};
  write('inventory-before.json', files); write('plan.json', plan);
  console.log({files: files.length, readableBytes: plan.inventoryBytes, duplicates: duplicates.length,
    bytesRecoverable: plan.bytesRecoverable, moves: moves.length, errors, links});
}
main().catch(error => { console.error(error); process.exitCode = 1; });
