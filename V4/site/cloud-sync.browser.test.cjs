'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_cloud_sync_browser.cjs'));
const {chromium}=runtime('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/cloud-sync'));
const origin='https://kalistar.pages.dev',supabaseOrigin='https://fkskjhlaaagqlfcsojjp.supabase.co';
const PARIS='11111111-1111-4111-8111-111111111111',TOKYO='22222222-2222-4222-8222-222222222222';
const AXE='fallen-king-axe',KAYLIS='30000012',MOMO='30000001'; // First visible Momo version in the Paris binder.
const profiles=[{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true}];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg','.wasm':'application/wasm'};
const credentials='only-a-fixture-password';
const prefix=userId=>'kalistar.v4.cloud.'+userId+'.';
function token(profile){
  const id=profile==='user-paris'?PARIS:TOKYO,email=profile==='user-paris'?'paris@example.invalid':'tokyo@example.invalid';
  const access_token=Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated',aud:'authenticated'})).toString('base64url')+'.fixture-signature';
  return {access_token,refresh_token:'fixture-refresh-'+profile,expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:{id,email,email_confirmed_at:'2026-10-16T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}};
}
function inside(root,file){return file.startsWith(root+path.sep);}
async function main(){
  assert(fs.existsSync(path.join(dist,'_worker.js')),'Build CF_PAGES=1 required: missing _worker.js');
  for(const name of ['cloud-sync.js','cloud-sync-ui.js','cloud-player.js','cloud-ownership.js'])assert(fs.existsSync(path.join(dist,'jeu',name)),'Build lacks '+name);
  fs.mkdirSync(output,{recursive:true});
  const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
  const worker=await import(pathToFileURL(path.join(dist,'_worker.js')).href);
  const database=await require('../deploy/supabase/browser-fixture.cjs').create(data);
  let browser;const results={passed:false,mode:'disposable Chrome + built Worker + official SDK + local PostgreSQL migrations',catalogue:data.cards.length,profiles:[],issues:[]};
  const sessions={'user-paris':token('user-paris'),'user-tokyo':token('user-tokyo')};
  const identify=authorization=>Object.entries(sessions).find(([,s])=>'Bearer '+s.access_token===authorization)?.[0]||null;
  let currentProfile='setup',stage='setup',currentPage=null;
  const contexts=[],pageErrors=[],routeErrors=[],calls=[],missingAssets=new Set();
  async function edgeAPI(url,options={}){
    const u=new URL(url),headers=new Headers(options.headers),who=identify(headers.get('authorization'));
    assert.equal(u.origin,supabaseOrigin,'Worker attempted an unexpected origin');
    if(u.pathname==='/auth/v1/user')return new Response(JSON.stringify(who?sessions[who].user:{message:'Unauthorized'}),{status:who?200:401});
    if(u.pathname==='/rest/v1/rpc/kalistar_access'){
      if(!who)return new Response(JSON.stringify({code:'42501',message:'Fixture access denied'}),{status:403});
      return new Response(JSON.stringify(await database.call('kalistar_access',{},who)),{status:200});
    }
    throw Error('Unexpected Worker request '+u.pathname);
  }
  const env={KALISTAR_SESSION_KEY:'test-only-session-key-'.repeat(4),ASSETS:{fetch:async request=>{
    let relative=decodeURIComponent(new URL(request.url).pathname).replace(/^\//,'');
    if(!relative||relative.endsWith('/'))relative+='index.html';
    if(relative==='jeu/login')relative+='.html';
    const file=path.resolve(dist,relative);assert(inside(dist,file),'Asset path outside disposable build');
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){missingAssets.add(relative);return new Response('Missing isolated QA asset',{status:404});}
    return new Response(fs.readFileSync(file),{headers:{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}});
  }}};
  async function device(profile,label){
    const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:'reduce',serviceWorkers:'block'});
    contexts.push(context);
    // There is no pass-through: assets, authentication and RPCs all stay in this process.
    await context.route('**/*',async route=>{
      const request=route.request(),u=new URL(request.url());
      try{
        if(u.origin===origin){
          const response=await worker.handle(new Request(request.url(),{method:request.method(),headers:await request.allHeaders(),...(request.postData()?{body:request.postData()}:{}),...(request.method()==='GET'?{}:{duplex:'half'})}),env,edgeAPI);
          // Redirected browser requests otherwise bypass Playwright's routing handler.
          if(response.status===302)return await route.fulfill({contentType:'text/html',body:'<!doctype html><script>location.replace('+JSON.stringify(response.headers.get('Location'))+')</script>'});
          return await route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:Buffer.from(await response.arrayBuffer())});
        }
        assert.equal(u.origin,supabaseOrigin,'Unexpected external HTTP request: '+u.origin+u.pathname);
        const headers={'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'GET,POST,OPTIONS'};
        if(request.method()==='OPTIONS')return await route.fulfill({status:204,headers});
        const args=request.postData()?JSON.parse(request.postData()):{},name=u.pathname.split('/').pop();
        if(u.pathname==='/auth/v1/token'){
          const refresh=Object.entries(sessions).find(([,s])=>s.refresh_token===args.refresh_token)?.[0];
          const who=refresh||Object.keys(sessions).find(p=>sessions[p].user.email===args.email);
          assert(who&&(refresh||args.password===credentials),'Only fictional accounts and passwords are permitted');
          return await route.fulfill({headers,json:sessions[who]});
        }
        if(u.pathname==='/auth/v1/logout')return await route.fulfill({headers,json:{}});
        const who=identify((await request.allHeaders()).authorization);
        assert(who,'Missing fictional identity for '+u.pathname);
        if(u.pathname==='/auth/v1/user')return await route.fulfill({headers,json:sessions[who].user});
        assert(u.pathname.startsWith('/rest/v1/'),'Unexpected Auth endpoint '+u.pathname);
        calls.push({device:label,profile:who,name,revision:args.p_expected_revision??null,takeover:args.p_takeover??false});
        try{
          const result=name==='kalistar_models'?await database.models():await database.call(name,args,who);
          return await route.fulfill({headers,json:result});
        }catch(error){
          routeErrors.push({device:label,rpc:name,code:error.code||null,message:error.message});
          return await route.fulfill({headers,status:403,json:{code:error.code||'FIXTURE_RPC',message:error.message}});
        }
      }catch(error){
        if(/Target.*closed|page.*closed|context.*closed|browser.*closed/i.test(error.message))return;
        routeErrors.push({device:label,url:u.origin+u.pathname,message:error.message});
        await route.fulfill({status:500,body:'Isolated cloud sync fixture failed'}).catch(()=>{});
      }
    });
    const page=await context.newPage();page.setDefaultTimeout(12000);
    page.on('pageerror',error=>pageErrors.push({device:label,message:error.message}));
    return {context,page,label};
  }
  async function shot(page,name){await page.screenshot({path:path.join(output,currentProfile+'-'+name+'.png')});}
  async function ready(page){
    await page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_SYNC&&window.KALISTAR_DB,null,{timeout:45000});
  }
  async function login(d,profile){
    currentPage=d.page;
    await d.page.goto(origin+'/jeu/#decks');await d.page.waitForURL('**/jeu/login*');
    await d.page.locator('#login-form button[type=submit]:enabled').waitFor();
    await d.page.locator('input[name=email]').fill(sessions[profile].user.email);
    await d.page.locator('input[name=password]').fill(credentials);await d.page.locator('#login-form [type=submit]').click();
    await ready(d.page);
    assert.equal(await d.page.evaluate(()=>KALISTAR_ACTIVE_USER),profile);
    const cookies=await d.context.cookies();assert(cookies.some(c=>c.name==='__Host-kalistar'&&c.secure&&c.httpOnly),'Actual Worker must issue the HttpOnly cookie');
  }
  async function closeDialogs(page){
    await page.evaluate(()=>{for(const dialog of document.querySelectorAll('dialog[open]'))dialog.close();});
    await page.waitForFunction(()=>!document.querySelector('dialog[open]')&&!history.state?.kalistarDialogBack);
  }
  async function view(page,name){
    currentPage=page;await closeDialogs(page);
    await page.evaluate(value=>{location.hash=value;},name);
    await page.waitForFunction(value=>location.hash==='#'+value,name);
    await page.locator({decks:'.team-page',weapons:'.weapons-page',story:'.story-library,.story-reader',collection:'.cb-heading',arena:'.game-shell'}[name]).first().waitFor();
  }
  async function flush(page,expected='synced'){
    let state;
    for(let attempt=0;attempt<10;attempt++){
      state=await page.evaluate(async()=>{await KALISTAR_DB.idle();return KALISTAR_SYNC.flush();});
      if(state.status===expected&&!state.pending)return state;
      if(['conflict','busy','unauthorized','error'].includes(state.status)&&state.status!==expected)throw Error('Unexpected sync state '+JSON.stringify(state));
      await page.waitForTimeout(80);
    }
    assert.equal(state.status,expected);assert.equal(state.pending,false);return state;
  }
  async function local(page,userId){
    return page.evaluate(p=>{
      const read=key=>JSON.parse(localStorage.getItem(p+key)||'null');
      return {name:read('deckName'),draft:read('teamDraft'),favorites:read('favorites'),story:read('story-progress'),game:read('game'),
        library:read('kalistar.v4.deckLibrary.'+encodeURIComponent(KALISTAR_ACTIVE_USER)),equipment:KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER),database:KALISTAR_DB.name,sync:KALISTAR_SYNC.snapshot()};
    },prefix(userId));
  }
  async function renameDeck(page,name){
    await view(page,'decks');
    const input=page.locator('[data-deck-action=name]');
    if(!await input.isVisible())await page.locator('[data-deck-action=manage]').first().click();
    await input.fill(name);
    await input.press('Tab');
    const manager=page.locator('[data-deck-action=manage]').first();
    if(await manager.getAttribute('aria-expanded')==='true'){
      const modalClose=page.locator('dialog.team-management[open] [data-deck-action=manage]');
      if(await modalClose.count())await modalClose.click();else await manager.click();
      await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
    }
    const save=page.locator('[data-deck-action=save]:visible').first();
    assert(await save.isEnabled());await save.press('Enter');
  }
  async function favorite(page,id){
    await view(page,'collection');
    const name=data.cards.find(c=>c.id===id).name;
    await page.locator('[data-binder-field=search]').fill(name);
    const target=page.locator('[data-binder-action=favorite][data-id="'+id+'"]');
    await target.first().waitFor();if(await target.first().getAttribute('aria-pressed')!=='true')await target.first().click();
    await page.waitForFunction(id=>[...document.querySelectorAll('[data-binder-action=favorite]')].some(n=>n.dataset.id===id&&n.getAttribute('aria-pressed')==='true'),id);
  }
  async function globalEquipment(page,equip){
    await view(page,'weapons');await page.locator('[data-weapon="'+AXE+'"]').click();
    await page.locator('#weapons-dialog[open]').waitFor();
    await page.locator('#weapons-dialog [data-weapon-action='+(equip?'equip':'unequip')+'][data-character=balmhyr]').click();
    await page.waitForFunction(({equip,id})=>!!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon.balmhyr===equip,{equip,id:AXE});
    await page.locator('#weapons-dialog [data-weapon-action=close]').click();
  }
  async function reading(page){
    await view(page,'story');await page.locator('[data-story-action=open-book]').click();
    await page.locator('.story-reader').waitFor();
    const select=page.locator('[data-story-select]');
    if(await select.isVisible())await select.selectOption('1');else await page.locator('[data-story-section="1"]').click();
    await page.locator('[data-story-action=theme]').click();
    await page.waitForFunction(p=>{const s=JSON.parse(localStorage.getItem(p+'story-progress')||'null');return s?.section===1&&s.paper==='night';},prefix(PARIS));
  }
  async function busy(page){
    await ready(page);
    const settled=await page.waitForFunction(()=>{const state=KALISTAR_SYNC.snapshot();return ['busy','conflict','error','unauthorized'].includes(state.status)&&state;},null,{timeout:20000});
    const state=await settled.jsonValue();await settled.dispose();
    assert.equal(state.status,'busy','A fresh second device must download progress, then show the real busy lease');
    assert.equal(state.canWrite,false);
    await page.locator('.cloud-sync-dialog[open] [data-sync-action=takeover]').waitFor();
  }
  async function formerWriter(page){
    currentPage=page;
    try{await page.evaluate(()=>KALISTAR_SYNC.flush());}catch(error){if(!/context.*destroyed|navigation/i.test(error.message))throw error;}
    await busy(page);
  }
  async function takeover(page){
    currentPage=page;await busy(page);
    await page.locator('.cloud-sync-dialog[open] [data-sync-action=takeover]').click();
    await ready(page);await page.waitForFunction(()=>KALISTAR_SYNC.snapshot().status==='synced'&&KALISTAR_SYNC.snapshot().canWrite);
    await closeDialogs(page);await flush(page);
  }
  async function player(page,profile){
    return page.evaluate(profile=>({count:KALISTAR_DB.registry.owned(profile).length,cards:KALISTAR_DB.registry.owned(profile),users:KALISTAR_DB.registry.users(),deck:JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+(profile==='user-paris'?'11111111-1111-4111-8111-111111111111':'22222222-2222-4222-8222-222222222222')+'.teamDraft')),db:KALISTAR_DB.name}),profile);
  }
  async function tokyoMatch(d,result){
    const page=d.page;stage='tokyo-match-equipment';currentPage=page;
    await globalEquipment(page,true);await view(page,'decks');
    assert.equal(await page.locator('[data-deck-action=slot][data-slot="0"] img').getAttribute('alt'),'BALMHYR');
    await page.locator('[data-deck-action=slot][data-slot="0"]').click();
    await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
    const equip=page.locator('[data-deck-action=equip][data-id="'+AXE+'"]');
    if(await equip.count())await equip.click();
    await page.waitForFunction(p=>JSON.parse(localStorage.getItem(p+'teamDraft')).equipment.weapon.balmhyr==='fallen-king-axe',prefix(TOKYO));
    const board=page.locator('[data-deck-action=panel][data-id=board]');if(await board.isVisible())await board.click();
    await page.locator('[data-deck-action=captain][data-slot="4"]').click();
    await flush(page);
    stage='tokyo-match-launch';await page.locator('[data-deck-action=play]').click();
    await page.locator('#game-mode').selectOption('local');await page.locator('#enemy-deck-preset').selectOption('enemy');
    const seed=await page.evaluate(p=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),team=JSON.parse(localStorage.getItem(p+'teamDraft')),T=KalistarTeamComposition.create(E);
      const arenaId=document.querySelector('#match-arena').value,enemy=T.fromPreset({name:'Fixture enemy',cards:KALISTAR_DATA.decks.enemy});
      for(let i=0;i<500;i++){
        const seed='CLOUD-SYNC-D6-'+i,s=E.newGame(team,enemy,{mode:'local',seed,arenaId,deckCoverage:2,turnOrder:'ABBA'});
        if(s.phase==='setup')E.start(s);while(s.phase==='initiative')E.rollInitiative(s);if(s.turn!==0)continue;
        E.lock(s,0,0);E.rollAttack(s);if(s.duel.attackDie!==6)continue;
        if(s.phase==='kalistel')E.acceptAttack(s);if(s.phase!=='defense')continue;
        E.rollDefense(s);if(s.phase==='result'&&s.duel.formula?.equipmentWeapon>0)return seed;
      }
      throw Error('No deterministic genuine D6 scenario found');
    },prefix(TOKYO));
    await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill(seed);
    const previousToast=await page.locator('#toast').textContent();
    await page.locator('#new-game-form [type=submit]:enabled').click();
    await page.waitForFunction(({p,previousToast})=>!!JSON.parse(localStorage.getItem(p+'game')||'null')||
      !!document.querySelector('#toast')?.textContent&&document.querySelector('#toast').textContent!==previousToast,{p:prefix(TOKYO),previousToast});
    assert((await local(page,TOKYO)).game,'Tokyo launch rejected: '+await page.locator('#toast').textContent());
    if(await page.locator('.li-skip').count())await page.locator('.li-skip').click();
    else if(await page.locator('[data-action=skip-lineup]').count())await page.locator('[data-action=skip-lineup]').click();
    await page.waitForFunction(p=>JSON.parse(localStorage.getItem(p+'game'))?.phase==='choose',prefix(TOKYO),{timeout:30000});
    assert(calls.some(c=>c.device===d.label&&c.name==='kalistar_validate_deck'),'Launch must validate the owned deck through SQL');
    const launched=(await local(page,TOKYO)).game;
    assert.equal(launched.collection.userId,'user-tokyo');assert.equal(Object.keys(launched.collection.bindings).length,10);
    assert.equal(new Set(Object.values(launched.collection.bindings)).size,10);
    assert.equal(launched.composition.teams[0].captain,KAYLIS);
    const frozen=launched.equipment;assert.equal(frozen.version,2);
    await page.locator('.slot-card[data-side="0"][data-slot="0"]').click();await page.locator('.slot-card[data-side="1"][data-slot="0"]').click();
    await page.locator('[data-action=lock]:enabled').click();await page.locator('[data-action=roll]:enabled').click();
    await page.waitForFunction(p=>['kalistel','defense'].includes(JSON.parse(localStorage.getItem(p+'game'))?.phase),prefix(TOKYO));
    if((await local(page,TOKYO)).game.phase==='kalistel')await page.locator('[data-action=accept-attack]:enabled').click();
    await page.waitForFunction(p=>JSON.parse(localStorage.getItem(p+'game'))?.phase==='defense',prefix(TOKYO));
    const attack=(await local(page,TOKYO)).game;
    assert.equal(attack.duel.attackDie,6);assert.equal(attack.duel.equipment.weapon.weaponId,AXE);assert(attack.duel.equipment.weapon.value>0);
    await flush(page);await shot(page,'tokyo-d6-weapon');
    stage='tokyo-snapshot';await globalEquipment(page,false);await flush(page);
    const remote=await database.read('user-tokyo'),match=remote.payload.matches.find(m=>m.id===attack.matchId);
    assert.equal(remote.payload.equipment.slots.weapon.balmhyr,undefined);assert.deepEqual(match.state.equipment,frozen,'Unequipping cannot alter an existing match');
    assert.equal(remote.payload.activeMatchId,attack.matchId);assert(match.profiles.length<=20);assert.equal(match.arenas.length,1);
    const second=await device({...profiles.find(p=>p.name===currentProfile)},currentProfile+'-tokyo-second');
    await login(second,'user-tokyo');await busy(second.page);await shot(second.page,'tokyo-reprise-busy');
    const restored=(await local(second.page,TOKYO)).game;
    for(const key of ['matchId','rng','phase','players','equipment','duel','collection'])assert.deepEqual(restored[key],match.state[key],'Resume preserves '+key);
    await takeover(second.page);await formerWriter(page);await shot(page,'tokyo-former-writer-busy');
    await closeDialogs(page);await view(page,'arena');
    const beforeBlocked=(await local(page,TOKYO)).game,blockedButton=page.locator('[data-action=roll]').first();
    if(await blockedButton.isEnabled())await blockedButton.click();
    assert.deepEqual((await local(page,TOKYO)).game,beforeBlocked,'Former writer cannot advance combat');
    currentPage=second.page;await second.page.reload();await ready(second.page);await flush(second.page);
    assert.equal((await local(second.page,TOKYO)).game.matchId,attack.matchId);
    await view(second.page,'arena');
    await second.page.locator('[data-action=roll]:enabled').click();
    await second.page.waitForFunction(p=>JSON.parse(localStorage.getItem(p+'game'))?.phase==='result',prefix(TOKYO));
    const end=(await local(second.page,TOKYO)).game,formula=end.duel.formula;
    assert.equal(formula.equipmentWeapon,attack.duel.equipment.weapon.value);
    const withoutEquipment=formula.baseAttack+formula.weapon+formula.element+formula.faction+formula.buff+formula.barrier+formula.arenaAttack+(formula.captainAttack||0);
    assert.equal(formula.attack,Math.max(0,withoutEquipment+formula.equipmentAttack));
    assert(JSON.stringify(end.log).includes(attack.duel.equipment.weapon.name),'Combat journal names the real equipment');
    await flush(second.page);await shot(second.page,'tokyo-resumed-result');
    result.match={seed,id:attack.matchId,attackDie:attack.duel.attackDie,weaponBonus:formula.equipmentWeapon,phase:end.phase,bindings:10,snapshotPreserved:true,formerWriterFrozen:true};
  }
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const profile of profiles.filter(p=>!process.env.KALISTAR_SYNC_PROFILES||process.env.KALISTAR_SYNC_PROFILES.split(',').includes(p.name))){
      currentProfile=profile.name;await database.resetProgress();stage='paris-first-login';
      const first=await device(profile,profile.name+'-paris-first');await login(first,'user-paris');await flush(first.page);
      const paris=await player(first.page,'user-paris');assert.equal(paris.count,data.cards.length);assert.equal(paris.users.length,1);assert(paris.db.endsWith(PARIS));
      const result={profile:profile.name,passed:false,paris:paris.count,checks:['paris-owned-complete-catalogue']};results.profiles.push(result);
      stage='paris-progress';const name='Synchro '+profile.name+' PC';
      await renameDeck(first.page,name);await favorite(first.page,KAYLIS);await globalEquipment(first.page,true);await reading(first.page);await view(first.page,'decks');await flush(first.page);
      const cloud=await database.read('user-paris');assert(cloud.revision>0);assert.equal(cloud.payload.preferences.teamDraft.name,name);
      assert(cloud.payload.preferences.favorites.includes(KAYLIS));assert(cloud.payload.deckLibrary.decks.some(d=>d.name===name));assert.equal(cloud.payload.equipment.slots.weapon.balmhyr,AXE);
      assert.equal(cloud.payload.preferences['story-progress'].section,1);assert.equal(cloud.payload.preferences['story-progress'].paper,'night');
      assert.equal(cloud.payload.schema,2);
      assert.deepEqual(Object.keys(cloud.payload).sort(),['schema','edition','localProfile','preferences','deckLibrary','equipment','matches','archives','activeMatchId','releasedMatches'].sort(),'Progress RPC contains no ownership registry or credentials');
      assert.equal(cloud.payload.localProfile,'user-paris');assert.equal(cloud.payload.activeMatchId,null);await shot(first.page,'paris-pc-saved');
      result.checks.push('real-ui-deck-favorites-equipment-story-upload');
      if(profile.name==='desktop'){
        stage='large-history-upload';
        result.largeHistory=await first.page.evaluate(async()=>{
          await KALISTAR_SYNC.pause();
          const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),samples=[];
          const step=s=>{
            if(E.equipmentChoice(s))return E.grantEquipment(s,E.aiEquipmentChoice(s));
            if(s.phase==='initiative')return E.rollInitiative(s);
            if(s.phase==='choose')return E.lock(s,...E.aiChoice(s));
            if(s.phase==='attack')return E.rollAttack(s);
            if(s.phase==='defense')return E.rollDefense(s);
            if(s.phase==='kalistel')return E.aiUseKalistel(s)?E.useKalistel(s):E.acceptAttack(s);
            if(s.phase==='result')return E.next(s);
            if(s.phase==='replace')return E.autoDeploy(s,s.replacing);
            const pair={clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice'],guard:['grantGuard','aiGuardChoice']}[s.phase];
            if(!pair)throw Error('Unexpected history phase');return E[pair[0]](s,E[pair[1]](s));
          };
          for(let i=0;i<5;i++){
            const s=KALISTAR_DB.registry.bindGame('user-paris',E.newGame(T.fromPreset({name:'History',cards:KALISTAR_DATA.decks.player}),T.fromPreset({name:'Enemy',cards:KALISTAR_DATA.decks.enemy}),{mode:'ai',seed:'archive-large-'+i,turnOrder:'ABBA'}));
            let actions=0;while(s.phase!=='over'&&actions++<10000)step(s);if(s.phase!=='over')throw Error('Incomplete history simulation');samples.push(s);
          }
          for(let i=0;i<120;i++){const s=structuredClone(samples[i%5]);s.matchId='match-'+crypto.randomUUID();await KALISTAR_DB.saveGame(s);}
          const entries=KALISTAR_DB.matches(),bytes=new TextEncoder().encode(JSON.stringify(entries)).length;
          KALISTAR_SYNC.changed();await KALISTAR_SYNC.retry();
          return {matches:entries.length,fullBytes:bytes,sampleId:entries[0].id,sampleWinner:entries[0].state.winner,sampleKills:entries[0].summary.units.reduce((n,u)=>n+u.kills,0)};
        });
        await flush(first.page);await closeDialogs(first.page);
        const large=await database.read('user-paris');assert.equal(large.payload.archives.length,120);assert.equal(large.payload.matches.length,0);
        result.largeHistory.wireBytes=Buffer.byteLength(JSON.stringify(large.payload));
        assert(result.largeHistory.fullBytes>8*1024*1024);assert(result.largeHistory.wireBytes<100000);
        assert(calls.some(c=>c.device===first.label&&c.name==='kalistar_archive_put'));
      }
      stage='paris-second-login';const second=await device({...profile,mobile:!profile.mobile,width:profile.mobile?1440:412,height:profile.mobile?1000:1007},profile.name+'-paris-second');
      await login(second,'user-paris');await busy(second.page);
      const copied=await local(second.page,PARIS);assert.equal(copied.name,name);assert(copied.favorites.includes(KAYLIS));assert.equal(copied.equipment.slots.weapon.balmhyr,AXE);
      if(result.largeHistory){
        const restored=await second.page.evaluate(id=>({count:KALISTAR_DB.matches().length,winner:KALISTAR_DB.match(id).state.winner,kills:KALISTAR_DB.match(id).summary.units.reduce((n,u)=>n+u.kills,0)}),result.largeHistory.sampleId);
        assert.equal(restored.count,120);assert.equal(restored.winner,result.largeHistory.sampleWinner);assert.equal(restored.kills,result.largeHistory.sampleKills);
        assert(calls.filter(c=>c.device===second.label&&c.name==='kalistar_archive_read').length>=15);result.checks.push('120-archives-paged-restore-over-eight-mib');
      }
      assert(copied.library.decks.some(d=>d.name===name));assert.equal(copied.story.section,1);assert.equal(copied.story.paper,'night');await shot(second.page,'paris-second-busy');
      result.checks.push('second-device-restores-all-progress');
      stage='paris-takeover';const claimsBefore=calls.filter(c=>c.takeover).length;await takeover(second.page);assert.equal(calls.filter(c=>c.takeover).length,claimsBefore+1);
      await formerWriter(first.page);await shot(first.page,'paris-former-writer-busy');
      result.checks.push('explicit-takeover-former-writer-busy');
      const secondName='Synchro '+profile.name+' reprise';await renameDeck(second.page,secondName);await favorite(second.page,MOMO);await view(second.page,'decks');await flush(second.page);
      await second.page.reload();await ready(second.page);await flush(second.page);
      const reloaded=await local(second.page,PARIS);assert.equal(reloaded.name,secondName);assert(reloaded.favorites.includes(MOMO));assert.equal(reloaded.story.section,1);assert.equal(reloaded.equipment.slots.weapon.balmhyr,AXE);
      assert.equal((await database.read('user-paris')).payload.preferences.teamDraft.name,secondName);await shot(second.page,'paris-reloaded');
      result.checks.push('latest-data-survive-reload');
      stage='tokyo-login';const tokyo=await device(profile,profile.name+'-tokyo-first');await login(tokyo,'user-tokyo');await flush(tokyo.page);
      const owned=await player(tokyo.page,'user-tokyo');assert.equal(owned.count,10);assert(owned.cards.some(c=>c.modelId===KAYLIS));assert.equal(owned.users.length,1);assert(owned.db.endsWith(TOKYO));
      assert.equal(owned.deck.cards.length,10);assert(owned.deck.cards.includes(KAYLIS));
      const coverage=[1,2,3,4,5].map(p=>owned.deck.cards.filter(id=>data.cards.find(c=>c.id===id).positions.includes(p)).length);assert(coverage.every(n=>n>=2));
      const parisIds=new Set(paris.cards.map(c=>c.id));assert(owned.cards.every(c=>!parisIds.has(c.id)),'Identical models have distinct owned specimens');
      const isolated=await local(tokyo.page,TOKYO);assert(!isolated.favorites.includes(KAYLIS));assert.notEqual(isolated.name,secondName);assert.equal(isolated.equipment.slots.weapon.balmhyr,undefined);
      assert.equal(await tokyo.page.evaluate(p=>Object.keys(localStorage).some(k=>k.startsWith(p)),prefix(PARIS)),false,'Another account progress is never imported');
      result.tokyo=owned.count;result.coverage=coverage;result.kaylis=true;await shot(tokyo.page,'tokyo-owned-starter');
      result.checks.push('tokyo-ten-owned-kaylis-legal-coverage-distinct-profile');
      await tokyoMatch(tokyo,result);
      assert.deepEqual(pageErrors,[],'No browser JavaScript errors');assert.deepEqual(routeErrors,[],'No unexpected HTTP or SQL failures');assert.deepEqual([...missingAssets],[],'All referenced build assets exist');
      result.completed=true;result.passed=!results.issues.some(i=>i.profile===profile.name);result.rpcCalls=calls.length;result.checks.push('tokyo-real-match-d6-snapshot-controlled-resume');
      for(const context of contexts.splice(0))await context.close();
      console.log((result.passed?'PASS':'DIAGNOSTIC')+' cloud sync '+profile.name+': distinct collections, deck/favorites/equipment/Story, explicit lease takeover, reload and genuine Tokyo D6/resume.');
    }
    assert(results.profiles.length,'No cloud sync profiles selected');
    assert.equal(results.issues.length,0,'Diagnostic continuation found integration regressions; see screenshots and results.json');results.passed=true;
  }catch(error){
    results.failure={profile:currentProfile,stage,message:error.message};
    if(currentPage&&!currentPage.isClosed()){
      await shot(currentPage,'failure-'+stage).catch(()=>{});
      results.failure.browser=await currentPage.evaluate(async()=>{
        const sync=window.KALISTAR_SYNC?.snapshot(),p=sync?'kalistar.v4.cloud.'+sync.userId+'.':null;
        const meta=sync&&window.KALISTAR_DB?.cloudProgress?JSON.parse(await KALISTAR_DB.cloudProgress.storage.getItem(KalistarCloudSync.storageKey(sync.userId,sync.deviceId))||'null'):null;
        return {url:location.href,ready:!!window.KALISTAR_READY,sync,outboxMeaningful:meta?.outbox?.meaningful,toast:document.querySelector('#toast')?.textContent,
          draft:p?JSON.parse(localStorage.getItem(p+'teamDraft')||'null'):null,
          dialogs:[...document.querySelectorAll('dialog[open]')].map(d=>({id:d.id,text:d.textContent.slice(0,1200)})),app:document.querySelector('#app')?.textContent.slice(0,2400),database:window.KALISTAR_DB?.name};
      }).catch(()=>null);
    }
    console.error('CLOUD SYNC FAILURE',results.failure);throw error;
  }finally{
    results.pageErrors=pageErrors;results.routeErrors=routeErrors;results.missingAssets=[...missingAssets];results.calls=calls;
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2));
    for(const context of contexts.splice(0))await context.close().catch(()=>{});
    await browser?.close();await database.close();
  }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
