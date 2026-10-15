'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const {createEngine}=require('./engine.js'),{createPublishedScenarios}=require('./fixtures/relic-ultimates.cjs');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__momo_qa__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-12-momo-equipment/qa/browser'));
const base='https://momo-equipment-qa.invalid/Kalistar',FLUTE='little-joys-flute',BOX='little-joys-box';
const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'))),E=createEngine(data);
const scenario=createPublishedScenarios(data).find(f=>f.id===BOX&&f.side===0),errors=[],results=[];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function ready(p){await p.waitForFunction(()=>window.KALISTAR_READY);await p.evaluate(()=>document.fonts.ready);}
async function shot(p,name){await p.waitForFunction(()=>[...document.querySelectorAll('dialog[open] img,.eq-overlay img,.slot-card>img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled'});}
async function bind(p,s){
  E.assertState(s);
  await p.evaluate(async state=>{const bound=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,state);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));},s);
  await p.goto(base+'/jeu/?momo-qa=arena#arena');await ready(p);
}
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,1007]]){
    const context=await browser.newContext({viewport:{width,height},serviceWorkers:'block'});
    await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(!u.href.startsWith(base+'/'))return route.abort();
      let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep));
      assert(fs.existsSync(file),relative);await route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
    await p.goto(base+'/jeu/#weapons');await ready(p);
    await p.locator('.header-actions [data-action=rules]').click();
    assert.match(await p.locator('#rules-dialog').innerText(),/Momo est une arme/);
    assert.match(await p.locator('#rules-dialog').innerText(),/Sa Bo\u00eete des Petits Bonheurs est une relique/);
    await p.locator('#rules-dialog [data-action=close]').click();
    for(const [id,kind,label]of [[FLUTE,'weapon',/\+30 ATK/],[BOX,'relic',/Tr.fle/i]]){
      await openEquipment(p,id);const card=p.locator('#weapons-dialog [data-weapon-card="'+id+'"]');
      assert.equal(await card.getAttribute('data-kind'),kind);assert.match(await card.innerText(),label);
      await p.locator('[data-weapon-action=equip][data-character=momo]').click();
      await p.waitForFunction(({id,kind})=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots[kind].momo===id,{id,kind});
      assert.equal(await p.locator('.weapon-confirm').count(),0,'different slots need no replacement');
      await shot(p,name+'-'+id);await p.locator('[data-weapon-action=close]').click();
    }
    await p.reload();await ready(p);
    const slots=await p.evaluate(()=>KALISTAR_DB.equipment.profile(KALISTAR_ACTIVE_USER).slots);
    assert.equal(slots.weapon.momo,FLUTE);assert.equal(slots.relic.momo,BOX);
    const s=E.clone(scenario.before);s.equipment.loadouts[0].weapon.momo=FLUTE;
    await bind(p,s);
    const both=p.locator('.slot[data-unit="'+scenario.uid+'"]');
    await both.locator('.eq-overlay[data-slot=weapon]').waitFor();
    await both.locator('.eq-overlay[data-slot=relic]').waitFor();
    assert.equal(await both.locator('.eq-overlay[data-slot=weapon][data-weapon-id="'+FLUTE+'"]').count(),1);
    assert.equal(await both.locator('.eq-overlay[data-slot=relic][data-weapon-id="'+BOX+'"]').count(),1);
    await shot(p,name+'-both-slots');
    assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
    results.push({viewport:name,equipBoth:true,reload:true,separateAnchors:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2)+'\n');console.log(JSON.stringify({passed:true,results}));
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
