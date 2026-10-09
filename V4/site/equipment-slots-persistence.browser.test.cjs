'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module'),{buildCatalog}=require('../atelier/game-catalog.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE||'','.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const runtime=createRequire(path.join(modules,'__equipment_slots_qa__.cjs'));
const ROOT=path.resolve(__dirname,'../..'),origin='https://equipment-460.invalid';
const output=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/equipment-slots-460');
const scripts=['assets/lucide.min.js','ui-system.js','factions.js','weapons.js','weapon-art.js','defensive-equipment.js','equipment.js','turn-order.js','engine.js','base-weapons.js','collaborations.js','card-media.js','equipment-presentation.js','local-db.js','weapon-cards.js','weapons-ui.js','deck-library.js','team-composition.js','deck-builder.js'];
const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const data=await buildCatalog(),references=require('../atelier/data/references.json'),checks=[],errors=[];
  const browser=await runtime('playwright').chromium.launch({channel:process.env.KALISTAR_BROWSER||'chrome',headless:true});
  let page;
  try{
    const context=await browser.newContext({viewport:{width:1920,height:1080},serviceWorkers:'block'});
    await context.route(origin+'/**',async route=>{
      const url=new URL(route.request().url()),name=decodeURIComponent(url.pathname);
      if(name==='/db')return route.fulfill({contentType:'text/html',body:'<!doctype html><meta charset="utf-8"><title>Isolated equipment persistence</title>'});
      if(name==='/composition'){
        const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/g,'').replace('href="manifest.webmanifest"','href="data:application/manifest+json,{}"');
        return route.fulfill({contentType:'text/html',body:html});
      }
      let file;
      if(name.startsWith('/media/reference/')){
        const ref=references.cards.find(r=>name==='/media/reference/'+r.key+'.png');if(ref)file=path.join(ROOT,ref.png);
      }else if(name.startsWith('/shared/'))file=path.join(ROOT,'V3/assets',name.slice(8));
      else{
        file=path.resolve(__dirname,'.'+name);
        assert(file.startsWith(__dirname+path.sep),'QA route outside site');
        if(!fs.existsSync(file)&&name.startsWith('/assets/'))file=path.join(ROOT,'V3/site',name);
      }
      if(!file||!fs.existsSync(file))return route.fulfill({status:404,body:name});
      return route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
    });
    page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
    await page.goto(origin+'/db');
    for(const file of scripts)await page.addScriptTag({url:origin+'/'+file});
    checks.push(...await page.evaluate(databaseScenarios,data));
    console.log('PASS isolated IndexedDB scenarios');
    await page.goto(origin+'/composition');
    for(const file of scripts)await page.addScriptTag({url:origin+'/'+file});
    await page.evaluate(mountComposition,data);
    await compositionScenarios(page,checks,data);
    await arsenalScenarios(page,checks);
    assert.deepEqual(errors,[],'page errors');
    fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,isolated:true,checks,errors},null,2));
    for(const check of checks)console.log('PASS '+check);
    await context.close();
  }catch(error){
    if(page&&!page.isClosed()){fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});}
    throw error;
  }finally{await browser.close();}
}
async function databaseScenarios(data){
  const Q=KalistarEquipment,E=KalistarEngine.createEngine(data),user='qa-equipment-460',namespace='kalistar-v4-cards-slots-'+crypto.randomUUID();
  const equal=(a,b)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error('Expected '+JSON.stringify(b)+', got '+JSON.stringify(a));};
  const reject=async fn=>{try{await fn();}catch{return;}throw Error('Expected rejected mutation.');};
  let db=await KalistarLocalDB.open(data,{name:namespace}),peer=null;
  try{
    await db.equipment.equip(user,'balmhyr','fallen-king-axe');
    const expectedProfile=db.equipment.profile(user);
    peer=await KalistarLocalDB.open(data,{name:namespace});
    await peer.equipment.equip(user,'balmhyr','exiled-king-seal');
    await reject(()=>db.equipment.equip(user,'balmhyr','durane-rampart',{expectedProfile}));
    await db.equipment.equip(user,'balmhyr','durane-rampart');
    equal(db.equipment.items(user,'balmhyr').map(w=>w.slot),['weapon','shield','relic']);
    equal(db.equipment.weapon(user,'balmhyr').id,'fallen-king-axe');
    await reject(()=>db.equipment.equip(user,'momo','fallen-king-axe'));
    const snapshot=db.equipment.profile(user);snapshot.slots.weapon.balmhyr='unknown';
    equal(db.equipment.profile(user).slots.weapon.balmhyr,'fallen-king-axe');
    await db.equipment.equip(user,'lok','durane-rampart');
    equal(db.equipment.profile(user).slots.shield,{lok:'durane-rampart'});
    equal(db.equipment.profile(user).slots.relic,{balmhyr:'exiled-king-seal'});
    await db.equipment.unequip(user,'lok','durane-rampart');
    equal(db.equipment.profile(user).slots.weapon,{balmhyr:'fallen-king-axe'});
    await db.equipment.equip(user,'momo','little-joys-flute');
    await db.equipment.equip(user,'momo','little-joys-box',{expected:'little-joys-flute'});
    equal(db.equipment.profile(user).slots.relic.momo,'little-joys-box');
    await reject(()=>db.equipment.unequip(user,'momo','little-joys-flute'));
    const T=KalistarTeamComposition.create(E,()=>db.equipment.profile(user).slots),team=T.normalize({name:'Snapshot QA',cards:data.decks.player});
    team.captain=team.formation[0];const game=E.newGame(team,team,{mode:'local',seed:'DB-SLOTS',kalistel:false});
    await db.saveGame(game);const frozen=JSON.stringify(db.match(game.matchId).state);
    await db.equipment.unequip(user,'balmhyr','fallen-king-axe');
    equal(JSON.stringify(db.match(game.matchId).state),frozen);
    const backup=await db.exportBackup();await db.importBackup(backup);
    equal(JSON.stringify(db.match(game.matchId).state),frozen);
    const corrupt=structuredClone(backup);corrupt.equipment[0].slots.weapon.momo='fallen-king-axe';
    await reject(()=>db.importBackup(corrupt));equal(JSON.stringify(db.match(game.matchId).state),frozen);
    peer.close();peer=null;db.close();db=await KalistarLocalDB.open(data,{name:namespace});
    equal(db.equipment.profile(user).version,2);equal(db.equipment.profile(user).slots.relic.momo,'little-joys-box');
    equal(JSON.stringify(db.match(game.matchId).state),frozen);
    db.close();
    await new Promise((resolve,reject)=>{
      const req=indexedDB.open(namespace);req.onerror=()=>reject(req.error);req.onsuccess=()=>{
        const raw=req.result,tx=raw.transaction('equipment','readwrite');
        tx.objectStore('equipment').put({id:'legacy-qa',version:1,slots:{weapon:{momo:'little-joys-flute'}}});
        tx.oncomplete=()=>{raw.close();resolve();};tx.onabort=()=>{raw.close();reject(tx.error);};
      };
    });
    db=await KalistarLocalDB.open(data,{name:namespace});
    equal(db.equipment.profile('legacy-qa').slots,{weapon:{},shield:{},relic:{momo:'little-joys-flute'}});
    const exported=await db.exportBackup();equal(exported.equipment.find(r=>r.id==='legacy-qa').version,2);
    return ['IndexedDB: three-slot save/reopen, legacy migration and backup/import without losing matches','IndexedDB: cross-connection stale confirms, replacements, transfers, per-slot removal and incompatible rejection','Match snapshot isolation from later profile changes and rejected corrupt imports'];
  }finally{peer?.close();db?.close();}
}
function mountComposition(data){
  const E=KalistarEngine.createEngine(data),T=KalistarTeamComposition.create(E),source=T.normalize({name:'Composition 4.6',cards:data.decks.player});
  const balm=data.cards.find(c=>c.characterId==='balmhyr');
  source.formation[0]=balm.id;source.captain=balm.id;
  window.QA={data,E,T,draft:source,toasts:[]};
  document.body.className='decks-view';
  QA.builder=KalistarDeckBuilder.create({data,engine:E,userId:'qa-ui-460',storage:localStorage,
    registry:{deckErrors:()=>[],owned:()=>[{}]},getDraft:()=>QA.draft,onDraft:value=>{QA.draft=structuredClone(value);},toast:text=>QA.toasts.push(text),
    onDetail:()=>{},getEquipmentDefaults:()=>KalistarEquipment.emptyLoadout()});
  QA.builder.mount(document.getElementById('app'));
}
async function compositionScenarios(page,checks,data){
  const draft=()=>page.evaluate(()=>structuredClone(QA.draft));
  await page.locator('[data-deck-action=slot][data-slot="0"]').click();
  await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
  assert.equal(await page.locator('.team-equipment-group').count(),3);
  for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal'])await page.locator('[data-deck-action=equip][data-id="'+id+'"]').click();
  let value=await draft();assert.equal(value.equipment.weapon.balmhyr,'fallen-king-axe');assert.equal(value.equipment.shield.balmhyr,'durane-rampart');assert.equal(value.equipment.relic.balmhyr,'exiled-king-seal');
  assert.equal(await page.locator('[data-deck-slot="0"] .team-equipped').count(),3);
  await page.locator('[data-deck-action=unequip][data-id=durane-rampart]').click();
  value=await draft();assert.deepEqual(value.equipment.shield,{});assert.equal(value.equipment.weapon.balmhyr,'fallen-king-axe');
  await page.locator('[data-deck-action=undo]').click();assert.equal((await draft()).equipment.shield.balmhyr,'durane-rampart');
  await page.locator('[data-deck-action=redo]').click();assert.deepEqual((await draft()).equipment.shield,{});
  await page.locator('[data-deck-action=undo]').click();
  await page.locator('.kdb-heading [data-deck-action=save]').click();
  value=await draft();await page.reload();for(const file of scripts)await page.addScriptTag({url:origin+'/'+file});await page.evaluate(mountComposition,data);
  const saved=await page.evaluate(()=>QA.builder.listDecks());assert.equal(saved.length,1);assert.deepEqual(saved[0].equipment,value.equipment);
  await page.evaluate(id=>QA.builder.openDeck(id),saved[0].id);
  await page.locator('[data-deck-action=recruit-mode][data-id=weapons]').click();
  await page.waitForTimeout(500);await verifyAnchors(page);fs.mkdirSync(output,{recursive:true});await page.screenshot({path:path.join(output,'composition-desktop.png')});
  await page.setViewportSize({width:412,height:1007});
  await page.waitForTimeout(250);await verifyAnchors(page);await page.screenshot({path:path.join(output,'composition-team-phone.png')});
  await page.locator('[data-deck-action=panel][data-id=recruit]').click();
  await page.waitForTimeout(300);await page.screenshot({path:path.join(output,'composition-phone.png')});
  const width=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,viewport:innerWidth}));assert(width.scroll<=width.viewport+2);
  assert.equal(await page.locator('.team-equipment-group').count(),3);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.locator('[data-deck-action=panel][data-id=board]').click();
  const motion=await page.locator('[data-deck-slot="0"] .team-equipped .eq-orbit').evaluateAll(nodes=>nodes.map(n=>getComputedStyle(n).animationName));
  assert(motion.every(name=>name==='none'),'reduced motion must stop equipment rotation');
  await page.emulateMedia({reducedMotion:'no-preference'});
  checks.push('Deck UI: three-category picker, three compact equipped items, scoped unequip and independent undo/redo','Deck UI: schema 2 save/reload, desktop and smartphone screenshots without horizontal overflow');
  checks.push('Deck UI: shared native anchors within one CSS pixel on PC/phone; continuous rotation and Reduced Motion both verified');
}
async function verifyAnchors(page){
  const metrics=await page.locator('[data-deck-slot="0"] .team-equipped').evaluateAll(nodes=>nodes.map(node=>{
    const img=node.parentElement.querySelector('img'),r=img.getBoundingClientRect(),o=node.getBoundingClientRect();
    const n=KalistarEquipmentFX.layouts[node.dataset.equipmentSlot],crop=KalistarCardMedia.crop;
    return {slot:node.dataset.equipmentSlot,x:Math.abs(o.x+o.width/2-r.x-(n.left-crop.left+n.width/2)/crop.width*r.width),
      y:Math.abs(o.y+o.height/2-r.y-(n.top-crop.top+n.height/2)/crop.height*r.height),
      width:Math.abs(o.width-n.width/crop.width*r.width),height:Math.abs(o.height-n.height/crop.height*r.height),
      animation:getComputedStyle(node.querySelector('.eq-orbit')).animationName};
  }));
  assert.equal(metrics.length,3);
  for(const m of metrics){assert(Math.max(m.x,m.y,m.width,m.height)<1,JSON.stringify(m));assert.match(m.animation,/eq-continuous-orbit/);}
}
async function arsenalScenarios(page,checks){
  await page.setViewportSize({width:1920,height:1080});
  await page.evaluate(async()=>{
    QA.builder.destroy();document.body.className='weapons-view';
    QA.db=await KalistarLocalDB.open(QA.data,{name:'kalistar-v4-cards-arsenal-460-'+crypto.randomUUID()});
    await QA.db.equipment.equip('arsenal-qa','balmhyr','fallen-king-axe');
    await QA.db.equipment.equip('arsenal-qa','balmhyr','durane-rampart');
    await QA.db.equipment.equip('arsenal-qa','balmhyr','exiled-king-seal');
    QA.arsenal=KalistarWeaponsUI.create({data:QA.data,db:QA.db,userId:'arsenal-qa',toast:text=>QA.toasts.push(text)});
    QA.arsenal.mount(document.getElementById('app'));QA.arsenal.open('durane-rampart');
  });
  const current=page.locator('#weapons-dialog .is-current');assert.match(await current.innerText(),/BALMHYR/);
  await current.locator('[data-weapon-action=unequip]').click();
  await page.waitForFunction(()=>!QA.db.equipment.profile('arsenal-qa').slots.shield.balmhyr);
  const loadout=await page.evaluate(()=>QA.db.equipment.profile('arsenal-qa').slots);
  assert.equal(loadout.weapon.balmhyr,'fallen-king-axe');assert.equal(loadout.relic.balmhyr,'exiled-king-seal');assert.deepEqual(loadout.shield,{});
  await page.locator('#weapons-dialog [data-weapon-action=equip][data-character=balmhyr]').click();
  assert.equal(await page.locator('.weapon-confirm').count(),0,'different categories must not ask to replace each other');
  await page.waitForFunction(()=>QA.db.equipment.profile('arsenal-qa').slots.shield.balmhyr==='durane-rampart');
  await page.evaluate(async()=>{await QA.db.equipment.equip('arsenal-qa','momo','little-joys-flute');QA.arsenal.open('little-joys-box');});
  await page.locator('#weapons-dialog [data-weapon-action=equip][data-character=momo]').click();
  assert.match(await page.locator('.weapon-confirm').innerText(),/Remplacer/);
  await page.evaluate(()=>QA.db.equipment.unequip('arsenal-qa','balmhyr','durane-rampart'));
  const notices=await page.evaluate(()=>QA.toasts.length);
  await page.locator('#weapons-dialog [data-weapon-action=confirm]').click();
  await page.waitForFunction(count=>QA.toasts.length>count,notices);
  assert.match(await page.evaluate(()=>QA.toasts.at(-1)),/chang/);
  assert.equal(await page.evaluate(()=>QA.db.equipment.profile('arsenal-qa').slots.relic.momo),'little-joys-flute');
  await page.evaluate(()=>QA.arsenal.open('little-joys-box'));
  await page.locator('#weapons-dialog [data-weapon-action=equip][data-character=momo]').click();
  await page.locator('#weapons-dialog [data-weapon-action=confirm]').click();
  await page.waitForFunction(()=>QA.db.equipment.profile('arsenal-qa').slots.relic.momo==='little-joys-box');
  await page.evaluate(async()=>{await QA.db.equipment.equip('arsenal-qa','balmhyr','durane-rampart');QA.arsenal.open('durane-rampart');});
  await page.screenshot({path:path.join(output,'arsenal-desktop.png')});
  await page.setViewportSize({width:412,height:1007});await page.waitForTimeout(350);
  await page.screenshot({path:path.join(output,'arsenal-phone.png')});
  await page.locator('#weapons-dialog [data-weapon-action=close]').click();
  await page.screenshot({path:path.join(output,'arsenal-grid-phone.png')});
  await page.evaluate(()=>{QA.arsenal.destroy();QA.db.close();});
  checks.push('Arsenal UI: current holder per category, scoped removal, coexistence without false replacement, PC/phone screenshots');
  checks.push('Arsenal UI: same-slot replacement requires confirmation; stale whole-profile confirmation is rejected without replacing Momo relic');
}
main().catch(error=>{console.error(error);process.exitCode=1;});
