'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const load=()=>import('./access-worker.mjs'),secret='disposable-test-key-'.repeat(4),sub='11111111-1111-4111-8111-111111111111';
const env={KALISTAR_SESSION_KEY:secret,ASSETS:{fetch:async()=>new Response('protected asset',{headers:{'Cache-Control':'public, max-age=31536000'}})}};
const request=(path,options={})=>new Request('https://kalistar.pages.dev'+path,options);
const post=(body,origin='https://kalistar.pages.dev')=>request('/auth/session',{method:'POST',headers:{Origin:origin,'Content-Type':'application/json'},body:JSON.stringify(body)});
test('all game entrypoints, raw media and catalogue are closed by default, never a client-only gate',async()=>{
  const {handle}=await load();
  for(const path of ['/','/jeu/','/jeu/index.html']){const r=await handle(request(path),env);assert.equal(r.status,302);assert.equal(new URL(r.headers.get('Location')).pathname,'/jeu/login.html');}
  for(const path of ['/jeu/catalogue.json','/media/reference/momo.png','/jeu/boot.js','/release.json',
    '/jeu/assets/cinematics/kalistar-anime-v1.mp4','/jeu/assets/cinematics/kalistar-anime-v1-phone.mp4',
    '/jeu/assets/cinematics/kalistar-anime-v1-poster.webp',
    '/jeu/assets/cinematics/kalistar-anime-v2.mp4','/jeu/assets/cinematics/kalistar-anime-v2-phone.mp4',
    '/jeu/assets/cinematics/kalistar-anime-v2-poster.webp','/jeu/assets/cinematics/kalistar-anime-v2-phone-poster.webp',
    '/jeu/assets/cinematics/kalistar-anime-v3.mp4','/jeu/assets/cinematics/kalistar-anime-v3-phone.mp4',
    '/jeu/assets/cinematics/kalistar-anime-v3-poster.webp','/jeu/assets/cinematics/kalistar-anime-v3-phone-poster.webp'])assert.equal((await handle(request(path),env)).status,401,path);
  for(const path of ['/jeu/login-intro.js','/jeu/login-intro.css'])assert.equal((await handle(request(path),env)).status,200,path);
  assert.equal((await handle(request('/jeu/login.html'),env)).status,200);
  for(const path of ['/jeu/login','/jeu/login.html']){
    const normalized={...env,ASSETS:{fetch:async r=>{assert.equal(new URL(r.url).pathname,'/jeu/login');return new Response('Login');}}};
    const login=await handle(request(path),normalized);assert.equal(login.status,200);assert.equal(login.headers.get('Cache-Control'),'no-store');assert.equal(login.headers.get('X-Frame-Options'),'DENY');
  }
  assert.equal((await handle(request('/jeu/assets/supabase/supabase-2.118.0.js'),env)).status,200);
  assert.equal((await handle(request('/jeu/assets/supabase/another-file.js'),env)).status,401);
  const callback=await handle(request('/jeu/?code=disposable-code&registry=1'),env);assert.equal(new URL(callback.headers.get('Location')).searchParams.get('code'),'disposable-code');
});
test('signed short-lived HttpOnly sessions reject tampering, expiry, wrong keys and forged profile aliases',async()=>{
  const {signSession,verifySession,handle}=await load(),now=Math.floor(Date.now()/1000),claims={v:1,sub,profile:'user-paris',iat:now,exp:now+900};
  const value=await signSession(claims,secret);assert.deepEqual(await verifySession(value,secret),claims);
  assert.equal(await verifySession(value,secret,now+901),null);assert.equal(await verifySession(value,secret+'x'),null);
  assert.equal(await verifySession(value.replace(/^./,value[0]==='a'?'b':'a'),secret),null);
  for(const patch of [{exp:now+901},{iat:now+40},{profile:'admin'},{sub:'forged'}])assert.equal(await verifySession(await signSession({...claims,...patch},secret),secret),null);
  const r=await handle(request('/jeu/catalogue.json',{headers:{Cookie:'__Host-kalistar='+value}}),env);assert.equal(r.status,200);assert.equal(r.headers.get('Cache-Control'),'private, max-age=300');assert.equal(r.headers.get('Vary'),'Cookie');
  for(const version of [1,2,3])assert.equal((await handle(request('/jeu/assets/cinematics/kalistar-anime-v'+version+'.mp4',{headers:{Cookie:'__Host-kalistar='+value}}),env)).status,200);
  assert.equal((await handle(request('/jeu/catalogue.json',{headers:{Cookie:'__Host-kalistar='+value}}),{...env,KALISTAR_SESSION_KEY:''})).status,401);
});
test('session exchange verifies Supabase identity AND server authorization; never accepts an email or admin claimed by a client',async()=>{
  const {handle,verifySession}=await load(),calls=[];
  const fetcher=async(url,options)=>{calls.push({url,options});return new Response(JSON.stringify(url.endsWith('/user')?{id:sub,email_confirmed_at:'2026-10-16'}:{localProfile:'user-tokyo',label:'Tokyo'}),{status:200});};
  const r=await handle(post({accessToken:'fixture-token',email:'forged@example.invalid',isAdmin:true}),env,fetcher);
  assert.equal(r.status,200);assert.equal(calls.length,2);assert.equal(calls[0].options.headers.Authorization,'Bearer fixture-token');assert(calls[1].url.endsWith('/rpc/kalistar_access'));
  const set=r.headers.get('Set-Cookie');assert(set.includes('HttpOnly')&&set.includes('Secure')&&set.includes('SameSite=Lax')&&set.includes('Max-Age=900'));
  const value=set.split(';')[0].split('=')[1],claims=await verifySession(value,secret);assert.equal(claims.profile,'user-tokyo');assert(!JSON.stringify(claims).includes('fixture-token'));
  assert.equal((await handle(post({accessToken:'fixture-token'},'https://attacker.invalid'),env,fetcher)).status,403);
  assert.equal((await handle(post({accessToken:'fixture-token'}),env,async()=>new Response('{}',{status:401}))).status,401);
  let count=0;assert.equal((await handle(post({accessToken:'fixture-token'}),env,async()=>++count===1?new Response(JSON.stringify({id:sub,email_confirmed_at:'yes'})):new Response('{}',{status:403}))).status,403);
  assert.equal((await handle(post({accessToken:'fixture-token'}),{...env,KALISTAR_SESSION_KEY:''},fetcher)).status,503);
});
test('logout clears the edge cookie and does not permit a cross-origin request',async()=>{
  const {handle}=await load(),r=await handle(request('/auth/session',{method:'DELETE',headers:{Origin:'https://kalistar.pages.dev'}}),env);
  assert.equal(r.status,200);assert(r.headers.get('Set-Cookie').includes('Max-Age=0'));
  assert.equal((await handle(request('/auth/session',{method:'DELETE',headers:{Origin:'https://attacker.invalid'}}),env)).status,403);
});
