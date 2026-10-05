'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__arborium__.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-05-arborium-weapons/browser');
const ids=['arborium-twinstring-bow','arborium-thorn-dagger'],allowed=['eryss-kalistar','liorne-kalistar','saelor-kalistar','velran-kalistar'],results=[],errors=[];
let browser,navigation=0;
async function ready(page,view){await page.goto(base+'/jeu/?arborium-qa='+(++navigation)+'#'+view);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function images(page){await page.waitForFunction(()=>[...document.querySelectorAll('.weapon-card img,.eq-overlay img,.eq-detail-overlay img')].every(i=>i.complete&&i.naturalWidth>0));}
async function alignment(page){
  const samples=await page.locator('.eq-overlay').evaluateAll(nodes=>nodes.map(node=>{
    const i=node.closest('.slot-card').querySelector('img').getBoundingClientRect(),r=node.getBoundingClientRect(),n=KalistarEquipmentFX.native,c=KalistarCardMedia.crop;
    return {dx:Math.abs(r.left+r.width/2-(i.left+(n.center.x-c.left)/c.width*i.width)),dy:Math.abs(r.top+r.height*(60.5/122)-(i.top+(n.center.y-c.top)/c.height*i.height)),width:Math.abs(r.width-n.width/c.width*i.width)};
  }));
  assert(samples.length);for(const s of samples)for(const v of Object.values(s))assert(v<1.3,JSON.stringify(s));return samples;
}
async function prepare(page,id,side,active){
  return page.evaluate(async({id,side,active})=>{
    const previous=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(previous&&previous.seed!=='ARBORIUM-BROWSER-ONLY')throw Error('Refusing to overwrite a non-QA game');
    if(previous?.collection&&previous.phase!=='over')await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,previous.matchId);
    const E=KalistarEngine.createEngine(KALISTAR_DATA),characterId=id.includes('bow')?'saelor-kalistar':'liorne-kalistar',c=KALISTAR_DATA.cards.find(c=>c.characterId===characterId),base=KALISTAR_DATA.decks.player;
    const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);
    const loadout={[characterId]:id},s=E.newGame(deck,deck,{mode:'local',seed:'ARBORIUM-BROWSER-ONLY',kalistel:false,equipment:side?[{},loadout]:[loadout,{}]});
    E.autoDeploy(s,0);E.autoDeploy(s,1);const p=s.players[side],u=[...p.board.filter(Boolean),...p.reserve].find(u=>u.cardId===c.id);
    if(!p.board.includes(u)){const slot=c.positions[0]-1;E.recall(s,side,slot);E.deploy(s,side,u.uid,slot);}E.start(s);
    // Synthetic board condition; rolls and calculations use the real engine below.
    if(active&&id.includes('bow')){const i=p.board.findIndex(v=>v&&v!==u);p.reserve.push(p.board[i]);p.board[i]=null;}
    if(active&&id.includes('dagger')){for(const v of p.reserve)v.entered=true;p.dead.push(...p.reserve);p.reserve=[];}
    s.turn=side;E.lock(s,p.board.indexOf(u),0);E.assertState(s);
    const bound=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,s);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));return u.uid;
  },{id,side,active});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact-reduced',320,640,'reduce']]){
    const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-arborium-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await ready(page,'weapons');
    for(const id of ids){
      await page.locator('.weapons-page [data-weapon="'+id+'"]').click();await images(page);
      const actual=await page.locator('#weapons-dialog [data-weapon-action=equip]').evaluateAll(nodes=>nodes.map(n=>n.dataset.character).sort());assert.deepEqual(actual,allowed);
      await page.locator('#weapons-dialog [data-weapon-action=equip][data-character=saelor-kalistar]').click();
      if(id===ids[1]){await page.locator('[data-weapon-action=confirm]').waitFor();await page.locator('[data-weapon-action=confirm]').click();}
      await page.waitForFunction(id=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['saelor-kalistar']===id,id);
      await page.locator('#weapons-dialog').evaluate(n=>n.scrollTop=0);await page.waitForTimeout(400);
      await page.screenshot({path:path.join(out,name+'-'+id+'-detail.png')});await page.locator('[data-weapon-action=close]').click();
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);assert.equal(await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['saelor-kalistar']),id);
    }
    await page.locator('.weapons-page [data-weapon="'+ids[1]+'"]').click();await page.locator('#weapons-dialog [data-weapon-action=unequip]').click();
    await page.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['saelor-kalistar']);await page.locator('[data-weapon-action=close]').click();
    const slot=await page.evaluate(id=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),c=KALISTAR_DATA.cards.find(c=>c.characterId==='saelor-kalistar'),base=KALISTAR_DATA.decks.player;
      const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length),team=T.equip(T.fromPreset({name:'Arborium QA',cards:deck}),c.id,id);
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return T.slots(team).indexOf(c.id);
    },ids[0]);
    await ready(page,'decks');await page.locator('[data-deck-slot="'+slot+'"] [data-deck-action=detail]').click();await images(page);
    assert.equal(await page.locator('.eq-detail-overlay').getAttribute('data-weapon-id'),ids[0]);await page.waitForTimeout(800);await page.screenshot({path:path.join(out,name+'-deck-inspection.png')});await page.locator('#detail-dialog [data-action=close]').click();
    for(const [index,id]of ids.entries()){
      const side=index,uid=await prepare(page,id,side,false);await ready(page,'arena');
      assert.equal(await page.locator('.slot[data-unit="'+uid+'"] .eq-overlay').count(),0);
      const activeUid=await prepare(page,id,side,true);await ready(page,'arena');
      const overlay=page.locator('.slot[data-unit="'+activeUid+'"] .eq-overlay');await overlay.waitFor();await images(page);await page.waitForTimeout(800);
      assert((await overlay.locator('.eq-body').getAttribute('src')).endsWith(id+'-v1.webp'));assert((await overlay.locator('.eq-rim').getAttribute('src')).endsWith(id+'-ring-v1.webp'));
      const geometry=await alignment(page),orbit=overlay.locator('.eq-orbit');assert.equal(await orbit.evaluate(n=>getComputedStyle(n).animationName),motion==='reduce'?'none':'eq-continuous-orbit');
      await page.screenshot({path:path.join(out,name+'-'+id+'-arena.png')});
      await page.locator('.slot[data-unit="'+activeUid+'"] [data-action=detail]').click();await images(page);assert.equal(await page.locator('.eq-detail-overlay').getAttribute('data-weapon-id'),id);
      await page.waitForTimeout(800);await page.screenshot({path:path.join(out,name+'-'+id+'-inspection.png')});await page.locator('#detail-dialog [data-action=close]').click();
      await page.setViewportSize({width:width-12,height:height-24});await page.waitForTimeout(100);await alignment(page);await page.setViewportSize({width,height});
      const formula=await page.evaluate(()=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),s=JSON.parse(localStorage.getItem('kalistar.v4.game'));
        const a=s.players[s.turn].board.find(u=>u&&E.equipmentView(s,u)?.active),d=s.players[1-s.turn].board[0];
        E.rollAttack(s,6-E.card(a).atk.findIndex(v=>typeof v==='number'));E.rollDefense(s,6-E.card(d).defense.findIndex(v=>typeof v==='number'));E.assertState(s);
        return {formula:E.restoreGame(s).duel.formula,log:s.log};
      });
      assert.equal(formula.formula.equipmentAttack,20);assert(formula.log.some(l=>l.text.includes('+20 ATK')));
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.locator('.slot[data-unit="'+activeUid+'"] .eq-overlay').waitFor();
      results.push({name,id,side,geometry,formula:formula.formula,compatible:allowed,equipReloadReplaceUnequip:true});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));console.log({passed:true,checks:results.length,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
