'use strict';
const assert = require('node:assert/strict');
const M = require('./model.cjs');
const FLAG = Object.freeze({ left: 672, top: 829, width: 98, height: 223 });
const WEAPON = Object.freeze({ left: 89, top: 1116, width: 96, height: 95 });
const EXTRA = Object.freeze({
  Katana: 'V4/collaborations/nier-pilot-01/components/weapon-Katana.png',
  Projectile: 'V4/collaborations/ff7-set-01/weapon-projectile.png',
  'Fl\u00e9au': 'V4/collaborations/ff8-set-01/weapon-fleau.png'
});
function createAssets(L, D, home = __dirname) {
  const { path, ROOT, read, fs, sharp } = L, bank = path.join(ROOT, 'V4/atelier/designer-assets');
  const local = n => L.inside(home, n), manifest = () => read(path.join(bank, 'manifest.json'));
  const flags = {
    NieR: { input: path.join(ROOT, 'V4/collaborations/nier-pilot-01/flag-NieR-packed.png'), proof: path.join(ROOT, 'V4/collaborations/nier-pilot-01/faction.json') },
    Replicant: { input: local('banner/flag-Replicant-packed.png'), proof: local('banner/faction.json') }
  };
  function weaponFile(name) {
    if (name === 'Ep\u00e9e courte') return local('components/weapon-short-sword.png');
    return EXTRA[name] ? path.join(ROOT, EXTRA[name]) : null;
  }
  function inputs(set) {
    const m = manifest(), races = D.raceComponents(), files = [path.join(bank, 'race-extensions.json')];
    for (const c of set.cards) {
      const race = m.races[c.race] || races[c.race]; assert.ok(race, 'Race non calibree : ' + c.race);
      files.push(path.join(bank, race.file));
      const weapon = weaponFile(c.weapon); files.push(weapon || path.join(bank, m.weapons[c.weapon].file));
      const flag = flags[c.faction];
      files.push(...(flag ? [flag.input, flag.proof] : [path.join(bank, m.factions[c.faction].file)]));
    }
    if (set.cards.some(c => c.weapon === 'Ep\u00e9e courte')) files.push(local('components/weapon-short-sword.json'), local('components/weapon-short-sword.motif.png'));
    return [...new Set(files)];
  }
  async function verify(set) {
    await require('../../collaborations/nier-set-02/assets.cjs').createAssets(L, D).verify();
    const factions = new Set(set.cards.map(c => c.faction));
    for (const [name, flag] of Object.entries(flags)) if (factions.has(name)) {
      const proof = read(flag.proof); assert.equal(proof.id, name); assert.deepEqual(proof.packedGeometry, FLAG);
      assert.equal(await L.hash(flag.input), proof.flagHash);
      const meta = await sharp(flag.input).metadata(); assert.deepEqual([meta.width, meta.height], [FLAG.width, FLAG.height]);
    }
    for (const c of set.cards) {
      const weapon = weaponFile(c.weapon);
      if (weapon) { const meta = await sharp(weapon).metadata(); assert.deepEqual([meta.width, meta.height], [96, 95]); }
    }
    if (set.cards.some(c => c.weapon === 'Ep\u00e9e courte')) {
      const proof = read(local('components/weapon-short-sword.json'));
      assert.equal(proof.sha256, await L.hash(weaponFile('Ep\u00e9e courte')));
      assert.equal(proof.sourceHash, await L.hash(path.join(ROOT, proof.source)));
      assert.equal(proof.nativeEmailHash, await L.hash(path.join(ROOT, proof.nativeEmail)));
      const measure = require('../../collaborations/nier-pilot-01/assets.cjs').opticalMetrics;
      const metrics = measure(await sharp(local('components/weapon-short-sword.motif.png')).ensureAlpha().raw().toBuffer({ resolveWithObject: true }));
      assert.ok(metrics.fullAlphaRadius <= 39 && metrics.opticalError <= .75);
    }
    for (const file of inputs(set)) assert.ok(fs.existsSync(file), 'Asset absent : ' + file);
  }
  function apply(layers, card) {
    const donor = M.WEAPON_DONORS[card.weapon], flag = flags[card.faction];
    if (flag) {
      const index = layers.findIndex(l => l.name === 'FACTION - Chroma'); assert.ok(index >= 0);
      layers[index] = { ...FLAG, name: 'FACTION - ' + card.faction, input: flag.input };
    }
    if (donor) {
      const index = layers.findIndex(l => l.name === 'ARME - ' + donor); assert.ok(index >= 0);
      layers[index] = { ...WEAPON, name: 'ARME - ' + card.weapon, input: weaponFile(card.weapon) };
    }
    return layers;
  }
  async function prepareShortSword() {
    const output = weaponFile('Ep\u00e9e courte'), proof = local('components/weapon-short-sword.json');
    assert.ok(!fs.existsSync(output) && !fs.existsSync(proof), 'Composant deja prepare : ne pas remplacer.');
    fs.mkdirSync(path.dirname(output), { recursive: true });
    const source = path.join(ROOT, 'V3/assets/revisions-buffs-scenes-20260914/armes/16.png');
    const result = await require('../../collaborations/nier-pilot-01/assets.cjs').race(source, output, WEAPON);
    L.write(proof, result); return result;
  }
  return { inputs, verify, apply, prepareShortSword, weaponFile, manifest };
}
module.exports = { FLAG, WEAPON, EXTRA, createAssets };
if (require.main === module) {
  assert.deepEqual(process.argv.slice(2), ['--short-sword']);
  const L = require('../../atelier/lib.cjs'), D = require('../../atelier/designer-core.cjs');
  createAssets(L, D).prepareShortSword().then(r => console.log(JSON.stringify(r))).catch(e => { console.error(e); process.exitCode = 1; });
}
