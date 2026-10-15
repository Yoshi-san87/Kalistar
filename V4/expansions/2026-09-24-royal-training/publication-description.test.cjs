'use strict';
const test = require('node:test'), assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const P = require('./reference-plan.cjs'), T = require('./transaction.cjs'), { selectedBProfiles } = require('./publish.cjs');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kalistar-description-'));
  t.after(() => { assert.equal(path.dirname(root), path.resolve(os.tmpdir())); assert.ok(path.basename(root).startsWith('kalistar-description-')); fs.rmSync(root, { recursive: true, force: true }); });
  const r = P.reader(root), prefix = P.batch('attempts/05-ornelle-description/');
  const put = (file, bytes) => { const f = r.io.absolute(file); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, bytes); return r.io.hash(file); };
  const json = (file, value) => put(file, T.encode(value));
  const before = ['keryn', 'brindor', 'asteran', 'ornelle', 'tazrik'].map(key => ({ key, name: key, art: 'art-b/' + key + '.png', atk: [1], description: 'A sufficiently long previous narrative for this fixture.' }));
  const after = structuredClone(before); after[3].description = 'A shorter narrative.';
  const beforeSet = { id: 'fixture', cards: [...['kaylis-entrainement', 'baptiste', 'sapphire', 'aelis-veille'].map(key => ({ key, description: 'Unchanged.' })), ...before] };
  const afterSet = structuredClone(beforeSet); afterSet.cards.find(c => c.key === 'ornelle').description = after[3].description;
  const selection = { profiles: P.batch('profiles-b.json'), profilesSha256: T.sha(T.encode(before)) };
  const report = { schemaVersion: 1, kind: 'parent-approved-description-revision', key: 'ornelle', authorizedBy: 'Parent', reason: 'Four lines.',
    active: { profiles: selection.profiles, set: P.batch('set.json') }, before: {}, after: {}, unchanged: {},
    archivedCard: { directory: prefix + 'card', originalHashes: {}, archivedHashes: {} } };
  for (const c of beforeSet.cards.filter(c => c.key !== 'ornelle')) {
    report.unchanged[c.key] = Object.fromEntries(['preparation.json', 'verification.json', 'card.psd', 'card.png'].map(name => {
      const file = P.batch('cards/' + c.key + '/' + name); return [file, put(file, 'unchanged:' + file)];
    }));
  }
  for (const name of ['preparation.json', 'verification.json', 'profile.json', 'card.psd', 'card.png', 'illustration.png']) {
    const file = prefix + 'card/' + name, hash = put(file, 'old:' + name); report.archivedCard.archivedHashes[file] = hash;
    report.archivedCard.originalHashes[P.batch('cards/ornelle/' + name)] = hash;
  }
  function save() {
    for (const [phase, profiles, set] of [['before', before, beforeSet], ['after', after, afterSet]]) {
      report[phase].description = profiles.find(c => c.key === 'ornelle').description;
      for (const [key, name, value] of [['profiles', 'profiles-b.json', profiles], ['set', 'set.json', set]]) {
        const file = prefix + phase + '-' + name; report[phase][key] = { file, sha256: json(file, value) };
      }
    }
    json(report.active.profiles, after); json(report.active.set, afterSet); json(prefix + 'revision.json', report);
  }
  const run = () => selectedBProfiles(P.reader(root), selection, afterSet); save();
  return { root, r, prefix, put, json, before, after, beforeSet, afterSet, selection, report, save, run };
}
test('original B selection remains valid without an explicit revision', t => {
  const f = fixture(t); fs.unlinkSync(f.r.io.absolute(f.prefix + 'revision.json')); f.json(f.selection.profiles, f.before);
  selectedBProfiles(P.reader(f.root), f.selection, f.beforeSet);
});
test('explicit sole Ornelle narrative revision preserves all provenance', t => {
  const f = fixture(t), r = P.reader(f.root); selectedBProfiles(r, f.selection, f.afterSet);
  assert.ok(r.observed[f.prefix + 'before-profiles-b.json']); assert.ok(r.observed[f.prefix + 'revision.json']);
  assert.ok(r.observed[P.batch('cards/tazrik/card.psd')]); assert.ok(r.observed[f.prefix + 'card/card.psd']);
});
test('art, attributes or another narrative cannot piggyback on Ornelle revision', t => {
  for (const mutate of [f => { f.after[3].atk[0] = 99; }, f => { f.after[3].art = 'other.png'; }, f => { f.after[0].description = 'Other story.'; }]) {
    const f = fixture(t); mutate(f); f.save(); assert.throws(f.run, /Seul Ornelle/);
  }
});
test('set metadata and other cards cannot change', t => {
  for (const mutate of [f => { f.afterSet.id = 'foreign'; }, f => { f.afterSet.cards[0].description = 'Changed.'; }]) {
    const f = fixture(t); mutate(f); f.save(); assert.throws(f.run);
  }
});
test('missing revision report does not allow a hash mismatch', t => {
  const f = fixture(t); fs.unlinkSync(f.r.io.absolute(f.prefix + 'revision.json')); assert.throws(f.run, /absente/);
});
test('historical selection copy must retain exact old bytes', t => {
  const f = fixture(t); f.put(f.prefix + 'before-profiles-b.json', 'tampered'); assert.throws(f.run, /stale/);
});
test('active profiles and set must match the after snapshots', t => {
  for (const file of ['profiles-b.json', 'set.json']) {
    const f = fixture(t); f.put(P.batch(file), 'tampered'); assert.throws(f.run);
  }
});
test('eight preserved cards and archived Ornelle remain byte-identical', t => {
  for (const file of [P.batch('cards/tazrik/card.png'), P.batch('attempts/05-ornelle-description/card/card.psd')]) {
    const f = fixture(t); f.put(file, 'tampered'); assert.throws(f.run, /stale/);
  }
});
test('revision cannot redirect evidence paths or omit authorization', t => {
  for (const mutate of [f => { f.report.before.profiles.file = P.batch('profiles-b.json'); }, f => { f.report.authorizedBy = ''; }, f => { f.report.active.set = 'V3/donnees/cartes.json'; }]) {
    const f = fixture(t); mutate(f); f.json(f.prefix + 'revision.json', f.report); assert.throws(f.run);
  }
});
test('reverting active profiles cannot silently bypass an existing revision', t => {
  const f = fixture(t); f.json(f.selection.profiles, f.before); assert.throws(f.run, /actifs hors revision/);
});
