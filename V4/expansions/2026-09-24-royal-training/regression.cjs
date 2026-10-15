'use strict';
const assert = require('node:assert/strict');
const P = require('./reference-plan.cjs');
const { encode, sha } = require('./transaction.cjs');
const EVIDENCE = 'evidence/native-regression/';
const SOURCES = ['V4/scripts/stable/common.jsx', 'V4/scripts/stable/registered.jsx', 'V4/scripts/stable/elements-common.jsx',
  'V4/atelier/lib.cjs', 'V4/atelier/barcode.py', 'V4/atelier/designer-render.cjs', 'V4/revisions/2026-09-18-branches/bridge.ps1',
  ...['regression.cjs', 'regression.jsx', 'reference-plan.cjs', 'transaction.cjs'].map(P.batch)];
function validateNative(n, item) {
  assert.deepEqual([n.width, n.height, n.resolution], [897, 1497, 300]); assert.equal(n.key, item.key);
  const get = name => { const found = n.layers.filter(l => l.name === name); assert.equal(found.length, 1, 'Calque absent/ambigu : ' + name); return found[0]; };
  for (const [side, values, modes] of [['ATK', item.card.atk, item.card.magic], ['DEF', item.card.defense, item.card.barriers]]) for (let i = 0; i < 6; i++) {
    const die = 6 - i, value = values[i], numeric = typeof value === 'number', l = get(side + ' D' + die + ' - valeur');
    assert.equal(l.kind, 'LayerKind.TEXT'); assert.equal(l.visible, numeric); if (numeric) assert.equal(l.text, String(value));
    else assert.equal(get(side + ' D' + die + ' - effet ' + value).visible, true);
    assert.equal(get(side + ' D' + die + (side === 'ATK' ? ' - HALO MAGIQUE' : ' - BARRIERE')).visible, numeric && modes.includes(die));
  }
  for (const [name, field] of [['NOM', 'name'], ['TITLE', 'title'], ['JOB', 'job'], ['RACE', 'race'], ['DESCRIPTION', 'description']]) {
    const l = get(name); assert.equal(l.kind, 'LayerKind.TEXT'); assert.equal(l.text.replace(/\r/g, ' '), item.card[field]);
  }
  for (let p = 1; p <= 5; p++) {
    const l = get('POSITION SLOT ' + p); assert.equal(l.kind, 'LayerKind.TEXT'); assert.equal(l.visible, p <= item.card.positions.length);
    if (l.visible) assert.equal(l.text, String(item.card.positions[p - 1]));
  }
}
function inspect(r, candidate) {
  const report = r.read(P.batch(EVIDENCE + 'report.json'));
  assert.equal(report.passed, true); assert.equal(report.baseReferenceId, candidate.baseReferenceId); assert.equal(report.candidateDigest, candidate.digest);
  const req = r.read(P.batch(EVIDENCE + 'request.json'), report.requestHash);
  assert.deepEqual(req.items, candidate.items); assert.equal(req.candidateDigest, candidate.digest);
  assert.deepEqual(Object.keys(req.sources).sort(), SOURCES.slice().sort()); r.check(req.sources); r.check(req.observed);
  assert.deepEqual(report.results.map(x => x.key), candidate.items.map(x => x.key));
  for (const [i, v] of report.results.entries()) {
    assert.equal(v.passed, true); assert.equal(v.comparison?.changed, 0); assert.equal(v.roundtrip?.changed, 0);
    assert.equal(v.barcode?.passed, true); assert.equal(v.barcode.expected, candidate.items[i].card.id);
    assert.deepEqual(Object.keys(v.files).sort(), ['card.png', 'native.json', 'reopened.png']);
    for (const [file, hash] of Object.entries(v.files)) r.observe(P.batch(EVIDENCE + v.key + '/' + file), hash);
    validateNative(r.read(P.batch(EVIDENCE + v.key + '/native.json')), candidate.items[i]);
  }
  return report;
}
async function verify(r, candidate) {
  const L = require('../../atelier/lib.cjs'), R = require('../../atelier/designer-render.cjs');
  const req = r.read(P.batch(EVIDENCE + 'request.json')); assert.equal(req.candidateDigest, candidate.digest); assert.deepEqual(req.items, candidate.items);
  r.check(req.observed); r.check(req.sources); const results = [];
  for (const item of candidate.items) {
    const rel = P.batch(EVIDENCE + item.key + '/'), out = r.io.absolute(rel.slice(0, -1));
    const n = r.read(rel + 'native.json'); validateNative(n, item);
    const comparison = await L.diff(r.io.absolute(item.png), L.path.join(out, 'card.png'));
    const roundtrip = await L.diff(L.path.join(out, 'card.png'), L.path.join(out, 'reopened.png'));
    assert.equal(comparison.changed, 0, 'Regression pixels : ' + item.key); assert.equal(roundtrip.changed, 0);
    const barcode = JSON.parse(await R.command(L.PYTHON, [L.path.join(L.ROOT, 'V4/atelier/barcode.py'), L.path.join(out, 'card.png'), item.card.id])); assert.equal(barcode.passed, true);
    const files = Object.fromEntries(['card.png', 'reopened.png', 'native.json'].map(f => [f, r.observe(rel + f)]));
    results.push({ key: item.key, passed: true, comparison, roundtrip, barcode, files });
  }
  r.io.check(r.observed);
  return { passed: true, baseReferenceId: candidate.baseReferenceId, candidateDigest: candidate.digest,
    requestHash: r.observe(P.batch(EVIDENCE + 'request.json')), rendererHash: await L.rendererHash(), checkedAt: new Date().toISOString(), results };
}
async function run({ nativeAuthorized = false, verifyOnly = false } = {}) {
  assert.ok(verifyOnly || nativeAuthorized === true, 'Autorisation native explicite requise.');
  const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs'), R = require('../../atelier/designer-render.cjs');
  return G.locked(async () => {
    await G.stable(); const r = P.reader(L.ROOT), c = P.candidate(r), folder = G.local(EVIDENCE), reportFile = G.local(EVIDENCE + 'report.json');
    assert.ok(!L.fs.existsSync(reportFile), 'Rapport deja present, ne pas ecraser.');
    if (!verifyOnly) {
      assert.ok(!L.fs.existsSync(folder), 'Tentative existante : conserver et archiver explicitement avant reprise.');
      const sources = Object.fromEntries(SOURCES.map(f => [f, r.observe(f)]));
      G.exclusive(G.local(EVIDENCE + 'request.json'), { baseReferenceId: c.baseReferenceId, candidateDigest: c.digest, items: c.items, sources, observed: r.observed });
      await R.command('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'RemoteSigned', '-File',
        L.path.join(L.ROOT, 'V4/revisions/2026-09-18-branches/bridge.ps1'), '-Script', G.local('regression.jsx')], G.local(EVIDENCE + 'photoshop.log'));
    }
    const report = await verify(r, c); await G.stable(); r.io.check(r.observed); G.exclusive(reportFile, report); inspect(r, c);
    return { passed: true, references: 38, report: P.batch(EVIDENCE + 'report.json') };
  });
}
module.exports = { EVIDENCE, SOURCES, validateNative, inspect, verify, run };
if (require.main === module) {
  const args = process.argv.slice(2);
  assert.ok(args.length === 1 && ['--native-authorized', '--verify-only'].includes(args[0]), 'regression.cjs --native-authorized | --verify-only');
  run({ nativeAuthorized: args[0] === '--native-authorized', verifyOnly: args[0] === '--verify-only' }).then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
}
