'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const Definitions = require('../site/journey-definitions.js');

const worker = import(pathToFileURL(path.join(__dirname, 'journey-worker.mjs')).href);
const origin = 'https://journey-worker.test';
const token = 'Bearer equipment-route-test-only-token';
const books = Definitions.catalogue({cards: []});
const actions = ['equipment-claim', 'equipment-ack'];
const unavailable = new Proxy({}, {get(_target, name) {
  throw Error('Equipment routes must not access combat runtime or environment: ' + String(name));
}});

function request(action, input, options = {}) {
  const headers = new Headers({Origin: origin, Authorization: token, 'Content-Type': 'application/json'});
  for (const [name, value] of Object.entries(options.headers || {})) {
    if (value === null) headers.delete(name); else headers.set(name, value);
  }
  const method = options.method || 'POST';
  const body = Object.hasOwn(options, 'raw') ? options.raw : JSON.stringify(input);
  return new Request(origin + '/api/journeys/' + action, {method, headers,
    ...(method === 'GET' || method === 'HEAD' ? {} : {body})});
}

async function route(action, input, options = {}) {
  const calls = [], {journeyRequest} = await worker;
  const response = await journeyRequest(request(action, input, options), unavailable, async (url, init) => {
    const call = {url, method: init.method, headers: init.headers, input: JSON.parse(init.body), signal: init.signal};
    calls.push(call);
    if (options.respond) return options.respond(call);
    return Response.json(options.reply || {}, {status: options.rpcStatus || 200});
  }, unavailable);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('X-Content-Type-Options'), 'nosniff');
  assert.match(response.headers.get('Content-Type'), /^application\/json/);
  return {calls, status: response.status, body: await response.json()};
}

function receipt(book, stage, patch = {}) {
  const reward = book.bonusStages[stage - 4];
  return {stage, equipmentId: reward.rewardEquipmentId, kind: reward.rewardKind, alreadyOwned: false, replayed: false, ...patch};
}

function acknowledged(book, stage) {
  return {isAdmin: false, books: [{id: book.id, revision: book.revision, rewardModelId: book.rewardModelId,
    cleared: stage + 1, completed: true, claimed: true, acknowledged: true, finished: stage === 6, activeAttempt: null,
    equipmentClaims: Array.from({length: stage - 3}, (_, index) => {
      const {replayed, ...claim} = receipt(book, index + 4);
      return {...claim, acknowledged: true};
    })}]};
}

for (const action of actions) for (const book of books) for (const stage of [4, 5, 6]) test(
  action + ' routes the exact authenticated book/stage without a combat runtime: ' + book.id + '/' + stage, async () => {
    const reply = action === 'equipment-claim' ? receipt(book, stage) : acknowledged(book, stage);
    const before = JSON.stringify(reply);
    const result = await route(action, {bookId: book.id, stage}, {reply});
    assert.equal(result.status, 200);
    assert.deepEqual(result.body, reply);
    assert.equal(JSON.stringify(reply), before);
    assert.equal(result.calls.length, 1);
    const call = result.calls[0];
    assert.equal(new URL(call.url).pathname, '/rest/v1/rpc/kalistar_journey_' + action.replace('-', '_'));
    assert.deepEqual(call.input, {p_book_id: book.id, p_stage: stage});
    assert.equal(call.method, 'POST');
    assert.equal(call.headers.Authorization, token);
    assert.equal(call.headers['Content-Type'], 'application/json');
    assert.equal(typeof call.headers.apikey, 'string');
    assert(call.headers.apikey.length > 0);
    assert.equal(call.signal.aborted, false);
  });

for (const action of actions) test(action + ' ignores forged reward, progress, account and runtime fields', async () => {
  const book = books[0], stage = 4;
  const reply = action === 'equipment-claim' ? receipt(book, stage) : acknowledged(book, stage);
  const result = await route(action, {bookId: book.id, stage, equipmentId: 'forged-equipment', kind: 'relic',
    alreadyOwned: true, acknowledged: true, cleared: 7, equipmentClaims: [{stage: 6, equipmentId: 'forged-equipment'}],
    actorId: 'another-account', userId: 'another-account', deviceId: 'not-a-device', runtimeHash: 'forged',
    state: {phase: 'over', winner: 0}}, {reply});
  assert.equal(result.status, 200);
  assert.deepEqual(result.calls[0].input, {p_book_id: book.id, p_stage: stage});
  assert.deepEqual(result.body, reply, 'Only the authenticated RPC result is returned');
});

const invalidStages = [
  ['missing', undefined], ['null', null], ['negative', -1], ['historical zero', 0], ['historical last', 3],
  ['past last', 7], ['large', 999], ['fraction', 4.5], ['string', '4'], ['numeric array', [4]],
  ['object', {stage: 4}], ['true', true], ['false', false], ['NaN serialized as null', NaN], ['Infinity serialized as null', Infinity]
];
for (const action of actions) for (const [label, stage] of invalidStages) test(
  action + ' rejects invalid stage before any RPC: ' + label, async () => {
    const result = await route(action, {bookId: books[0].id, stage});
    assert.equal(result.status, 400);
    assert.match(result.body.error, /Chapitre invalide/);
    assert.deepEqual(result.calls, []);
  });

for (const action of actions) for (const [label, options, expected] of [
  ['GET', {method: 'GET'}, 405],
  ['foreign origin', {headers: {Origin: 'https://another-origin.test'}}, 403],
  ['missing origin', {headers: {Origin: null}}, 403],
  ['missing auth', {headers: {Authorization: null}}, 401],
  ['non-bearer auth', {headers: {Authorization: 'Basic fixture'}}, 401],
  ['oversized auth', {headers: {Authorization: 'Bearer ' + 'x'.repeat(7200)}}, 401],
  ['non-JSON type', {headers: {'Content-Type': 'text/plain'}}, 400],
  ['invalid JSON', {raw: '{'}, 400],
  ['empty JSON', {raw: ''}, 400],
  ['oversized JSON', {raw: JSON.stringify({bookId: books[0].id, stage: 4, ignored: 'x'.repeat(16384)})}, 400],
  ['null body', {raw: 'null'}, 400],
  ['array body', {raw: '[]'}, 400]
]) test(action + ' preserves request guards: ' + label, async () => {
  const result = await route(action, {bookId: books[0].id, stage: 4}, options);
  assert.equal(result.status, expected);
  assert.equal(typeof result.body.error, 'string');
  assert.equal(result.calls.length, 0);
});

for (const action of actions) for (const rpcStatus of [400, 401, 403, 409, 500]) test(
  action + ' propagates RPC rejection without success, retry or follow-up: ' + rpcStatus, async () => {
    const result = await route(action, {bookId: books[0].id, stage: 4},
      {rpcStatus, reply: {message: 'Previous reward must be acknowledged'}});
    assert.equal(result.status, rpcStatus === 401 || rpcStatus === 403 ? 403 : 409);
    assert.deepEqual(result.body, {error: 'Previous reward must be acknowledged'});
    assert.equal(result.calls.length, 1);
  });

for (const action of actions) for (const failure of ['network', 'JSON']) test(
  action + ' reports a failed RPC ' + failure + ' response without replaying the mutation', async () => {
    const result = await route(action, {bookId: books[0].id, stage: 4}, {respond: async () => {
      if (failure === 'network') throw TypeError('Test-only RPC connection lost');
      return new Response('{', {status: 200, headers: {'Content-Type': 'application/json'}});
    }});
    assert.equal(result.status, 400);
    assert.equal(typeof result.body.error, 'string');
    assert.equal(result.calls.length, 1);
  });

test('equipment claim preserves already-owned and idempotent replay receipts from the RPC', async () => {
  const book = books[0], reply = receipt(book, 4, {alreadyOwned: true, replayed: true});
  const result = await route('equipment-claim', {bookId: book.id, stage: 4}, {reply});
  assert.equal(result.status, 200);
  assert.deepEqual(result.body, reply);
  assert.equal(result.calls.length, 1, 'The Worker does not reissue, auto-ACK or refresh ownership');
});
