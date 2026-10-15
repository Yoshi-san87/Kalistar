'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { buildCatalog, collaborationArenas } = require('../../atelier/game-catalog.cjs');
const SET = 'nier-arenas-01';
const KEYS = ['city-ruins', 'amusement-park'];
const sha = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
const parse = bytes => JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/, ''));
const read = file => fs.readFileSync(file);
const encode = value => Buffer.from(JSON.stringify(value, null, 2) + '\n');

async function decodeImage(bytes) {
  const { sharp } = require('../../atelier/lib.cjs');
  const metadata = await sharp(bytes).metadata();
  await sharp(bytes).stats();
  return metadata;
}

function createPublisher(options = {}) {
  const root = path.resolve(options.root || path.join(__dirname, '../../..'));
  const catalogueBuilder = options.buildCatalog || buildCatalog;
  const decode = options.decodeImage || decodeImage;
  const absolute = relative => {
    const file = path.resolve(root, relative), rel = path.relative(root, file);
    assert.ok(rel && !rel.startsWith('..') && !path.isAbsolute(rel), 'Chemin hors du projet.');
    return file;
  };
  const home = absolute('V4/collaborations/' + SET);
  const registry = absolute('V4/donnees/arenes-collaborations.json');
  const catalogue = absolute('V4/donnees/catalogue.json');
  const lock = absolute('V4/atelier/data/render.lock');
  const reviewFile = path.join(home, 'art-review.json');

  async function inspect() {
    const observed = new Map();
    const observe = file => {
      assert.ok(fs.lstatSync(file).isFile(), 'Source non reguliere : ' + file);
      const bytes = read(file); observed.set(file, sha(bytes)); return bytes;
    };
    const manifest = parse(observe(path.join(home, 'manifest.json')));
    assert.equal(manifest.id, SET);
    assert.equal(manifest.collaboration, 'nier');
    assert.equal(manifest.officialCollaboration, false);
    assert.deepEqual(manifest.arenas.map(a => a.key), KEYS, 'Les deux arenes NieR sont requises.');
    const before = observe(registry), old = parse(before);
    assert.ok(Array.isArray(old), 'Registre des arenes invalide.');
    const published = parse(observe(catalogue)).cards.filter(c => c.kind === 'created');
    assert.ok(published.every(c => c.testOnly !== true && c.profile?.testOnly !== true && c.profile?.published !== false), 'Publication de test interdite.');
    const data = await catalogueBuilder({ published });
    const ids = new Set(data.cards.map(c => c.characterId));
    const entries = manifest.arenas.map(a => a.entry);
    const candidateIds = new Set(entries.map(a => a.id));
    const expected = collaborationArenas(entries, ids, data.elements, data.arenas.filter(a => !candidateIds.has(a.id)));
    assert.equal(expected.length, 2, 'Publier d abord les personnages NieR.');
    const assets = [];
    for (const [index, spec] of manifest.arenas.entries()) {
      const entry = spec.entry;
      assert.equal(entry.id, 'nier-' + spec.key);
      assert.equal(entry.collaboration, 'nier');
      assert.equal(entry.image, '/jeu/assets/arenes/' + entry.id + '.png');
      assert.equal(spec.source, 'V4/collaborations/' + SET + '/art/' + spec.key + '.png');
      assert.deepEqual(expected[index].homeCharacters, entry.homeCharacters, 'Affinite non publiee : ' + entry.homeCharacters.filter(id => !ids.has(id)).join(', '));
      const prior = old.filter(a => a.id === entry.id);
      assert.ok(prior.length <= 1, 'Identifiant duplique : ' + entry.id);
      if (prior.length) assert.deepEqual(prior[0], entry, 'Arene existante differente : ' + entry.id);
      const source = absolute(spec.source), bytes = observe(source);
      assert.ok(bytes.length <= 32 * 1024 ** 2, 'Image trop volumineuse.');
      const image = await decode(bytes);
      assert.ok(image.format === 'png' && image.width >= 1024 && image.height >= 576 && image.width > image.height && image.width <= 8192 && image.height <= 8192, 'PNG paysage attendu : ' + spec.key);
      const target = absolute('V4/site/assets/arenes/' + entry.id + '.png');
      if (fs.existsSync(target)) assert.equal(sha(observe(target)), sha(bytes), 'Ne pas ecraser un decor existant : ' + entry.id);
      assets.push({ key: spec.key, source, target, sha256: sha(bytes), width: image.width, height: image.height });
    }
    const added = entries.filter(a => !old.some(prior => prior.id === a.id));
    const eol = before.includes(Buffer.from('\r\n')) ? '\r\n' : '\n';
    const next = added.length ? Buffer.from(JSON.stringify([...old, ...added], null, 2).replace(/\n/g, eol) + eol) : before;
    return { observed, before, next, assets, expected, added: added.map(a => a.id) };
  }

  function recheck(plan) {
    for (const [file, digest] of plan.observed) assert.equal(sha(read(file)), digest, 'Source modifiee depuis le preflight : ' + file);
  }
  function report(plan, mode) {
    return { setId: SET, mode, added: plan.added, registryBefore: sha(plan.before), registryAfter: sha(plan.next),
      observed: Object.fromEntries([...plan.observed].map(([file, digest]) => [path.relative(root, file).replace(/\\/g, '/'), digest])),
      assets: plan.assets.map(a => ({ ...a, source: path.relative(root, a.source).replace(/\\/g, '/'), target: path.relative(root, a.target).replace(/\\/g, '/') })), arenas: plan.expected };
  }
  async function preflight() {
    assert.ok(!fs.existsSync(lock), 'render.lock occupe.');
    const plan = await inspect(); recheck(plan); return report(plan, 'preflight');
  }
  async function publish() {
    const id = crypto.randomUUID(), owner = encode({ id, pid: process.pid, kind: 'arena-publication', setId: SET });
    let fd, temporary;
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, owner);
      const plan = await inspect();
      const reviewBytes = read(reviewFile), review = parse(reviewBytes);
      assert.equal(review.reviewed, true, 'Revue visuelle des illustrations requise.');
      for (const asset of plan.assets) assert.equal(review.assets?.[asset.key]?.sha256, asset.sha256, 'Revue visuelle obsolete : ' + asset.key);
      plan.observed.set(reviewFile, sha(reviewBytes));
      recheck(plan);
      if (!plan.added.length && plan.assets.every(a => fs.existsSync(a.target))) return report(plan, 'unchanged');
      const directory = path.join(home, 'publication', id);
      fs.mkdirSync(directory, { recursive: true });
      fs.writeFileSync(path.join(directory, 'arenes.before.json'), plan.before, { flag: 'wx' });
      fs.writeFileSync(path.join(directory, 'arenes.next.json'), plan.next, { flag: 'wx' });
      const proof = report(plan, 'prepared');
      fs.writeFileSync(path.join(directory, 'prepared.json'), encode(proof), { flag: 'wx' });
      for (const asset of plan.assets) {
        fs.mkdirSync(path.dirname(asset.target), { recursive: true });
        if (!fs.existsSync(asset.target)) fs.copyFileSync(asset.source, asset.target, fs.constants.COPYFILE_EXCL);
        assert.equal(sha(read(asset.target)), asset.sha256, 'Copie du decor differente.');
      }
      recheck(plan);
      assert.deepEqual(read(lock), owner, 'Verrou de publication perdu.');
      // Install media first, then commit the supplemental index atomically. Existing entries stay untouched.
      temporary = registry + '.' + id + '.tmp';
      fs.writeFileSync(temporary, plan.next, { flag: 'wx' });
      fs.renameSync(temporary, registry); temporary = undefined;
      const current = await catalogueBuilder({ published: parse(read(catalogue)).cards.filter(c => c.kind === 'created') });
      assert.deepEqual(current.arenas.filter(a => plan.expected.some(expected => a.id === expected.id)), plan.expected, 'Arenes publiees differentes du preflight.');
      const result = { ...proof, mode: 'published', transaction: id };
      fs.writeFileSync(path.join(directory, 'published.json'), encode(result), { flag: 'wx' });
      return result;
    } finally {
      if (temporary && fs.existsSync(temporary)) fs.unlinkSync(temporary);
      if (fd !== undefined) {
        fs.closeSync(fd);
        if (fs.existsSync(lock) && read(lock).equals(owner)) fs.unlinkSync(lock);
      }
    }
  }
  return { preflight, publish };
}

async function main(args = process.argv.slice(2)) {
  assert.ok(args.length === 0 || args.length === 1 && args[0] === '--publish', 'Usage: node publish.cjs [--publish]');
  const publisher = createPublisher();
  return args[0] === '--publish' ? publisher.publish() : publisher.preflight();
}
module.exports = { createPublisher, main };
if (require.main === module) main().then(r => console.log(JSON.stringify(r, null, 2))).catch(e => { console.error(e.message); process.exitCode = 1; });
