'use strict';
const assert = require('node:assert/strict');
const SET = 'ff7-set-01', CLOUD = '47208326';
const FILES = ['profile.json', 'card.png', 'card.psd', 'verification.json', 'illustration.png'];
const KEYS = ['cloud', 'barret', 'tifa', 'aeris', 'red-xiii', 'cait-sith', 'cid', 'vincent', 'yuffie', 'sephiroth'];
const ARENAS = ['ff7-midgar', 'ff7-cosmo-canyon'];

function createPublisher(options = {}) {
  const L = options.L || require('../../atelier/lib.cjs');
  const D = options.D || require('../../atelier/designer-core.cjs');
  const buildCatalog = options.buildCatalog || require('../../atelier/game-catalog.cjs').buildCatalog;
  const createEngine = options.createEngine || require('../../site/engine.js').createEngine;
  const { fs, path, crypto, ROOT, DATA, read, write, hash, sharp } = L;
  const home = L.inside(ROOT, options.home || __dirname), lock = path.join(DATA, 'render.lock');
  const sha = value => crypto.createHash('sha256').update(value).digest('hex');
  const bytes = file => fs.existsSync(file) ? fs.readFileSync(file) : null;
  const json = buffer => JSON.parse(buffer.toString('utf8').replace(/^\uFEFF/, ''));
  const uuid = value => typeof value === 'string' && D.UUID.test(value);
  const same = (a, b, message) => assert.deepEqual(a, b, message);

  async function image(file, card = false) {
    const m = await sharp(file).metadata();
    assert.ok(m.format === 'png' && m.width > 0 && m.height > 0, 'PNG invalide : ' + file);
    if (card) same([m.width, m.height], [897, 1497], 'Dimensions de carte invalides.');
    return m;
  }
  async function compareFiles(folder, hashes, names = FILES) {
    for (const name of names) assert.equal(await hash(path.join(folder, name)), hashes[name], 'Empreinte modifiee : ' + path.join(folder, name));
  }
  async function inspect() {
    const observed = new Map(), referenceId = L.baseline().id;
    const setFile = path.join(home, 'set.json'), setBytes = fs.readFileSync(setFile), set = json(setBytes);
    observed.set(setFile, sha(setBytes));
    assert.ok(set.id === SET && set.faction === 'FF7' && set.officialCollaboration === false, 'Set FF7 prive invalide.');
    assert.ok(Array.isArray(set.cards) && set.cards.length === 9, 'Neuf cartes plus Cloud sont requises.');
    same(set.cards.map(c => c.key).sort(), KEYS.filter(k => k !== 'cloud').sort(), 'Personnages du set invalides.');
    const before = bytes(D.CATALOGUE), cat = D.catalogue();
    assert.equal(cat.referenceId, referenceId, 'Reference du catalogue obsolete.');
    assert.equal(new Set(cat.cards.map(c => c.id)).size, cat.cards.length, 'Identifiants du catalogue dupliques.');
    if (before) {
      for (const old of json(before).cards) assert.ok(cat.cards.some(c => c.id === old.id && c.kind === old.kind), 'Entree existante perdue par D.catalogue().');
    }
    const cards = [], ids = new Set();
    for (const spec of [{ key: 'cloud', positions: [2] }, ...set.cards]) {
      const source = L.inside(path.join(home, 'cards'), spec.key), hashes = {}, parsed = {};
      for (const name of FILES) {
        const file = path.join(source, name), stat = fs.lstatSync(file);
        assert.ok(stat.isFile() && stat.size > 0, 'Fichier absent, vide ou non regulier : ' + file);
        if (name.endsWith('.json')) {
          const buffer = fs.readFileSync(file); parsed[name] = json(buffer); hashes[name] = sha(buffer);
        } else hashes[name] = await hash(file);
        observed.set(file, hashes[name]);
      }
      const p = parsed['profile.json'], v = parsed['verification.json'];
      assert.ok(p && typeof p.id === 'string' && /^4\d{7}$/.test(p.id) && !ids.has(p.id), 'Dix identifiants V4 uniques sont requis.');
      ids.add(p.id);
      if (spec.key === 'cloud') assert.equal(p.id, CLOUD, 'Identifiant Cloud preserve.');
      assert.ok(p.faction === 'FF7' && p.collaboration === 'FF7' && p.characterId === spec.key + '-ff7', 'Identite FF7 invalide : ' + spec.key);
      assert.notEqual(p.testOnly, true, 'Profil testOnly non publiable : conversion explicite requise.');
      assert.ok(Array.isArray(p.positions) && new Set(p.positions).size === p.positions.length && p.positions.every(n => Number.isInteger(n) && n >= 1 && n <= 5), 'Positions invalides.');
      same([...p.positions].sort(), [...spec.positions].sort(), 'Positions utilisateur modifiees : ' + spec.key);
      assert.ok(p.positions.includes(p.role) && typeof p.sentry === 'boolean', 'Role ou sentry invalide.');
      assert.equal(p.canGuard, p.atk?.includes('guard'), 'canGuard incompatible.');
      assert.equal(p.canHeal, p.atk?.includes('revive'), 'canHeal incompatible.');
      for (const [field, side] of [['magic', 'atk'], ['barriers', 'defense']]) {
        assert.ok(Array.isArray(p[field]) && new Set(p[field]).size === p[field].length && p[field].every(d => typeof p[side]?.[6 - d] === 'number'), 'Mode sur une face non numerique.');
      }
      assert.ok(v?.passed === true && v.modelId === p.id && v.referenceId === referenceId && v.testOnly !== true, 'Verification incomplete ou obsolete : ' + spec.key);
      assert.equal(v.profileHash, hashes['profile.json'], 'Profil modifie depuis sa verification.');
      for (const name of ['card.png', 'card.psd']) assert.equal(v.hashes?.[name], hashes[name], 'Rendu modifie depuis sa verification : ' + name);
      assert.ok(v.roundtrip?.changed === 0 && v.barcode?.passed === true && v.components?.fixedDifferences === 0 && v.components?.severePixels === 0, 'Preuves natives incompletes : ' + spec.key);
      if (v.barcode.expected !== undefined) assert.equal(v.barcode.expected, p.id, 'Code-barres incorrect.');
      await image(path.join(source, 'card.png'), true); await image(path.join(source, 'illustration.png'));
      await compareFiles(source, hashes);
      const rel = 'V4/creations/' + p.id, target = L.inside(ROOT, rel), prior = cat.cards.find(c => c.id === p.id);
      const media = { png: rel + '/card.png', psd: rel + '/card.psd', pngUrl: '/media/created/' + p.id + '.png', psdUrl: '/media/created/' + p.id + '.psd' };
      let creation;
      if (prior) {
        assert.ok(prior.kind === 'created' && prior.profile?.collaboration === 'FF7', 'Identifiant appartenant a une autre carte : ' + p.id);
        same(prior.profile, p, 'Profil deja publie different : ' + p.id);
        for (const [field, value] of Object.entries(media)) assert.equal(prior[field], value, 'Route existante differente.');
        same(read(path.join(target, 'profile.json')), p, 'Profil publie sur disque different.');
        const old = read(path.join(target, 'creation.json'));
        const legacyCloud = p.id === CLOUD && old.kind === 'private-collaboration' && old.modelId === CLOUD;
        await compareFiles(target, hashes, legacyCloud ? ['card.png', 'card.psd', 'illustration.png'] : FILES);
        if (prior.creationJob !== undefined) {
          assert.ok(uuid(prior.creationJob), 'creationJob existant invalide.');
          if (!legacyCloud) assert.equal(old.job, prior.creationJob, 'Provenance de creation differente.');
        } else assert.ok(legacyCloud, 'creationJob manquant hors Cloud historique.');
        creation = { job: prior.creationJob || crypto.randomUUID() };
      } else if (fs.existsSync(target)) {
        creation = read(path.join(target, 'creation.json'));
        assert.ok(creation.setId === SET && creation.key === spec.key && creation.modelId === p.id && uuid(creation.job), 'Dossier deja utilise : ' + p.id);
        same(creation.hashes, hashes, 'Dossier orphelin incompatible.');
        await compareFiles(target, hashes);
      } else creation = { job: crypto.randomUUID(), setId: SET, key: spec.key, modelId: p.id, hashes, createdAt: new Date().toISOString() };
      if (fs.existsSync(target)) {
        for (const name of [...FILES, 'creation.json']) observed.set(path.join(target, name), await hash(path.join(target, name)));
      }
      const entry = prior ? { ...prior, creationJob: creation.job } : {
        id: p.id, kind: 'created', creationJob: creation.job, name: p.name, title: p.title, element: p.element,
        profile: p, ...media, createdAt: creation.createdAt, publicationSource: 'V4/collaborations/' + SET
      };
      cards.push({ source, target, hashes, creation, entry, prior, install: !fs.existsSync(target) });
    }
    const next = { ...cat, cards: cat.cards.map(c => cards.find(item => item.prior?.id === c.id)?.entry || c) };
    next.cards.push(...cards.filter(c => !c.prior).map(c => c.entry));
    const data = await buildCatalog({ published: next.cards.filter(c => c.kind === 'created') }), engine = createEngine(data);
    const deck = cards.map(c => c.entry.id);
    same(engine.validatePlayableDeck(deck), [], 'Deck FF7 non jouable (couverture P1-P5 >= 2).');
    for (const { entry } of cards) {
      for (const field of ['role', 'canGuard', 'canHeal']) assert.equal(engine.byId[entry.id][field], entry.profile[field], 'Profil moteur different : ' + field);
    }
    const chroma = data.cards.find(c => c.faction === 'Chroma');
    assert.ok(chroma, 'Temoin Chroma absent.');
    for (let n = 1; n <= 5; n++) {
      const board = deck.slice(0, n).map(cardId => ({ cardId }));
      assert.equal(engine.synergy({ board }, board[0], 'faction'), (n - 1) * 10, 'Synergie FF7 incorrecte.');
      if (n < 5) {
        const other = { cardId: chroma.id }; board.push(other);
        assert.equal(engine.synergy({ board }, board[0], 'faction'), (n - 1) * 10, 'Chroma ne doit pas renforcer FF7.');
        assert.equal(engine.synergy({ board }, other, 'faction'), 0, 'FF7 ne doit pas renforcer Chroma.');
      }
    }
    for (const id of ARENAS) {
      const arena = data.arenas.find(a => a.id === id);
      assert.ok(arena && arena.image === '/jeu/assets/arenes/' + id + '.png', 'Arene FF7 absente du catalogue : ' + id);
      const file = L.inside(ROOT, 'V4/site/assets/arenes/' + id + '.png'), m = await image(file);
      assert.ok(m.width > m.height, 'Arene attendue au format paysage.'); observed.set(file, await hash(file));
    }
    return { before, next, cards, observed, referenceId, deck, coverage: engine.deckCoverage(deck) };
  }
  const report = (plan, mode) => ({ mode, setId: SET, ids: plan.deck, added: plan.cards.filter(c => !c.prior).length,
    reused: plan.cards.filter(c => c.prior).length, jobUpgrades: plan.cards.filter(c => c.prior && !c.prior.creationJob).map(c => c.entry.id), coverage: plan.coverage, arenas: ARENAS });
  async function recheck(plan) {
    for (const [file, expected] of plan.observed) assert.equal(await hash(file), expected, 'Entree modifiee pendant la transaction : ' + file);
    assert.equal(L.baseline().id, plan.referenceId, 'Reference modifiee pendant la transaction.');
    same(bytes(D.CATALOGUE), plan.before, 'Catalogue modifie pendant la transaction ; relancer le preflight.');
  }
  async function preflight() {
    assert.ok(!fs.existsSync(lock), 'render.lock occupe.');
    const plan = await inspect(); await recheck(plan); return report(plan, 'preflight');
  }
  async function publish() {
    const transaction = crypto.randomUUID(); let fd;
    const owner = JSON.stringify({ pid: process.pid, id: transaction, kind: 'collaboration-publication', setId: SET });
    try {
      fd = fs.openSync(lock, 'wx'); fs.writeFileSync(fd, owner);
      const plan = await inspect();
      const changed = plan.cards.some(c => !c.prior || !c.prior.creationJob);
      if (!changed) { await recheck(plan); return report(plan, 'unchanged'); }
      const transactionDir = path.join(home, 'publication', transaction);
      fs.mkdirSync(transactionDir, { recursive: true });
      if (plan.before) fs.writeFileSync(path.join(transactionDir, 'catalogue.before.json'), plan.before, { flag: 'wx' });
      write(path.join(transactionDir, 'catalogue.next.json'), plan.next);
      // Stage and check every new card before installing any directory or committing the index.
      for (const c of plan.cards.filter(c => c.install)) {
        c.stage = path.join(transactionDir, 'staging', c.entry.id); fs.mkdirSync(c.stage, { recursive: true });
        for (const name of FILES) fs.copyFileSync(path.join(c.source, name), path.join(c.stage, name), fs.constants.COPYFILE_EXCL);
        write(path.join(c.stage, 'creation.json'), c.creation); await compareFiles(c.stage, c.hashes);
      }
      await recheck(plan);
      for (const c of plan.cards.filter(c => c.install)) {
        assert.ok(!fs.existsSync(c.target), 'Dossier apparu pendant la transaction.');
        fs.mkdirSync(path.dirname(c.target), { recursive: true }); fs.renameSync(c.stage, c.target);
      }
      for (const c of plan.cards) await compareFiles(c.target, c.hashes, c.prior ? ['card.png', 'card.psd', 'illustration.png'] : FILES);
      await recheck(plan);
      assert.equal(read(lock).id, transaction, 'Verrou de transaction perdu.');
      // L.write uses a sibling temporary file + rename. Never restore an old index on failure.
      write(D.CATALOGUE, plan.next);
      return { ...report(plan, 'published'), backup: plan.before ? path.join(transactionDir, 'catalogue.before.json') : null };
    } finally {
      if (fd !== undefined) {
        fs.closeSync(fd);
        if (bytes(lock)?.toString('utf8') === owner) fs.unlinkSync(lock);
      }
    }
  }
  return { preflight, publish };
}

async function main(args = process.argv.slice(2), publisher) {
  assert.ok(args.length === 0 || args.length === 1 && args[0] === '--publish', 'Usage: node publish.cjs [--publish]');
  publisher ||= createPublisher();
  return args[0] === '--publish' ? publisher.publish() : publisher.preflight();
}
module.exports = { createPublisher, main };
if (require.main === module) main().then(result => console.log(JSON.stringify(result, null, 2))).catch(error => { console.error(error.message); process.exitCode = 1; });
