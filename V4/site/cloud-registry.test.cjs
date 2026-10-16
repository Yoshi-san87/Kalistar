'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Cloud=require('./cloud-registry.js');
const id='KC-'+'a'.repeat(32),secret='b'.repeat(64);
function fixture(){
  const calls=[],session={user:{id:'private-user',email:'fixture@example.invalid'}};let callback,active=session;
  const client={auth:{getSession:async()=>({data:{session:active}}),onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){calls.push('unsubscribe');}}}};},
    signInWithOtp:async args=>{calls.push(args);return {};},signOut:async args=>{calls.push(args);active=null;callback('SIGNED_OUT',null);return {};}},
    rpc:async(name,args)=>{calls.push({name,args});return {data:name==='kalistar_me'?{profile:{handle:'fixture'},isAdmin:false}:name==='kalistar_activate'?{ok:true,card:{id}}:name==='kalistar_certificate'?{id,owner:null}:[]};},
    from:()=>({select:()=>({order:async()=>({data:[]})})})};
  return {api:Cloud.create({client,redirectTo:'https://example.invalid/jeu/?registry=1'}),calls,client,clear:()=>{active=null;callback('SIGNED_OUT',null);}};
}
test('public specimen, activation secret and player handle have distinct bounded formats',()=>{
  assert(Cloud.specimen(id));assert(Cloud.specimen('00000001'));assert(!Cloud.specimen('30000001'));assert(!Cloud.specimen('K4-30000001-001'));
  assert(Cloud.handle('yoshi_87'));assert(!Cloud.handle('email@example.invalid'));assert(Cloud.secret(secret));assert(!Cloud.secret(id));
});
test('login uses the official Auth client with a fixed approved redirect, never an email in a public profile',async()=>{
  const f=fixture();await f.api.login('fixture@example.invalid');assert.equal(f.calls[0].options.emailRedirectTo,'https://example.invalid/jeu/?registry=1');
  assert.equal(f.calls[0].options.shouldCreateUser,true);await assert.rejects(f.api.login('bad-email'));f.api.destroy();
});
test('registration uses server RPCs; no client-chosen owner, admin role or local demo identifiers',async()=>{
  const f=fixture();await f.api.activate(id,secret);
  assert.deepEqual(f.calls[0],{name:'kalistar_activate',args:{p_id:id,p_secret:secret}});
  assert(!JSON.stringify(f.api.snapshot()).includes(secret));
  await assert.rejects(f.api.activate('K4-30000001-001',secret));
  await f.api.profile({handle:'fixture',displayName:'Fixture',publishOwner:true});
  const call=f.calls.find(c=>c.name==='kalistar_set_profile');assert.deepEqual(Object.keys(call.args).sort(),['p_display_name','p_handle','p_publish_owner']);f.api.destroy();
});
test('public lookup does not require a session and cannot accept activation codes as card IDs',async()=>{
  const f=fixture();f.clear();const cert=await f.api.certificate(id);assert.equal(cert.owner,null);
  await assert.rejects(f.api.certificate(secret));assert.equal(f.calls.filter(c=>c.name==='kalistar_me').length,0);f.api.destroy();
});
test('logout invalidates pending responses and clears private data, without touching local game storage',async()=>{
  const f=fixture();await f.api.refresh();assert(f.api.snapshot().user);
  let release;f.client.rpc=()=>new Promise(resolve=>{release=resolve;});
  const pending=f.api.refresh();await new Promise(resolve=>setImmediate(resolve));
  await f.api.logout();release({data:{profile:null,isAdmin:true}});
  await pending;assert.equal(f.api.snapshot().user,null);assert.equal(f.api.snapshot().isAdmin,false);f.api.destroy();
});
test('a used or invalid activation cannot be presented as successful',async()=>{
  const f=fixture();f.client.rpc=async()=>({data:{ok:false,code:'activation_refused'}});
  await assert.rejects(f.api.activate(id,secret),/refusee/);
  f.client.rpc=async()=>({data:{ok:false,code:'rate_limited'}});await assert.rejects(f.api.activate(id,secret),/minute/);f.api.destroy();
});

test('expired or refused server sessions clear previously displayed private state',async()=>{
  const f=fixture();await f.api.refresh();assert(f.api.snapshot().user);
  f.client.rpc=async()=>({error:{code:'42501',message:'Session refusee'}});
  await assert.rejects(f.api.refresh());assert.equal(f.api.snapshot().user,null);f.api.destroy();
});
