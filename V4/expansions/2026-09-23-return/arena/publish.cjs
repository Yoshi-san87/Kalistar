'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const { buildCatalog, collaborationArenas } = require('../../../atelier/game-catalog.cjs');
const HOME = 'V4/expansions/2026-09-23-return/arena';
const BANNER = 'V4/expansions/2026-09-23-return/banner';
const HOMES = ['nier-replicant', 'kaine-replicant', 'devola-nier', 'popola-nier'];
const GEOMETRY = { left: 672, top: 829, width: 98, height: 223 };
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');
const digest = file => sha(fs.readFileSync(file));
const identity = file => { const s = fs.lstatSync(file); return [s.dev, s.ino, s.birthtimeMs]; };
const sameIdentity = (a, b) => a.every((v, i) => v === b[i]);

// Parse first, then insert at the array tail: all previous JSON bytes survive.
function appendEntry(before, entries, entry) {
  assert.ok(Array.isArray(parse(before)));
  const close = before.lastIndexOf(0x5d);
  assert.ok(close >= 0 && /^\s*$/.test(before.subarray(close + 1).toString('utf8')));
  let at = close;
  while (at > 0 && [0x20, 0x09, 0x0d, 0x0a].includes(before[at - 1])) at--;
  const eol = before.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
  const body = JSON.stringify(entry, null, 2).split('\n').map(line => '  ' + line).join(eol);
  const insertion = Buffer.from((entries.length ? ',' : '') + eol + body);
  const next = Buffer.concat([before.subarray(0, at), insertion, before.subarray(at)]);
  assert.deepEqual(parse(next), [...entries, entry]);
  assert.ok(Buffer.concat([next.subarray(0, at), next.subarray(at + insertion.length)]).equals(before));
  return { next, insertion: { offset: at, bytes: insertion.length } };
}

async function decodeImage(bytes) {
  const { sharp } = require('../../../atelier/lib.cjs');
  const metadata = await sharp(bytes).metadata(); await sharp(bytes).stats(); return metadata;
}

function createPublisher(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '../../../..'));
  const builder = options.buildCatalog || buildCatalog, decode = options.decodeImage || decodeImage;
  const checkpoint = options.checkpoint || (async () => {});
  const absolute = relative => {
    assert.ok(typeof relative === 'string' && relative && !path.isAbsolute(relative), 'Chemin relatif requis.');
    const file = path.resolve(root, relative), rel = path.relative(root, file);
    assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Chemin hors du projet.');
    let current = root;
    assert.ok(!fs.lstatSync(root).isSymbolicLink(), 'Racine symbolique interdite.');
    for (const segment of rel.split(path.sep)) {
      current = path.join(current, segment);
      if (fs.existsSync(current)) assert.ok(!fs.lstatSync(current).isSymbolicLink(), 'Lien symbolique/jonction interdit : ' + relative);
    }
    return file;
  };
  const relative = file => path.relative(root, file).replace(/\\/g, '/');
  const registry = absolute('V4/donnees/arenes-collaborations.json');
  const catalogue = absolute('V4/donnees/catalogue.json');
  const lock = absolute('V4/atelier/data/render.lock');
  const local = name => absolute(HOME + '/' + name);
  const flagFile = name => absolute(BANNER + '/' + name);

  async function inspect() {
    const observed = new Map();
    const observe = file => {
      absolute(relative(file)); assert.ok(fs.lstatSync(file).isFile(), 'Source non reguliere : ' + relative(file));
      const bytes = fs.readFileSync(file); observed.set(file, sha(bytes)); return bytes;
    };
    const spec = parse(observe(local('spec.json'))), manifest = parse(observe(local('manifest.json')));
    assert.equal(manifest.id, 'return-replicant-arena-20260923'); assert.equal(manifest.collaboration, 'replicant');
    assert.equal(manifest.officialCollaboration, false); assert.deepEqual(manifest.arenas, [spec]);
    assert.equal(spec.key, 'village'); assert.equal(spec.source, HOME + '/replicant-village.png');
    const entry = spec.entry;
    assert.equal(entry.id, 'replicant-village'); assert.equal(entry.collaboration, 'replicant');
    assert.equal(entry.image, '/jeu/assets/arenes/replicant-village.png');
    assert.equal(entry.element, 'AERO'); assert.equal(entry.elementBonus, 15);
    assert.equal(entry.homeAttack, 10); assert.equal(entry.homeDefense, 10); assert.deepEqual(entry.homeCharacters, HOMES);
    const before = observe(registry), old = parse(before); assert.ok(Array.isArray(old));
    observe(absolute('V4/atelier/data/references.json'));
    const catalog = parse(observe(catalogue)); assert.ok(Array.isArray(catalog.cards));
    const published = catalog.cards.filter(c => c.kind === 'created');
    assert.ok(published.every(c => c.testOnly !== true && c.profile?.testOnly !== true && c.profile?.published !== false), 'Publication de test interdite.');
    const data = await builder({ published });
    const eligible = HOMES.map(id => {
      const card = data.cards.find(c => c.characterId === id && c.faction === 'Replicant' && ['approved', 'published'].includes(c.origin));
      assert.ok(card, 'Personnage Replicant non publie : ' + id); return { id: card.id, characterId: id, faction: card.faction };
    });
    const expected = collaborationArenas([entry], new Set(data.cards.map(c => c.characterId)), data.elements, data.arenas.filter(a => a.id !== entry.id));
    assert.equal(expected.length, 1); assert.deepEqual(expected[0].homeCharacters, HOMES);
    const prior = old.filter(a => a.id === entry.id); assert.ok(prior.length <= 1, 'Arene dupliquee.');
    if (prior.length) assert.deepEqual(prior[0], entry, 'Arene existante differente.');
    const arenaProof = parse(observe(local('verification.json'))), review = parse(observe(local('art-review.json')));
    assert.equal(arenaProof.passed, true); assert.equal(review.reviewed, true, 'Revue visuelle requise.');
    const faction = parse(observe(flagFile('faction.json'))), flagProof = parse(observe(flagFile('verification.json')));
    assert.equal(faction.id, 'Replicant'); assert.equal(faction.label, 'Replicant'); assert.deepEqual(faction.packedGeometry, GEOMETRY);
    assert.equal(faction.bonusField, 'faction'); assert.equal(faction.bonusStat, 'ATK'); assert.equal(faction.membersScope, 'living-board-only');
    assert.ok(faction.isolatedFrom.includes('NieR')); assert.equal(flagProof.passed, true);
    assert.equal(flagProof.alphaMismatch, 0); assert.equal(flagProof.packedAlphaMismatch, 0); assert.equal(flagProof.fullPixelMismatch, 0);
    assert.equal(faction.fullFlag.file, BANNER + '/flag-Replicant.png');
    assert.equal(faction.fullFlag.width, 109); assert.equal(faction.fullFlag.height, 230);
    assert.equal(faction.source, BANNER + '/flag-source.png');
    assert.equal(sha(observe(flagFile('flag-source.png'))), faction.sourceHash);
    assert.equal(sha(observe(flagFile('flag-Replicant-packed.png'))), faction.flagHash);
    assert.equal(faction.flagHash, flagProof.packedHash); assert.equal(faction.sourceHash, flagProof.sourceHash);
    assert.equal(sha(observe(absolute('V4/propositions/collaborations/cloud-ff7-01/flag-FF7.png'))), faction.outlineHash);
    const assets = [];
    for (const a of [
      { key: 'village', kind: 'arena', source: absolute(spec.source), target: absolute('V4/site/assets/arenes/replicant-village.png'), hash: arenaProof.sha256 },
      { key: 'faction-Replicant', kind: 'faction', source: flagFile('flag-Replicant.png'), target: absolute('V4/site/assets/factions/Replicant.png'), hash: faction.fullFlag.sha256 }
    ]) {
      const bytes = observe(a.source), sum = sha(bytes); assert.equal(sum, a.hash, 'Empreinte media invalide : ' + a.key);
      assert.equal(review.assets?.[a.key]?.sha256, sum, 'Revue visuelle absente/obsolete : ' + a.key);
      if (a.kind === 'faction') { assert.equal(sum, flagProof.fullHash); assert.equal(review.assets[a.key].packedSha256, faction.flagHash, 'Revue drapeau packed obsolete.'); }
      assert.ok(bytes.length <= 32 * 1024 ** 2, 'Media trop volumineux.');
      const meta = await decode(bytes, a.kind);
      assert.equal(meta.format, 'png', 'PNG requis.');
      if (a.kind === 'arena') assert.ok(meta.width >= 1024 && meta.height >= 576 && meta.width > meta.height && meta.width <= 8192 && meta.height <= 8192, 'Arene paysage requise.');
      else assert.ok(meta.width === 109 && meta.height === 230 && meta.hasAlpha === true, 'Drapeau RGBA 109x230 requis.');
      const exists = fs.existsSync(a.target);
      if (exists) assert.equal(sha(observe(a.target)), sum, 'Media existant different : ' + a.key);
      assets.push({ ...a, sha256: sum, width: meta.width, height: meta.height, existed: exists });
    }
    const next = prior.length ? { next: before, insertion: null } : appendEntry(before, old, entry);
    return { observed, before, ...next, assets, entry, expected: expected[0], eligible, added: !prior.length, published };
  }

  function recheck(plan, owned = new Map()) {
    for (const [file, hash] of plan.observed) {
      absolute(relative(file)); assert.equal(digest(file), hash, 'Source modifiee depuis le preflight : ' + relative(file));
    }
    for (const asset of plan.assets) if (!asset.existed) {
      absolute(relative(asset.target));
      if (owned.has(asset.target)) assert.ok(fs.existsSync(asset.target) && sameIdentity(identity(asset.target), owned.get(asset.target).identity) && digest(asset.target) === asset.sha256, 'Media cree modifie : ' + asset.key);
      else assert.ok(!fs.existsSync(asset.target), 'Destination apparue depuis le preflight : ' + asset.key);
    }
  }
  function report(plan, mode) {
    return { mode, arenaId: plan.entry.id, added: plan.added, registryBefore: sha(plan.before), registryAfter: sha(plan.next),
      insertion: plan.insertion, previousRegistryBytesPreserved: true, eligibleCards: plan.eligible, arena: plan.expected,
      observed: Object.fromEntries([...plan.observed].map(([f,h]) => [relative(f),h])),
      assets: plan.assets.map(a => ({ key:a.key, source:relative(a.source), target:relative(a.target), sha256:a.sha256, width:a.width, height:a.height, existed:a.existed })) };
  }
  async function preflight() {
    assert.ok(!fs.existsSync(lock), 'render.lock occupe.');
    const plan = await inspect(); recheck(plan); assert.ok(!fs.existsSync(lock), 'render.lock occupe.'); return report(plan, 'preflight');
  }
  async function publish() {
    const id = crypto.randomUUID(), owner = encode({ id, pid:process.pid, kind:'replicant-arena-publication' });
    let fd, lockIdentity, plan, transaction, committed = false, temporary;
    const owned = new Map(), issues = [];
    const ownsLock = () => fs.existsSync(lock) && sameIdentity(identity(lock), lockIdentity) && fs.readFileSync(lock).equals(owner);
    const assertLock = () => assert.ok(ownsLock(), 'Verrou de publication perdu.');
    const verifyCommitted = () => {
      assertLock(); absolute(relative(registry));
      assert.equal(digest(registry),sha(plan.next),'Registre modifie apres publication.');
      for (const [f,h] of plan.observed) if (f !== registry) { absolute(relative(f)); assert.equal(digest(f),h,'Source modifiee apres publication.'); }
      for (const a of plan.assets) { absolute(relative(a.target)); assert.equal(digest(a.target),a.sha256,'Media modifie apres publication.'); }
    };
    const removeOwnedTemp = () => { if (temporary && fs.existsSync(temporary.path) && sameIdentity(identity(temporary.path), temporary.identity) && digest(temporary.path) === temporary.hash) fs.unlinkSync(temporary.path); };
    const atomicRegistry = bytes => {
      assertLock(); absolute(relative(registry));
      const temp = registry + '.' + id + '.tmp';
      fs.writeFileSync(temp, bytes, { flag:'wx' }); temporary = { path:temp, identity:identity(temp), hash:sha(bytes) };
      fs.renameSync(temp, registry); temporary = undefined;
    };
    try {
      absolute(relative(lock)); fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, owner); lockIdentity = identity(lock);
      plan = await inspect(); recheck(plan); assertLock();
      if (!plan.added && plan.assets.every(a => a.existed)) return report(plan, 'unchanged');
      transaction = local('publication/' + id); fs.mkdirSync(transaction, { recursive:true });
      fs.writeFileSync(path.join(transaction,'arenes.before.json'),plan.before,{flag:'wx'});
      fs.writeFileSync(path.join(transaction,'arenes.next.json'),plan.next,{flag:'wx'});
      fs.writeFileSync(path.join(transaction,'prepared.json'),encode(report(plan,'prepared')),{flag:'wx'});
      await checkpoint('before-media', report(plan,'prepared')); recheck(plan); assertLock();
      for (const a of plan.assets) {
        if (!a.existed) {
          absolute(relative(a.target)); fs.mkdirSync(path.dirname(a.target),{recursive:true}); absolute(relative(a.target));
          fs.copyFileSync(a.source,a.target,fs.constants.COPYFILE_EXCL);
          owned.set(a.target,{identity:identity(a.target),hash:a.sha256});
          assert.equal(digest(a.target),a.sha256,'Copie media differente.');
        }
        await checkpoint('after-media:' + a.kind, report(plan,'prepared')); recheck(plan,owned); assertLock();
      }
      await checkpoint('before-commit',report(plan,'prepared')); recheck(plan,owned); assertLock();
      if (plan.added) { atomicRegistry(plan.next); committed = true; }
      await checkpoint('after-commit',report(plan,'prepared')); verifyCommitted();
      const current = await builder({published:plan.published});
      assert.deepEqual(current.arenas.find(a=>a.id===plan.entry.id),plan.expected,'Arene publiee differente.');
      verifyCommitted();
      const result = {...report(plan,'published'),transaction:id};
      fs.writeFileSync(path.join(transaction,'published.json'),encode(result),{flag:'wx'}); return result;
    } catch (error) {
      try { removeOwnedTemp(); } catch (e) { issues.push('Temporary: ' + e.message); }
      if (plan) {
        let registrySafe = false;
        try {
          absolute(relative(registry));
          if (committed && digest(registry) === sha(plan.next) && ownsLock()) atomicRegistry(plan.before);
          registrySafe = digest(registry) === sha(plan.before);
          if (!registrySafe) issues.push('Registre externe conserve; les medias crees restent en place.');
        } catch (e) { issues.push('Registre: ' + e.message); }
        if (registrySafe) for (const [target, record] of owned) {
          try {
            absolute(relative(target));
            if (!fs.existsSync(target)) continue;
            if (sameIdentity(identity(target),record.identity) && digest(target)===record.hash) fs.unlinkSync(target);
            else issues.push('Media externe conserve: ' + relative(target));
          } catch (e) { issues.push('Media: ' + e.message); }
        }
        if (transaction) {
          try { fs.writeFileSync(path.join(transaction,'failed.json'),encode({error:error.message,registryRestored:registrySafe,issues}),{flag:'wx'}); }
          catch (e) { issues.push('Journal: ' + e.message); }
        }
      }
      error.rollbackIssues = issues; if (issues.length) error.message += ' Rollback incomplet: ' + issues.join(' | '); throw error;
    } finally {
      if (fd !== undefined) { fs.closeSync(fd); if (lockIdentity && ownsLock()) fs.unlinkSync(lock); }
    }
  }
  return {preflight,publish};
}
async function main(args=process.argv.slice(2)) {
  assert.ok(args.length===0 || args.length===1 && args[0]==='--publish','Usage: node publish.cjs [--publish]');
  const p=createPublisher(); return args[0]==='--publish' ? p.publish() : p.preflight();
}
module.exports={createPublisher,appendEntry,main,HOME,BANNER,HOMES};
if(require.main===module)main().then(r=>console.log(JSON.stringify(r,null,2))).catch(e=>{console.error(e.message);process.exitCode=1;});
