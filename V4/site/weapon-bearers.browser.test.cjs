'use strict';
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__bearers__.cjs'))('playwright');
const previous=require('./fixtures/weapons-v4.5.28.json').weapons;
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304';
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-06-weapon-families/browser');
const expected={
  'wardens-spear':['brask-kalistar','karrok-kalistar','kimahri-ff10','nazar','ward-ff8'],
  'soldiers-blade':['isvel-kalistar','liorne-kalistar'],'commanders-sabre':[],
  'arborium-twinstring-bow':['saelor-kalistar','ssilas'],'arborium-thorn-dagger':[],
  'draevenheim-wing-spear':['orven-kalistar'],'draevenheim-crimson-crossbow':[],
  'cryptown-oath-sword':['varkhen-kalistar'],'cryptown-vigil-rifle':['nereth-kalistar'],
  'cryptown-watch-flail':['draust-kalistar'],'rhinoz-ancestral-horn':[],
  brotherhood:['tidus-ff10'],'single-action-army':['revolver-ocelot-mgs'],'virtuous-treaty':[],'mythic-iron-gauntlet':[]
};
let browser,navigation=0;const results=[],errors=[];
async function ready(page,view='weapons'){await page.goto(base+'/jeu/?bearer-qa='+(++navigation)+'#'+view);await page.waitForFunction(()=>window.KALISTAR_READY);}
async function images(page){await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog img')].every(i=>i.complete&&i.naturalWidth));}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height] of [['desktop',1440,1000],['razr50',412,1007],['compact',320,640]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-bearers-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await ready(page);
    for(const [id,allowed] of Object.entries(expected)){
      await openEquipment(page,id);await images(page);
      const actual=await page.locator('#weapons-dialog [data-weapon-action=equip],#weapons-dialog [data-weapon-action=unequip]').evaluateAll(nodes=>nodes.map(n=>n.dataset.character).sort());assert.deepEqual(actual,allowed,id);
      const family=await page.evaluate(id=>KalistarWeapons.weapons.find(w=>w.id===id).family,id);
      assert.equal(await page.locator('#weapons-dialog .wc-family img').getAttribute('alt'),'Famille : '+family);
      assert(!((await page.locator('#weapons-dialog .wc-bearers').innerText()).includes(family)),'footer is reserved for the bearer/origin');
      const versions=await page.locator('#weapons-dialog [data-weapon-action=card]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id));
      if(id==='brotherhood')assert(!versions.includes('46513388'));
      if(id==='single-action-army')assert(!versions.includes('49600104'));
      if(!allowed.length)assert.match(await page.locator('#weapons-dialog .weapon-carriers').innerText(),/Aucun porteur compatible/);
      else{
        await page.locator('#weapons-dialog [data-weapon-action=equip]').first().click();
        if(await page.locator('[data-weapon-action=confirm]').count())await page.locator('[data-weapon-action=confirm]').click();
        await page.waitForFunction(id=>Object.values(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon).includes(id),id);
      }
      if(['gen-mechanical-arm','brotherhood','virtuous-treaty','cryptown-oath-sword','wardens-spear'].includes(id))await page.screenshot({path:path.join(out,name+'-'+id+'.png')});
      assert(await page.locator('#weapons-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),'dialog horizontal overflow');
      await page.locator('[data-weapon-action=close]').click();results.push({name,id,allowed});
    }
    const profile=await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER));await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER)),profile);
    await openEquipment(page,'cryptown-oath-sword');await page.locator('[data-weapon-action=unequip]').click();
    await page.waitForFunction(()=>!KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon['varkhen-kalistar']);await page.locator('[data-weapon-action=close]').click();
    if(name==='desktop'){
      const saved=await page.evaluate(async previous=>{
        const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),c=KALISTAR_DATA.cards.find(c=>c.characterId==='belrog'),base=KALISTAR_DATA.decks.player;
        const deck=base.map((_,i)=>base.map((v,j)=>i===j?c.id:v)).find(ids=>!E.validatePlayableDeck(ids).length);
        const s=E.newGame(deck,deck,{mode:'local',seed:'BEARERS-LEGACY-QA',kalistel:false,equipment:[{},{}]});
        s.equipment.definitions=previous;s.equipment.loadouts[0].belrog='rhinoz-ancestral-horn';
        E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.assertState(s);
        await KALISTAR_DB.saveGame(s);
        const team={...T.fromPreset({name:'Legacy Rhinoz',cards:deck}),equipment:{belrog:'rhinoz-ancestral-horn'}};
        const lib=KalistarDeckLibrary.create({storage:localStorage,userId:KALISTAR_ACTIVE_USER,knownIds:KALISTAR_DATA.cards.map(c=>c.id),normalizeDeck:T.normalize});
        localStorage.setItem(lib.key,JSON.stringify({schema:2,edition:'V4',decks:[{id:'kd-12345678-1234-4234-8234-123456789abc',...team}]}));
        localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
        const row=KalistarEquipment.profile(KALISTAR_ACTIVE_USER,{weapon:{belrog:'rhinoz-ancestral-horn',nazar:'wardens-spear',momo:'little-joys-flute','2b-nier':'virtuous-treaty',balmhyr:'mythic-iron-gauntlet'}}),dbName=KALISTAR_DB.name;
        KALISTAR_DB.close();
        await new Promise((resolve,reject)=>{const r=indexedDB.open(dbName);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const db=r.result,tx=db.transaction('equipment','readwrite');tx.objectStore('equipment').put(row);tx.oncomplete=()=>{db.close();resolve();};tx.onabort=()=>reject(tx.error);};});
        return {match:s,team,profile:row,libKey:lib.key,dbName};
      },previous);
      await ready(page,'decks');
      const migration=await page.evaluate(async saved=>{
        const db=KALISTAR_DB,T=KalistarTeamComposition.create(KalistarEngine.createEngine(KALISTAR_DATA));
        const lib=KalistarDeckLibrary.create({storage:localStorage,userId:KALISTAR_ACTIVE_USER,knownIds:KALISTAR_DATA.cards.map(c=>c.id),normalizeDeck:T.normalize});
        const before=await db.exportBackup(),backup=structuredClone(before);backup.equipment=[saved.profile];
        await db.importBackup(backup,{replaceRegistry:true});
        const after=await db.exportBackup();
        const raw=await new Promise((resolve,reject)=>{const r=indexedDB.open(saved.dbName);r.onerror=()=>reject(r.error);r.onsuccess=()=>{const conn=r.result,tx=conn.transaction('equipment'),get=tx.objectStore('equipment').get(KALISTAR_ACTIVE_USER);get.onsuccess=()=>resolve(get.result);tx.oncomplete=()=>conn.close();};});
        const malformed=structuredClone(backup);malformed.equipment[0].slots.weapon.momo='unknown';let rejected=false;
        try{await db.importBackup(malformed,{replaceRegistry:true});}catch{rejected=true;}
        return {profile:db.equipment.profile(KALISTAR_ACTIVE_USER),raw,match:db.match(saved.match.matchId).state,team:lib.list()[0],unchanged:JSON.stringify(before.collectibles)===JSON.stringify(after.collectibles),rejected};
      },saved);
      const normalized={...saved.profile,slots:{weapon:{nazar:'wardens-spear',momo:'little-joys-flute'}}};
      assert.deepEqual(migration.profile,normalized);assert.deepEqual(migration.raw,normalized);assert.deepEqual(migration.match,saved.match);
      assert.deepEqual(migration.team,{id:'kd-12345678-1234-4234-8234-123456789abc',...saved.team,equipment:{}});assert(migration.unchanged);assert(migration.rejected);
      results.push({name,migration:true,backupImport:true,legacyMatchUnchanged:true,cardsUnchanged:true});
      await page.screenshot({path:path.join(out,name+'-repaired-deck.png')});
    }
    await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));console.log({passed:true,checks:results.length,out});
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>browser?.close());
