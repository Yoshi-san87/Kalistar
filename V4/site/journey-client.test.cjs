'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const Definitions = require('./journey-definitions.js');

const source = new vm.Script(fs.readFileSync(path.join(__dirname, 'journey-client.js'), 'utf8'), {filename:'journey-client.js'});
const ACTOR = '11111111-1111-4111-8111-111111111111';
const DEVICE = '22222222-2222-4222-8222-222222222222';
const PROFILE = 'user-client-fixture';
const ATTEMPT = '33333333-3333-4333-8333-333333333333';
const data = {cards:[]};
const books = Definitions.catalogue(data);
const bookId = books[0].id;
const copy = value => structuredClone(value);
const drain = () => new Promise(resolve => setImmediate(resolve));
function deferred() {
  let resolve, reject;
  const promise = new Promise((done, fail) => { resolve = done; reject = fail; });
  return {promise,resolve,reject};
}
function timers() {
  let id = 0;
  const jobs = new Map();
  return {jobs,setTimeout(callback,delay) { const key = ++id; jobs.set(key,{callback,delay}); return key; },
    clearTimeout(key) { jobs.delete(key); },
    expire() { for (const [key,job] of [...jobs]) { jobs.delete(key); job.callback(); } }};
}
function response(body,status = 200) { return {ok:status >= 200 && status < 300,status,json:async()=>copy(body)}; }
function library(cleared = 0, patch = {}, isAdmin = false) {
  return {isAdmin,books:books.map(book => ({id:book.id,revision:book.revision,rewardModelId:book.rewardModelId,
    cleared,completed:cleared >= 4,claimed:false,acknowledged:false,activeAttempt:null,...(book.id === bookId ? patch : {})}))};
}
function equipmentClaim(stage = 4, patch = {}, book = books[0]) {
  const definition = book.bonusStages[stage-4];
  return {stage,equipmentId:definition.rewardEquipmentId,kind:definition.rewardKind,alreadyOwned:false,acknowledged:false,...patch};
}
function equipmentReward(stage = 4, patch = {}, book = books[0]) {
  const {acknowledged,...claim} = equipmentClaim(stage,{},book);
  return {...claim,replayed:false,...patch};
}
function equipmentLibrary(cleared = 5, patch = {}) {
  return library(cleared,{claimed:true,acknowledged:true,finished:cleared === 7,
    equipmentClaims:Array.from({length:cleared-4},(_,index)=>equipmentClaim(index+4,{acknowledged:index+5<cleared})),...patch});
}
function attempt(sequence = 1, patch = {}) {
  const state = {matchId:'match-'+ATTEMPT,phase:'attack',rng:127,duel:{attackDie:null},
    journey:{version:1,attemptId:ATTEMPT,bookId,revision:books[0].revision,stage:0,sequence},...copy(patch)};
  return {id:ATTEMPT,localProfile:PROFILE,sequence,state};
}
function frozen(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(frozen); }
  return value;
}
function harness(t, options = {}) {
  const clock = timers(), calls = [], updates = [], counts = {auth:0,flush:0,playerRefresh:0};
  const writable = {canWrite:true,pending:false,deviceId:DEVICE};
  const h = {clock,calls,updates,counts,lease:{...writable},flushed:{...writable},
    identity:{data:{session:{user:{id:ACTOR},access_token:'fixture-token-never-written'}}}};
  const player = {userId:ACTOR,player:{localProfile:PROFILE},
    client:{auth:{getSession:async()=>{counts.auth++; if (options.authGate) await options.authGate.promise; return h.identity; }}},
    refresh:async()=>{counts.playerRefresh++; if (options.playerGate) await options.playerGate.promise; }};
  const sync = {snapshot:()=>copy(h.lease),flush:async()=>{counts.flush++; if (options.deviceGate) await options.deviceGate.promise; return copy(h.flushed); }};
  const fetcher = async (url, init) => {
    const gate = deferred(), call = {action:url.split('/').at(-1),url,init,input:JSON.parse(init.body),gate,finished:false};
    calls.push(call);
    const abort = () => { if (options.honorAbort !== false) gate.reject(init.signal.reason); };
    init.signal.addEventListener('abort',abort,{once:true});
    if (init.signal.aborted) abort();
    try { return options.respond ? await options.respond(call) : await gate.promise; }
    finally { call.finished = true; init.signal.removeEventListener('abort',abort); }
  };
  // Each client gets its own browser-global definitions and deterministic timers.
  // This exercises the shipped UMD module without modifying Node globals.
  const context = vm.createContext({module:{exports:{}},structuredClone,AbortController,
    setTimeout:clock.setTimeout,clearTimeout:clock.clearTimeout,KalistarJourneyDefinitions:Definitions});
  source.runInContext(context);
  h.api = context.module.exports.create({data:options.data||data,player:options.local ? null : player,sync,fetcher,
    localAdmin:!!options.localAdmin,onUpdate:value=>updates.push(copy(value))});
  h.reply = (index, body, status) => calls[index].gate.resolve(response(body,status));
  h.fail = (index, error = TypeError('Fixture network unavailable')) => calls[index].gate.reject(error);
  h.seen = async count => {
    for (let pass=0;pass<10 && calls.length<count;pass++) await drain();
    assert.equal(calls.length,count,'Unexpected request order: '+calls.map(call=>call.action).join(', '));
  };
  t.after(async()=>{
    h.api.destroy(); await drain();
    assert.equal(clock.jobs.size,0,'Every request deadline must be cleared');
    assert.ok(calls.every(call=>call.finished),'Every started transport must settle');
  });
  return h;
}

test('local library uses the three official four-combat definitions without network or possessions', async t => {
  const h = harness(t,{local:true,localAdmin:true});
  const state = await h.api.refresh();
  assert.equal(state.status,'ready'); assert.equal(state.isAdmin,true);
  assert.equal(state.books.length,3); assert.deepEqual(state.books.map(book=>book.stages.length),[4,4,4]);
  assert.ok(Object.values(state.progress).every(progress=>progress.cleared === 0 && !progress.completed && !progress.claimed && !progress.activeAttempt));
  assert.equal(h.calls.length,0);
  await assert.rejects(h.api.claim(bookId),/compte Kalistar en ligne/);
});

test('library projects the actual historical card receipt without rewriting the local definitions', async t => {
  const before=copy(books),h=harness(t),reading=h.api.refresh();await h.seen(1);
  const historical=library(4,{claimed:true,acknowledged:false,rewardModelId:'30000001',
    configuredRewardModelId:'30000014',claimedRewardModelId:'30000001'});
  h.reply(0,historical);const state=await reading;
  assert.equal(state.books.find(book=>book.id===bookId).rewardModelId,'30000001');
  assert.equal(state.progress[bookId].claimedRewardModelId,'30000001');
  assert.equal(state.progress[bookId].configuredRewardModelId,'30000014');
  assert.deepEqual(Definitions.catalogue(data),before,'Projection must not alter future configured rewards');
  const acknowledging=h.api.acknowledge(bookId);await h.seen(2);
  historical.books[0].acknowledged=true;h.reply(1,historical);await acknowledging;
  assert.equal(h.api.snapshot().books[0].rewardModelId,'30000001');
  assert.equal(h.api.snapshot().progress[bookId].acknowledged,true);
});

test('completed but unclaimed Fragment projects the server future reward',async t=>{
  const h=harness(t),reading=h.api.refresh();await h.seen(1);
  h.reply(0,library(4,{rewardModelId:'30000014',configuredRewardModelId:'30000014',claimedRewardModelId:null}));
  const state=await reading;
  assert.equal(state.books[0].rewardModelId,'30000014');assert.equal(state.progress[bookId].claimed,false);
  assert.equal(h.counts.playerRefresh,0,'Reading a new reward never issues it');
});

for(const patch of [
  {rewardModelId:null}, {rewardModelId:'unknown'},
  {claimed:true,rewardModelId:'30000001',claimedRewardModelId:'30000014'},
  {claimed:false,rewardModelId:'30000014',claimedRewardModelId:'30000014'}
])test('malformed historical reward cannot replace known progression: '+JSON.stringify(patch),async t=>{
  const h=harness(t),reading=h.api.refresh();await h.seen(1);h.reply(0,library());await reading;
  const before=h.api.snapshot(),pending=h.api.refresh(),rejected=assert.rejects(pending,/Recompense de livre incompatible/);
  await h.seen(2);h.reply(1,library(4,patch));await rejected;
  assert.deepEqual(h.api.snapshot().books,before.books);assert.deepEqual(h.api.snapshot().progress,before.progress);
});

for(const model of ['30000007','49999999'])test('an authoritative reward must still be a known version of its character: '+model,async t=>{
  const modelData={cards:books.map(book=>({id:book.rewardModelId,characterId:book.characterId}))};
  modelData.cards.push({id:'30000007',characterId:'balmhyr'});
  const h=harness(t,{data:modelData}),reading=h.api.refresh(),rejected=assert.rejects(reading,/Recompense de livre incompatible/);
  await h.seen(1);h.reply(0,library(4,{claimed:true,rewardModelId:model,claimedRewardModelId:model}));await rejected;
  assert.equal(h.updates.length,1);assert.equal(h.api.snapshot().status,'error');
  assert.deepEqual(h.api.snapshot().progress,{});
});

test('a late older library response cannot regress four wins or a claimed reward', async t => {
  const h = harness(t);
  const older = h.api.refresh(); await h.seen(1);
  const newer = h.api.refresh(); await h.seen(2);
  const latest = library(4,{claimed:true,acknowledged:true});
  h.reply(1,latest); const ready = await newer;
  assert.equal(ready.progress[bookId].cleared,4);
  h.reply(0,library(3)); assert.deepEqual(await older,ready);
  assert.deepEqual(h.api.snapshot(),ready); assert.equal(h.updates.length,1);
});

test('an obsolete library failure cannot replace a newer ready state with an error', async t => {
  const h = harness(t);
  const older = h.api.refresh(); await h.seen(1);
  const newer = h.api.refresh(); await h.seen(2);
  h.reply(1,library(4,{claimed:true},true)); const ready = await newer;
  h.fail(0); assert.deepEqual(await older,ready);
  assert.deepEqual(h.api.snapshot(),ready); assert.equal(h.updates.length,1);
});

test('an obsolete success cannot hide the newest library error', async t => {
  const h = harness(t);
  const older = h.api.refresh(); await h.seen(1);
  const newer = h.api.refresh(); const rejected = assert.rejects(newer,/Newest library failed/); await h.seen(2);
  h.fail(1,Error('Newest library failed')); await rejected;
  const failed = h.api.snapshot();
  h.reply(0,library(4,{claimed:true},true)); await older;
  assert.equal(failed.status,'error'); assert.equal(failed.isAdmin,false);
  assert.deepEqual(h.api.snapshot(),failed);
});

test('snapshot and onUpdate payloads cannot mutate internal library progress or definitions', async t => {
  const h = harness(t), loading = h.api.snapshot();
  loading.books[0].stages.pop();
  const reading = h.api.refresh(); await h.seen(1); h.reply(0,library(2)); const state = await reading;
  state.progress[bookId].cleared = 99; state.books[0].title = 'Not stored'; h.updates[0].books.length = 0;
  assert.equal(h.api.snapshot().progress[bookId].cleared,2);
  assert.equal(h.api.snapshot().books[0].stages.length,4);
  assert.equal(h.api.snapshot().books[0].title,books[0].title);
});

for (const staleFailure of [false,true]) test('ack invalidates a read started before it, including '+(staleFailure ? 'a late failure' : 'a late success'), async t => {
  const h = harness(t);
  const reading = h.api.refresh(); await h.seen(1);
  const acknowledging = h.api.acknowledge(bookId); await h.seen(2);
  h.reply(1,library(4,{claimed:true,acknowledged:true})); await acknowledging;
  const acknowledged = h.api.snapshot();
  if (staleFailure) h.fail(0); else h.reply(0,library(4,{claimed:true,acknowledged:false}));
  assert.deepEqual(await reading,acknowledged);
  assert.deepEqual(h.api.snapshot(),acknowledged); assert.equal(h.updates.length,1);
});

for (const staleFailure of [false,true]) test('ack completion invalidates a read started while ack was pending: '+(staleFailure ? 'failure' : 'success'), async t => {
  const h = harness(t);
  const acknowledging = h.api.acknowledge(bookId); await h.seen(1);
  const reading = h.api.refresh(); await h.seen(2);
  h.reply(0,library(4,{claimed:true,acknowledged:true})); await acknowledging;
  const acknowledged = h.api.snapshot();
  if (staleFailure) h.fail(1); else h.reply(1,library(4,{claimed:true,acknowledged:false}));
  await reading;
  assert.deepEqual(h.api.snapshot(),acknowledged);
  assert.deepEqual(h.calls.map(call=>call.action),['ack','library']);
});

test('a read issued after ack completion can publish newer state normally', async t => {
  const h = harness(t), acknowledging = h.api.acknowledge(bookId);
  await h.seen(1); h.reply(0,library(4,{claimed:true,acknowledged:true})); await acknowledging;
  const reading = h.api.refresh(); await h.seen(2); h.reply(1,library(4,{claimed:true,acknowledged:true},true)); await reading;
  assert.equal(h.api.snapshot().isAdmin,true); assert.equal(h.updates.length,2);
});

test('claim invalidates old and concurrent reads before refreshing collection and library', async t => {
  const playerGate = deferred(), h = harness(t,{playerGate});
  const old = h.api.refresh(); await h.seen(1);
  const claiming = h.api.claim(bookId); await h.seen(2);
  h.reply(0,library(3)); await old; assert.equal(h.updates.length,0,'Claim start invalidates an earlier read');
  const during = h.api.refresh(); await h.seen(3);
  const reward = {card:{modelId:books[0].rewardModelId},alreadyOwned:false,replayed:false};
  h.reply(1,reward); await drain(); assert.equal(h.counts.playerRefresh,1);
  h.reply(2,library(4,{claimed:false})); await during;
  assert.equal(h.updates.length,0,'Claim completion invalidates a read before player.refresh resolves');
  playerGate.resolve(); await h.seen(4); h.reply(3,library(4,{claimed:true}));
  assert.deepEqual(await claiming,reward); assert.equal(h.api.snapshot().progress[bookId].claimed,true);
  assert.deepEqual(h.calls.map(call=>call.action),['library','claim','library','library']);
});

for (const book of books) for (const stage of [4,5,6]) test(
  'equipment claim validates and refreshes the real reward: '+book.id+'/'+stage, async t => {
    const playerGate = deferred(), h = harness(t,{playerGate});
    const reward = equipmentReward(stage,{alreadyOwned:stage === 5,replayed:stage === 6},book);
    const claiming = h.api.claimEquipment(book.id,stage);
    await h.seen(1);
    assert.equal(h.calls[0].action,'equipment-claim');
    assert.deepEqual(h.calls[0].input,{bookId:book.id,stage});
    assert.equal(h.calls[0].init.method,'POST');
    assert.equal(h.calls[0].init.credentials,'same-origin');
    assert.equal(h.calls[0].init.headers.Authorization,'Bearer fixture-token-never-written');
    h.reply(0,reward); await drain();
    assert.equal(h.counts.playerRefresh,1);
    assert.equal(h.calls.length,1,'Ownership refresh finishes before the authoritative library read');
    assert.equal(h.updates.length,0,'A receipt is not a local progression update');
    playerGate.resolve(); await h.seen(2);
    const latest = library();
    Object.assign(latest.books.find(value=>value.id === book.id),{cleared:stage+1,completed:true,claimed:true,acknowledged:true,
      finished:stage === 6,equipmentClaims:Array.from({length:stage-3},(_,index)=>equipmentClaim(index+4,
        {acknowledged:index+4<stage,alreadyOwned:index+4 === stage && reward.alreadyOwned},book))});
    h.reply(1,latest);
    assert.deepEqual(await claiming,reward);
    assert.deepEqual(h.api.snapshot().progress[book.id],latest.books.find(value=>value.id === book.id));
    assert.deepEqual(h.calls.map(call=>call.action),['equipment-claim','library']);
    assert.equal(h.counts.flush,0,'Claiming is not a combat-device operation');
  });

for (const stage of [4,5,6]) test('equipment ACK '+stage+' projects server claims without refreshing ownership or claiming again', async t => {
  const h = harness(t), acknowledging = h.api.acknowledgeEquipment(bookId,stage);
  await h.seen(1);
  assert.deepEqual(h.calls[0].input,{bookId,stage});
  const latest = equipmentLibrary(stage+1);
  latest.books[0].equipmentClaims.at(-1).acknowledged = true;
  h.reply(0,latest); await acknowledging;
  assert.deepEqual(h.api.snapshot().progress[bookId],latest.books[0]);
  assert.deepEqual(h.calls.map(call=>call.action),['equipment-ack']);
  assert.equal(h.counts.playerRefresh,0); assert.equal(h.counts.flush,0);
  const returned = h.api.snapshot(); returned.progress[bookId].equipmentClaims[0].acknowledged = false;
  h.updates[0].progress[bookId].equipmentClaims.length = 0;
  assert.equal(h.api.snapshot().progress[bookId].equipmentClaims.length,stage-3);
  assert.equal(h.api.snapshot().progress[bookId].equipmentClaims[0].acknowledged,true);
});

const badRewardReplies = [
  ['another equipment',()=>equipmentReward(4,{equipmentId:books[1].bonusStages[0].rewardEquipmentId})],
  ['wrong kind',()=>equipmentReward(4,{kind:'relic'})],
  ['another stage',()=>equipmentReward(4,{stage:5})],
  ['string stage',()=>equipmentReward(4,{stage:'4'})],
  ['missing equipment',()=>{const value=equipmentReward();delete value.equipmentId;return value;}],
  ['empty response',()=>({})], ['null response',()=>null], ['array response',()=>[]],
  ['non-boolean alreadyOwned',()=>equipmentReward(4,{alreadyOwned:'false'})],
  ['missing alreadyOwned',()=>{const value=equipmentReward();delete value.alreadyOwned;return value;}],
  ['non-boolean replayed',()=>equipmentReward(4,{replayed:1})],
  ['missing replayed',()=>{const value=equipmentReward();delete value.replayed;return value;}]
];
for (const [label,make] of badRewardReplies) test('equipment claim rejects '+label+' before refreshing possessions', async t => {
  const h = harness(t,{respond:async call=>response(call.action === 'equipment-claim' ? make() : library(4))});
  const before = h.api.snapshot();
  await assert.rejects(h.api.claimEquipment(bookId,4));
  assert.equal(h.counts.playerRefresh,0);
  assert.deepEqual(h.calls.map(call=>call.action),['equipment-claim']);
  assert.deepEqual(h.api.snapshot(),before);
});

for (const stage of ['4','5','6']) test('equipment claim cannot accept a string stage even when the receipt echoes it', async t => {
  const h = harness(t,{respond:async call=>response(call.action === 'equipment-claim'
    ? equipmentReward(Number(stage),{stage}) : equipmentLibrary(Number(stage)+1))});
  const before = h.api.snapshot();
  await assert.rejects(h.api.claimEquipment(bookId,stage));
  assert.equal(h.counts.playerRefresh,0); assert.deepEqual(h.api.snapshot(),before);
  assert(h.calls.length <= 1,'Invalid input must never trigger an ownership or library refresh');
});

for (const method of ['claimEquipment','acknowledgeEquipment']) for (const stage of [-1,3,7,4.5,'4',null]) test(
  method+' preserves progress on server rejection of invalid stage '+JSON.stringify(stage), async t => {
    const h = harness(t), reading = h.api.refresh(); await h.seen(1);
    h.reply(0,equipmentLibrary()); await reading; const before = h.api.snapshot();
    const mutation = h.api[method](bookId,stage);
    const rejected = assert.rejects(mutation,/Chapitre invalide/);
    await h.seen(2); h.reply(1,{error:'Chapitre invalide.'},400); await rejected;
    assert.deepEqual(h.calls[1].input,{bookId,stage});
    assert.equal(h.calls[1].action,method === 'claimEquipment' ? 'equipment-claim' : 'equipment-ack');
    assert.deepEqual(h.api.snapshot(),before); assert.equal(h.counts.playerRefresh,0);
    assert.equal(h.calls.length,2,'Rejected mutations are not retried or ACKed');
  });

for (const omitted of [false,true]) test('library accepts '+(omitted ? 'omitted legacy' : 'empty')+' equipment claims before the first bonus', async t => {
  const h = harness(t), reading = h.api.refresh(); await h.seen(1);
  const payload = equipmentLibrary(4);
  if (omitted) delete payload.books[0].equipmentClaims;
  h.reply(0,payload); await reading;
  assert.equal(h.api.snapshot().status,'ready');
  assert.deepEqual(h.api.snapshot().progress[bookId].equipmentClaims || [],[]);
});

const badEquipmentClaims = [
  ['object container',()=>({})], ['string container',()=> 'not-claims'],
  ['false container',()=>false], ['zero container',()=>0], ['empty-string container',()=> ''], ['null container',()=>null],
  ['too many claims',()=>[equipmentClaim(),equipmentClaim(5),equipmentClaim(6),equipmentClaim()]],
  ['duplicate stage',()=>[equipmentClaim(),equipmentClaim()]],
  ['null entry',()=>[null]], ['scalar entry',()=>[false]],
  ['unknown equipment',()=>[equipmentClaim(4,{equipmentId:'not-an-equipment'})]],
  ['equipment of another book',()=>[equipmentClaim(4,{},books[1])]],
  ['wrong kind',()=>[equipmentClaim(4,{kind:'shield'})]],
  ['historical stage',()=>[equipmentClaim(4,{stage:3})]],
  ['stage beyond sequel',()=>[equipmentClaim(4,{stage:7})]],
  ['fractional stage',()=>[equipmentClaim(4,{stage:4.5})]],
  ['string stage',()=>[equipmentClaim(4,{stage:'4'})]],
  ['unearned stage',()=>[equipmentClaim(5)]],
  ['non-boolean acknowledged',()=>[equipmentClaim(4,{acknowledged:'true'})]],
  ['missing acknowledged',()=>{const value=equipmentClaim();delete value.acknowledged;return [value];}],
  ['non-boolean alreadyOwned',()=>[equipmentClaim(4,{alreadyOwned:'false'})]],
  ['missing alreadyOwned',()=>{const value=equipmentClaim();delete value.alreadyOwned;return [value];}]
];
for (const [label,make] of badEquipmentClaims) test('library rejects malformed equipment claims: '+label, async t => {
  const h = harness(t), reading = h.api.refresh(); await h.seen(1);
  h.reply(0,equipmentLibrary()); await reading;
  const before = h.api.snapshot();
  const invalid = h.api.refresh(), rejected = assert.rejects(invalid);
  await h.seen(2); h.reply(1,equipmentLibrary(5,{equipmentClaims:make()})); await rejected;
  assert.equal(h.api.snapshot().status,'error');
  assert.deepEqual(h.api.snapshot().progress,before.progress,'A malformed response must not partially replace known progress');
  assert.deepEqual(h.api.snapshot().books,before.books);
  assert.equal(h.counts.playerRefresh,0);
});

test('a malformed equipment ACK response cannot replace valid claims or unlock another chapter', async t => {
  const h = harness(t), reading = h.api.refresh(); await h.seen(1);
  h.reply(0,equipmentLibrary()); await reading; const before = h.api.snapshot();
  const acknowledging = h.api.acknowledgeEquipment(bookId,4), rejected = assert.rejects(acknowledging);
  await h.seen(2); h.reply(1,equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{equipmentId:'wrong'})]})); await rejected;
  assert.deepEqual(h.api.snapshot(),before); assert.equal(h.counts.playerRefresh,0);
});

for (const staleFailure of [false,true]) test('equipment claim invalidates reads before and during ownership refresh: '+(staleFailure ? 'failure' : 'success'), async t => {
  const playerGate = deferred(), h = harness(t,{playerGate});
  const older = h.api.refresh(); await h.seen(1);
  const claiming = h.api.claimEquipment(bookId,4); await h.seen(2);
  if (staleFailure) h.fail(0); else h.reply(0,library(4));
  await older; assert.equal(h.updates.length,0);
  const during = h.api.refresh(); await h.seen(3);
  h.reply(1,equipmentReward()); await drain(); assert.equal(h.counts.playerRefresh,1);
  if (staleFailure) h.fail(2); else h.reply(2,equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{equipmentId:'obsolete'})]}));
  await during; assert.equal(h.updates.length,0,'An obsolete malformed payload is ignored before validation');
  playerGate.resolve(); await h.seen(4); h.reply(3,equipmentLibrary());
  assert.deepEqual(await claiming,equipmentReward());
  assert.equal(h.api.snapshot().status,'ready');
  assert.deepEqual(h.api.snapshot().progress[bookId].equipmentClaims,[equipmentClaim()]);
  assert.deepEqual(h.calls.map(call=>call.action),['library','equipment-claim','library','library']);
});

for (const timing of ['before','during']) for (const staleFailure of [false,true]) test(
  'equipment ACK invalidates a '+(staleFailure ? 'failed' : 'successful')+' read started '+timing+' it', async t => {
    const h = harness(t);
    const first = timing === 'before' ? h.api.refresh() : h.api.acknowledgeEquipment(bookId,4); await h.seen(1);
    const second = timing === 'before' ? h.api.acknowledgeEquipment(bookId,4) : h.api.refresh(); await h.seen(2);
    const ackIndex = timing === 'before' ? 1 : 0, readIndex = 1-ackIndex;
    const latest = equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{acknowledged:true})]});
    h.reply(ackIndex,latest); await (ackIndex === 0 ? first : second);
    const acknowledged = h.api.snapshot();
    if (staleFailure) h.fail(readIndex); else h.reply(readIndex,equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{equipmentId:'obsolete'})]}));
    assert.deepEqual(await (readIndex === 0 ? first : second),acknowledged);
    assert.deepEqual(h.api.snapshot(),acknowledged); assert.equal(h.updates.length,1);
    assert.equal(h.counts.playerRefresh,0);
  });

test('a fresh library read after equipment ACK can advance to the next won chapter', async t => {
  const h = harness(t), acknowledging = h.api.acknowledgeEquipment(bookId,4); await h.seen(1);
  h.reply(0,equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{acknowledged:true})]})); await acknowledging;
  const reading = h.api.refresh(); await h.seen(2); h.reply(1,equipmentLibrary(6)); await reading;
  assert.equal(h.api.snapshot().progress[bookId].cleared,6);
  assert.equal(h.api.snapshot().progress[bookId].equipmentClaims.length,2);
  assert.equal(h.updates.length,2);
});

test('failed ownership refresh after an equipment receipt neither retries the claim nor emits an ACK', async t => {
  const playerGate = deferred(), h = harness(t,{playerGate});
  const claiming = h.api.claimEquipment(bookId,4), rejected = assert.rejects(claiming,/Ownership refresh failed/);
  await h.seen(1); h.reply(0,equipmentReward()); await drain();
  assert.equal(h.counts.playerRefresh,1);
  playerGate.reject(Error('Ownership refresh failed')); await rejected;
  assert.deepEqual(h.calls.map(call=>call.action),['equipment-claim']);
  assert.equal(h.updates.length,0);
  const reading = h.api.refresh(); await h.seen(2); h.reply(1,equipmentLibrary()); await reading;
  assert.deepEqual(h.api.snapshot().progress[bookId].equipmentClaims,[equipmentClaim()]);
  assert.equal(h.calls.filter(call=>call.action === 'equipment-claim').length,1);
});

test('failed library refresh after an equipment receipt recovers by reading, not reissuing the grant', async t => {
  const h = harness(t), claiming = h.api.claimEquipment(bookId,4);
  const rejected = assert.rejects(claiming,/Library refresh failed/);
  await h.seen(1); h.reply(0,equipmentReward()); await h.seen(2);
  assert.equal(h.counts.playerRefresh,1); h.fail(1,Error('Library refresh failed')); await rejected;
  assert.equal(h.api.snapshot().status,'error');
  const reading = h.api.refresh(); await h.seen(3); h.reply(2,equipmentLibrary()); await reading;
  assert.equal(h.api.snapshot().status,'ready');
  assert.deepEqual(h.api.snapshot().progress[bookId].equipmentClaims,[equipmentClaim()]);
  assert.deepEqual(h.calls.map(call=>call.action),['equipment-claim','library','library']);
});

for (const method of ['claimEquipment','acknowledgeEquipment']) test(method+' does not retry a lost response; library recovers authoritative claims', async t => {
  const h = harness(t), mutation = h.api[method](bookId,4), rejected = assert.rejects(mutation,/Fixture network unavailable/);
  await h.seen(1); h.fail(0); await rejected;
  assert.equal(h.calls.length,1); assert.equal(h.counts.playerRefresh,0); assert.equal(h.updates.length,0);
  const reading = h.api.refresh(); await h.seen(2);
  const latest = equipmentLibrary(5,{equipmentClaims:[equipmentClaim(4,{acknowledged:method === 'acknowledgeEquipment'})]});
  h.reply(1,latest); await reading;
  assert.deepEqual(h.api.snapshot().progress[bookId],latest.books[0]);
});

for (const method of ['claimEquipment','acknowledgeEquipment']) test(method+' after destroy ignores a late receipt and emits no refresh', async t => {
  const h = harness(t,{honorAbort:false}), mutation = h.api[method](bookId,4), rejected = assert.rejects(mutation,/Parcours interrompu/);
  await h.seen(1); const before = h.api.snapshot(); h.api.destroy();
  h.reply(0,method === 'claimEquipment' ? equipmentReward() : equipmentLibrary()); await rejected;
  assert.deepEqual(h.api.snapshot(),before); assert.equal(h.counts.playerRefresh,0); assert.equal(h.updates.length,0);
});

test('abandon invalidates reads both before and during its mutation', async t => {
  const h = harness(t), old = h.api.refresh(); await h.seen(1);
  const abandoning = h.api.abandon(ATTEMPT); await h.seen(2);
  h.reply(0,library(1,{activeAttempt:{id:ATTEMPT,stage:1,phase:'attack'}})); await old;
  assert.equal(h.updates.length,0);
  const during = h.api.refresh(); await h.seen(3);
  h.reply(1,library(1)); await abandoning;
  h.reply(2,library(1,{activeAttempt:{id:ATTEMPT,stage:1,phase:'attack'}})); await during;
  assert.equal(h.api.snapshot().progress[bookId].activeAttempt,null);
  assert.equal(h.calls[1].input.deviceId,DEVICE); assert.equal(h.counts.flush,1);
});

test('a committed terminal move returns its canonical state while library refresh is still pending', {timeout:2000}, async t => {
  const h = harness(t), prior = frozen(attempt(8).state), commands = frozen([{method:'rollDefense',args:[]}]);
  const before = JSON.stringify({prior,commands});
  const terminal = attempt(9,{phase:'over',winner:0,rng:902,duel:{attackDie:6,defenseDie:1}});
  const moving = h.api.move(prior,commands); await h.seen(1); h.reply(0,{attempt:terminal});
  const next = await moving;
  assert.deepEqual(next,terminal.state); assert.equal(next.journey.sequence,9);
  await h.seen(2); assert.deepEqual(h.calls.map(call=>call.action),['move','library']);
  assert.equal(h.api.snapshot().status,'loading','Background read has not resolved');
  h.fail(1,Error('Library unavailable after committed victory')); await drain();
  assert.equal(next.phase,'over'); assert.equal(next.winner,0);
  assert.equal(h.api.snapshot().status,'error'); assert.match(h.api.snapshot().error,/after committed victory/);
  assert.equal(JSON.stringify({prior,commands}),before);
});

test('a terminal background refresh can publish the four-win progress after move already returned', async t => {
  const h = harness(t), terminal = attempt(2,{phase:'over',winner:0});
  const moving = h.api.move(attempt().state,[{method:'next',args:[]}]); await h.seen(1); h.reply(0,{attempt:terminal});
  assert.deepEqual(await moving,terminal.state); await h.seen(2);
  h.reply(1,library(4)); await drain();
  assert.equal(h.api.snapshot().progress[bookId].cleared,4); assert.equal(h.api.snapshot().status,'ready');
});

test('lost move acknowledgement recovers the one canonical draw through context without replaying move', async t => {
  let draws = 0;
  const canonical = attempt(12,{phase:'kalistel',rng:8102,duel:{attackDie:6,attackValue:202}});
  const h = harness(t,{respond:async call=>{
    if (call.action === 'move') { draws++; throw TypeError('Acknowledgement lost after commit'); }
    assert.equal(call.action,'context'); return response({attempt:canonical});
  }});
  const prior = frozen(attempt(11).state), commands = frozen([{method:'rollAttack',args:[]}]);
  const before = JSON.stringify({prior,commands}), next = await h.api.move(prior,commands);
  assert.deepEqual(next,canonical.state); assert.equal(next.duel.attackDie,6); assert.equal(next.rng,8102);
  assert.equal(draws,1,'The server draw was requested exactly once');
  assert.deepEqual(h.calls.map(call=>call.action),['move','context']);
  assert.deepEqual(h.calls[0].input,{attemptId:ATTEMPT,sequence:11,commands,deviceId:DEVICE});
  assert.deepEqual(h.calls[1].input,{attemptId:ATTEMPT,deviceId:DEVICE});
  assert.equal(JSON.stringify({prior,commands}),before);
});

test('a conflict carrying exactly the next canonical sequence needs no second move or context', async t => {
  const h = harness(t), canonical = attempt(4,{phase:'kalistel',rng:940,duel:{attackDie:5}});
  const moving = h.api.move(attempt(3).state,[{method:'rollAttack',args:[]}]); await h.seen(1);
  h.reply(0,{error:'Already committed',code:'conflict',attempt:canonical},409);
  assert.deepEqual(await moving,canonical.state); assert.deepEqual(h.calls.map(call=>call.action),['move']);
});

for (const recoveredSequence of [5,7]) test('lost acknowledgement refuses ambiguous recovered sequence '+recoveredSequence+' without retrying a draw', async t => {
  const original = TypeError('Lost response');
  const h = harness(t,{respond:async call=>{
    if (call.action === 'move') throw original;
    return response({attempt:attempt(recoveredSequence)});
  }});
  await assert.rejects(h.api.move(attempt(5).state,[{method:'rollAttack',args:[]}]),error=>error === original);
  assert.deepEqual(h.calls.map(call=>call.action),['move','context']);
});

test('an explicit rejected command is not retried or treated as a lost acknowledgement', async t => {
  const h = harness(t), moving = h.api.move(attempt().state,[{method:'rollAttack',args:[]}]);
  const rejected = assert.rejects(moving,error=>error.code === 'forbidden' && error.message === 'Command refused');
  await h.seen(1); h.reply(0,{error:'Command refused',code:'forbidden'},403); await rejected;
  assert.equal(h.calls.length,1);
});

for (const method of ['start','resume','abandon']) for (const lease of [{canWrite:false,pending:false},{canWrite:true,pending:true}]) test(
  method+' bails before Auth/HTTP when device is '+(lease.pending ? 'pending' : 'read-only'), async t => {
    const h = harness(t); Object.assign(h.flushed,lease);
    const action = method === 'start' ? h.api.start(bookId,{cards:[]}) : h.api[method](ATTEMPT);
    await assert.rejects(action,/Reprends la sauvegarde sur cet appareil/);
    assert.equal(h.counts.flush,1); assert.equal(h.counts.auth,0); assert.equal(h.calls.length,0);
  });

test('move refuses a read-only device before Auth/HTTP without flushing or altering its game', async t => {
  const h = harness(t); h.lease.canWrite = false;
  const prior = frozen(attempt().state), before = JSON.stringify(prior);
  await assert.rejects(h.api.move(prior,[{method:'rollAttack',args:[]}]),/Reprends ce parcours sur cet appareil/);
  assert.equal(h.counts.flush,0); assert.equal(h.counts.auth,0); assert.equal(h.calls.length,0);
  assert.equal(JSON.stringify(prior),before);
});

test('start and resume send the current device and validate the canonical attempt identity', async t => {
  const h = harness(t), deck = frozen({name:'Client fixture',cards:['30000001']});
  const starting = h.api.start(bookId,deck); await h.seen(1); h.reply(0,{attempt:attempt()});
  assert.deepEqual(await starting,attempt().state);
  assert.deepEqual(h.calls[0].input,{bookId,deck,deviceId:DEVICE});
  assert.equal(h.calls[0].init.method,'POST'); assert.equal(h.calls[0].init.credentials,'same-origin');
  assert.equal(h.calls[0].init.headers.Authorization,'Bearer fixture-token-never-written');
  const resuming = h.api.resume(ATTEMPT); await h.seen(2); h.reply(1,{attempt:attempt(7)});
  assert.equal((await resuming).journey.sequence,7); assert.deepEqual(h.calls[1].input,{attemptId:ATTEMPT,deviceId:DEVICE});
  assert.equal(h.counts.flush,2);
});

for (const invalid of ['profile','attempt','sequence']) test('resume rejects a mismatching canonical '+invalid, async t => {
  const h = harness(t), value = attempt();
  if (invalid === 'profile') value.localProfile = 'another-player';
  if (invalid === 'attempt') value.state.journey.attemptId = 'another-attempt';
  if (invalid === 'sequence') value.state.journey.sequence++;
  const resuming = h.api.resume(ATTEMPT), rejected = assert.rejects(resuming,/Sauvegarde de parcours incompatible/);
  await h.seen(1); h.reply(0,{attempt:value}); await rejected;
});

for (const identity of [{data:{session:null}},{data:{session:{user:{id:'another-actor'},access_token:'wrong-token'}}},{error:{message:'Auth failed'},data:{session:null}}]) test(
  'invalid Auth identity cannot make an HTTP library request: '+(identity.error ? 'error' : identity.data.session ? 'other user' : 'signed out'), async t => {
    const h = harness(t); h.identity = identity;
    await assert.rejects(h.api.refresh(),/Reconnecte-toi/);
    assert.equal(h.calls.length,0); assert.equal(h.api.snapshot().status,'error');
  });

test('destroy aborts pending fetches, settles them and suppresses all late state notifications', async t => {
  const h = harness(t), reading = h.api.refresh(), rejected = assert.rejects(reading,/abort|interrompu/i);
  await h.seen(1); assert.equal(h.clock.jobs.size,1);
  const before = h.api.snapshot(); h.api.destroy(); h.api.destroy(); await rejected;
  assert.equal(h.calls[0].init.signal.aborted,true); assert.deepEqual(h.api.snapshot(),before);
  assert.equal(h.updates.length,0); assert.equal(h.clock.jobs.size,0);
});

test('destroy also ignores an already delivered response whose JSON body resolves later', async t => {
  const body = deferred(), h = harness(t,{respond:async()=>({ok:true,json:()=>body.promise})});
  const reading = h.api.refresh(), rejected = assert.rejects(reading,/Parcours interrompu/);
  await h.seen(1); await drain(); const before = h.api.snapshot(); h.api.destroy();
  body.resolve(library(4,{claimed:true},true)); await rejected;
  assert.equal(h.calls[0].init.signal.aborted,true); assert.deepEqual(h.api.snapshot(),before); assert.equal(h.updates.length,0);
});

test('request timeout aborts transport and clears its deadline without using a real clock', async t => {
  const h = harness(t), reading = h.api.refresh(), rejected = assert.rejects(reading,/abort/i);
  await h.seen(1); assert.deepEqual([...h.clock.jobs.values()].map(job=>job.delay),[20000]);
  h.clock.expire(); await rejected;
  assert.equal(h.calls[0].init.signal.aborted,true); assert.equal(h.clock.jobs.size,0); assert.equal(h.api.snapshot().status,'error');
});

test('destroy during Auth prevents a new HTTP request when Auth eventually resolves', async t => {
  const authGate = deferred(), h = harness(t,{authGate,respond:async()=>response(library())});
  const reading = h.api.refresh(), rejected = assert.rejects(reading,/Parcours interrompu/);
  await drain(); assert.equal(h.counts.auth,1); assert.equal(h.calls.length,0);
  h.api.destroy(); authGate.resolve(); await rejected;
  assert.equal(h.calls.length,0,'A destroyed client must not send a request after waiting for Auth');
  assert.equal(h.updates.length,0);
});

test('destroy during device flush prevents a delayed start from issuing Auth/HTTP', async t => {
  const deviceGate = deferred(), h = harness(t,{deviceGate,respond:async()=>response({attempt:attempt()})});
  const starting = h.api.start(bookId,{cards:[]}), rejected = assert.rejects(starting,/Parcours interrompu/);
  await drain(); assert.equal(h.counts.flush,1); assert.equal(h.calls.length,0);
  h.api.destroy(); deviceGate.resolve(); await rejected;
  assert.equal(h.calls.length,0,'A destroyed client must not start a combat after device synchronization');
  assert.equal(h.updates.length,0);
});
