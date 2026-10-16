'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const modules=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_journey_browser.cjs'));
const {chromium}=modules('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/journeys'));
const origin='https://kalistar.pages.dev',supa='https://fkskjhlaaagqlfcsojjp.supabase.co';
const key='disposable-journey-browser-HMAC-key-only-for-local-QA-20261016';
const ids={'user-paris':'11111111-1111-4111-8111-111111111111','user-tokyo':'22222222-2222-4222-8222-222222222222'};
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const password='fictional-browser-password';
function session(profile){const id=ids[profile];return {access_token:Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional-signature',refresh_token:'fictional-refresh-'+profile,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:profile+'@example.invalid',email_confirmed_at:'2026-10-16T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}};}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const worker=await import(pathToFileURL(path.resolve(process.env.KALISTAR_WORKER_BUNDLE||path.join(dist,'_worker.js'))).href);
  const runtime=require(path.join(dist,'jeu/journey-combat.js')).create(data),E=runtime.engine;
  const sessions=Object.fromEntries(Object.keys(ids).map(p=>[p,session(p)]));
  const identify=token=>Object.keys(ids).find(p=>'Bearer '+sessions[p].access_token===token);
  const database=await require('../deploy/supabase/browser-fixture.cjs').create(data,{journeyKey:key});
  const errors=[],missing=[],result={passed:false,profiles:[]},contexts=[];let browser,page,stage='setup',startGate=null,releaseStart=null;
  async function edgeAPI(url,options={}){
    const u=new URL(url),who=identify(new Headers(options.headers).get('authorization'));
    assert.equal(u.origin,supa);if(!who)return Response.json({message:'Fixture Auth required'},{status:401});
    if(u.pathname==='/auth/v1/user')return Response.json(sessions[who].user);
    assert(u.pathname.startsWith('/rest/v1/rpc/kalistar_'));
    if(u.pathname.endsWith('/kalistar_journey_start')&&startGate){const gate=startGate;startGate=null;await gate;}
    try{return Response.json(await database.call(u.pathname.split('/').pop(),JSON.parse(options.body||'{}'),who));}
    catch(error){return Response.json({message:error.message,code:error.code},{status:error.code==='42501'?403:409});}
  }
  const env={KALISTAR_SESSION_KEY:'test-only-session-key-'.repeat(4),KALISTAR_JOURNEY_KEY:key,ASSETS:{fetch:async request=>{
    let name=decodeURIComponent(new URL(request.url).pathname).replace(/^\//,'');if(!name||name.endsWith('/'))name+='index.html';if(name==='jeu/login')name+='.html';
    const file=path.resolve(dist,name);assert(file.startsWith(dist+path.sep));
    if(!fs.existsSync(file)){missing.push(name);return new Response('Missing fixture asset',{status:404});}
    return new Response(fs.readFileSync(file),{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}});
  }}};
  async function device(profile,who){
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:'reduce',serviceWorkers:'block'});contexts.push(context);
    // All HTTP requests are intercepted; no test account or game reaches a live service.
    await context.route('**/*',async route=>{
      const request=route.request(),url=new URL(request.url());
      try{
        if(url.origin===origin){
          const response=await worker.handle(new Request(request.url(),{method:request.method(),headers:await request.allHeaders(),...(request.postData()?{body:request.postData(),duplex:'half'}:{})}),env,edgeAPI);
          if(response.status===302)return route.fulfill({contentType:'text/html',body:'<script>location.replace('+JSON.stringify(response.headers.get('Location'))+')</script>'});
          return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
        }
        assert.equal(url.origin,supa,'Unexpected test network destination');
        const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
        if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
        const args=JSON.parse(request.postData()||'{}');
        if(url.pathname==='/auth/v1/token'){
          assert(args.email===sessions[who].user.email&&args.password===password||args.refresh_token===sessions[who].refresh_token);
          return route.fulfill({headers,json:sessions[who]});
        }
        const actor=identify((await request.allHeaders()).authorization);assert(actor);
        if(url.pathname==='/auth/v1/user')return route.fulfill({headers,json:sessions[actor].user});
        if(url.pathname==='/auth/v1/logout')return route.fulfill({headers,json:{}});
        const name=url.pathname.split('/').pop();
        const value=name==='kalistar_models'?await database.models():await database.call(name,args,actor);
        return route.fulfill({headers,json:value});
      }catch(error){errors.push(error.message);await route.fulfill({status:500,body:'Disposable fixture error'}).catch(()=>{});}
    });
    const p=await context.newPage();p.setDefaultTimeout(15000);p.on('pageerror',error=>errors.push(error.message));
    await p.goto(origin+'/jeu/#journeys');await p.waitForURL('**/jeu/login*');
    await p.locator('#login-form button[type=submit]:enabled').waitFor();
    await p.locator('input[name=email]').fill(sessions[who].user.email);await p.locator('input[name=password]').fill(password);await p.locator('#login-form [type=submit]').click();
    await ready(p);await view(p);return p;
  }
  async function ready(p){await p.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_JOURNEYS&&window.KALISTAR_SYNC,null,{timeout:60000});}
  async function closeDialogs(p){await p.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});await p.waitForFunction(()=>!history.state?.kalistarDialogBack);}
  async function view(p){await closeDialogs(p);await p.evaluate(()=>location.hash='journeys');await p.locator('.jv-view').waitFor();await p.waitForFunction(()=>KALISTAR_JOURNEYS.snapshot().status==='ready');}
  async function shot(name){await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});}
  async function state(p){return p.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.game')||'null'));}
  function command(s,policy=0,step=0){
    if(E.equipmentChoice(s))return {method:'grantEquipment',args:[E.aiEquipmentChoice(s)]};
    if(s.phase==='initiative')return {method:'rollInitiative'};
    if(s.phase==='choose'){
      const pairs=s.players[0].board.flatMap((u,a)=>u?s.players[1].board.flatMap((v,b)=>v?[[a,b]]:[]):[]);
      return {method:'lock',args:s.turn===0&&policy?pairs[(step*(policy+1)+policy*7)%pairs.length]:E.aiChoice(s)};
    }
    if(s.phase==='attack')return {method:'rollAttack'};if(s.phase==='defense')return {method:'rollDefense'};
    if(s.phase==='kalistel')return {method:E.aiUseKalistel(s)?'useKalistel':'acceptAttack'};
    if(s.phase==='replace')return {method:'autoDeploy',args:[s.replacing]};if(s.phase==='result')return {method:'next'};
    const name={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];assert(name);return {method:'grant'+name,args:[E['ai'+name+'Choice'](s)]};
  }
  async function playEntireAttempt(initial,policy){
    let s=initial,step=0,moves=0;
    while(s.phase!=='over'){
      const commands=[command(s,policy,step++)],before=s;
      s=await page.evaluate(async({state,commands})=>KALISTAR_JOURNEYS.move(state,commands),{state:s,commands});moves+=commands.length;
      E.assertState(s);assert.equal(s.journey.sequence,before.journey.sequence+1);assert(moves<4000);
    }
    await page.evaluate(()=>KALISTAR_JOURNEYS.refresh());return {s,moves};
  }
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    stage='desktop-library';page=await device({width:1440,height:1000},'user-tokyo');
    await page.locator('.jv-cover').first().waitFor();assert.equal(await page.locator('.jv-cover').count(),3);await shot('desktop-library');
    assert.equal(await page.evaluate(()=>KALISTAR_JOURNEYS.snapshot().isAdmin),false);
    await page.locator('[data-jv-filter=character]').selectOption('momo');assert.equal(await page.locator('.jv-cover').count(),1);
    await page.locator('[data-jv-action=reset-filters]').click();await page.locator('[data-jv-book=momo-petits-bonheurs]').click();
    assert.equal(await page.locator('[data-jv-action=stage]').count(),4);await shot('desktop-book-four-stages');
    stage='phone-reader';await page.setViewportSize({width:412,height:1007});await shot('razr-book');
    const layout=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,stages:[...document.querySelectorAll('[data-jv-action=stage]')].map(n=>n.getBoundingClientRect().width)}));
    assert(layout.scroll<=layout.width+1);assert(layout.stages.every(w=>w>=32));
    await page.locator('[data-jv-action=library]').click();await shot('razr-library');
    await page.locator('[data-jv-book=momo-petits-bonheurs]').click();
    stage='real-app-start';startGate=new Promise(resolve=>{releaseStart=resolve;});await page.locator('[data-jv-action=start]').click();
    await page.evaluate(()=>location.hash='story');await page.locator('.story-library,.story-reader').first().waitFor();releaseStart();releaseStart=null;
    await page.waitForFunction(()=>!!JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.game')||'null')?.journey);
    assert.equal(new URL(page.url()).hash,'#story','A delayed launch must not pull the reader back into the arena');
    await view(page);if(await page.locator('[data-jv-book=momo-petits-bonheurs]').count())await page.locator('[data-jv-book=momo-petits-bonheurs]').click();
    await page.locator('[data-jv-action=resume]').click();await page.locator('.game-shell').waitFor();
    await page.waitForFunction(()=>!!document.querySelector('.li-skip')||!!document.querySelector('[data-action=skip-lineup]'),null,{timeout:30000});
    if(await page.locator('.li-skip').count())await page.locator('.li-skip').click();else await page.locator('[data-action=skip-lineup]').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.game'))?.phase!=='initiative');
    await shot('razr-real-arena');
    stage='human-ui-signed-command';let clicked=false;
    for(let action=0;action<12&&!clicked;action++){
      await page.waitForFunction(()=>{const g=JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.game'));return g&&(g.phase==='choose'&&g.turn===0||g.phase==='result'||g.phase==='replace'&&g.replacing===0||g.phase==='defense'&&g.turn===1&&!g.duel.autoDefense);},null,{timeout:40000});
      const current=await state(page);
      if(current.phase==='result'){await page.locator('[data-action=next]:enabled').click();continue;}
      if(current.phase==='replace'){await page.locator('[data-action=auto-replace]:enabled').click();continue;}
      if(current.phase==='defense'){await page.locator('[data-action=roll]:enabled').click();continue;}
      const pair=E.aiChoice(current);
      await page.locator('.slot-card[data-side="0"][data-slot="'+pair[0]+'"]').click();
      await page.locator('.slot-card[data-side="1"][data-slot="'+pair[1]+'"]').click();
      await page.locator('[data-action=lock]:enabled').click();
      await page.locator('[data-action=roll]:enabled').waitFor();
      await page.locator('[data-action=roll]:enabled').click();
      await page.waitForFunction(sequence=>JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.game')).journey.sequence>=sequence+2,current.journey.sequence);
      clicked=true;
    }
    assert(clicked,'A real player must be able to engage and roll through the normal arena controls');
    await page.waitForFunction(()=>document.querySelector('[data-action=journey-return]')&&!document.querySelector('#app.rolling'));
    // Navigation is deliberately attempted through the real control, so the
    // app cannot leave a network command or combat animation half committed.
    await page.locator('[data-action=journey-return]').click();await page.locator('.jv-view').waitFor({timeout:30000});
    stage='canonical-resume';const before=await state(page);await page.reload();await ready(page);await closeDialogs(page);const after=await state(page);
    assert.equal(after.matchId,before.matchId);assert(after.journey.sequence>=before.journey.sequence);
    await view(page);await page.locator('[data-jv-book=momo-petits-bonheurs]').click();await page.locator('[data-jv-action=resume]').waitFor();await shot('razr-resume');
    // Keep the arena unmounted while making legal commands rapidly. UI/AI timers
    // cannot race this full end-to-end Worker/PostgreSQL transcript.
    const book='momo-petits-bonheurs';let totalMoves=0,attempts=0,losses=0;
    for(let index=0;index<4;index++){
      stage='full-server-combat-'+(index+1);let initial=index===0?await page.evaluate(id=>KALISTAR_JOURNEYS.resume(id),after.journey.attemptId):await page.evaluate(async book=>{await KALISTAR_SYNC.flush();const deck=JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.teamDraft'));return KALISTAR_JOURNEYS.start(book,deck);},book);
      let played;
      do{
        assert(++attempts<=20,'Bounded fair-play fixture exhausted its hourly start allowance');
        played=await playEntireAttempt(initial,0);totalMoves+=played.moves;
        if(played.s.winner!==0){losses++;assert.equal(await page.evaluate(book=>KALISTAR_JOURNEYS.snapshot().progress[book].cleared,book),index);initial=await page.evaluate(book=>KALISTAR_JOURNEYS.start(book,JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.teamDraft'))),book);}
      }while(played.s.winner!==0);
      assert.equal(await page.evaluate(book=>KALISTAR_JOURNEYS.snapshot().progress[book].cleared,book),index+1);
      await page.reload();await ready(page);await closeDialogs(page);await view(page);
    }
    stage='reward';await page.locator('[data-jv-book=momo-petits-bonheurs]').click();await page.locator('[data-jv-action=claim]').click();await page.locator('.jv-reward[open]').waitFor();
    await page.waitForFunction(()=>[...document.querySelectorAll('.jv-reward img')].every(img=>img.complete&&img.naturalWidth));await shot('razr-earned-card');
    await page.locator('.jv-reward [data-jv-action=acknowledge]').click();await page.waitForFunction(()=>!document.querySelector('.jv-reward'));
    assert.equal(await page.evaluate(()=>KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).length),11);
    await page.reload();await ready(page);await closeDialogs(page);await view(page);
    const progress=await page.evaluate(book=>KALISTAR_JOURNEYS.snapshot().progress[book],book);assert(progress.completed&&progress.claimed&&progress.acknowledged);assert.equal(progress.cleared,4);
    assert.equal(await page.locator('[data-jv-action=start]').count(),0);await shot('razr-completed-library');
    result.profiles.push({name:'Tokyo',fourWins:true,totalMoves,attempts,losses,owned:11,reload:true,normalRole:true,arenaUICommands:true,viewports:[1440,412]});
    stage='admin';page=await device({width:1440,height:1000},'user-paris');assert.equal(await page.evaluate(()=>KALISTAR_JOURNEYS.snapshot().isAdmin),true);
    await page.locator('[data-jv-book=balmhyr-retour]').click();await page.locator('[data-jv-stage="3"]').click();await page.locator('[data-jv-action=preview]').waitFor();await shot('desktop-admin-fourth-stage');
    await page.locator('[data-jv-action=preview]').click();await page.locator('.journey-arena-strip').waitFor();assert.match(await page.locator('.journey-arena-strip').innerText(),/Aperçu/);
    assert.equal(await state(page),null,'An admin preview must not become a persisted or reward-bearing game');
    await view(page);assert((await page.evaluate(()=>Object.values(KALISTAR_JOURNEYS.snapshot().progress))).every(p=>p.cleared===0&&!p.claimed));
    result.profiles.push({name:'Paris',admin:true,previewWithoutProgress:true});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);result.passed=true;
    console.log('PASS journeys browser: four complete signed command transcripts, Tokyo reward/reload, Paris preview, PC/Razr.');
  }catch(error){result.failure={stage,message:error.message};if(page&&!page.isClosed()){await shot('failure-'+stage).catch(()=>{});result.failure.ui=await page.locator('body').innerText().catch(()=>null);}throw error;}
  finally{releaseStart?.();result.errors=errors;result.missing=missing;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));for(const c of contexts)await c.close().catch(()=>{});await browser?.close();await database.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
