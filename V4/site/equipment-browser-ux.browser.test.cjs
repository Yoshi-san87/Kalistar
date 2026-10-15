'use strict';
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {chromium}=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/__equipment_ux__.cjs'))('playwright');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-06-equipment-browser/qa');
const results=[],errors=[];let browser;
async function ready(page){await page.waitForFunction(()=>window.KALISTAR_READY);await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);}
async function capture(page,name){
  await page.waitForFunction(()=>[...document.querySelectorAll('#weapons-dialog[open] img,.weapon-entry:not([hidden]) img')].every(i=>i.complete&&i.naturalWidth>0));
  if(await page.locator('#weapons-dialog[open]').count())assert(await page.locator('#weapons-dialog').evaluate(n=>n.scrollWidth<=n.clientWidth+1),name+' popup has no sideways overflow');
  await page.screenshot({path:path.join(out,name+'.png')});
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height]of [['desktop',1440,1000],['laptop',1366,768],['wide',1920,1080],['short',1280,600],['tablet',1024,768],['narrow',700,700],['phone',412,1007],['compact',320,568],['landscape',844,390]]){
    const mobile=width<700||width<951&&height<501;
    const context=await browser.newContext({viewport:{width,height},reducedMotion:name==='compact'?'reduce':'no-preference',serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-equipment-browser-ux'):open.call(this,n+'-equipment-browser-ux',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/#weapons');await ready(page);
    await page.locator('.weapon-filter').selectOption('equipped');
    assert(await page.locator('.weapons-empty').isVisible());
    const empty=await page.locator('.weapons-empty').boundingBox();assert(empty.y+empty.height<=height+1,'empty filter remains inside the view');
    await page.locator('[data-weapon-action=reset-filter]').click();
    if(!mobile){
      const geometry=await page.evaluate(()=>{const app=document.querySelector('#app'),stage=document.querySelector('.weapons-stage').getBoundingClientRect();return {body:document.documentElement.scrollHeight,app:app.scrollHeight,height:app.clientHeight,viewport:innerHeight,columns:getComputedStyle(document.querySelector('.weapons-list')).gridTemplateColumns.split(' ').length,clipped:[...document.querySelectorAll('.weapon-entry:not([hidden])')].some(n=>{const r=n.getBoundingClientRect();return r.top<stage.top-1||r.bottom>stage.bottom+1;})};});
      assert(geometry.body<=height+1&&geometry.app<=geometry.height+1,JSON.stringify(geometry));assert.equal(geometry.columns,width>=1200?6:3);assert(!geometry.clipped,JSON.stringify(geometry));
      const seen=new Set();let pages=await page.locator('[data-weapon-page=collection] option').count();
      for(let i=0;i<pages;i++){
        await page.locator('[data-weapon-page=collection]').selectOption(String(i));
        for(const id of await page.locator('.weapon-entry:not([hidden]) [data-weapon]').evaluateAll(ns=>ns.map(n=>n.dataset.weapon)))seen.add(id);
      }
      assert.equal(seen.size,await page.locator('.weapon-entry').count());
      await page.locator('.weapons-stage').focus();await page.keyboard.press('ArrowLeft');assert.equal(await page.locator('[data-weapon-page=collection]').inputValue(),String(pages-2));
      await page.locator('[data-equipment-category=shield]').click();assert.equal(await page.locator('[data-weapon-page=collection]').inputValue(),'0');
      await page.locator('[data-equipment-category=all]').click();await capture(page,name+'-collection');
    }else{
      assert(await page.locator('#app').evaluate(n=>n.scrollHeight>n.clientHeight));await capture(page,name+'-collection');
    }
    const collective=await page.evaluate(()=>KalistarWeapons.weapons.map(w=>({id:w.id,count:new Set(KALISTAR_DATA.cards.filter(c=>KalistarEquipment.compatible(w,c)).map(c=>c.characterId)).size})).sort((a,b)=>b.count-a.count)[0]);
    await openEquipment(page,collective.id);await capture(page,name+'-bearers');
    const available=await page.locator('.weapon-carriers article').count();assert.equal(available,collective.count);assert(available>6);
    const rosterPages=await page.locator('[data-weapon-page=carriers] option').count();assert(rosterPages>1);
    await page.locator('[data-weapon-page=carriers]').selectOption(String(rosterPages-1));
    const last=page.locator('.weapon-carriers article:not([hidden]) [data-weapon-action=equip]').last(),character=await last.getAttribute('data-character');
    await last.click();await page.waitForFunction(({id,character})=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon[character]===id,{id:collective.id,character});
    assert.equal(await page.locator('.weapon-carriers .is-current:not([hidden])').count(),1);
    await page.locator('[data-weapon-search]').fill('zz-no-match');assert.equal(await page.locator('.weapon-carriers article').count(),0);assert(await page.locator('.weapon-roster-empty').isVisible());
    await page.locator('[data-weapon-search]').fill('');
    await page.locator('.weapon-carriers article:not([hidden]) [data-weapon-action=equip]').first().click();assert(await page.locator('.weapon-confirm').isVisible());
    await capture(page,name+'-confirmation');await page.locator('[data-weapon-action=cancel]').click();
    assert.equal(await page.evaluate(character=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon[character],character),collective.id);
    const next=page.locator('.weapon-carriers article:not([hidden]) [data-weapon-action=equip]').first(),nextCharacter=await next.getAttribute('data-character');await next.click();await page.locator('[data-weapon-action=confirm]').click();
    await page.waitForFunction(({id,character})=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon[character]===id,{id:collective.id,character:nextCharacter});
    await page.locator('[data-weapon-action=close]').click();await page.reload();await ready(page);await openEquipment(page,collective.id);
    assert.equal(await page.locator('[data-weapon-action=unequip]').getAttribute('data-character'),nextCharacter);
    await page.locator('[data-weapon-action=unequip]').click();await page.waitForFunction(id=>!Object.values(KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots.weapon).includes(id),collective.id);
    await page.locator('[data-weapon-action=close]').click();
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    await page.locator('[data-view=collection]').first().evaluate(n=>n.click());await page.waitForSelector('.cb-page');await page.locator('[data-view=weapons]').first().evaluate(n=>n.click());await ready(page);
    results.push({name,passed:true,collective,rosterPages});console.log(name+' PASS');await context.close();
  }
  assert.deepEqual(errors,[]);
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:!process.exitCode,results,errors},null,2));await browser?.close();});
