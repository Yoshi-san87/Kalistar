'use strict';

const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__card_detail_qa__.cjs'))('playwright');
const legacyWeapons=require('./fixtures/weapons-v4.5.28.json').weapons;
const built=!!process.env.KALISTAR_DIST||process.env.KALISTAR_BUILT_SITE==='1';
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://card-detail-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=path.resolve(__dirname,'../revisions/2026-10-11-razr-experience/qa/detail',built?'built':'.');
const errors=[],checks=[];
let browser,navigation=0;

async function ready(page,view){
  await page.goto(base+'/jeu/?card-detail-qa-only='+ ++navigation+'#'+view);
  await page.waitForFunction(()=>window.KALISTAR_READY);
  // Allows independent QA before the parent adds the production stylesheet link.
  if(!await page.locator('link[href*="card-detail.css"]').count())await page.addStyleTag({url:base+'/jeu/card-detail.css'});
}
async function back(page,selector='#detail-dialog'){
  await page.goBack();
  await page.waitForFunction(selector=>!document.querySelector(selector).open,selector);
}
async function images(page){
  await page.waitForFunction(()=>[...document.querySelectorAll('#detail-dialog img')].every(i=>i.complete&&i.naturalWidth>0));
}
async function snapshot(page){
  return page.evaluate(async()=>{await KALISTAR_DB.idle();const backup=await KALISTAR_DB.exportBackup();delete backup.exportedAt;return {backup,equipment:KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER),game:localStorage.getItem('kalistar.v4.game'),team:localStorage.getItem('kalistar.v4.teamDraft')};});
}
async function geometry(page,name){
  const layout=await page.locator('#detail-dialog').evaluate(d=>{
    const bounds=n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const body=d.querySelector('.detail-body'),visual=d.querySelector('.detail-visual'),equipment=d.querySelector('.detail-equipment');
    const overflows=[...d.querySelectorAll('.detail-equipment-name,.detail-equipment-meta,summary,.detail-actions')].filter(n=>n.getClientRects().length&&n.scrollWidth>n.clientWidth+2).map(n=>n.className||n.tagName);
    return {dialog:bounds(d),visual:bounds(visual),equipment:bounds(equipment),actions:bounds(d.querySelector('.detail-actions')),bodyWidth:body.clientWidth,scrollWidth:body.scrollWidth,viewport:{width:innerWidth,height:innerHeight},overflows};
  });
  assert(layout.dialog.x>=0&&layout.dialog.right<=layout.viewport.width+1,name+' dialog fits horizontally');
  assert(layout.dialog.y>=0&&layout.dialog.bottom<=layout.viewport.height+1,name+' dialog fits vertically');
  assert(layout.actions.bottom<=layout.viewport.height+1,name+' actions remain visible');
  assert(layout.equipment.y>=layout.visual.bottom-1,name+' equipment directly below the visual');
  assert(layout.scrollWidth<=layout.bodyWidth+1,name+' no horizontal body overflow');
  assert.deepEqual(layout.overflows,[],name+' text is not clipped');
  return layout;
}
async function openDeck(page,id){
  await page.locator(`[data-deck-slot][data-deck-preview="${id}"] [data-deck-action=detail]`).click();
  await images(page);
}
async function fixture(page){
  return page.evaluate(async()=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),db=KALISTAR_DB,user=KALISTAR_ACTIVE_USER;
    const balm=KALISTAR_DATA.cards.find(c=>c.characterId==='balmhyr'),ids=KALISTAR_DATA.decks.player;
    const legal=ids.includes(balm.id)?ids:ids.map((_,i)=>ids.map((id,j)=>i===j?balm.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
    if(!legal)throw Error('No legal Balmhyr fixture');
    let team=T.fromPreset({name:'Fiche trois objets QA',cards:legal});
    for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal']){
      team=T.equip(team,balm.id,id);await db.equipment.equip(user,balm.characterId,id);
    }
    localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
    const idle=E.newGame(team,team,{mode:'local',seed:'DETAIL-QA-IDLE',kalistel:false,turnOrder:'ABBA'});
    E.rollInitiative(idle,[6,1]);E.assertState(idle);
    const active=E.newGame(team,team,{mode:'local',seed:'DETAIL-QA-ACTIVE',kalistel:false,turnOrder:'ABBA'});
    E.rollInitiative(active,[6,1]);
    E.lock(active,active.players[0].board.findIndex(u=>u.cardId===balm.id),active.players[1].board.findIndex(u=>u.cardId===balm.id));
    E.rollAttack(active,6);E.rollDefense(active,6);
    while(E.equipmentChoice(active))E.grantEquipment(active,E.aiEquipmentChoice(active));
    E.assertState(active);
    const over=E.clone(active);over.matchId='match-'+crypto.randomUUID();
    for(let i=0;i<5000&&over.phase!=='over';i++){
      if(E.equipmentChoice(over)){E.grantEquipment(over,E.aiEquipmentChoice(over));continue;}
      if(over.phase==='choose')E.lock(over,...E.aiChoice(over));
      else if(over.phase==='attack')E.rollAttack(over);
      else if(over.phase==='kalistel')E.acceptAttack(over);
      else if(over.phase==='defense')E.rollDefense(over);
      else if(over.phase==='result')E.next(over);
      else if(over.phase==='replace')E.autoDeploy(over,over.replacing);
      else {const type={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[over.phase];if(!type)throw Error('Unexpected fixture phase '+over.phase);E['grant'+type](over,E['ai'+type+'Choice'](over));}
    }
    if(over.phase!=='over')throw Error('Archive fixture did not finish');
    E.assertState(over);await db.saveGame(over);await db.idle();
    return {id:balm.id,team,idle,active,over};
  });
}
async function loadGame(page,state){
  await page.evaluate(async s=>{await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},state);
  await ready(page,'arena');
}
async function inspect(page,uid){
  await page.locator(`.slot[data-unit="${uid}"] [data-action=detail]`).click();await images(page);
}
async function legacyFixture(page,f){
  return page.evaluate(({f,weapons})=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(f.team.cards,f.team.cards,{mode:'local',seed:'DETAIL-QA-LEGACY',kalistel:false,equipment:[{},{}]});
    s.equipment={version:1,definitions:weapons,loadouts:[{balmhyr:'fallen-king-axe'},{}],pending:{}};
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    const p=s.players[0],u=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===f.id);
    if(!p.board.includes(u)){const slot=E.card(u).positions[0]-1;E.recall(s,0,slot);E.deploy(s,0,u.uid,slot);}
    E.start(s);E.assertState(s);return {state:s,uid:u.uid};
  },{f,weapons:legacyWeapons});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  try{
    for(const [name,width,height,motion] of [['desktop',1440,1000,'no-preference'],['wide',1920,1080,'no-preference'],['razr',412,1007,'no-preference'],['phone',390,844,'no-preference'],['compact',320,568,'reduce'],['landscape',844,390,'reduce']]){
      const context=await browser.newContext({viewport:{width,height},isMobile:width<700,hasTouch:width<700,reducedMotion:motion,serviceWorkers:'block'});
      context.setDefaultTimeout(20000);
      if(built)await context.route('**/*',route=>{
        const url=new URL(route.request().url()),root=new URL(base),prefix=root.pathname.replace(/\/$/,'');
        if(url.origin!==root.origin||!url.pathname.startsWith(prefix+'/'))return route.abort();
        let relative=decodeURIComponent(url.pathname.slice(prefix.length+1));if(relative.endsWith('/'))relative+='index.html';
        const file=path.resolve(dist,relative);
        assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing isolated build resource '+relative);
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open,remove=IDBFactory.prototype.deleteDatabase;
        window.detailQADatabases=[];
        IDBFactory.prototype.open=function(n,v){const name=n+'-card-detail-qa-only';detailQADatabases.push(name);return v===undefined?open.call(this,name):open.call(this,name,v);};
        IDBFactory.prototype.deleteDatabase=function(n){return remove.call(this,n+'-card-detail-qa-only');};
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(name+': '+r.status()+' '+r.url());});
      try{
        await ready(page,'decks');const f=await fixture(page);await ready(page,'decks');
        const before=await snapshot(page);await openDeck(page,f.id);
        assert.equal(await page.locator('.detail-equipment-card .wc-surface').count(),3,'real equipment cards');
        assert.equal(await page.locator('.detail-equipment[data-equipment-source=deck]').count(),1);
        assert.equal(await page.locator('.detail-equipment-card[data-equipment-state=snapshot]').count(),3);
        assert.equal(await page.locator('.detail-equipment-card [data-weapon-holder],.detail-equipment-card button').count(),0,'no second equip or inventory control');
        assert.equal(await page.locator('.eq-detail-overlay').count(),3,'existing deck overlay flow');
        const layout=await geometry(page,name);
        await page.screenshot({path:path.join(out,name+'-deck.png'),scale:'css'});
        const first=page.locator('.detail-equipment-card').first();
        const equipId=await first.getAttribute('data-id');await first.click();
        assert.equal(await page.locator('#weapons-dialog[open]').count(),1);
        assert.equal(await page.locator(`#weapons-dialog .wc-surface[data-weapon-card="${equipId}"]`).count(),1);
        await back(page,'#weapons-dialog');assert.equal(await page.locator('#detail-dialog[open]').count(),1);
        await page.locator('[data-detail-section=lore]>summary').click();
        assert.equal(await page.locator('#detail-dialog .story').innerText(),await page.evaluate(id=>KALISTAR_DATA.cards.find(c=>c.id===id).text,f.id));
        await page.locator('[data-detail-section=career]>summary').click();
        assert.equal(await page.locator('.career-panel').count(),1);assert.equal(await page.locator('.ownership-banner').count(),1);
        const instance=await page.locator('#career-instance option').nth(1).getAttribute('value');
        await page.locator('#career-instance').selectOption(instance);
        assert.equal(await page.locator('#career-instance').inputValue(),instance,'replacement remains inside accordion');
        assert.equal(await page.locator('.ownership-banner').count(),1,'no ownership duplication after career replacement');
        await page.locator('.career-panel').evaluate(n=>n.scrollIntoView({block:'start'}));
        await geometry(page,name+' career');
        await page.screenshot({path:path.join(out,name+'-career.png'),scale:'css'});
        await page.locator('.ownership-banner [data-action=owned-cards]').click();
        await page.waitForFunction(()=>document.querySelector('#account-dialog').open);
        await back(page,'#account-dialog');assert.equal(await page.locator('#detail-dialog[open]').count(),1);
        await page.locator('[data-action=toggle-art]').click();await images(page);
        assert.equal(await page.locator('.eq-detail-overlay').count(),0,'illustration has no overlay');
        assert.equal(await page.locator('.detail-equipment-card').count(),3,'illustration preserves equipment list');
        await page.locator('[data-action=toggle-art]').click();await images(page);
        const png=await page.locator('.detail-actions a[download]').getAttribute('href');assert(png&&png.includes('png'));
        const alternate=await page.locator('.detail-versions [data-action=detail-version]').last().getAttribute('data-id');
        await page.locator(`.detail-versions [data-id="${alternate}"]`).click();await images(page);
        assert.equal(await page.locator(`.detail-versions [data-id="${alternate}"]`).getAttribute('aria-pressed'),'true');
        await page.locator(`.detail-versions [data-id="${f.id}"]`).click();await images(page);
        await page.locator('.detail-actions [data-action=favorite]').click();
        assert.equal(await page.locator('.detail-actions [data-action=favorite]').getAttribute('aria-pressed'),'true');
        await page.locator('.detail-actions [data-action=favorite]').click();
        await back(page);assert.deepEqual(await snapshot(page),before,'inspection does not change inventory/equipment/game/team');

        // Deliberately diverge current profile preferences from the deck/match snapshots.
        await page.evaluate(async()=>{for(const id of ['fallen-king-axe','durane-rampart','exiled-king-seal'])await KALISTAR_DB.equipment.unequip(KALISTAR_ACTIVE_USER,'balmhyr',id);});
        await openDeck(page,f.id);assert.equal(await page.locator('.detail-equipment-card').count(),3);await back(page);
        await loadGame(page,f.idle);const idleBefore=await snapshot(page),uid=f.idle.players[0].board.find(u=>u.cardId===f.id).uid;
        const arenaImage=await page.locator(`.slot[data-unit="${uid}"] .slot-card>img`).getAttribute('src');
        await inspect(page,uid);
        assert.equal(await page.locator('.detail-visual>img').getAttribute('src'),arenaImage,'combat card visual is preserved');
        assert.equal(await page.locator('.detail-equipment-card').count(),3);
        assert.equal(await page.locator('.detail-equipment-card[data-equipment-state=inactive]').count(),3);
        assert.equal(await page.locator('.eq-detail-overlay:visible').count(),0,'inactive items never visible as inspection overlays');
        assert.equal(await page.locator('.live-bonuses .bonus-explanation').count(),9,'all existing live explanations are retained');
        await geometry(page,name);await page.screenshot({path:path.join(out,name+'-arena-inactive.png'),scale:'css'});
        await page.locator('[data-explains=faction]>summary').click();assert(await page.locator('[data-explains=faction]>p').isVisible());
        await back(page);assert.deepEqual(await snapshot(page),idleBefore);
        await page.evaluate(({uid})=>{const b=document.createElement('button');b.dataset.action='bonus';b.dataset.side='0';b.dataset.uid=uid;b.dataset.bonus='ward';document.body.append(b);b.click();b.remove();},{uid});
        assert.equal(await page.locator('details.bonus-explanation.highlighted[open][data-explains=ward]').count(),1,'bonus deep link expands its explanation');
        await back(page);assert.deepEqual(await snapshot(page),idleBefore);

        await loadGame(page,f.active);const activeBefore=await snapshot(page);
        const expected=await page.evaluate(s=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),u=s.players[s.duel.side].board.find(u=>u?.uid===s.duel.attacker);return E.equipmentViews(s,u).filter(v=>v.weapon).map(v=>({id:v.weapon.id,active:v.active}));},f.active);
        await inspect(page,f.active.duel.attacker);
        for(const item of expected)assert.equal(await page.locator(`.detail-equipment-card[data-id="${item.id}"]`).getAttribute('data-equipment-state'),item.active?'active':'inactive');
        assert.equal(await page.locator('.eq-detail-overlay:visible').count(),expected.filter(v=>v.active).length);
        await page.screenshot({path:path.join(out,name+'-arena-active.png'),scale:'css'});
        await page.locator('[data-action=toggle-art]').click();await images(page);assert.equal(await page.locator('.eq-detail-overlay').count(),0);
        await page.locator('[data-action=toggle-art]').click();await images(page);
        await page.setViewportSize({width:width+4,height});await geometry(page,name+' resize');await page.setViewportSize({width,height});
        await back(page);assert.deepEqual(await snapshot(page),activeBefore);
        assert.equal(await page.locator('.eq-detail-overlay').count(),0,'close clears detail FX');

        if(name==='desktop'||name==='razr'){
          const legacy=await legacyFixture(page,f);await loadGame(page,legacy.state);const legacyBefore=await snapshot(page);
          await inspect(page,legacy.uid);assert.equal(await page.locator('.detail-equipment-card').count(),1);
          const condition=await page.locator('.detail-equipment-card .wc-rule-condition').innerText();
          assert(condition.includes('Dernier combattant'),'historical equipment card uses its actual LAST_STANDING rule, not current D6');
          assert.equal(await page.locator('.eq-detail-overlay:visible').count(),0);
          await page.screenshot({path:path.join(out,name+'-legacy-snapshot.png'),scale:'css'});
          await back(page);assert.deepEqual(await snapshot(page),legacyBefore);
        }

        await page.evaluate(async()=>{await KALISTAR_DB.equipment.equip(KALISTAR_ACTIVE_USER,'balmhyr','fallen-king-axe');});
        await ready(page,'weapons');
        // A fixture inspection command goes through the actual delegated app action.
        await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='detail';b.dataset.id=id;document.body.append(b);b.click();b.remove();},f.id);
        await images(page);assert.equal(await page.locator('.detail-equipment[data-equipment-source=profile]').count(),1);
        assert.equal(await page.locator('.detail-equipment-card').count(),1);assert.equal(await page.locator('.eq-detail-overlay').count(),0);
        await page.screenshot({path:path.join(out,name+'-profile.png'),scale:'css'});await back(page);
        if(name==='desktop'||name==='razr'){
          const incompatible=await page.evaluate(async()=>{
            const w=KalistarWeapons.weapons.find(w=>w.id==='brotherhood');
            const c=KALISTAR_DATA.cards.find(c=>c.characterId==='tidus-ff10'&&!KalistarEquipment.compatible(w,c));
            if(!c)throw Error('Missing incompatible Tidus edition fixture');
            await KALISTAR_DB.equipment.equip(KALISTAR_ACTIVE_USER,c.characterId,w.id);return c.id;
          });
          const beforeEdition=await snapshot(page);
          await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='detail';b.dataset.id=id;document.body.append(b);b.click();b.remove();},incompatible);
          await images(page);assert.equal(await page.locator('.detail-equipment-card,.eq-detail-overlay').count(),0,'profile preference cannot invent equipment on an incompatible edition');
          assert(await page.locator('.detail-equipment-empty').isVisible());await back(page);
          assert.deepEqual(await snapshot(page),beforeEdition,'incompatible edition does not change stored preference');
        }
        const archiveBefore=await snapshot(page);
        await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='history-match';b.dataset.id=id;document.body.append(b);b.click();b.remove();},f.over.matchId);
        await page.waitForFunction(()=>document.querySelector('#match-dialog').open);
        await page.evaluate(id=>{const b=document.createElement('button');b.dataset.action='detail';b.dataset.id=id;document.querySelector('#match-dialog').append(b);b.click();b.remove();},f.id);
        await images(page);assert.equal(await page.locator('#detail-dialog[data-detail-source=archive]').count(),1);
        assert.equal(await page.locator('.detail-equipment-card,.eq-detail-overlay,.ownership-banner').count(),0,'archive never fabricates current equipment or ownership');
        assert.equal(await page.locator('.detail-versions').count(),0);
        await page.screenshot({path:path.join(out,name+'-archive.png'),scale:'css'});
        await back(page);assert.equal(await page.locator('#match-dialog[open]').count(),1);await back(page,'#match-dialog');
        assert.deepEqual(await snapshot(page),archiveBefore);
        assert((await page.evaluate(()=>detailQADatabases)).every(n=>n.endsWith('-card-detail-qa-only')));
        checks.push({name,passed:true,layout,checks:['native equipment cards/click/Back','desktop/phone geometry and text','faces/lore/career/instance replacement','illustration/favorite/PNG','profile/deck/match snapshot isolation','runtime active/inactive and active-only popup overlays','archive without invented equipment','no inventory or equipment mutation']});
        console.log('PASS '+name);
      }catch(error){await page.screenshot({path:path.join(out,name+'-failure.png'),scale:'css'});throw error;}
      finally{await context.close();}
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(out,built?'results-built.json':'results.json'),JSON.stringify({passed:true,built,dist:built?dist:null,checks,errors},null,2)+'\n');
    console.log('PASS card detail: six isolated browser profiles.');
  }finally{await browser?.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
