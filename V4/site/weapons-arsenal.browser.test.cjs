'use strict';
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__arsenal__.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-06-weapon-bearers/arsenal');
const weapons=require('./weapons.js').weapons.filter(w=>w.collectible),errors=[],results=[];let browser;
async function images(page){await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card img')].every(i=>i.complete&&i.naturalWidth>0));}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,1007]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-new-arsenal-isolated',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
    await page.goto(base+'/jeu/#weapons');await page.waitForFunction(()=>window.KALISTAR_READY);await images(page);
    for(const w of weapons){
      await openEquipment(page,w.id);await images(page);
      const eligible=await page.evaluate(id=>{const w=KalistarWeapons.weapons.find(w=>w.id===id);return [...new Set(KALISTAR_DATA.cards.filter(c=>KalistarEquipment.compatible(w,c)).map(c=>c.characterId))].sort();},w.id);
      const actual=await page.locator('#weapons-dialog [data-weapon-action=equip],#weapons-dialog [data-weapon-action=unequip]').evaluateAll(nodes=>nodes.map(n=>n.dataset.character).sort());assert.deepEqual(actual,eligible);
      const skin=require('./weapon-art.js').get(w),body=page.locator('#weapons-dialog .eq-body');assert((await body.getAttribute('src')).endsWith(skin.body));
      assert((await page.locator('#weapons-dialog .eq-rim').getAttribute('src')).endsWith(skin.rim));
      if(!eligible.length){assert.match(await page.locator('#weapons-dialog .weapon-carriers').innerText(),/Aucun porteur compatible/);await page.locator('[data-weapon-action=close]').click();results.push({name,id:w.id,compatible:0,equipped:false});continue;}
      const equip=page.locator('#weapons-dialog [data-weapon-action=equip]').first();await equip.click();
      if(await page.locator('[data-weapon-action=confirm]').count())await page.locator('[data-weapon-action=confirm]').click();
      await page.waitForFunction(id=>Object.values(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon).includes(id),w.id);
      if(['white-oath-rapier','leopard-lightning','wardens-spear'].includes(w.id))await page.screenshot({path:path.join(out,name+'-'+w.id+'.png')});
      await page.locator('[data-weapon-action=close]').click();results.push({name,id:w.id,compatible:eligible.length,equipped:true});
    }
    const before=await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER));await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER)),before);
    for(const id of ['white-oath-rapier','brotherhood','gen-mechanical-arm']){
      const expected=await page.evaluate(async id=>{
        const previous=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
        if(previous&&previous.seed!=='ARSENAL-BROWSER-ONLY')throw Error('Refusing to change a non-QA match.');
        if(previous?.collection&&previous.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,previous.matchId);
        const E=KalistarEngine.createEngine(KALISTAR_DATA),w=KalistarWeapons.weapons.find(w=>w.id===id),c=KALISTAR_DATA.cards.find(c=>KalistarEquipment.compatible(w,c));
        const base=KALISTAR_DATA.decks.player,deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);
        let s=E.newGame(deck,deck,{mode:'local',seed:'ARSENAL-BROWSER-ONLY',kalistel:false,equipment:[{[c.characterId]:id},{}]});
        E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[0],u=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
        if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,0,slot);E.deploy(s,0,u.uid,slot);}E.start(s);
        if(w.effect.when.outnumbered||w.effect.when.activeAtMost){p.reserve.push(...p.board.filter(v=>v&&v!==u));p.board=p.board.map(v=>v===u?v:null);}
        if(w.effect.when.reserveAtMost===0){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
        const defense=w.effect.stat==='DEF';s.turn=defense?1:0;const slot=p.board.indexOf(u);E.lock(s,defense?0:slot,defense?slot:0);E.assertState(s);
        // Isolated context: this is a synthetic setup, then real engine rolls below.
        const bound=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);
        localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));return {uid:u.uid,value:w.effect.value,stat:w.effect.stat};
      },id);
      await page.goto(base+'/jeu/?arsenal-qa='+name+'-'+id+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
      const overlay=page.locator('.slot[data-unit="'+expected.uid+'"] .eq-overlay');await overlay.waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay img')].every(i=>i.complete&&i.naturalWidth===488));
      assert((await overlay.locator('.eq-body').getAttribute('src')).endsWith(id+'-v1.webp'));
      await page.screenshot({path:path.join(out,name+'-'+id+'-arena.png')});
      const formula=await page.evaluate(()=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),s=JSON.parse(localStorage.getItem('kalistar.v4.game'));E.rollAttack(s,6);E.rollDefense(s,6);E.assertState(s);return E.restoreGame(s).duel.formula;});
      assert.equal(formula[expected.stat==='ATK'?'equipmentAttack':'equipmentDefense'],expected.value);
      results.push({name,id,arena:true,formula});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,errors,results},null,2));console.log({passed:true,checks:results.length,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
