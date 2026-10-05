'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const Updates=require('./catalogue-updates.js');
const catalogue=(...ids)=>({version:4,edition:'V4',cards:ids.map(id=>({id,edition:'V4'}))});
const loaded=catalogue('30000001','30000002'),added=catalogue('30000001','30000002','40000003');
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
test('only a currently available, unloaded version is a new card',()=>{
  assert.deepEqual(Updates.pending(loaded,loaded),[]);
  assert.deepEqual(Updates.pending(added,loaded),[],'removed profiles are not additions');
  assert.deepEqual(Updates.pending(loaded,catalogue('30000001','40000003')),['40000003']);
});
test('checking the authoritative catalogue never counts unknown registry history',async()=>{
  let notice=0;const updates=Updates.create({loaded,readLatest:async()=>loaded,onChange:()=>notice++});
  assert.deepEqual(await updates.check(),[]);assert.equal(notice,0);updates.destroy();
});
test('real additions are announced once, counted exactly and returned as copies',async()=>{
  const noticed=[],updates=Updates.create({loaded,readLatest:async()=>added,onChange:ids=>noticed.push(ids)});
  assert.deepEqual(await updates.check(),['40000003']);await updates.check();assert.equal(noticed.length,1);
  const copy=updates.ids();copy.push('40000099');assert.deepEqual(updates.ids(),['40000003']);updates.destroy();
});
test('withdrawn additions clear the notice; reloading into the new catalogue has no notice',async()=>{
  let available=added;const noticed=[],updates=Updates.create({loaded,readLatest:async()=>available,onChange:ids=>noticed.push(ids)});
  await updates.check();available=loaded;await updates.check();assert.deepEqual(noticed,[['40000003'],[]]);updates.destroy();
  const fresh=Updates.create({loaded:added,readLatest:async()=>added});assert.deepEqual(await fresh.check(),[]);fresh.destroy();
});
test('offline or failed checks cannot invent updates or erase a verified notice',async()=>{
  let offline=true;const updates=Updates.create({loaded,readLatest:async()=>{if(offline)throw Error('Offline');return added;}});
  assert.deepEqual(await updates.check(),[]);offline=false;await updates.check();offline=true;
  assert.deepEqual(await updates.check(),['40000003']);updates.destroy();
});
test('invalid, historical, empty and duplicate catalogues fail closed',async()=>{
  for(const data of [{...loaded,version:3},{...loaded,edition:'V3'},catalogue(),catalogue('x'),catalogue('30000001','30000001'),{...loaded,cards:[null]}]){
    assert.throws(()=>Updates.pending(loaded,data));
    const updates=Updates.create({loaded,readLatest:async()=>data});assert.deepEqual(await updates.check(),[]);updates.destroy();
  }
});
test('out-of-order responses cannot overwrite the newest available catalogue',async()=>{
  const requests=[],notices=[],updates=Updates.create({loaded,readLatest:signal=>{const r=deferred();requests.push({...r,signal});return r.promise;},onChange:ids=>notices.push(ids)});
  const old=updates.check(),fresh=updates.check();assert(requests[0].signal.aborted);
  requests[1].resolve(added);await fresh;requests[0].resolve(loaded);await old;
  assert.deepEqual(updates.ids(),['40000003']);assert.deepEqual(notices,[['40000003']]);updates.destroy();
});
test('navigation aborts the pending request and suppresses all late callbacks',async()=>{
  const r=deferred();let signal,reads=0,notices=0;
  const updates=Updates.create({loaded,readLatest:s=>{signal=s;reads++;return r.promise;},onChange:()=>notices++});
  const pending=updates.check();updates.destroy();assert(signal.aborted);r.resolve(added);await pending;await updates.check();
  assert.equal(reads,1);assert.equal(notices,0);assert.deepEqual(updates.ids(),[]);
});
test('boot and both notices use the same verified additions without changing the DB guard',()=>{
  const read=file=>fs.readFileSync(require.resolve(file),'utf8');
  assert(read('./boot.js').indexOf("'catalogue-updates.js'")<read('./boot.js').indexOf("'app.js'"));
  const app=read('./app.js');assert(app.includes("{cache:'no-store',signal}"));assert(app.includes("$('#catalogue-refresh').hidden=!ids.length"));
  assert(app.includes('getCatalogueChanges:()=>catalogueUpdates.ids()'));assert(read('./accounts-ui.js').includes('const pending=getCatalogueChanges()'));
  assert(read('./local-db.js').includes("O.fail('CATALOGUE_STALE'"),'import safety stays intact');
});
