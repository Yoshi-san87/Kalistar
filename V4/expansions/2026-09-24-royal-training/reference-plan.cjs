'use strict';
const assert = require('node:assert/strict');
const { createIO, sha, encode } = require('./transaction.cjs');
const HOME = 'V4/expansions/2026-09-24-royal-training';
const REF = 'V4/atelier/data/references.json', CAT = 'V4/donnees/catalogue.json', REG = 'V4/atelier/data/regression.json', BANK = 'V4/atelier/designer-assets/';
const KEYS = ['kaine', 'capitaine-skully', 'darnako', 'xiaomi', 'ruby', 'aelis', 'iliane'];
const NEW_FILES = ['card.psd', 'card.png', 'profile.json', 'illustration.png', 'verification.json', 'creation.json'];
const batch = name => HOME + '/' + name;
function reader(root) {
  const io = createIO(root), observed = {};
  function observe(file, expected) {
    const h = io.hash(file); assert.ok(h, 'Source absente : ' + file);
    if (expected !== undefined) assert.equal(h, expected, 'Source/preuve stale : ' + file);
    if (Object.hasOwn(observed, file)) assert.equal(h, observed[file]); observed[file] = h; return h;
  }
  function read(file, expected) { const hash = observe(file, expected), value = io.read(file); assert.equal(io.hash(file), hash); return value; }
  const check = map => { for (const [f, h] of Object.entries(map)) observe(f, h); };
  return { io, observed, observe, read, check };
}
function baseline(r) {
  const capture = r.read(batch('capture.json')); r.check(capture.snapshots);
  const before = r.read(batch('baseline/references.json')), cat = r.read(batch('baseline/catalogue.json'));
  const revisions = r.read(batch('baseline/revisions.json')).map(item => ({ ...item, id: item.id || item.entry.id }));
  assert.equal(before.id, capture.referenceId); assert.equal(before.cards.length, 38); assert.equal(cat.cards.length, 80);
  assert.equal(cat.cards.filter(c => c.kind === 'created').length, 42); assert.equal(cat.referenceId, before.id);
  assert.deepEqual(revisions.map(c => c.key), KEYS);
  for (const item of revisions) {
    assert.deepEqual(item.entry, cat.cards.find(c => c.id === item.id));
    if (item.entry.kind === 'approved') assert.deepEqual(item.reference, before.cards.find(c => c.card.id === item.id));
    else { assert.equal(item.key, 'kaine'); assert.equal(item.id, '45951088'); }
  }
  return { capture, before, cat, revisions };
}
function revision(r, item, base) {
  const dir = batch('revisions/' + item.key), prep = r.read(dir + '/preparation.json');
  assert.equal(prep.referenceId, base.before.id); assert.equal(prep.captureHash, r.observed[batch('capture.json')]);
  r.check(prep.inputs); r.check(prep.generated);
  const v = r.read(dir + '/verification.json');
  assert.equal(v.preparationHash, r.observed[dir + '/preparation.json']); assert.equal(v.referenceId, base.before.id);
  assert.equal(v.passed, true); assert.equal(v.key, item.key); assert.equal(v.id, item.id);
  for (const k of ['original', 'isolated', 'roundtrip']) assert.equal(v[k]?.changed, 0, 'Preuve native incompletement verte.');
  assert.ok(v.visual?.changed > 0); assert.equal(v.visual.outside, 0); assert.equal(v.barcode?.passed, true); assert.equal(v.barcode.expected, item.id);
  for (const file of ['native.json', 'card.psd', 'card.png', 'reopened.png', 'before-card.png', 'before-without-edits.png', 'after-without-edits.png'])
    assert.ok(v.nativeFiles?.[dir + '/' + file], 'Preuve native manquante : ' + file);
  r.check(v.nativeFiles);
  const plan = r.read(dir + '/plan.json'); assert.equal(plan.id, item.id); assert.equal(plan.kind, item.kind);
  assert.deepEqual(plan.allowed, item.kind === 'flag' ? [[663, 997, 789, 1036]] : [[80, 156, 817, 1077]]);
  if (item.crop) assert.deepEqual(plan.crop, item.crop);
  assert.deepEqual(r.read(dir + '/originals/profile.json'), item.entry.profile);
  r.observe(dir + '/originals/card.psd', item.originalHashes[item.entry.psd]);
  r.observe(dir + '/originals/card.png', item.originalHashes[item.entry.png]);
  const profile = structuredClone(item.entry.profile); if (item.crop) profile.crop = structuredClone(item.crop);
  const M = require('./model.cjs'); assert.deepEqual(M.gameplay(profile), M.gameplay(item.entry.profile));
  return { item, dir, profile, verification: v };
}
function candidate(r, base = baseline(r)) {
  const revised = base.revisions.filter(x => x.reference).map(x => revision(r, x, base));
  const items = base.before.cards.map(e => {
    const change = revised.find(v => v.item.id === e.card.id), card = change ? change.profile : e.card;
    const psd = change ? change.dir + '/card.psd' : e.psd, png = change ? change.dir + '/card.png' : e.png;
    const hashes = { psd: r.observe(psd, change ? undefined : base.before.protectedFiles[psd]), png: r.observe(png, change ? undefined : base.before.protectedFiles[png]) };
    return { key: e.key, card, registry: e.registry, artworkLayer: e.artworkLayer, psd, png, hashes };
  });
  const data = { baseReferenceId: base.before.id, items };
  return { ...data, digest: sha(encode(data)), revised, base };
}
function targets(base, set) {
  const result = [REF, CAT, REG, BANK + 'manifest.json', BANK + 'manifest.raw.json', BANK + 'banks/faction-Solaria.png', BANK + 'packed/banks/faction-Solaria.png'];
  for (const item of base.revisions) {
    if (item.reference) { result.push(item.entry.psd, item.entry.png); if (item.crop) result.push(item.reference.profile); }
    else for (const name of NEW_FILES) result.push('V4/creations/' + item.id + '/' + name);
  }
  for (const card of set.cards) for (const name of NEW_FILES) result.push('V4/creations/' + card.id + '/' + name);
  assert.equal(result.length, new Set(result).size); return result.sort();
}
module.exports = { HOME, REF, CAT, REG, BANK, KEYS, NEW_FILES, batch, reader, baseline, revision, candidate, targets };
