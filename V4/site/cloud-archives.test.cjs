'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Archives=require('./cloud-archives.js');
const id=i=>'match-00000000-0000-4000-8000-'+String(i).padStart(12,'0');
test('the expanded limit includes ten thousand archives plus the active match',()=>{
  const value=payload(),date='2026-10-17T00:00:00Z';
  value.matches=Array.from({length:10001},(_,i)=>({id:id(i),createdAt:date,updatedAt:date,state:{collection:{userId:'user-tokyo'},phase:i===10000?'choose':'over'}}));
  value.activeMatchId=id(10000);
  const Player=require('./cloud-player.js');
  assert.equal(Player.validatePayload(value,'user-tokyo',null,{expanded:true}).matches.length,10001);
  value.matches.push({...value.matches[0],id:id(10001)});
  assert.throws(()=>Player.validatePayload(value,'user-tokyo',null,{expanded:true}));
});
function match(i){return {id:id(i),state:{matchId:id(i),schema:6,edition:'V4',collection:{userId:'user-tokyo'},log:'x'.repeat(220000)},profiles:[],arenas:[]};}
function payload(n=0){return {schema:1,edition:'V4',localProfile:'user-tokyo',preferences:{},deckLibrary:{},equipment:{id:'user-tokyo'},matches:Array.from({length:n},(_,i)=>match(i)),activeMatchId:null,releasedMatches:[]};}
function fixture(local=[]){
  const localRows=new Map(),remote=new Map(),calls=[];let fail=false;
  const client={auth:{},rpc:async(name,args)=>{
    calls.push({name,args});if(fail)return {error:{message:'Network timeout'}};
    if(name==='kalistar_archive_put'){for(const row of args.p_archives)remote.set(row.hash,row);return {data:{ok:true}};}
    if(name==='kalistar_archive_read')return {data:args.p_refs.map(ref=>({...ref,text:remote.get(ref.hash).text}))};
    return {data:{ok:true,unchanged:true,payload:null,revision:2}};
  }};
  const options={client,profile:'user-tokyo',compact:structuredClone,entries:()=>local,storage:{get:async h=>localRows.get(h),put:async(h,t)=>localRows.set(h,t)}};
  return {api:Archives.create(options),options,calls,localRows,remote,fail:value=>{fail=value;}};
}
test('120 complete histories cross 25 MB while the current cloud document stays under 20 KB',async()=>{
  const f=fixture(),legacy=payload(120),next=await f.api.split(legacy);
  assert(JSON.stringify(legacy).length>25000000);assert(JSON.stringify(next).length<20000);
  assert.equal(next.matches.length,0);assert.equal(next.archives.length,120);assert.equal(f.localRows.size,120);
  assert.equal(legacy.schema,1);assert.equal(legacy.matches.length,120);
  await f.api.transport.rpc('kalistar_sync_write',{p_payload:next,p_device_id:'test',p_expected_revision:1});
  assert.equal(f.remote.size,120);const puts=f.calls.filter(c=>c.name==='kalistar_archive_put');assert(puts.length>1);assert(puts.every(c=>c.args.p_archives.length<=8));
  f.calls.length=0;await f.api.transport.rpc('kalistar_sync_write',{p_payload:next,p_device_id:'test',p_expected_revision:2});
  assert.deepEqual(f.calls.map(c=>c.name),['kalistar_sync_v2_write']);
  f.localRows.clear();const fresh=Archives.create(f.options),expanded=await fresh.expand(next);
  assert.equal(expanded.matches.length,120);assert.deepEqual(expanded.matches,legacy.matches);
  assert(f.calls.filter(c=>c.name==='kalistar_archive_read').every(c=>c.args.p_refs.length<=8));
});
test('active state stays inline, metadata migration is lossless, pending archives survive controller destruction offline',async()=>{
  const f=fixture(),legacy=payload(3);legacy.activeMatchId=id(1);
  const compact=await f.api.split(legacy);assert.equal(compact.matches.length,1);assert.equal(compact.archives.length,2);
  const record={schema:1,userId:'test',base:{payload:legacy},outbox:{payload:legacy}};
  const migrated=JSON.parse(await f.api.migrateRecord(JSON.stringify(record)));assert.equal(migrated.base.payload.schema,2);assert.equal(record.base.payload.schema,1);
  f.fail(true);const fresh=Archives.create(f.options),restored=await fresh.expand(migrated.outbox.payload);
  assert.equal(restored.matches.length,3);assert.equal(f.calls.length,0);
});
test('missing, corrupt and cross-account archives do not overwrite progress',async()=>{
  const f=fixture(),next=await f.api.split(payload(1));await f.api.transport.rpc('kalistar_sync_write',{p_payload:next});
  f.localRows.clear();const entry=f.remote.get(next.archives[0].hash);entry.text=entry.text.replace('tokyo','paris');
  await assert.rejects(Archives.create(f.options).expand(next),/Integrite/);
  await assert.rejects(f.api.split({...payload(1),localProfile:'user-paris'}));
  assert.throws(()=>Archives.validate({...next,archives:[next.archives[0],next.archives[0]]}));
});
test('lease failure before archival acknowledgement cannot commit the compact document',async()=>{
  const f=fixture(),next=await f.api.split(payload(1));f.options.client.rpc=async(name)=>({data:{ok:false,code:'busy',current:{revision:3,payload:null}}});
  const result=await f.api.transport.rpc('kalistar_sync_write',{p_payload:next});assert.equal(result.data.code,'busy');assert.equal(f.remote.size,0);
});
