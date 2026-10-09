'use strict';
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__weapons_browser__.cjs'))('playwright');
const definitions=require('./weapons.js').weapons;
const archive=require('./fixtures/equipment-v4.5.64.json');
assert.deepEqual(require('./weapons.js').legacyWeapons,archive.weapons);
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(__dirname,'../deploy/dist');
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304'),out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/weapons',...(built?['pages']:[]));
const results=[],errors=[];let browser;
let navigation=0;
async function ready(page,hash='weapons'){await page.goto(base+'/jeu/?weapons-qa='+ ++navigation+'#'+hash);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function rotation(page,selector,label){
  const node=page.locator(selector).first(),before=await node.evaluate(n=>getComputedStyle(n).transform);
  await page.waitForFunction(({selector,before})=>{
    const n=document.querySelector(selector);return n&&getComputedStyle(n).transform!==before;
  },{selector,before},{timeout:5000});
  assert.notEqual(await node.evaluate(n=>getComputedStyle(n).transform),before,label);
}
async function equipment(page,id,action='equip'){
  await openEquipment(page,id);await page.locator(`[data-weapon-action="${action}"]`).click();
  await page.waitForFunction(({id,action})=>KalistarEquipment.items(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots).some(item=>item.id===id)===(action==='equip'),{id,action});
  await page.locator('[data-weapon-action=close]').click();
}
async function prepare(page,kind,side=0){
  await page.evaluate(async({kind,side,historical})=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),db=KALISTAR_DB,user=KALISTAR_ACTIVE_USER,previous=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(previous&&previous.seed!=='WEAPONS-BROWSER')throw Error('Refusing to change a non-QA match.');
    if(previous?.collection&&previous.phase!=='over')await db.registry.releaseGame(user,previous.matchId);
    const profile=db.equipment.profile(user),legacy=kind==='axe'||kind==='flute';
    // The axe's last-standing and Momo's original relay are saved-match regressions.
    const loadout=legacy?Object.fromEntries(KalistarEquipment.items(profile.slots).filter(item=>['fallen-king-axe','little-joys-flute'].includes(item.id)).map(item=>[item.characterId,item.id])):profile.slots;
    const empty=legacy?{}:KalistarEquipment.emptyLoadout();
    const deck=KALISTAR_DATA.decks.player.slice(),balmhyr=KALISTAR_DATA.cards.find(c=>c.characterId==='balmhyr');
    if(!deck.includes(balmhyr.id)){
      const index=deck.findIndex((id,i)=>!E.validateDeck(deck.map((id,j)=>i===j?balmhyr.id:id)).length);
      if(index<0)throw Error('No legal fixture deck including Balmhyr.');deck[index]=balmhyr.id;
    }
    let s=E.newGame(deck,deck,{mode:'local',seed:'WEAPONS-BROWSER',kalistel:false,equipment:side?[empty,loadout]:[loadout,empty]});
    if(legacy)s.equipment.definitions=historical;
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    const p=s.players[side],balm=p.reserve.find(u=>E.card(u).characterId==='balmhyr');
    if(balm){E.recall(s,side,0);E.deploy(s,side,balm.uid,0);}
    if(kind==='flute'){
      const momo=p.reserve.find(u=>E.card(u).characterId==='momo');
      if(momo){const slot=E.card(momo).positions.find(pos=>E.card(p.board[pos-1])?.characterId!=='balmhyr')-1;E.recall(s,side,slot);E.deploy(s,side,momo.uid,slot);}
    }
    E.start(s);
    if(kind==='axe'){
      // Use real engine attacks/defenses to eliminate the other combatants, including replacements.
      for(let n=0;p.board.filter(Boolean).length>1&&n<20;n++){
        const enemy=1-side;let chosen=null;
        for(const target of s.players[side].board.filter(u=>u&&E.card(u).characterId!=='balmhyr')){
          const dies=E.card(target).defense.map((v,i)=>[v,6-i]).filter(([v])=>typeof v==='number').sort((a,b)=>a[0]-b[0]);
          for(const actor of s.players[enemy].board.filter(Boolean))for(const [value,die] of E.card(actor).atk.map((v,i)=>[v,6-i]).filter(([v])=>typeof v==='number')){
            const trial=E.clone(s);trial.turn=enemy;
            E.lock(trial,s.players[enemy].board.indexOf(actor),s.players[side].board.indexOf(target));E.rollAttack(trial,die);E.rollDefense(trial,dies[0][1]);
            if(trial.phase==='result'&&trial.players[side].dead.some(u=>u.uid===target.uid)){chosen=trial;break;}
          }
          if(chosen)break;
        }
        if(!chosen)throw Error('No legal numeric kill in fixture.');s=chosen;E.next(s);
        while(s.phase==='replace')E.autoDeploy(s,s.replacing);
        if(s.phase==='over')throw Error('Balmhyr must remain alive.');
        // p refers to the first state; look up the cloned team's live board below.
        if(s.players[side].board.filter(Boolean).length===1)break;
      }
      if(s.players[side].board.filter(Boolean).length!==1)throw Error('Last-standing fixture incomplete.');
      s.turn=side;
    }else if(kind==='flute'){
      s.turn=side;const m=s.players[side].board.find(u=>E.card(u)?.characterId==='momo');
      const support=E.card(m)?.atk.findIndex(v=>v==='retry'||v==='mana');
      if(support<0||support===undefined)throw Error('Momo must have a printed Retry or Mana face.');
      E.lock(s,s.players[side].board.indexOf(m),0);E.rollAttack(s,6-support);
      if(!['clover','potion'].includes(s.phase))throw Error('Expected a printed support face.');
    }
    E.assertState(s);const bound=db.registry.bindGame(user,s);await db.idle();await db.saveGame(bound);
    localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));
  },{kind,side,historical:structuredClone(archive.weapons)});
  await ready(page,'arena');
}
async function alignment(page,label){
  const samples=await page.evaluate(()=>[...document.querySelectorAll('.eq-overlay')].map(node=>{
    const img=node.closest('.slot-card').querySelector('img'),i=img.getBoundingClientRect(),r=node.getBoundingClientRect(),n=KalistarEquipmentFX.layouts[node.dataset.slot],c=KalistarCardMedia.crop;
    return {uid:node.closest('.slot').dataset.unit,slot:node.dataset.slot,dx:Math.abs(r.left+r.width*(n.center.x-n.left)/n.width-(i.left+(n.center.x-c.left)/c.width*i.width)),dy:Math.abs(r.top+r.height*(n.center.y-n.top)/n.height-(i.top+(n.center.y-c.top)/c.height*i.height)),width:Math.abs(r.width-n.width/c.width*i.width)};
  }));
  assert.ok(samples.length,label+' has an active medallion');for(const s of samples)for(const k of ['dx','dy','width'])assert.ok(s[k]<1.3,label+' '+JSON.stringify(s));
  results.push({label,samples});
}
async function detailAlignment(page,label,motion){
  await page.waitForFunction(()=>{
    const img=document.querySelector('#detail-dialog .detail-visual > img'),overlays=[...document.querySelectorAll('.eq-detail-overlay')];
    return img?.naturalWidth===797&&img?.naturalHeight===1388&&overlays.length&&overlays.every(overlay=>getComputedStyle(overlay).visibility==='visible'&&[...overlay.querySelectorAll('img')].every(i=>i.complete&&i.naturalWidth===488));
  });
  // Allow resize observers to place the overlay after the viewport's next layout.
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const samples=await page.evaluate(()=>[...document.querySelectorAll('.eq-detail-overlay')].map(node=>{
    const img=document.querySelector('#detail-dialog .detail-visual > img');
    const i=img.getBoundingClientRect(),r=node.getBoundingClientRect(),n=KalistarEquipmentFX.layouts[node.dataset.slot],c=KalistarCardMedia.crop;
    const scale=Math.min(i.width/c.width,i.height/c.height),left=i.left+(i.width-c.width*scale)/2,top=i.top+(i.height-c.height*scale)/2;
    const body=node.querySelector('.eq-body').getBoundingClientRect(),orbit=node.querySelector('.eq-orbit');
    return {slot:node.dataset.slot,dx:Math.abs(r.left-(left+(n.left-c.left)*scale)),dy:Math.abs(r.top-(top+(n.top-c.top)*scale)),width:Math.abs(r.width-n.width*scale),height:Math.abs(r.height-n.height*scale),bodyWidth:Math.abs(body.width-r.width),bodyHeight:Math.abs(body.height-r.height),animation:getComputedStyle(orbit).animationName};
  }));
  for(const sample of samples){
    for(const k of ['dx','dy','width','height','bodyWidth','bodyHeight'])assert(sample[k]<1,label+' '+JSON.stringify(sample));
    assert.equal(sample.animation,motion==='reduce'?'none':'eq-continuous-orbit');
  }
  results.push({label,samples});
}
async function inspect(page,selector,weapon,motion,{bonus=true,label='inspection'}={}){
  const before=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
  await page.locator(selector).click();await page.waitForFunction(()=>document.querySelector('#detail-dialog').open);
  if(!weapon)assert.equal(await page.locator('.eq-detail-overlay').count(),0,label+' stays native');
  else{
    const expected=(Array.isArray(weapon)?weapon:[weapon]).sort();
    assert.deepEqual((await page.locator('.eq-detail-overlay').evaluateAll(nodes=>nodes.map(n=>n.dataset.weaponId))).sort(),expected);
    assert.equal(await page.locator('.eq-detail-overlay .eq-tab').count(),bonus?expected.length:0);
    await detailAlignment(page,label,motion);
    if(motion!=='reduce')await rotation(page,'.eq-detail-overlay .eq-orbit','inspected equipment keeps rotating');
  }
  assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),before,'inspection never changes the match');
}
async function closeDetail(page){
  await page.locator('#detail-dialog [data-action=close]').click();
  await page.waitForFunction(()=>!document.querySelector('#detail-dialog').open&&!document.querySelector('.eq-detail-overlay'));
}
async function replacementUI(page){
  await page.evaluate(()=>{
    const Q=KalistarEquipment,original=Q.catalogue,definitions=[...original.weapons,{...original.weapons[0],id:'qa-move-only',name:'Arme QA non publiee',restrictions:{characterIds:['balmhyr','momo']}}];
    let row=Q.profile('qa-profile',{weapon:{balmhyr:'fallen-king-axe'},shield:{balmhyr:'durane-rampart'},relic:{momo:'little-joys-flute'}});
    Q.catalogue={...original,weapons:definitions};
    const db={registry:{user:()=>({name:'QA'})},equipment:{
      profile:()=>structuredClone(row),subscribe:()=>()=>{},weapon:(_,c)=>definitions.find(w=>w.id===row.slots.weapon[c]),
      equip:async(_,c,id,options)=>{row=Q.equipProfile(row,c,id,KALISTAR_DATA.cards,options,definitions);},
      unequip:async(_,c,id)=>{const slot=definitions.find(w=>w.id===id).slot;if(row.slots[slot][c]!==id)throw Error('Stale QA selection');delete row.slots[slot][c];}
    }};
    const root=document.createElement('section');root.id='weapons-root';document.querySelector('#app').replaceChildren(root);
    const ui=KalistarWeaponsUI.create({data:KALISTAR_DATA,db,userId:'qa-profile'});ui.mount(root);
    window.WEAPON_UI_FIXTURE={profile:()=>structuredClone(row),destroy:()=>{ui.destroy();Q.catalogue=original;delete window.WEAPON_UI_FIXTURE;}};
  });
  await openEquipment(page,'qa-move-only');
  const equip=c=>page.locator(`[data-weapon-action=equip][data-character="${c}"]`);
  await equip('balmhyr').click();assert.ok(await page.locator('.weapon-confirm').isVisible());
  await page.locator('[data-weapon-action=cancel]').click();assert.equal(await page.evaluate(()=>WEAPON_UI_FIXTURE.profile().slots.weapon.balmhyr),'fallen-king-axe');
  await equip('balmhyr').click();await page.locator('[data-weapon-action=confirm]').click();
  await page.waitForFunction(()=>WEAPON_UI_FIXTURE.profile().slots.weapon.balmhyr==='qa-move-only');
  await equip('momo').click();await page.locator('[data-weapon-action=confirm]').click();
  await page.waitForFunction(()=>WEAPON_UI_FIXTURE.profile().slots.weapon.momo==='qa-move-only');
  assert.equal(await page.evaluate(()=>WEAPON_UI_FIXTURE.profile().slots.weapon.balmhyr),undefined);
  await page.locator('[data-weapon-action=unequip][data-character=momo]').click();
  await page.waitForFunction(()=>Object.keys(WEAPON_UI_FIXTURE.profile().slots.weapon).length===0);
  assert.deepEqual(await page.evaluate(()=>{const p=WEAPON_UI_FIXTURE.profile();return {shield:p.slots.shield,relic:p.slots.relic};}),{shield:{balmhyr:'durane-rampart'},relic:{momo:'little-joys-flute'}},'moving/removing a weapon preserves protections and relics');
  await page.evaluate(()=>WEAPON_UI_FIXTURE.destroy());results.push({label:'UI replacement / cancel / move / unequip, QA-only definition and in-memory profile',passed:true});
}
async function currentThreeSlots(page,name,viewport,motion){
  const profileBefore=await page.evaluate(()=>JSON.stringify(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER)));
  const duel=await page.evaluate(async(name)=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),db=KALISTAR_DB,user=KALISTAR_ACTIVE_USER;
    const previous=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(previous?.seed!=='WEAPONS-BROWSER')throw Error('Refusing to replace a non-QA match.');
    if(previous.collection&&previous.phase!=='over')await db.registry.releaseGame(user,previous.matchId);
    const c=KALISTAR_DATA.cards.find(c=>c.characterId==='balmhyr'&&c.weapon==='Hache'),base=KALISTAR_DATA.decks.player;
    const deck=base.includes(c.id)?base.slice():base.map((_,i)=>base.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
    if(!deck)throw Error('No playable three-slot fixture deck.');
    const loadout={weapon:{balmhyr:'fallen-king-axe'},shield:{balmhyr:'durane-rampart'},relic:{balmhyr:'exiled-king-seal'}};
    let s=E.newGame(deck,deck,{mode:'local',seed:'WEAPONS-BROWSER',kalistel:false,equipment:[loadout,loadout]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    for(const side of [0,1]){
      const u=s.players[side].reserve.find(u=>u.cardId===c.id);
      if(u){E.recall(s,side,0);E.deploy(s,side,u.uid,0);}
    }
    E.start(s);s.turn=name==='reduced'?1:0;
    const a=s.players[s.turn].board.find(u=>u?.cardId===c.id),b=s.players[1-s.turn].board.find(u=>u?.cardId===c.id);
    E.lock(s,s.players[s.turn].board.indexOf(a),s.players[1-s.turn].board.indexOf(b));E.rollAttack(s,6);E.rollDefense(s,6);
    if(!s.match.events.at(-1).hold||s.match.events.at(-1).dodge)throw Error('The natural Balmhyr D6 fixture should Block.');
    if(!E.equipmentChoice(s))throw Error('Balmhyr seal should offer its support after Block.');
    E.grantEquipment(s,E.aiEquipmentChoice(s));E.assertState(s);
    if(s.equipment.version!==2||s.duel.formula.equipmentWeapon!==30||s.duel.formula.equipmentProtection!==30)throw Error('Missing current D6 equipment contributions.');
    const bound=db.registry.bindGame(user,s);await db.idle();await db.saveGame(bound);localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));
    return {attacker:a.uid,defender:b.uid,formula:s.duel.formula};
  },name);
  await ready(page,'arena');
  await page.waitForFunction(()=>document.querySelectorAll('.eq-overlay').length===3);
  await page.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay img')].every(i=>i.complete&&i.naturalWidth===488));
  assert.deepEqual((await page.locator('.eq-overlay').evaluateAll(nodes=>nodes.map(n=>n.dataset.slot))).sort(),['relic','shield','weapon']);
  await alignment(page,name+' current 4.6 three native anchors');
  assert.match(await page.locator('[data-bonus=equipmentAttack]').innerText(),/Hache du Roi Déchu/);
  assert.match(await page.locator('[data-bonus=equipmentDefense]').innerText(),/Rempart de Durane/);
  assert.equal(await page.locator('.recap-equipment-art').count(),2);
  await inspect(page,`.slot[data-unit="${duel.attacker}"] [data-action=detail]`,'fallen-king-axe',motion,{label:name+' current ATK anchor inspection'});await closeDetail(page);
  await inspect(page,`.slot[data-unit="${duel.defender}"] [data-action=detail]`,['durane-rampart','exiled-king-seal'],motion,{label:name+' current DEF and relic anchor inspection'});
  await page.setViewportSize({width:viewport.width-20,height:viewport.height-40});await detailAlignment(page,name+' current multi-slot inspector resize',motion);
  await page.setViewportSize(viewport);await detailAlignment(page,name+' current multi-slot inspector restore',motion);await closeDetail(page);
  await page.setViewportSize({width:viewport.width-20,height:viewport.height-40});await page.waitForTimeout(160);await alignment(page,name+' current three-slot arena resize');
  await page.setViewportSize(viewport);await page.waitForTimeout(160);
  if(name==='desktop'){
    await page.locator('#board-scale').fill('125');await page.locator('#board-scale').dispatchEvent('input');await page.waitForTimeout(350);await alignment(page,name+' current three-slot board zoom');
    await page.locator('#board-scale').fill('100');await page.locator('#board-scale').dispatchEvent('input');await page.waitForTimeout(350);
  }
  const animations=await page.locator('.eq-overlay .eq-orbit').evaluateAll(nodes=>nodes.map(n=>({name:getComputedStyle(n).animationName,iterations:getComputedStyle(n).animationIterationCount})));
  assert(animations.every(a=>motion==='reduce'?a.name==='none':a.name==='eq-continuous-orbit'&&a.iterations==='infinite'));
  await page.screenshot({path:path.join(out,name+'-current-three-slot-duel.png')});
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await alignment(page,name+' current three-slot snapshot reload');
  assert.equal(await page.evaluate(()=>JSON.stringify(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER))),profileBefore,'match snapshot never changes the profile');
  await page.evaluate(async()=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),s=JSON.parse(localStorage.getItem('kalistar.v4.game'));E.next(s);E.assertState(s);
    await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  });await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.equal(await page.locator('.eq-overlay[data-slot=weapon],.eq-overlay[data-slot=shield]').count(),0,'direct D6 equipment retracts at next duel');
  assert.equal(await page.locator('.eq-overlay[data-slot=relic]').count(),1,'unspent conditional relic stays active');
  results.push({label:name+' current D6 weapon/protection, conditional relic, three anchors, restart and expiry',passed:true,formula:duel.formula});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,viewport,motion] of [['desktop',{width:1440,height:900},'no-preference'],['razr50',{width:412,height:1007},'no-preference'],['reduced',{width:390,height:844},'reduce'],['compact',{width:320,height:568},'no-preference']]){
    // No persistent Chrome profile is used. Every IDB open is additionally routed
    // to a QA-only name, so production storage cannot be touched even accidentally.
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const url=new URL(route.request().url());
      if(url.origin!==new URL(base).origin||!url.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))throw Error('Missing built resource: '+relative);
      const mime={'.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{
      const open=IDBFactory.prototype.open;
      IDBFactory.prototype.open=function(name,version){const qa=String(name)+'-weapons-qa-only';return version===undefined?open.call(this,qa):open.call(this,qa,version);};
    });
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    page.on('dialog',dialog=>dialog.type()==='confirm'&&dialog.message().startsWith('Remplacer cette partie')?dialog.accept():dialog.dismiss());
    if(name==='desktop'){
      await page.goto(base+'/jeu/site-config.js');
      await page.evaluate(()=>new Promise((resolve,reject)=>{
        const request=indexedDB.open('kalistar-v4-cards',1);
        request.onupgradeneeded=()=>{
          const db=request.result;for(const name of ['versions','instances','matches','results'])db.createObjectStore(name,{keyPath:'id'});
          db.createObjectStore('qa-marker').put('preserved','migration');
        };
        request.onerror=()=>reject(request.error);request.onsuccess=()=>{request.result.close();resolve();};
      }));
    }
    await ready(page);assert.equal(await page.locator('.weapon-card').count(),definitions.length);
    await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card .eq-body')].every(i=>i.complete&&i.naturalWidth===488));
    const art=await page.locator('.weapon-card .eq-body').evaluateAll(images=>images.map(i=>new URL(i.src).pathname.split('/').pop()));
    assert.deepEqual(art,definitions.map(w=>require('./weapon-art.js').get(w)?.body||(w.visual==='axe'?'fallen-king-axe-v3.webp':'little-joys-flute-v3.webp')));
    await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card .eq-rim')].every(i=>i.complete&&i.naturalWidth===488));
    assert.deepEqual(await page.locator('.weapon-card .eq-rim').evaluateAll(images=>images.map(i=>new URL(i.src).pathname.split('/').pop())),definitions.map(w=>require('./weapon-art.js').get(w)?.rim||(w.visual==='axe'?'stone-copper-ring-v1.webp':'electro-copper-ring-v1.webp')));
    if(name==='desktop'){
      const orbit=page.locator('.weapon-card').first().locator('.eq-orbit');
      await page.mouse.move(1,1);assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationName),'none');
      await page.locator('.weapon-card').first().hover();
      assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationIterationCount),'infinite');
      await rotation(page,'.weapons-page .weapon-card .eq-orbit','hover rotation continues');
      await page.mouse.move(1,1);assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationName),'none');
      await page.locator('.weapon-open').first().focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');
      assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationIterationCount),'infinite','keyboard focus animates');
      await page.mouse.click(1,1);
    }
    assert.match(await page.title(),/^Kalistar V4\.6\.1/);
    if(name==='desktop')assert.equal(await page.locator('.edition').innerText(),'VERSION 4.6.1');
    else assert.equal(await page.locator('.brand').evaluate(n=>getComputedStyle(n,'::after').content),'"V4.6.1"');
    if(name==='desktop'){
      const migrated=await page.evaluate(()=>new Promise((resolve,reject)=>{
        const request=indexedDB.open('kalistar-v4-cards');request.onerror=()=>reject(request.error);
        request.onsuccess=()=>{const db=request.result,names=[...db.objectStoreNames],read=db.transaction('qa-marker').objectStore('qa-marker').get('migration');read.onsuccess=()=>{db.close();resolve({version:db.version,equipment:names.includes('equipment'),marker:read.result});};};
      }));
      assert.ok(migrated.version>1);assert.equal(migrated.equipment,true);assert.equal(migrated.marker,'preserved');results.push({label:'old database upgraded in place',...migrated});
    }
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    if(name==='razr50'){
      const nav=await page.locator('.main-nav button:visible').evaluateAll(nodes=>nodes.map(n=>({label:n.textContent,height:n.getBoundingClientRect().height,width:n.getBoundingClientRect().width})));
      assert.equal(nav.length,5);assert.ok(nav.every(n=>n.height>=44&&n.width>=44));results.push({label:'phone navigation',nav});
      await page.locator('.nav-more').click();assert.ok(await page.locator('#mobile-dialog [data-view=story]').isVisible());await page.locator('#mobile-dialog [data-action=close]').click();
    }
    await equipment(page,'fallen-king-axe');await equipment(page,'little-joys-flute');
    await page.screenshot({path:path.join(out,name+'-arsenal.png')});
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.match(await page.locator('.weapons-page [data-weapon-holder=fallen-king-axe]').getAttribute('aria-label'),/Porteur : BALMHYR/);
    assert.equal(await page.locator('.weapons-page [data-weapon=fallen-king-axe] .wc-holder img').getAttribute('alt'),'BALMHYR');
    await page.locator('[data-weapon=fallen-king-axe]').click();assert.equal(await page.locator('.weapon-carriers article').count(),1);await page.screenshot({path:path.join(out,name+'-weapon-detail.png')});
    await inspect(page,'[data-weapon-action=card]',null,motion,{label:name+' arsenal card has no combat overlay'});await closeDetail(page);
    await page.locator('[data-weapon-action=close]').click();
    const profileTests=await page.evaluate(async()=>{
      const db=KALISTAR_DB,p=KALISTAR_ACTIVE_USER,row=db.equipment.profile(p);let incompatible=false,stale=false,invalidImport=false;
      try{await db.equipment.equip(p,'momo','fallen-king-axe');}catch{incompatible=true;}
      try{await db.equipment.equip(p,'balmhyr','fallen-king-axe');}catch{stale=true;}
      const other=db.equipment.profile('user-tokyo');const backup=await db.exportBackup();
      const bad=structuredClone(backup);bad.equipment[0].slots.weapon.momo='fallen-king-axe';
      try{await db.importBackup(bad,{replaceRegistry:true});}catch{invalidImport=true;}
      const afterBad=await db.exportBackup();afterBad.exportedAt=backup.exportedAt;
      const unchanged=JSON.stringify(afterBad)===JSON.stringify(backup);
      const old=structuredClone(backup);delete old.equipment;await db.importBackup(old,{replaceRegistry:true});
      const afterOld=db.equipment.profile(p);await db.importBackup(backup,{replaceRegistry:true});
      return {incompatible,stale,invalidImport,unchanged,isolated:KalistarEquipment.items(other.slots).length===0,retained:JSON.stringify(afterOld)===JSON.stringify(row)};
    });assert.deepEqual(profileTests,{incompatible:true,stale:true,invalidImport:true,unchanged:true,isolated:true,retained:true});
    await equipment(page,'fallen-king-axe','unequip');await equipment(page,'fallen-king-axe');
    await page.locator('[data-view=decks]').first().click();
    const momoSlot=await page.evaluate(()=>KalistarTeamComposition.create(KalistarEngine.createEngine(KALISTAR_DATA)).slots(JSON.parse(localStorage.getItem('kalistar.v4.teamDraft'))).findIndex(id=>KALISTAR_DATA.cards.find(c=>c.id===id)?.characterId==='momo'));
    assert(momoSlot>=0);await page.locator(`[data-deck-action=slot][data-slot="${momoSlot}"]`).click();
    await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
    const flute=page.locator('[data-deck-action=equip][data-id=little-joys-flute]');
    if(await flute.count())await flute.click();else assert(await page.locator('[data-deck-action=unequip][data-id=little-joys-flute]').isVisible());
    if(viewport.width<=900)await page.locator('[data-deck-action=panel][data-id=board]').click();
    await page.locator('[data-deck-action=captain][data-slot="0"]').click();
    const loadout=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.teamDraft')).equipment);
    assert.equal(await page.locator('.team-equipped').count(),Object.values(loadout).reduce((sum,items)=>sum+Object.keys(items).length,0));
    assert.deepEqual(Object.keys(loadout).sort(),['relic','shield','weapon']);assert.equal(loadout.relic.momo,'little-joys-flute');
    const momoEye=`[data-deck-slot="${momoSlot}"] [data-deck-action=detail]`;
    await inspect(page,momoEye,'little-joys-flute',motion,{bonus:false,label:name+' deck inspection'});
    await page.screenshot({path:path.join(out,name+'-deck-inspection.png')});
    await page.locator('#detail-dialog [data-action=toggle-art]').click();assert.equal(await page.locator('.eq-detail-overlay').count(),0,'illustration has no medallion');
    await page.locator('#detail-dialog [data-action=toggle-art]').click();await detailAlignment(page,name+' back to deck card',motion);
    const momoVersions=await page.locator('#detail-dialog [data-action=detail-version]').count();
    if(momoVersions>1){await page.locator('#detail-dialog [data-action=detail-version]').last().click();await detailAlignment(page,name+' deck character version',motion);}
    await closeDetail(page);
    const deckOrbit=page.locator('.team-equipped .eq-orbit').first();
    assert.equal(await deckOrbit.evaluate(n=>getComputedStyle(n).animationName),motion==='reduce'?'none':'eq-continuous-orbit');
    await page.locator(`[data-deck-action=slot][data-slot="${momoSlot}"]`).click();
    await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
    await page.locator('[data-deck-action=unequip][data-id=little-joys-flute]').click();
    if(viewport.width<=900)await page.locator('[data-deck-action=panel][data-id=board]').click();
    await inspect(page,momoEye,null,motion,{label:name+' deck unequipped despite global preference'});await closeDetail(page);
    if(viewport.width<=900)await page.locator('[data-deck-action=panel][data-id=recruit]').click();
    await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
    await page.locator('[data-deck-action=equip][data-id=little-joys-flute]').click();
    if(viewport.width<=900)await page.locator('[data-deck-action=panel][data-id=board]').click();
    await page.locator('[data-deck-action=play]').click();
    await page.locator('#game-mode').selectOption('local');await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('WEAPONS-BROWSER');
    await page.locator('#new-game-form [type=submit]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')||'null')?.seed==='WEAPONS-BROWSER');
    const launched=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).equipment.loadouts);
    assert.deepEqual(launched,[loadout,{weapon:{},shield:{},relic:{}}]);results.push({label:name+' 4.6 pre-match UI captures three-slot deck loadout, not global preferences',passed:true});
    await prepare(page,'normal');assert.equal(await page.locator('.eq-overlay').count(),0,'inactive cards stay exactly normal');await page.screenshot({path:path.join(out,name+'-normal-cards.png')});
    const inactive=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).players[0].board.find(u=>KALISTAR_DATA.cards.find(c=>c.id===u?.cardId)?.characterId==='balmhyr').uid);
    await inspect(page,`.slot[data-unit="${inactive}"] [data-action=detail]`,null,motion,{label:name+' inactive arena inspection'});await closeDetail(page);
    await prepare(page,'axe',name==='reduced'?1:0);
    const side=name==='reduced'?1:0,slot=page.locator(`.formation[data-player="${side}"] .slot-card:not(.empty)`);await slot.click();
    await page.locator(`.formation[data-player="${1-side}"] .slot-card:not(.empty)`).first().click();await page.waitForTimeout(600);
    await alignment(page,name+' archived 4.5.64 challenger');await page.screenshot({path:path.join(out,name+'-axe-challenger.png')});
    await inspect(page,`.formation[data-player="${side}"] .slot[data-unit]:has(.eq-overlay) [data-action=detail]`,'fallen-king-axe',motion,{label:name+' active arena inspection'});
    await page.screenshot({path:path.join(out,name+'-arena-inspection.png')});
    await page.setViewportSize({width:viewport.width-20,height:viewport.height-40});await detailAlignment(page,name+' resize while inspecting',motion);
    await page.setViewportSize(viewport);await detailAlignment(page,name+' restore inspector viewport',motion);await closeDetail(page);
    const loop=await page.locator('.eq-overlay.is-active').evaluate(n=>[...n.querySelectorAll('.eq-orbit,.eq-radar')].map(e=>({name:getComputedStyle(e).animationName,iterations:getComputedStyle(e).animationIterationCount,opacity:getComputedStyle(e).opacity})));
    assert.equal(loop.length,2);
    if(motion==='reduce')assert(loop.every(e=>e.name==='none'));
    else{
      assert(loop.every(e=>e.iterations==='infinite'));assert(Number(loop[1].opacity)>.5);
      await rotation(page,'.eq-overlay .eq-orbit','active archived weapon continuously rotates');
    }
    await page.locator('[data-action=lock]').click();await page.locator('[data-action=roll]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).phase==='defense');
    assert.match(await page.locator('[data-bonus=equipmentAttack]').innerText(),/30/);
    await page.locator('[data-action=roll]').click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).phase==='result');
    const numeric=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).duel.formula);assert.equal(numeric.equipmentAttack,30);
    await alignment(page,name+' after attack');
    await page.evaluate(()=>{
      const s=JSON.parse(localStorage.getItem('kalistar.v4.game')),E=KalistarEngine.createEngine(KALISTAR_DATA);
      KalistarEquipmentFX.capture();KalistarEquipmentFX.mount({...s,phase:'setup'},E);
    });await page.waitForTimeout(motion==='reduce'?50:100);
    assert.equal(await page.locator('.eq-overlay').count(),1,'deactivation unfolds before removal');
    await page.waitForTimeout(450);assert.equal(await page.locator('.eq-overlay').count(),0,'deactivation removes dynamic medallion');
    await page.evaluate(()=>{
      const s=JSON.parse(localStorage.getItem('kalistar.v4.game')),E=KalistarEngine.createEngine(KALISTAR_DATA);
      KalistarEquipmentFX.capture({reset:true});KalistarEquipmentFX.mount({...s,phase:'setup'},E);KalistarEquipmentFX.capture();KalistarEquipmentFX.mount(s,E);
    });
    await page.setViewportSize({width:viewport.width-20,height:viewport.height-40});await page.waitForTimeout(160);await alignment(page,name+' resizing during activation');
    await page.setViewportSize(viewport);await page.waitForTimeout(700);
    if(name==='desktop'){
      await page.locator('#board-scale').fill('125');await page.locator('#board-scale').dispatchEvent('input');await page.waitForTimeout(350);await alignment(page,'desktop board zoom 125%');
      await page.locator('#board-scale').fill('100');await page.locator('#board-scale').dispatchEvent('input');await page.waitForTimeout(350);
      await page.locator('.arena-toolbar [data-action=combat-reference][data-reference=weapons]').click();
      const glyph=page.locator('#combat-reference-dialog [data-defender="Fléau"] img');
      await glyph.evaluate(n=>n.complete?Promise.resolve():new Promise(resolve=>n.addEventListener('load',resolve,{once:true})));
      assert((await glyph.getAttribute('src')).endsWith('base-weapons/04.svg'));assert.equal(await glyph.evaluate(n=>n.naturalWidth),96);
      assert(await page.locator('.weapon-icon-credit').isVisible());await page.screenshot({path:path.join(out,'white-flail-codex.png')});
      await page.locator('#combat-reference-dialog [data-action=close]').click();
    }
    if(name==='reduced')assert.equal(await page.locator('.eq-overlay').evaluate(n=>n.getAnimations({subtree:true}).length),0);
    const snapshot=await page.evaluate(async()=>{const s=JSON.parse(localStorage.getItem('kalistar.v4.game'));await KALISTAR_DB.equipment.unequip(KALISTAR_ACTIVE_USER,'balmhyr','fallen-king-axe');return s.equipment.loadouts[0].balmhyr||s.equipment.loadouts[1].balmhyr;});assert.equal(snapshot,'fallen-king-axe');
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.locator('.eq-overlay').count(),1,'match keeps its original loadout');
    await inspect(page,`.slot:has(.eq-overlay) [data-action=detail]`,'fallen-king-axe',motion,{label:name+' inspection preserves original match equipment'});await closeDetail(page);
    await prepare(page,'flute');
    const beneficiary=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).players[0].board.find(u=>KALISTAR_DATA.cards.find(c=>c.id===u?.cardId)?.characterId==='balmhyr').uid);
    await page.locator(`.slot[data-unit="${beneficiary}"] .slot-card`).click();await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).phase==='result');
    await alignment(page,name+' archived 4.5.64 flute support');assert.equal(await page.locator('.eq-pending').count(),1);await page.screenshot({path:path.join(out,name+'-flute-support.png')});
    await inspect(page,'.slot:has(.eq-overlay) [data-action=detail]','little-joys-flute',motion,{label:name+' active flute inspection'});await closeDetail(page);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.locator('.eq-pending').count(),1);
    await page.evaluate(()=>{
      const s=JSON.parse(localStorage.getItem('kalistar.v4.game')),E=KalistarEngine.createEngine(KALISTAR_DATA);E.next(s);
      const b=s.players[0].board.find(u=>E.card(u).characterId==='balmhyr'),a=s.players[1].board[0];
      E.lock(s,0,s.players[0].board.indexOf(b));E.rollAttack(s,6);E.rollDefense(s,6);E.assertState(s);
      if(s.duel.formula.equipmentDefense!==30)throw Error('Missing real DEF bonus.');
      localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
    });await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await page.locator('.eq-pending').count(),0);assert.equal(await page.locator('.eq-overlay').count(),0);assert.match(await page.locator('[data-bonus=equipmentDefense]').innerText(),/30/);
    const spent=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).players[0].board.find(u=>KALISTAR_DATA.cards.find(c=>c.id===u?.cardId)?.characterId==='momo').uid);
    await inspect(page,`.slot[data-unit="${spent}"] [data-action=detail]`,null,motion,{label:name+' consumed flute inspection'});await closeDetail(page);
    await currentThreeSlots(page,name,viewport,motion);
    await page.locator('[data-view=collection]').first().evaluate(n=>n.click());assert.equal(await page.locator('.eq-overlay').count(),0);assert.equal(await page.locator('.eq-transfer,.eq-gift').count(),0);
    if(name==='desktop')await replacementUI(page);
    await context.close();results.push({label:name,passed:true,profileTests});
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));
  console.log('PASS: weapons UI, profiles/backups/reload, live engine bonuses, native geometry, desktop/Razr/reduced motion and cleanup.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
