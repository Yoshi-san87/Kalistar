'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__performance_contracts__.cjs'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/performance-audit/contracts'));
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),report=[];
  try{for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,1007]]){
    console.log(name+' / contracts');
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'}),page=await context.newPage(),errors=[];
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-performance-contract-only',version);};});
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto('http://127.0.0.1:4304/jeu/#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
    const scoped=await page.evaluate(()=>{
      const outside=document.createElement('i');outside.dataset.lucide='sword';document.body.append(outside);
      const inside=document.createElement('div');inside.innerHTML='<i data-lucide="shield" aria-label="Test shield"></i>';document.body.append(inside);
      const converted=KalistarUI.icons(inside),svg=inside.querySelector('svg');KalistarUI.icons(inside);
      const result={converted,stable:svg===inside.querySelector('svg'),outside:outside.tagName,aria:svg.getAttribute('aria-label')};inside.remove();outside.remove();return result;
    });assert.deepEqual(scoped,{converted:1,stable:true,outside:'I',aria:'Test shield'});
    await page.locator('[data-action=account]').click();await page.locator('#account-dialog[open]').waitFor();
    await page.locator('[data-registry-action=tab][data-tab=collection]').click();await page.waitForTimeout(1000);
    const registry=await page.locator('.registry-owned-row>img').evaluateAll(images=>({total:images.length,loaded:images.filter(i=>i.complete&&i.naturalWidth).length,lazy:images.every(i=>i.loading==='lazy'),aspect:images[0].getBoundingClientRect().width/images[0].getBoundingClientRect().height}));
    assert(registry.lazy);assert(registry.loaded<registry.total*.75,'registry does not download all native cards at opening');assert(Math.abs(registry.aspect-797/1388)<.02,'native thumbnail ratio remains correct');
    await page.locator('.registry-owned-row>img').last().scrollIntoViewIfNeeded();await page.waitForFunction(()=>{const images=document.querySelectorAll('.registry-owned-row>img'),img=images[images.length-1];return img.complete&&img.naturalWidth>0;});
    await page.screenshot({path:path.join(output,name+'-registry.png')});await page.locator('[data-registry-action=close]').click();
    await page.evaluate(()=>document.querySelector('.main-nav [data-view=decks]').click());
    await page.waitForFunction(()=>[...document.querySelectorAll('.kdb-slot-image img')].every(img=>img.complete&&img.naturalWidth>0&&!img.src.includes('#v4-')));
    await page.screenshot({path:path.join(output,name+'-composition.png')});
    if(width<700)await page.locator('[data-deck-action=panel][data-id=recruit]').click();
    const search=page.locator('[data-deck-filter=search]');
    await page.evaluate(()=>window.__stableDeck={board:document.querySelector('.team-starters'),input:document.querySelector('[data-deck-filter=search]'),draft:localStorage.getItem('kalistar.v4.teamDraft')});
    await search.fill('Momo');assert(await page.locator('.kdb-candidate').count()>0);assert(await page.locator('.kdb-candidate-info>b').evaluateAll(nodes=>nodes.every(n=>n.textContent==='MOMO')));
    await search.fill('');assert(await page.evaluate(()=>__stableDeck.board===document.querySelector('.team-starters')&&__stableDeck.input===document.querySelector('[data-deck-filter=search]')&&__stableDeck.draft===localStorage.getItem('kalistar.v4.teamDraft')),'typing changes only recruitment, never formation, focus or saved draft');
    if(width<700)await page.locator('[data-deck-action=panel][data-id=board]').click();
    if(!await page.locator('[data-deck-action=captain][aria-pressed=true]').count())await page.locator('[data-deck-action=captain]').first().click();
    await page.locator('[data-deck-action=play]').click();await page.locator('#new-game-dialog[open]').waitFor();
    assert.equal(await page.locator('.match-arena-choice>img').count(),0,'only the selected arena loads a preview');
    const last=await page.locator('#match-arena option').last().getAttribute('value');
    await page.locator('#match-arena').selectOption(last);assert.equal(await page.locator('#match-arena').inputValue(),last);
    await page.waitForFunction(()=>{const img=document.querySelector('#match-arena-summary>img');return img?.complete&&img.naturalWidth>0;});
    await page.screenshot({path:path.join(output,name+'-prematch.png')});await page.keyboard.press('Escape');
    await page.evaluate(()=>document.querySelector('.main-nav [data-view=collection]').click());
    const favorite=page.locator('.cb-caption [data-binder-action=favorite]:visible').first(),id=await favorite.getAttribute('data-id');await favorite.click();
    const expected=await favorite.getAttribute('aria-pressed');await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.equal(await page.evaluate(id=>JSON.parse(localStorage.getItem('kalistar.v4.favorites')).includes(id),id),expected==='true','changed preferences survive reload');
    const other=await context.newPage();await other.goto('http://127.0.0.1:4304/jeu/site-config.js');
    await page.evaluate(()=>{window.__storageObserved=null;addEventListener('storage',event=>{if(event.key==='kalistar.v4.deckName')window.__storageObserved={key:event.key,sameArea:event.storageArea===localStorage};},{once:true});});
    await other.evaluate(()=>localStorage.setItem('kalistar.v4.deckName','Other tab test'));
    await page.waitForFunction(()=>window.__storageObserved);await page.bringToFront();await page.evaluate(()=>document.querySelector('.main-nav [data-view=decks]').click());
    const nameAfter=await page.evaluate(()=>({value:localStorage.getItem('kalistar.v4.deckName'),view:location.hash,event:__storageObserved}));assert.notEqual(nameAfter.value,'Other tab test','storage cache invalidation: '+JSON.stringify(nameAfter));await other.close();
    await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Quota QA',cards:KALISTAR_DATA.decks.player});
      const game=E.newGame(team,team,{mode:'local',seed:'QUOTA-QA',turnOrder:'ABBA'});E.rollInitiative(game,[6,1]);await KALISTAR_DB.saveGame(game);localStorage.setItem('kalistar.v4.game',JSON.stringify(game));
    });await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>KALISTAR_DB.idle());
    const quota=await page.evaluate(async()=>{
      const set=Storage.prototype.setItem,save=KALISTAR_DB.saveGame;let dbWrites=0,attempts=0;
      Storage.prototype.setItem=function(){attempts++;throw new DOMException('QA quota','QuotaExceededError');};
      KALISTAR_DB.saveGame=function(value){dbWrites++;return save.call(this,value);};
      try{
        document.querySelector('.main-nav [data-view=arena]').click();
        document.querySelector('.slot-card[data-side="0"][data-slot="0"]').click();
        document.querySelector('.slot-card[data-side="1"][data-slot="0"]').click();
        document.querySelector('[data-action=lock]').click();await KALISTAR_DB.idle();return {dbWrites,attempts};
      }
      finally{Storage.prototype.setItem=set;KALISTAR_DB.saveGame=save;}
    });
    assert(quota.attempts>=1);assert(quota.dbWrites>=1,'IndexedDB still persists new combat state when localStorage is full');
    assert.deepEqual(errors,[]);report.push({name,registry,quota,errors});await context.close();
  }}finally{await browser.close();}
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,report},null,2)+'\n');console.log(JSON.stringify(report,null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1;});
