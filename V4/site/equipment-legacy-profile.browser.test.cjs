'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module'),{DIST:defaultDist,inside}=require('../deploy/build.cjs');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'_legacy_equipment_qa.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||defaultDist);
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/equipment-legacy-profile');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const server=http.createServer((req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(!url.pathname.startsWith('/Kalistar/'))throw Error('Outside site');
      const rel=decodeURIComponent(url.pathname.slice('/Kalistar/'.length));
      const file=inside(dist,rel.endsWith('/')||!rel?rel+'index.html':rel);
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
      res.setHeader('Cache-Control','no-store');res.end(fs.readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/jeu/';
  let browser;
  const checks=[];
  try{
    browser=await chromium.launch({channel:'chrome',headless:true});
    fs.mkdirSync(output,{recursive:true});
    const weapon={balmhyr:'fallen-king-axe',momo:'little-joys-flute'};
    const cases=[
      {name:'legacy-current',row:{id:'user-paris',version:1,slots:{weapon}},historical:false,editable:true},
      {name:'legacy-archived',row:{id:'user-paris',version:1,slots:{weapon}},historical:true,editable:true},
      {name:'former-flute-archived',row:{id:'user-paris',version:2,slots:{weapon:{balmhyr:'fallen-king-axe'},shield:{},relic:{momo:'little-joys-flute'}}},historical:true,editable:true},
      {name:'legacy-unavailable-wearer',row:{id:'user-paris',version:1,slots:{weapon:{...weapon,'qa-archived-identity':'qa-unavailable-weapon'}}},historical:true,editable:false},
      {name:'modern-unavailable-weapon',row:{id:'user-paris',version:2,slots:{weapon:{...weapon,taulio:'qa-unavailable-weapon'},shield:{},relic:{}}},historical:true,editable:false}
    ];
    for(const scenario of cases){
      const context=await browser.newContext({viewport:{width:1920,height:1080},serviceWorkers:'block',reducedMotion:'reduce'});
      try{
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));
        await page.goto(base+'#collection');await page.waitForFunction(()=>window.KALISTAR_READY);
        await page.evaluate(seed,scenario);
        await page.goto(base+'?legacy-profile='+scenario.name+'#weapons');
        await page.waitForFunction(()=>window.KALISTAR_READY);
        await page.locator('.weapons-page').waitFor();
        assert.equal(await page.locator('h1').innerText(),'\u00c9quipements');
        assert.equal(await page.locator('.weapon-entry').count()>2,true);
        const expected=scenario.editable?{id:'user-paris',version:2,slots:{weapon,shield:{},relic:{}}}:scenario.row;
        const state=await page.evaluate(read);
        assert.deepEqual(state.cached,expected,scenario.name+' cache');
        assert.deepEqual(state.raw,expected,scenario.name+' persisted');
        assert.equal(state.archived,scenario.historical);
        assert.deepEqual(state.privateRow,scenario.historical?{id:'qa-private',version:1,slots:{weapon:{'qa-archived-identity':'qa-unavailable-weapon'}}}:undefined);
        await openEquipment(page,'fallen-king-axe');
        const removal=page.locator('#weapons-dialog [data-weapon-action=unequip][data-character=balmhyr]');
        assert.equal(await removal.isDisabled(),!scenario.editable);
        assert.equal(await page.locator('#weapons-dialog .weapon-carriers').innerText().then(t=>t.includes('attributions conserv\u00e9es')),!scenario.editable);
        await page.locator('#weapons-dialog [data-weapon-action=close]').click();
        if(scenario.name==='legacy-archived'){
          for(const id of ['durane-rampart','exiled-king-seal']){
            await openEquipment(page,id);
            await page.locator('#weapons-dialog [data-weapon-action=equip][data-character=balmhyr]').click();
            await page.waitForFunction(id=>KalistarEquipment.items(KALISTAR_DB.equipment.profile('user-paris').slots).some(w=>w.id===id),id);
            await page.locator('#weapons-dialog [data-weapon-action=close]').click();
          }
          const equipped={...expected,slots:{weapon,shield:{balmhyr:'durane-rampart'},relic:{balmhyr:'exiled-king-seal'}}};
          await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
          assert.deepEqual((await page.evaluate(read)).raw,equipped);
          await page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
          await page.screenshot({path:path.join(output,'equipment-desktop.png')});
          await page.setViewportSize({width:412,height:915});await page.waitForTimeout(250);
          const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);
          assert.equal(overflow,false,'Phone horizontal overflow');
          await page.locator('[data-equipment-category=shield]').click();
          await openEquipment(page,'durane-rampart');
          await page.locator('#weapons-dialog [data-weapon-action=unequip][data-character=balmhyr]').click();
          await page.waitForFunction(()=>!KALISTAR_DB.equipment.profile('user-paris').slots.shield.balmhyr);
          await page.locator('#weapons-dialog [data-weapon-action=close]').click();
          assert.deepEqual((await page.evaluate(read)).raw.slots,{weapon,shield:{},relic:{balmhyr:'exiled-king-seal'}});
          await page.locator('[data-equipment-category=all]').click();
          await page.waitForTimeout(250);
          const scroll=await page.locator('.weapons-stage').evaluate(el=>{el.scrollTop=el.scrollHeight;return {top:el.scrollTop,height:el.scrollHeight,client:el.clientHeight};});
          assert(scroll.height<=scroll.client+1||scroll.top>0,'Phone equipment must scroll');
          await page.locator('.weapons-stage').evaluate(el=>{el.scrollTop=0;});
          await page.screenshot({path:path.join(output,'equipment-phone.png')});
          checks.push('Desktop and phone: equip shield/relic, reload, per-slot removal, category filters and scroll');
        }else{
          await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
          assert.deepEqual((await page.evaluate(read)).raw,expected,scenario.name+' reopen');
        }
        assert.deepEqual(errors,[],scenario.name+' page errors');
        checks.push(scenario.name+': boot, all categories, wearer detail, raw persistence and reopen');
      }finally{await context.close();}
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,isolated:true,checks},null,2));
    for(const check of checks)console.log('PASS '+check);
  }finally{await browser?.close();await new Promise(resolve=>server.close(resolve));}
}
async function seed({row,historical}){
  const card={...KALISTAR_DATA.cards[0],id:'49999999',characterId:'qa-archived-identity'};
  KALISTAR_DB.close();
  await new Promise((resolve,reject)=>{
    const req=indexedDB.open('kalistar-v4-cards');req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
      const connection=req.result,tx=connection.transaction(['versions','equipment'],'readwrite');
      if(historical)tx.objectStore('versions').put(card);
      tx.objectStore('equipment').put(row);
      // An unrelated profile must not block migration of this player's profile.
      if(historical)tx.objectStore('equipment').put({id:'qa-private',version:1,slots:{weapon:{'qa-archived-identity':'qa-unavailable-weapon'}}});
      tx.oncomplete=()=>{connection.close();resolve();};tx.onabort=()=>{connection.close();reject(tx.error);};
    };
  });
}
async function read(){
  const cached=KALISTAR_DB.equipment.profile('user-paris');
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open('kalistar-v4-cards');req.onerror=()=>reject(req.error);
    req.onsuccess=()=>{
      const connection=req.result,tx=connection.transaction(['versions','equipment']),state={cached};
      tx.objectStore('equipment').get('user-paris').onsuccess=e=>{state.raw=e.target.result;};
      tx.objectStore('equipment').get('qa-private').onsuccess=e=>{state.privateRow=e.target.result;};
      tx.objectStore('versions').get('49999999').onsuccess=e=>{state.archived=!!e.target.result;};
      tx.oncomplete=()=>{connection.close();resolve(state);};tx.onabort=()=>{connection.close();reject(tx.error);};
    };
  });
}
main().catch(error=>{console.error(error);process.exitCode=1;});
