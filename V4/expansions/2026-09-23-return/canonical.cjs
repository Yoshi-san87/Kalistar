'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
function registry(card, plan) {
  const names = [...plan.layers, ...plan.hiddenLayers].map(l => l.name);
  for (const side of ['ATK', 'DEF']) for (let d = 1; d <= 6; d++) assert.ok(names.includes(side + ' D' + d + (side === 'ATK' ? ' - HALO MAGIQUE' : ' - BARRIERE')));
  return { schemaVersion: 4, template: 'V4/templates/' + card.output + '.psd', canvas: [897, 1497], elements: [card.element],
    banks: [['artwork', card.artwork, 'ILLUSTRATION - cadrage'], ['id', card.id, 'ID CODE128 - ' + card.id],
      ['weapon', card.weapon, 'ARME - ' + card.weapon], ['race', card.race, 'RACE - ' + card.race], ['faction', card.faction, 'FACTION - ' + card.faction]].map(([field, value, layer]) => ({ field, variants: { [value]: [layer] } })),
    positionLayout: { textX: 224, textY: 1020.5, step: 58, maxTextWidth: 34 }, effectLayouts: [], effectSupports: [] };
}
function referenceEntry(card, key, native, plan) {
  const options = { atk: [], defense: [] };
  for (const [side, prefix] of [['atk', 'ATK'], ['defense', 'DEF']]) for (let i = 0; i < 6; i++) {
    const start = prefix + ' D' + (6 - i) + ' - effet ';
    options[side].push(native.layers.filter(l => l.name.startsWith(start)).map(l => l.name.slice(start.length)));
  }
  const value = { key, card, profile: 'V4/template-stable/return-20260923/' + key + '/card.json',
    png: 'V4/cartes/' + card.output + '.png', psd: 'V4/templates/' + card.output + '.psd',
    registry: registry(card, plan), options, artworkLayer: 'ILLUSTRATION - cadrage',
    fonts: [...new Set(native.layers.filter(l => l.kind === 'LayerKind.TEXT').map(l => l.font))] };
  assert.ok(card.edition === 'canonical' && card.id === card.legacyId);
  return value;
}
async function createPlan(L, D, home = __dirname) {
  const { path, fs, read, crypto } = L, local = n => L.inside(home, n), guard = require('./preservation.cjs').createGuard(L, D, home);
  guard.publication(); const set = M.validateSet(read(local('set.json'))), before = L.baseline(), next = structuredClone(before), install = [];
  const newEntries = [], oldIds = new Set(before.cards.map(c => c.card.id)), oldKeys = new Set(before.cards.map(c => c.key));
  const evidence = new Set(['set.json', ...Object.keys(M.INPUTS)].map(local));
  const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
  const buffer = value => Buffer.from(JSON.stringify(value, null, 2));
  function generated(to, value) { const bytes = buffer(value); install.push({ to, bytes, hash: sha(bytes) }); }
  async function source(to, from) { install.push({ to, from, hash: await L.hash(from) }); }
  for (const c of set.cards.filter(c => c.edition === 'canonical')) {
    assert.ok(!oldIds.has(c.id) && !oldKeys.has(c.key), 'Reference deja presente.');
    const dir = local('cards/' + c.key), card = read(path.join(dir, 'profile.json'));
    M.validateProfile(card, c);
    const native = read(path.join(dir, 'render/native.json')), plan = read(path.join(dir, 'render/composition.json'));
    const entry = referenceEntry(card, c.key, native, plan); newEntries.push(entry); next.cards.push(entry);
    for (const f of ['profile.json', 'verification.json', 'preparation.json', 'render/native.json']) evidence.add(path.join(dir, f));
    evidence.add(local(c.art));
    generated(entry.profile, card); await source(entry.psd, path.join(dir, 'card.psd')); await source(entry.png, path.join(dir, 'card.png'));
  }
  assert.ok(newEntries.length, 'Aucun ajout canonique.');
  const assets = require('./assets.cjs').createAssets(L, D, home), manifests = ['manifest.json', 'manifest.raw.json'];
  const packs = manifests.map(n => ({ to: 'V4/atelier/designer-assets/' + n, old: read(path.join(L.ROOT, 'V4/atelier/designer-assets', n)) }));
  for (const pack of packs) {
    pack.next = structuredClone(pack.old);
    pack.next.sources.push(...newEntries.map(e => ({ key: e.key, psd: e.psd, png: e.png, profile: e.profile })));
    for (const c of set.cards.filter(c => c.edition === 'canonical')) if (!pack.next.weapons[c.weapon]) {
      const input = assets.weaponFile(c.weapon); assert.ok(input, 'Banque arme absente.');
      const name = 'return-weapon-' + Object.keys(require('../../../V3/donnees/armes.json')).indexOf(c.weapon) + '.png';
      const relative = (pack.to.endsWith('manifest.raw.json') ? 'banks/' : 'packed/banks/') + name;
      const descriptor = { file: relative, left: 89, top: 1116, width: 96, height: 95, sourceCard: c.key, sourceLayers: ['ARME - ' + c.weapon] };
      pack.next.weapons[c.weapon] = descriptor; pack.next.hashes ||= {}; pack.next.hashes[relative] = await L.hash(input);
      await source('V4/atelier/designer-assets/' + relative, input);
    }
  }
  for (const op of install) {
    assert.ok(!fs.existsSync(L.inside(L.ROOT, op.to)), 'Cible canonique deja presente : ' + op.to);
    assert.ok(!Object.hasOwn(before.protectedFiles, op.to)); next.protectedFiles[op.to] = op.hash;
  }
  for (const file of evidence) {
    const relative = path.relative(L.ROOT, file).replace(/\\/g, '/'), digest = await L.hash(file);
    if (Object.hasOwn(before.protectedFiles, relative)) assert.equal(before.protectedFiles[relative], digest);
    else next.protectedFiles[relative] = digest;
  }
  // A child lock extends the old map, never rehashes an existing protected file.
  assert.deepEqual(Object.fromEntries(Object.keys(before.protectedFiles).map(f => [f, next.protectedFiles[f]])), before.protectedFiles);
  next.parentReferenceId = before.id; next.id = sha(Buffer.from(JSON.stringify(next.protectedFiles)));
  next.createdAt = read(local('existing-created.snapshot.json')).capturedAt;
  next.revision = { id: M.SET, reason: 'Ajouts canoniques V3 vers V4, identites historiques conservees', audit: 'V4/expansions/' + M.SET + '/canonical-regression.json' };
  for (const pack of packs) { pack.next.referenceId = next.id; generated(pack.to, pack.next); }
  const digest = sha(buffer({ reference: next, install: install.map(({ to, hash }) => ({ to, hash })) }));
  return { before, next, newEntries, install, digest, packs };
}
module.exports = { registry, referenceEntry, createPlan };
