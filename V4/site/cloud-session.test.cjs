'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),Session=require('./cloud-session.js');
function fixture(){
  let active=null,callback;const calls=[],exchange=[];
  const session={access_token:'disposable-token',user:{id:'fixture',email:'fixture@example.invalid'}};
  const client={auth:{onAuthStateChange:fn=>{callback=fn;return {data:{subscription:{unsubscribe(){}}}};},getSession:async()=>({data:{session:active}}),
    signInWithPassword:async args=>{calls.push({name:'password',args});active=session;return {data:{session}};},
    signOut:async()=>{active=null;callback('SIGNED_OUT');return {};},resetPasswordForEmail:async(...args)=>{calls.push({name:'reset',args});return {};},updateUser:async args=>{calls.push({name:'update',args});return {};}},
    rpc:async name=>{calls.push({name});return {data:{localProfile:'user-paris',label:'Paris'}};}};
  return {api:Session.create({client,redirectTo:'https://example.invalid/jeu/?registry=1',exchange:async(...args)=>exchange.push(args)}),client,calls,exchange,recovery:()=>callback('PASSWORD_RECOVERY'),active:()=>{active=session;}};
}
test('hosted game requires access, loopback and isolated development hosts remain usable without a production identity',()=>{
  assert(Session.protectedSite(true,{protocol:'https:',hostname:'kalistar.pages.dev'}));assert(Session.protectedSite(true,{protocol:'https:',hostname:'preview.kalistar.pages.dev'}));
  assert(!Session.protectedSite(true,{protocol:'http:',hostname:'127.0.0.1'}));assert(!Session.protectedSite(true,{protocol:'https:',hostname:'qa.invalid'}));
  assert(!Session.protectedSite(false,{protocol:'http:',hostname:'localhost'}));
});
test('return paths never leave the game or permit an external redirect',()=>{
  const origin='https://example.invalid';
  for(const bad of ['https://attacker.invalid/jeu/','//attacker.invalid','/auth/session','/jeu/login.html'])assert.equal(Session.target(bad,origin),'/jeu/#home');
  assert.equal(Session.target('/jeu/#decks',origin),'/jeu/#decks');
});
test('password sign-in verifies the private permission before opening an edge session; credentials are never in snapshots',async()=>{
  const f=fixture();assert.equal((await f.api.check()).user,null);assert.equal(f.calls.length,0);
  const s=await f.api.login('fixture@example.invalid','only-a-fixture-password');assert.equal(s.access.localProfile,'user-paris');
  assert.deepEqual(f.calls.map(c=>c.name),['password','kalistar_access']);assert.deepEqual(f.exchange,[['POST','disposable-token']]);
  assert(!JSON.stringify(s).includes('password'));assert(!JSON.stringify(s).includes('disposable-token'));f.api.destroy();
});
test('a valid Supabase user without a private authorization cannot enter the game',async()=>{
  const f=fixture();f.client.rpc=async()=>({error:{code:'42501'}});
  await assert.rejects(f.api.login('fixture@example.invalid','only-a-fixture-password'),/acceder/);assert.equal(f.api.snapshot().user,null);assert.equal(f.exchange.length,0);f.api.destroy();
});
test('recovery uses the approved URL, waits for the new password and never becomes a signup flow',async()=>{
  const f=fixture();await f.api.forgot('fixture@example.invalid');assert.equal(f.calls[0].args[1].redirectTo,'https://example.invalid/jeu/?registry=1');
  f.active();f.recovery();assert((await f.api.check()).recovery);assert.equal(f.exchange.length,0);
  await assert.rejects(f.api.password('short','short'));await assert.rejects(f.api.password('fixture-new-password','mismatch'));
  const s=await f.api.password('fixture-new-password','fixture-new-password');assert(s.user);assert.equal(s.recovery,false);f.api.destroy();
});
test('logout closes the edge session and invalidates pending identity responses',async()=>{
  const f=fixture();await f.api.login('fixture@example.invalid','only-a-fixture-password');let release;
  f.client.rpc=()=>new Promise(resolve=>{release=resolve;});const pending=f.api.check();await new Promise(resolve=>setImmediate(resolve));
  await f.api.logout();release({data:{localProfile:'user-tokyo'}});assert.equal((await pending).user,null);assert.deepEqual(f.exchange.at(-1),['DELETE']);f.api.destroy();
});
