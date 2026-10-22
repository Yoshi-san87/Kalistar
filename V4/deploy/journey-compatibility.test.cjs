'use strict';
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs/promises'), path = require('node:path'), os = require('node:os');
const crypto = require('node:crypto'), vm = require('node:vm');
const {createRequire} = require('node:module');
const {pathToFileURL} = require('node:url');
const Combat = require('../site/journey-combat.js'), Composition = require('../site/team-composition.js');
const Hash = require('./journey-hash.cjs'), migration = require('./journey-compatibility.json');
const legacyData = require('./journey-legacy-4.6.85.json');
const root = path.resolve(__dirname, '../..'), copy = value => structuredClone(value);
const secret = 'journey-compatibility-test-only-key-never-for-production';
const deviceId = '22222222-2222-4222-8222-222222222222';
const equipmentProof = require('./fixtures/journey-equipment-4.6.109.json');
const sha256 = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

async function beforeGauntlet(name) {
  const bytes = await fs.readFile(path.join(root, 'V4/site', name + '.js'));
  if (name === 'weapons') return Buffer.from(bytes.toString().replace(/  \/\/ Balmhyr relic conversion:[\s\S]*?  \/\/ End of Balmhyr relic conversion\.\r?\n/, ''));
  if (name === 'equipment') {
    const text = bytes.toString();
    return Buffer.from(text.slice(0, text.indexOf('  function reconcileLoadout(')) + equipmentProof.reconcileLoadout + text.slice(text.indexOf('  function reconcileProfile(')));
  }
  return bytes;
}

function fixture() {
  const runtime = Combat.create(legacyData);
  const deck = Composition.create(runtime.engine).fromPreset({name: 'Compatibility fixture', cards: legacyData.decks.player});
  const attempt = {id: '00000000-0000-4000-8000-000000000001', actorId: '11111111-1111-4111-8111-111111111111',
    localProfile: 'user-compatibility', bookId: runtime.books[0].id, revision: runtime.books[0].revision, stage: 0,
    seed: 'legacy-compatibility', deck, cards: deck.cards.map((modelId, i) => ({modelId, id: 'KC-' + String(i + 1).padStart(32, '0')})),
    runtimeHash: migration.legacyHash, sequence: 1, status: 'active'};
  attempt.state = runtime.initial(attempt);
  delete attempt.state.journey.snapshot;
  return attempt;
}

// Execute the real builder's compatibility gate and emitted runtime in memory.
// No output directory, registry, remote service or production asset is written.
async function builtSource(hash, {corruptLegacy = false, catalogue = legacyData} = {}) {
  const output = new Map(), filename = path.join(__dirname, 'build.cjs');
  const realRequire = createRequire(filename);
  const memoryFS = {
    readFile: async (file, encoding) => {
      if (path.basename(file) === migration.catalogue && corruptLegacy) return Buffer.from('{}');
      return fs.readFile(file, encoding);
    },
    lstat: async () => { throw Object.assign(Error('No test output directory'), {code: 'ENOENT'}); },
    mkdir: async () => {},
    writeFile: async (file, bytes) => output.set(file, Buffer.from(bytes)),
    stat: async file => ({size: output.get(file).length})
  };
  const context = {module: {exports: {}}, __dirname, Buffer, console: {log() {}}, process: {env: {CF_PAGES: '1'}},
    require: name => name === 'node:fs/promises' ? memoryFS : name === './journey-hash.cjs' ? {hash: async () => hash} : realRequire(name)};
  vm.runInNewContext(await fs.readFile(filename, 'utf8'), context, {filename});
  context.testCatalogue = catalogue;
  vm.runInNewContext("plan=async()=>({files:[{source:'V4/deploy/journey-runtime.cjs',target:'journey-runtime.cjs'}],catalogue:testCatalogue});releaseVersion=async()=>'test-only';", context);
  await context.module.exports.build();
  const emitted = {module: {exports: {}}, require: name => {
    if (name === './jeu/journey-combat.js') return Combat;
    if (name === './jeu/team-composition.js') return Composition;
    if (name === './journey-legacy-4.6.85.json') return copy(legacyData);
    throw Error('Unexpected runtime dependency: ' + name);
  }};
  vm.runInNewContext(output.get(path.join(__dirname, 'dist/journey-runtime.cjs')).toString(), emitted);
  return emitted.module.exports;
}

async function harness(source, attempt = fixture(), catalogue = legacyData) {
  const {journeyRequest} = await import(pathToFileURL(path.join(__dirname, 'journey-worker.mjs')).href);
  let stored = copy(attempt), reads = 0;
  const calls = [], frames = [];
  const env = {KALISTAR_JOURNEY_KEY: secret, ASSETS: {fetch: async () => { reads++; return Response.json(catalogue); }}};
  const fetcher = async (url, options) => {
    const action = url.split('kalistar_journey_')[1], input = JSON.parse(options.body);
    calls.push(action);
    if (action === 'context' || action === 'start') return Response.json(stored);
    assert.equal(action, 'commit');
    assert.equal(input.p_device_id, deviceId);
    assert.equal(input.p_signature, crypto.createHmac('sha256', secret).update('kalistar-journey-v1:' + input.p_frame).digest('hex'));
    const frame = JSON.parse(input.p_frame);
    assert.equal(frame.runtimeHash, stored.runtimeHash, 'Keep the SQL attempt hash when signing migration frames');
    assert.equal(frame.attemptId, stored.id);
    assert.equal(frame.actorId, stored.actorId);
    assert.equal(frame.sequence, stored.sequence + 1);
    assert.equal(frame.state.journey.sequence, frame.sequence);
    frames.push(frame);
    stored = {...stored, state: frame.state, sequence: frame.sequence};
    return Response.json(stored);
  };
  return {calls, frames, stored: () => copy(stored), reads: () => reads,
    request: async (action, input = {}) => {
      const request = new Request('https://journey.test/api/journeys/' + action, {method: 'POST',
        headers: {Origin: 'https://journey.test', Authorization: 'Bearer test-only', 'Content-Type': 'application/json'},
        body: JSON.stringify({deviceId, attemptId: stored.id, ...input})});
      const response = await journeyRequest(request, env, fetcher, source);
      return {status: response.status, body: await response.json()};
    }};
}

test('executable hash excludes public card/arena publications but covers every ongoing combat module', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'kalistar-journey-hash-'));
  t.after(async () => {
    assert.equal(path.dirname(temp), path.resolve(os.tmpdir()));
    assert(path.basename(temp).startsWith('kalistar-journey-hash-'));
    await fs.rm(temp, {recursive: true});
  });
  const site = path.join(temp, 'V4/site');
  await fs.mkdir(site, {recursive: true});
  for (const name of Hash.modules) await fs.copyFile(path.join(root, 'V4/site', name + '.js'), path.join(site, name + '.js'));
  const baseline = await Hash.hash(temp);
  assert.equal(baseline, await Hash.hash(root));
  const published = copy(legacyData);
  published.cards[0].title = 'Cosmetic print revision';
  published.cards.push({...copy(published.cards[0]), id: '49999998', characterId: 'unrelated-fixture'});
  published.arenas.push({...copy(published.arenas[0]), id: 'unrelated-fixture'});
  await fs.writeFile(path.join(site, 'catalogue.json'), JSON.stringify(published));
  for (const name of ['journey-definitions', 'ultimate-definitions']) await fs.writeFile(path.join(site, name + '.js'), 'definition-only fixture');
  assert.equal(await Hash.hash(temp), baseline);
  assert(Object.isFrozen(Hash.modules));
  for (const name of Hash.modules) {
    const file = path.join(site, name + '.js'), original = await fs.readFile(file);
    await fs.appendFile(file, '\nthrow new Error("executable change");\n');
    assert.notEqual(await Hash.hash(temp), baseline, name);
    await fs.writeFile(file, original);
  }
  // These are executable helpers, not inert catalogue definitions.
  for (const name of ['weapons', 'factions']) assert(Hash.modules.includes(name));
});

test('the unpublished mapping matches the reviewed executable and exact frozen legacy catalogue', async () => {
  assert.equal(await Hash.hash(root), migration.compatibleHash);
  const bytes = await fs.readFile(path.join(__dirname, migration.catalogue));
  assert.equal(crypto.createHash('sha256').update(bytes).digest('hex'), migration.catalogueSha256);
  const source = await builtSource(migration.compatibleHash);
  assert.equal(source.legacy.hash, migration.legacyHash);
  assert.deepEqual(source.legacy.data, legacyData);
  await assert.rejects(builtSource(migration.compatibleHash, {corruptLegacy: true}), /Legacy journey catalogue changed/);
});

test('sequel equipment is strictly additive to the reviewed runtime and old snapshots keep their signature',async()=>{
  const text=(await beforeGauntlet('weapons')).toString();
  const previous=text.replace(/  \/\/ Fragment sequel objects:[\s\S]*?  \/\/ End of additive Fragment sequel objects\.\r?\n/,'');
  assert.notEqual(previous,text);
  assert.equal(crypto.createHash('sha256').update(previous).digest('hex'),migration.additiveEquipmentProof.weaponsSha256);
  const h=crypto.createHash('sha256').update('kalistar-fragment-snapshot-v1\n');
  for(const name of Hash.modules){h.update(name+'\n');h.update(name==='weapons'?previous:await beforeGauntlet(name));}
  assert.deepEqual(migration.snapshotHashes,[h.digest('hex'),equipmentProof.runtimeHash],'No executable change hidden by the compatibility allowance');
  const source=await builtSource(migration.compatibleHash);
  assert.deepEqual(Array.from(source.snapshotHashes),migration.snapshotHashes);
  const original=fixture();original.runtimeHash=migration.snapshotHashes[0];
  original.state.journey.snapshot=Combat.freeze(legacyData,original.state);
  const app=await harness(source,original);
  const result=await app.request('move',{sequence:1,commands:[{method:'rollInitiative'}]});
  assert.equal(result.status,200);assert.equal(result.body.attempt.runtimeHash,original.runtimeHash);
  assert.deepEqual(result.body.attempt.state.journey.snapshot,original.state.journey.snapshot);
  const changed=await builtSource('b'.repeat(64));
  assert.equal(changed.snapshotHashes.length,0);
  assert.equal((await (await harness(changed,original)).request('context')).status,409);
});

test('gauntlet conversion has a fixed pre-change proof; only the catalogue conversion and profile reconciliation changed', async () => {
  assert.equal(sha256(await fs.readFile(path.join(__dirname, migration.profileEquipmentProof.file))), migration.profileEquipmentProof.sha256);
  assert.equal(equipmentProof.runtimeHash, '84a92b1a93b6f8ff6d11ec8a8af187f9061509c196c563a64c31a4fb9a233c9e');
  const h = crypto.createHash('sha256').update('kalistar-fragment-snapshot-v1\n');
  for (const name of Hash.modules) {
    const old = await beforeGauntlet(name);
    assert.equal(sha256(old), equipmentProof.modules[name], 'Unreviewed executable change in ' + name);
    h.update(name + '\n'); h.update(old);
  }
  assert.equal(h.digest('hex'), equipmentProof.runtimeHash);
});

test('a real 4.6.109 gauntlet match replays all 283 recorded actions identically, including the old ATK6 bonus', () => {
  const attempt = copy(equipmentProof.attempt), data = attempt.state.journey.snapshot;
  const runtime = Combat.create(data, {resume: true});
  let state = attempt.state, gauntletUses = 0;
  const oldEquipment = copy(state.equipment);
  assert.equal(oldEquipment.definitions.find(w => w.id === 'mythic-iron-gauntlet').slot, 'weapon');
  assert.equal(oldEquipment.loadouts[0].weapon.balmhyr, 'mythic-iron-gauntlet');
  assert.equal(oldEquipment.loadouts[0].relic.balmhyr, 'exiled-king-seal');
  assert.equal(equipmentProof.trace.length, 283);
  for (const [index, frame] of equipmentProof.trace.entries()) {
    state = runtime.apply(state, [frame.command]);
    assert.equal(sha256(JSON.stringify(state)), frame.stateSha256, 'Historical action ' + index + ': ' + frame.command.method);
    if (state.phase === 'result' && frame.command.method !== 'next' && state.duel.equipment.weapon?.weaponId === 'mythic-iron-gauntlet') gauntletUses++;
  }
  assert.equal(state.phase, 'over'); assert.equal(state.winner, equipmentProof.result.winner);
  assert.equal(gauntletUses, equipmentProof.gauntletUses); assert(gauntletUses > 0);
  assert.deepEqual(state.equipment.definitions, oldEquipment.definitions);
  assert.deepEqual(state.equipment.loadouts, oldEquipment.loadouts);
});

test('worker accepts the recorded historical gauntlet snapshot without migrating its definitions or SQL hash', async () => {
  const original = copy(equipmentProof.attempt), data = original.state.journey.snapshot;
  const app = await harness(await builtSource(migration.compatibleHash), original, data);
  assert.equal((await app.request('context')).status, 200);
  assert.deepEqual(app.stored(), original);
  const moved = await app.request('move', {sequence: original.sequence, commands: [equipmentProof.trace[0].command]});
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.attempt.runtimeHash, original.runtimeHash);
  assert.deepEqual(moved.body.attempt.state.equipment.definitions, original.state.equipment.definitions);
  assert.deepEqual(moved.body.attempt.state.equipment.loadouts, original.state.equipment.loadouts);
  assert.deepEqual(moved.body.attempt.state.journey.snapshot, original.state.journey.snapshot);
  assert.equal(app.frames.length, 1);
});

test('an old-hash attempt with no initial frame normalizes its profile once, preserving its existing relic and owned specimens', async () => {
  const data = await require('../atelier/game-catalog.cjs').buildCatalog({published: require('../donnees/catalogue.json').cards.filter(c => c.kind === 'created')});
  const original = {...copy(equipmentProof.attempt), state: null, sequence: 0};
  const app = await harness(await builtSource(migration.compatibleHash), original, data);
  const result = await app.request('context');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const state = result.body.attempt.state;
  assert.deepEqual(state.equipment.loadouts[0], {weapon: {}, shield: {balmhyr: 'durane-rampart'}, relic: {balmhyr: 'exiled-king-seal'}});
  assert.deepEqual(result.body.attempt.cards, original.cards);
  assert.deepEqual(result.body.attempt.deck, original.deck, 'No saved input deck rewrite by context');
  assert.equal(result.body.attempt.runtimeHash, original.runtimeHash); assert.equal(app.frames.length, 1);
  const repeated = await app.request('context');
  assert.deepEqual(repeated.body.attempt.state, state); assert.equal(app.frames.length, 1);
});

test('real builder gate disables legacy migration after an executable hash change; unknown attempts fail closed', async () => {
  const changedHash = crypto.createHash('sha256').update(migration.compatibleHash + ':changed-engine').digest('hex');
  const source = await builtSource(changedHash);
  assert.equal(source.legacy, null);
  for (const runtimeHash of [migration.legacyHash, migration.compatibleHash, ...migration.snapshotHashes, 'a'.repeat(64)]) {
    const app = await harness(source, {...fixture(), runtimeHash});
    for (const action of ['context', 'move']) {
      const result = await app.request(action, {sequence: 1, commands: [{method: 'rollInitiative'}]});
      assert.equal(result.status, 409);
      assert.equal(result.body.code, 'runtime_changed');
    }
    assert.equal(app.frames.length, 0);
    assert.equal(app.reads(), 0, 'Reject incompatible code before loading current catalogue');
  }
  const unavailable = await harness({Combat, Composition, hash: null});
  assert.equal((await unavailable.request('context')).status, 503);
  assert.equal(unavailable.calls.length, 0);
});

test('legacy active attempt resumes with old data and hash, keeps sequence, and ignores forged client state', async () => {
  const published = copy(legacyData);
  for (const card of published.cards) card.atk = card.atk.map(v => typeof v === 'number' ? v + 9 : v);
  published.demo.barrier = 0;
  // A missing reward makes new book validation fail, but must not stop this fight.
  published.cards = published.cards.filter(c => c.id !== '49055457');
  assert.throws(() => Combat.create(published));
  const source = await builtSource(migration.compatibleHash, {catalogue: published});
  const original = fixture(), app = await harness(source, original, published);
  const context = await app.request('context');
  assert.equal(context.status, 200);
  assert.equal(context.body.attempt.sequence, original.sequence);
  assert.deepEqual(context.body.attempt.state.journey.snapshot, Combat.freeze(legacyData, original.state));
  assert.deepEqual(app.stored(), original, 'Reading context does not advance or persist a migration');
  assert.equal(app.frames.length, 0);
  const moved = await app.request('move', {sequence: original.sequence, commands: [{method: 'rollInitiative'}],
    runtimeHash: 'f'.repeat(64), state: {phase: 'over', winner: 0, journey: {snapshot: {cards: []}}}});
  assert.equal(moved.status, 200, JSON.stringify(moved.body));
  assert.equal(moved.body.attempt.runtimeHash, migration.legacyHash);
  assert.equal(moved.body.attempt.sequence, original.sequence + 1);
  assert.deepEqual(moved.body.attempt.state.journey.snapshot, context.body.attempt.state.journey.snapshot);
  assert.notEqual(moved.body.attempt.state.phase, 'over');
  const ack = await app.request('context');
  assert.deepEqual(ack.body.attempt, moved.body.attempt, 'A lost acknowledgement is recovered without replay');
  const conflict = await app.request('move', {sequence: original.sequence, commands: [{method: 'rollInitiative'}]});
  assert.equal(conflict.status, 409);
  assert.equal(conflict.body.code, 'conflict');
  assert.equal(app.frames.length, 1);
});

test('legacy active attempt without an initial frame is reconstructed from its verified old catalogue', async () => {
  const original = fixture(), pending = {...original, state: null, sequence: 0};
  const app = await harness(await builtSource(migration.compatibleHash), pending);
  const result = await app.request('context');
  assert.equal(result.status, 200, JSON.stringify(result.body));
  const state = copy(result.body.attempt.state);
  assert.deepEqual(state.journey.snapshot, Combat.freeze(legacyData, original.state));
  delete state.journey.snapshot;
  assert.deepEqual(state, original.state);
  assert.equal(app.frames.length, 1);
  assert.equal(app.frames[0].runtimeHash, migration.legacyHash);
});

test('current-hash snapshots remain intact through catalogue changes and invalid commands never commit', async () => {
  const original = fixture();
  original.runtimeHash = migration.compatibleHash;
  original.state.journey.snapshot = Combat.freeze(legacyData, original.state);
  original.state.journey.snapshot.cards[0].title = 'The actual saved edition';
  const published = copy(legacyData);
  published.cards[0].title = 'A later edition';
  published.cards.push({...copy(published.cards[0]), id: '49999998', characterId: 'unrelated-fixture'});
  published.arenas.push({...copy(published.arenas[0]), id: 'unrelated-fixture'});
  const app = await harness(await builtSource(migration.compatibleHash), original, published);
  const invalid = await app.request('move', {sequence: 1, commands: [{method: 'rollInitiative', args: [6]}]});
  assert.equal(invalid.status, 400);
  assert.deepEqual(app.stored(), original);
  assert.equal(app.frames.length, 0);
  const valid = await app.request('move', {sequence: 1, commands: [{method: 'rollInitiative'}]});
  assert.equal(valid.status, 200, JSON.stringify(valid.body));
  assert.deepEqual(valid.body.attempt.state.journey.snapshot, original.state.journey.snapshot);
  assert.equal(app.reads(), 1);
});
