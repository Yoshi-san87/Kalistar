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

test('real builder gate disables legacy migration after an executable hash change; unknown attempts fail closed', async () => {
  const changedHash = crypto.createHash('sha256').update(migration.compatibleHash + ':changed-engine').digest('hex');
  const source = await builtSource(changedHash);
  assert.equal(source.legacy, null);
  for (const runtimeHash of [migration.legacyHash, migration.compatibleHash, 'a'.repeat(64)]) {
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
