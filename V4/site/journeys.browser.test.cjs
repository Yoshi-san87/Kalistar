'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const modules=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_journey_browser.cjs'));
const {chromium}=modules('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/journeys'));
const origin='https://kalistar.pages.dev',supa='https://fkskjhlaaagqlfcsojjp.supabase.co';
const key='disposable-journey-browser-HMAC-key-only-for-local-QA-20261016';
const ids={'user-paris':'11111111-1111-4111-8111-111111111111','user-tokyo':'22222222-2222-4222-8222-222222222222'};
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.mp4':'video/mp4','.jpg':'image/jpeg','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.ogg':'audio/ogg'};
const password='fictional-browser-password';
function session(profile){const id=ids[profile];return {access_token:Buffer.from('{"alg":"HS256","typ":"JWT"}').toString('base64url')+'.'+Buffer.from(JSON.stringify({sub:id,exp:Math.floor(Date.now()/1000)+3600,role:'authenticated'})).toString('base64url')+'.fictional-signature',refresh_token:'fictional-refresh-'+profile,expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:{id,email:profile+'@example.invalid',email_confirmed_at:'2026-10-16T00:00:00Z',aud:'authenticated',role:'authenticated',app_metadata:{provider:'email'},user_metadata:{}}};}
async function fixtureSources(){
  if(process.env.KALISTAR_DIST||process.env.KALISTAR_WORKER_BUNDLE)return {assets:dist,site:path.join(dist,'jeu'),worker:path.resolve(process.env.KALISTAR_WORKER_BUNDLE||path.join(dist,'_worker.js')),mode:'frozen-build'};
  // Snapshot current text into ignored QA output, never rebuild the shared dist.
  // Both Worker and browser use this same engine. Freeze assets as well, so a
  // concurrent build cannot remove the catalogue halfway through a reload.
  const root=fs.mkdtempSync(path.join(out,'fixture-')),site=path.join(root,'V4/site'),deploy=path.join(root,'V4/deploy'),assets=path.join(root,'public');
  fs.mkdirSync(site,{recursive:true});fs.mkdirSync(deploy,{recursive:true});
  fs.cpSync(dist,assets,{recursive:true});
  const hashes={};
  for(const entry of fs.readdirSync(__dirname,{withFileTypes:true})){
    if(!entry.isFile()||!(/\.(js|css|html|json|webmanifest)$/).test(entry.name))continue;
    const bytes=fs.readFileSync(path.join(__dirname,entry.name));
    hashes[entry.name]=crypto.createHash('sha256').update(bytes).digest('hex');
    fs.writeFileSync(path.join(site,entry.name),entry.name==='index.html'?bytes.toString().replace('data-hosting="local"','data-hosting="static" data-auth-state="checking"'):bytes);
  }
  for(const name of ['access-worker.mjs','journey-worker.mjs']){
    const bytes=fs.readFileSync(path.join(__dirname,'../deploy',name));
    fs.writeFileSync(path.join(deploy,name),bytes);hashes[name]=crypto.createHash('sha256').update(bytes).digest('hex');
  }
  const runtimeHash=await require('../deploy/journey-hash.cjs').hash(root);
  fs.writeFileSync(path.join(deploy,'journey-runtime.cjs'),"'use strict';\nmodule.exports={Combat:require('../site/journey-combat.js'),Composition:require('../site/team-composition.js'),hash:"+JSON.stringify(runtimeHash)+"};\n");
  fs.writeFileSync(path.join(root,'sources.json'),JSON.stringify({runtimeHash,hashes},null,2));
  return {root,assets,site,worker:path.join(deploy,'access-worker.mjs'),runtimeHash,appHash:hashes['app.js'],mode:'current-source-snapshot'};
}
async function main(){
  const started=Date.now();
  fs.mkdirSync(out,{recursive:true});
  const sources=await fixtureSources();
  const data=JSON.parse(fs.readFileSync(path.join(sources.assets,'jeu/catalogue.json'),'utf8'));
  const worker=await import(pathToFileURL(sources.worker).href);
  const runtime=require(path.join(sources.site,'journey-combat.js')).create(data),E=runtime.engine;
  const definition=require(path.join(sources.site,'journey-definitions.js')).catalogue(data).find(book=>book.id==='momo-petits-bonheurs');
  assert.equal(definition.stages.length,4);assert.equal(definition.bonusStages.length,3);
  const sessions=Object.fromEntries(Object.keys(ids).map(p=>[p,session(p)]));
  const identify=token=>Object.keys(ids).find(p=>'Bearer '+sessions[p].access_token===token);
  const database=await require('../deploy/supabase/browser-fixture.cjs').create(data,{journeyKey:key});
  const errors=[],missing=[],result={passed:false,sources,profiles:[],combats:[],rewards:[],captures:[]},contexts=[],rpcCounts={};let browser,page,stage='setup',startGate=null,releaseStart=null;
  const rewardRPCs=()=>Object.fromEntries(Object.entries(rpcCounts).filter(([name])=>/(?:claim|ack)$/.test(name)&&name.includes('journey_')));
  async function edgeAPI(url,options={}){
    const u=new URL(url),who=identify(new Headers(options.headers).get('authorization'));
    assert.equal(u.origin,supa);if(!who)return Response.json({message:'Fixture Auth required'},{status:401});
    if(u.pathname==='/auth/v1/user')return Response.json(sessions[who].user);
    assert(u.pathname.startsWith('/rest/v1/rpc/kalistar_'));
    const rpc=who+':'+u.pathname.split('/').pop();rpcCounts[rpc]=(rpcCounts[rpc]||0)+1;
    if(u.pathname.endsWith('/kalistar_journey_start')&&startGate){const gate=startGate;startGate=null;await gate;}
    try{return Response.json(await database.call(u.pathname.split('/').pop(),JSON.parse(options.body||'{}'),who));}
    catch(error){return Response.json({message:error.message,code:error.code},{status:error.code==='42501'?403:409});}
  }
  const env={KALISTAR_SESSION_KEY:'test-only-session-key-'.repeat(4),KALISTAR_JOURNEY_KEY:key,ASSETS:{fetch:async request=>{
    let name=decodeURIComponent(new URL(request.url).pathname).replace(/^\//,'');if(!name||name.endsWith('/'))name+='index.html';if(name==='jeu/login')name+='.html';
    let file=path.resolve(sources.assets,name);assert(file.startsWith(sources.assets+path.sep));
    if(sources.mode==='current-source-snapshot'&&name.startsWith('jeu/')){
      const relative=name.slice(4),current=path.resolve(sources.site,relative);
      assert(current.startsWith(sources.site+path.sep));
      if(fs.existsSync(current)&&fs.statSync(current).isFile())file=current;
      else if(!fs.existsSync(file)&&relative.startsWith('assets/')){
        const media=path.resolve(__dirname,relative);assert(media.startsWith(__dirname+path.sep));if(fs.existsSync(media))file=media;
      }
    }
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
  async function closeDialogs(p){
    assert.equal(await p.locator('.jv-reward').count(),0,'Housekeeping must never acknowledge a reward');
    await p.evaluate(()=>{for(const d of document.querySelectorAll('dialog[open]'))d.close();});await p.waitForFunction(()=>!history.state?.kalistarDialogBack);
  }
  async function view(p){await closeDialogs(p);await p.evaluate(()=>location.hash='journeys');await p.locator('.jv-view').waitFor();await p.waitForFunction(()=>KALISTAR_JOURNEYS.snapshot().status==='ready');}
  async function shot(name){
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForFunction(()=>[...document.querySelectorAll('.jv-reward img,.jv-scene img')].every(img=>img.complete&&img.naturalWidth));
    await page.screenshot({path:path.join(out,name+'.png'),fullPage:true});result.captures.push(name+'.png');
  }
  async function arenaLayout(label,{step=1}={}){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const geometry=await page.evaluate(()=>{
      const app=document.querySelector('#app'),shell=document.querySelector('.game-shell'),board=document.querySelector('.arena-layout'),nav=document.querySelector('.main-nav'),menu=document.querySelector('[data-action=arena-menu]'),strip=document.querySelector('.journey-arena-strip');
      const box=node=>{const r=node.getBoundingClientRect();return {top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
      return {width:innerWidth,height:innerHeight,scrollWidth:document.documentElement.scrollWidth,app:box(app),shell:box(shell),board:box(board),nav:box(nav),menu:box(menu),scroll:app.scrollHeight,client:app.clientHeight,stripVisible:!!strip.getClientRects().length,menuLabel:menu.getAttribute('aria-label'),progress:menu.querySelector('.journey-arena-progress')?.textContent};
    });
    result.arenaLayouts??=[];result.arenaLayouts.push({label,...geometry});
    assert.equal(geometry.stripVisible,false,label+': no extra journey row on phone');
    assert(geometry.scrollWidth<=geometry.width+1,label+': no horizontal page overflow');
    assert(geometry.menu.width>=44&&geometry.menu.height>=44,label+': thumb-sized options');
    assert.match(geometry.menuLabel,new RegExp('Story, '+(step<=4?'Étape '+step+'/4':'Chapitre '+step),'i'));
    assert.equal(geometry.progress,step<=4?step+'/4':String(step));assert.doesNotMatch(geometry.menuLabel,/\b[567]\/4\b/);
    assert.equal(geometry.nav.height,0,label+': fullscreen arena hides navigation');
    assert(geometry.board.bottom<=geometry.shell.bottom+1,label+': journey does not extend board past its shell');
    assert(geometry.scroll<=geometry.client+1,label+': arena must not scroll '+JSON.stringify(geometry));
    assert(geometry.board.bottom<=geometry.app.bottom+1,label+': arena uses the space freed by hidden navigation');
    assert(geometry.board.top>=0&&geometry.board.bottom<=geometry.height+1,label+': board stays inside the viewport');
  }
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
      if(moves%100===0)console.log('Worker combat '+(s.journey.stage+1)+': '+moves+' commandes validées.');
    }
    await page.evaluate(()=>KALISTAR_JOURNEYS.refresh());return {s,moves};
  }
  const book='momo-petits-bonheurs';
  const progress=()=>page.evaluate(book=>KALISTAR_JOURNEYS.snapshot().progress[book],book);
  async function openBook(){
    const cover=page.locator('[data-jv-book="'+book+'"]');if(await cover.count())await cover.click();
    await page.locator('.jv-reader').waitFor();
  }
  async function reloadBook(){await page.reload();await ready(page);await view(page);await openBook();assert.equal(await page.locator('.jv-reward').count(),0,'Reload must not replay a ceremony');}
  async function stations(count){
    assert.deepEqual(await page.locator('[data-jv-action=stage]').evaluateAll(nodes=>nodes.map(node=>Number(node.dataset.jvStage))),Array.from({length:count},(_,index)=>index));
    assert.doesNotMatch(await page.locator('.jv-reader-status').innerText(),/\b[567]\s*\/\s*4\b|\/\s*7\b/);
  }
  async function startAttempt(){
    return page.evaluate(async book=>{await KALISTAR_SYNC.flush();const deck=JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.teamDraft'));return KALISTAR_JOURNEYS.start(book,deck);},book);
  }
  async function inventory(){
    const player=await database.call('kalistar_player',{},'user-tokyo');
    const cards=player.cards.filter(card=>card.status==='owned').map(card=>card.id).sort(),equipment=[...player.equipment.ids].sort();
    const models=player.cards.filter(card=>card.status==='owned').map(card=>card.modelId).sort();
    assert.equal(new Set(cards).size,cards.length);assert.equal(new Set(equipment).size,equipment.length);
    assert.equal(new Set(models).size,models.length,'one specimen per version');
    const ui=await page.evaluate(ids=>({cards:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER).map(card=>card.id).sort(),equipment:ids.filter(id=>KALISTAR_DB.registry.ownsEquipment(KALISTAR_ACTIVE_USER,id))}),equipment);
    assert.deepEqual(ui,{cards,equipment},'ownershipChanged refreshes the real local registry');
    return {cards,models,equipment};
  }
  async function refreshStable(label){
    const before=await progress(),counts=rewardRPCs(),owned=await inventory();
    await page.evaluate(()=>Promise.all([KALISTAR_JOURNEYS.refresh(),KALISTAR_JOURNEYS.refresh(),KALISTAR_JOURNEYS.refresh()]));
    assert.deepEqual(await progress(),before,label+': refresh preserves progress');
    assert.deepEqual(await inventory(),owned,label+': no duplicate ownership');
    assert.deepEqual(rewardRPCs(),counts,label+': refresh never claims or acknowledges');
    return {before,counts,owned};
  }
  async function rewardLayout(label){
    const geometry=await page.locator('.jv-reward').evaluate(dialog=>{
      const rect=node=>node.getBoundingClientRect().toJSON(),d=rect(dialog),b=rect(dialog.querySelector('[data-jv-action=acknowledge]'));
      const prize=dialog.querySelector('.jv-reward-prize'),name=dialog.querySelector('.jv-reward-name');
      return {width:innerWidth,scroll:document.documentElement.scrollWidth,dialog:d,button:b,prize:prize&&rect(prize),name:name&&rect(name)};
    });
    assert(geometry.scroll<=geometry.width+1,label+': no horizontal overflow');
    assert(geometry.button.bottom<=geometry.dialog.bottom+1&&geometry.button.top>=geometry.dialog.top,label+': confirmation stays visible');
    if(geometry.prize)assert(geometry.name.top>=geometry.prize.bottom-1||geometry.name.left>=geometry.prize.right-1,label+': illustration does not cover its name');
  }
  async function captureBoth(label){
    for(const [name,width,height] of [['desktop',1440,1000],['razr',412,1007]]){
      await page.setViewportSize({width,height});await rewardLayout(name+' '+label);await shot(name+'-'+label);
    }
  }
  async function receiveReward(index){
    stage='reward-'+(index+1);
    const card=index===3,claim=card?'claim':'claim-equipment',reveal=card?'reveal':'reveal-equipment',modal=card?'.jv-card-reveal':'.jv-equipment-reveal';
    const before=await inventory(),initial=await progress();
    assert.equal(initial.cleared,index+1);assert.equal(initial.completed,true);assert.equal(initial.finished,false);
    await stations(index+1);
    if(card)assert.equal(await page.locator('.jv-bonus-route').count(),0);
    const countsBefore=rewardRPCs();
    await page.locator('[data-jv-action='+claim+']').evaluate(button=>{button.click();button.click();});
    if(card){
      const {sceneFrame,playScene}=require('./test-support/gaming-book.cjs');
      const frame=await sceneFrame(page);
      assert.deepEqual(rewardRPCs(),countsBefore,'Opening the scene never claims the card');
      await playScene(frame);
    }
    await page.locator(modal+'[open]').waitFor({timeout:30000});
    await page.locator('.jv-reward [data-jv-action=acknowledge]:enabled').waitFor();
    const won=await progress(),owned=await inventory();
    assert.equal(won.cleared,index+1);assert.equal(won.finished,index===6);
    if(card){
      const alreadyOwned=before.models.includes(definition.rewardModelId);
      assert(won.claimed&&!won.acknowledged);assert.equal(won.alreadyOwned,alreadyOwned);
      assert.equal(owned.cards.length,before.cards.length+(alreadyOwned?0:1));
      assert.deepEqual(owned.models,[...new Set([...before.models,definition.rewardModelId])].sort());
      if(alreadyOwned)assert.deepEqual(owned.cards,before.cards,'the existing specimen is reused, not reminted');
      assert.deepEqual(owned.equipment,before.equipment);
      assert.equal(await page.locator('.jv-reward-prize').getAttribute('data-jv-model'),definition.rewardModelId);
    }
    else{
      const expected=definition.bonusStages[index-4],reward=won.equipmentClaims.find(item=>item.stage===index);
      assert.equal(won.equipmentClaims.length,index-3);assert(reward&&!reward.acknowledged);
      assert.equal(reward.equipmentId,expected.rewardEquipmentId);assert.equal(reward.kind,expected.rewardKind);
      assert.deepEqual(owned.cards,before.cards);assert.deepEqual(owned.equipment,[...new Set([...before.equipment,expected.rewardEquipmentId])].sort());
      assert.equal(await page.locator('.jv-reward-name strong').textContent(),require(path.join(sources.site,'weapons.js')).weapons.find(item=>item.id===expected.rewardEquipmentId).name);
    }
    const rpc='user-tokyo:kalistar_journey_'+(card?'claim':'equipment_claim');
    assert.equal(rpcCounts[rpc]-(countsBefore[rpc]||0),1,'double click creates one claim RPC');
    await stations(index+1);await captureBoth(card?'earned-card':'earned-'+definition.bonusStages[index-4].rewardKind);
    const stable=await refreshStable('unacknowledged reward '+index);
    const denied=index<6?await page.evaluate(async book=>{
      try{await KALISTAR_JOURNEYS.start(book,JSON.parse(localStorage.getItem('kalistar.v4.cloud.'+KALISTAR_SYNC.snapshot().userId+'.teamDraft')));return null;}
      catch(error){return error.message;}
    },book):null;
    if(index<6)assert.match(denied,/carte|recompense|récompense/i,'Worker/SQL blocks the next fight until ACK');
    // Destroy the in-flight presentation by reloading: a false result must not ACK.
    await reloadBook();assert.deepEqual(await progress(),stable.before);assert.deepEqual(rewardRPCs(),stable.counts);
    assert.deepEqual(await inventory(),owned);await stations(index+1);
    assert.equal(await page.locator('[data-jv-action='+claim+']').count(),0,'no duplicate claim button after reload');
    await page.locator('[data-jv-action='+reveal+']').click();await page.locator(modal+'[open]').waitFor();
    if(card&&won.alreadyOwned)assert.equal(await page.locator('.jv-reward h2').innerText(),'Déjà dans votre collection');
    assert.deepEqual(rewardRPCs(),stable.counts,'reopening the ceremony does not claim again');
    await page.locator('.jv-reward [data-jv-action=acknowledge]:enabled').click();
    await page.waitForFunction(({book,index})=>{const p=KALISTAR_JOURNEYS.snapshot().progress[book];return index===3?p.acknowledged:p.equipmentClaims.find(c=>c.stage===index)?.acknowledged;},{book,index});
    const ackRPC='user-tokyo:kalistar_journey_'+(card?'ack':'equipment_ack');
    assert.equal(rpcCounts[ackRPC]-(countsBefore[ackRPC]||0),1,'one user confirmation produces one ACK');
    if(index<6){
      await page.locator('.jv-sequel-reveal[open]').waitFor();await page.locator('.jv-reward [data-jv-action=acknowledge]:enabled').waitFor();
      await stations(index+2);await captureBoth('chapter-'+(index+2)+'-revealed');
      assert.equal(await page.locator('.jv-reward h2').textContent(),index===3?definition.bonusReveal.title:definition.bonusStages[index-3].reveal?.title||definition.bonusStages[index-3].title);
      await page.locator('.jv-reward [data-jv-action=acknowledge]').click();
    }
    await page.locator('.jv-reward').waitFor({state:'detached'});await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
    const after=await refreshStable('acknowledged reward '+index);await reloadBook();
    assert.deepEqual(await progress(),after.before);assert.deepEqual(await inventory(),owned);assert.deepEqual(rewardRPCs(),after.counts);
    await stations(Math.min(7,index+2));
    await page.locator('[data-jv-action=library]').click();
    const cover=page.locator('[data-jv-book="'+book+'"]');
    assert.equal(await cover.locator('.jv-cover-seal').count(),index===6?1:0);
    assert.equal(await cover.locator('.jv-cover-command span').textContent(),index===6?'Consulter':'Poursuivre');
    await openBook();
    result.rewards.push({stage:index,kind:card?'card':definition.bonusStages[index-4].rewardKind,claimed:true,acknowledged:true,reloadBeforeAck:true,noDuplicate:true,ownedCards:owned.cards.length,ownedEquipment:owned.equipment.length});
    console.log('PASS reward '+(index+1)+': claim, reload without ACK, user ACK, sequential reveal, no duplicate.');
  }
  async function bonusArena(index,initial){
    await page.evaluate(()=>KALISTAR_JOURNEYS.refresh());await openBook();
    await page.locator('[data-jv-action=resume]').click();await page.locator('.game-shell').waitFor();
    await page.waitForFunction(()=>!document.querySelector('#app.rolling'));
    await arenaLayout('razr-chapter-'+(index+1),{step:index+1});await shot('razr-chapter-'+(index+1)+'-arena');
    await page.locator('[data-action=arena-menu]').click();const link=page.locator('#mobile-dialog [data-action=journey-return]');
    assert.match(await link.innerText(),new RegExp('Chapitre '+(index+1)));await shot('razr-chapter-'+(index+1)+'-menu');
    await link.click();await page.locator('.jv-view').waitFor();
    return page.evaluate(id=>KALISTAR_JOURNEYS.resume(id),initial.journey.attemptId);
  }
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    stage='desktop-library';page=await device({width:1440,height:1000,mobile:true},'user-tokyo');
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
    stage='phone-arena-layout';
    await arenaLayout('razr');await shot('razr-real-arena');
    await page.emulateMedia({reducedMotion:'no-preference'});
    for(const [width,height] of [[360,800],[320,740],[1007,412],[412,1007]]){
      await page.setViewportSize({width,height});await arenaLayout(width+'x'+height);
    }
    await page.emulateMedia({reducedMotion:'reduce'});
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
    await arenaLayout('razr-duel');
    // Navigation is deliberately attempted through the real control, so the
    // app cannot leave a network command or combat animation half committed.
    await page.locator('[data-action=arena-menu]').click();
    const returnLink=page.locator('#mobile-dialog [data-action=journey-return]');
    await returnLink.waitFor();assert.match(await returnLink.innerText(),/Étape 1\/4/);await shot('razr-fragment-menu');
    await returnLink.click();await page.locator('.jv-view').waitFor({timeout:30000});
    stage='canonical-resume';const before=await state(page);await page.reload();await ready(page);await closeDialogs(page);const after=await state(page);
    assert.equal(after.matchId,before.matchId);assert(after.journey.sequence>=before.journey.sequence);
    await view(page);await page.locator('[data-jv-book=momo-petits-bonheurs]').click();await page.locator('[data-jv-action=resume]').waitFor();await shot('razr-resume');
    await page.locator('[data-jv-action=resume]').click();await page.locator('.game-shell').waitFor();
    await arenaLayout('razr-resumed');
    await page.locator('[data-action=arena-menu]').click();await page.locator('#mobile-dialog [data-action=journey-return]').click();await page.locator('.jv-view').waitFor();
    // Keep the arena unmounted while making legal commands rapidly. UI/AI timers
    // cannot race this full end-to-end Worker/PostgreSQL transcript.
    let totalMoves=0,attempts=0,losses=0;
    for(let index=0;index<7;index++){
      stage='full-server-combat-'+(index+1);let initial=index===0?await page.evaluate(id=>KALISTAR_JOURNEYS.resume(id),after.journey.attemptId):await startAttempt();
      assert.equal(initial.journey.stage,index);
      if(index>=4)initial=await bonusArena(index,initial);
      let played;
      do{
        assert(++attempts<=20,'Bounded fair-play fixture exhausted its hourly start allowance');
        if(index===3){
          await page.evaluate(()=>KALISTAR_JOURNEYS.refresh());
          await openBook();await page.locator('[data-jv-action=resume]').click();await page.locator('.game-shell').waitFor();
          await view(page);
        }
        played=await playEntireAttempt(initial,0);totalMoves+=played.moves;
        result.combats.push({stage:index,attempt:played.s.journey.attemptId,winner:played.s.winner,moves:played.moves,sequence:played.s.journey.sequence});
        console.log('Combat '+(index+1)+', tentative '+attempts+': '+(played.s.winner===0?'victoire':'sans victoire')+', '+played.moves+' commandes signées.');
        if(played.s.winner!==0){losses++;assert.equal((await progress()).cleared,index);initial=await startAttempt();}
      }while(played.s.winner!==0);
      assert.equal((await progress()).cleared,index+1);
      assert.equal((await progress()).completed,index>=3,'completed keeps its four-victory meaning');
      if(index===3){
        const beforeScene=rewardRPCs();
        await page.evaluate(()=>location.hash='arena');
        await page.locator('.gaming-book-dialog[open]').waitFor({timeout:30000});
        assert.equal(new URL(page.url()).hash,'#journeys','Fourth victory automatically enters Story');
        assert.deepEqual(rewardRPCs(),beforeScene,'Automatic scene is not a reward grant');
        await page.locator('.gaming-book-dialog > header button').click();
        await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
      }
      await reloadBook();
      if(index>=3)await receiveReward(index);
    }
    stage='finished';const finished=await progress();assert(finished.completed&&finished.claimed&&finished.acknowledged&&finished.finished);assert.equal(finished.cleared,7);
    assert.deepEqual(finished.equipmentClaims.map(item=>[item.stage,item.equipmentId,item.kind,item.acknowledged]),definition.bonusStages.map((item,index)=>[index+4,item.rewardEquipmentId,item.rewardKind,true]));
    assert.equal(await page.locator('[data-jv-action=start],[data-jv-action=claim],[data-jv-action=claim-equipment]').count(),0);
    const owned=await inventory();
    assert.equal(owned.cards.length,finished.alreadyOwned?10:11);assert.equal(owned.equipment.length,3);
    assert(owned.models.includes(definition.rewardModelId));
    // Explicit request retries are idempotent too; refresh alone was checked above.
    const replayed=await page.evaluate(async book=>({card:await KALISTAR_JOURNEYS.claim(book),equipment:await Promise.all([4,5,6].map(stage=>KALISTAR_JOURNEYS.claimEquipment(book,stage)))}),book);
    assert(replayed.card.replayed);assert(replayed.equipment.every(item=>item.replayed));
    assert.deepEqual(await inventory(),owned);assert.deepEqual(await progress(),finished);
    for(let index=0;index<7;index++){
      await page.locator('[data-jv-action=stage][data-jv-stage="'+index+'"]').click();await page.locator('[data-jv-action=intro]').click();await page.locator('[data-jv-action=outro]').click();
    }
    await shot('razr-seven-completed');await page.setViewportSize({width:1440,height:1000});await shot('desktop-seven-completed');
    await page.locator('[data-jv-action=library]').click();await shot('desktop-completed-library');
    result.profiles.push({name:'Tokyo',sevenWins:true,totalMoves,attempts,losses,owned:owned.cards.length,equipment:owned.equipment,refreshWithoutDuplicate:true,reload:true,normalRole:true,arenaUICommands:true,viewports:[1440,412]});
    stage='admin';page=await device({width:1440,height:1000},'user-paris');assert.equal(await page.evaluate(()=>KALISTAR_JOURNEYS.snapshot().isAdmin),true);
    await page.locator('[data-jv-book=balmhyr-retour]').click();assert.equal(await page.locator('[data-jv-action=stage]').count(),7);
    const adminBefore=JSON.stringify(await database.call('kalistar_journey_library',{},'user-paris'));
    for(let index=0;index<7;index++){
      stage='admin-preview-'+(index+1);await page.locator('[data-jv-action=stage][data-jv-stage="'+index+'"]').click();
      const preview=page.locator('[data-jv-action=preview]');assert.match(await preview.getAttribute('aria-label')||await preview.innerText(),/Aperçu sans récompense/);
      await preview.click();await page.locator('.journey-arena-strip').waitFor();assert.match(await page.locator('.journey-arena-strip').innerText(),/Aperçu/);
      assert.match(await page.locator('.journey-arena-strip').innerText(),new RegExp(index<4?'Étape '+(index+1)+'/4':'Chapitre '+(index+1),'i'));
      await page.locator('.li-skip').waitFor();await page.locator('.li-skip').click();await page.waitForFunction(()=>!document.querySelector('.lineup-intro'));
      await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card img')].every(img=>img.complete&&img.naturalWidth));
      await shot('desktop-admin-arena-'+(index+1));assert.equal(await state(page),null,'An admin preview must not become a persisted or reward-bearing game');
      await page.locator('.journey-arena-strip [data-action=journey-return]').click();await page.locator('.jv-view').waitFor();
      assert.equal(JSON.stringify(await database.call('kalistar_journey_library',{},'user-paris')),adminBefore,'admin preview has no progression, card or equipment claim');
    }
    result.profiles.push({name:'Paris',admin:true,sevenPreviews:true,previewWithoutProgress:true});assert.deepEqual(errors,[]);assert.deepEqual(missing,[]);result.passed=true;
    console.log('PASS journeys browser: seven complete signed Worker/PGlite combats, sequential card/equipment ACK, no duplicates after reload, seven Paris previews, PC/Razr.');
  }catch(error){result.failure={stage,message:error.message};if(page&&!page.isClosed()){await shot('failure-'+stage).catch(()=>{});result.failure.ui=await page.locator('body').innerText().catch(()=>null);}throw error;}
  finally{releaseStart?.();result.errors=errors;result.missing=missing;result.rpcCounts=rpcCounts;result.durationMs=Date.now()-started;fs.writeFileSync(path.join(out,'results.json'),JSON.stringify(result,null,2));for(const c of contexts)await c.close().catch(()=>{});await browser?.close();await database.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
