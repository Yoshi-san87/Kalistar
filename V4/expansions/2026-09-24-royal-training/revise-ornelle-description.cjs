'use strict';
const L = require('../../atelier/lib.cjs'), G = require('./preservation.cjs'), M = require('./model.cjs');
const DESCRIPTION = "Sur la berge rompue de Woodland, Ornelle relie les racines. Elles se nouent et cessent de trembler sous le premier pas. Elle sourit enfin : la for\u00eat n'a pas seulement repris du terrain, elle a rendu un chemin.";
async function main() {
  return G.locked(async () => {
    await G.stable();
    const dest = G.local('attempts/05-ornelle-description'); L.assert.ok(!L.fs.existsSync(dest));
    const profilesFile = G.local('profiles-b.json'), setFile = G.local('set.json');
    const beforeProfiles = L.read(profilesFile), beforeSet = L.read(setFile);
    const selected = L.read(G.local('art-b/READY-B.json'));
    L.assert.equal(G.digest(profilesFile), selected.profilesSha256);
    const beforeCard = beforeProfiles.find(c => c.key === 'ornelle'); L.assert.ok(beforeCard);
    L.assert.equal(beforeCard.description, L.read(G.local('typography-calibration.json')).descriptions.find(c => c.key === 'ornelle').description);
    const nextProfiles = structuredClone(beforeProfiles); nextProfiles.find(c => c.key === 'ornelle').description = DESCRIPTION;
    const nextSet = structuredClone(beforeSet); nextSet.cards.find(c => c.key === 'ornelle').description = DESCRIPTION;
    L.assert.deepEqual(nextSet.cards, L.read(G.local('profiles-a.json')).concat(nextProfiles).map(M.normalize));
    M.validateSet(nextSet, L.read(G.local('baseline/catalogue.json')).cards.map(c => c.id));
    const unchanged = {};
    for (const card of beforeSet.cards.filter(c => c.key !== 'ornelle')) {
      await G.preparation(card.key);
      unchanged[card.key] = await G.hashes(['preparation.json', 'verification.json', 'card.psd', 'card.png'].map(f => G.local('cards/' + card.key + '/' + f)));
    }
    await G.preparation('ornelle'); L.assert.equal(L.read(G.local('cards/ornelle/verification.json')).passed, true);
    const archivedHashes = await G.hashes(G.tree(G.local('cards/ornelle')));
    L.fs.mkdirSync(dest, { recursive: true });
    for (const [from, name] of [[profilesFile, 'before-profiles-b.json'], [setFile, 'before-set.json']])
      L.fs.copyFileSync(from, L.path.join(dest, name), L.fs.constants.COPYFILE_EXCL);
    G.exclusive(L.path.join(dest, 'after-profiles-b.json'), nextProfiles); G.exclusive(L.path.join(dest, 'after-set.json'), nextSet);
    const from = L.path.resolve(G.local('cards/ornelle')), to = L.path.resolve(L.path.join(dest, 'card'));
    L.assert.ok(from.startsWith(L.path.resolve(G.local('cards')) + L.path.sep) && to.startsWith(dest + L.path.sep));
    L.fs.renameSync(from, to);
    const record = name => ({ file: G.relative(L.path.join(dest, name)), sha256: G.digest(L.path.join(dest, name)) });
    G.exclusive(L.path.join(dest, 'revision.json'), {
      schemaVersion: 1, kind: 'parent-approved-description-revision', key: 'ornelle', at: new Date().toISOString(),
      reason: 'Five technically in-frame lines visually touch the crystal point. Parent supplied this shorter narrative for four native lines; no font, size, geometry, art or gameplay change.',
      authorizedBy: 'Parent visual review and exact replacement copy, 2026-09-25',
      before: { profiles: record('before-profiles-b.json'), set: record('before-set.json'), description: beforeCard.description },
      after: { profiles: record('after-profiles-b.json'), set: record('after-set.json'), description: DESCRIPTION },
      active: { profiles: G.relative(profilesFile), set: G.relative(setFile) },
      unchanged, archivedCard: { directory: G.relative(to), originalHashes: archivedHashes, archivedHashes: await G.hashes(G.tree(to)) }
    });
    L.fs.copyFileSync(L.path.join(dest, 'after-profiles-b.json'), profilesFile);
    L.fs.copyFileSync(L.path.join(dest, 'after-set.json'), setFile);
    for (const hashes of Object.values(unchanged)) await G.unchanged(hashes);
    await G.stable(); return { revised: 'ornelle', description: DESCRIPTION, unchangedNativeCards: 8, report: G.relative(L.path.join(dest, 'revision.json')) };
  });
}
if (require.main === module) main().then(console.log).catch(e => { console.error(e); process.exitCode = 1; });
