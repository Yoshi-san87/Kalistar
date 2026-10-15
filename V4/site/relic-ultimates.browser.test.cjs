'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const {createEngine}=require('./engine.js'),{createPublishedScenarios}=require('./fixtures/relic-ultimates.cjs');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__relic_qa__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const source=process.env.KALISTAR_QA_SOURCE==='1',base='https://kalistar-relic-qa.invalid/Kalistar';
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-12-relic-ultimates/qa'));
const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8')),E=createEngine(data),scenarios=createPublishedScenarios(data);
const results=[],errors=[];let browser,serial=0;
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
const images=p=>p.waitForFunction(()=>[...document.querySelectorAll('.eq-overlay img,.slot-card > img,.eq-choice img,dialog[open] img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
async function capture(p,name){await images(p);await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled'});}
async function bind(p,s){
  await p.evaluate(async state=>{
    const old=JSON.parse(localStorage.getItem('kalistar.v4.game')||'null');
    if(old&&!old.seed.startsWith('PUBLISHED-'))throw Error('Isolated relic QA only');
    if(old?.collection&&old.matchId!==state.matchId)await KALISTAR_DB.registry.releaseGame(KALISTAR_ACTIVE_USER,old.matchId);
    if(old?.collection&&old.matchId===state.matchId)state.collection=old.collection;
    const bound=state.collection?state:KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,state);
    await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));
  },s);
  await p.goto(base+'/jeu/?relic-qa='+ ++serial+'#arena');await p.waitForFunction(()=>window.KALISTAR_READY);await images(p);
}
function nextDie(s,die){
  // Control the ordinary seeded roll, without replacing the engine or its data.
  for(let n=1;n<200000;n++){
    let x=n;x^=x<<13;x^=x>>>17;x^=x<<5;
    if(Math.floor((x>>>0)/4294967296*6)+1===die){s.rng=n;E.assertState(s);return;}
  }
  throw Error('No RNG state found');
}
async function click(p,action){await p.locator('[data-action="'+action+'"]:visible').first().click();}
async function phase(p,expected){await p.waitForFunction(want=>JSON.parse(localStorage.getItem('kalistar.v4.game')||'null')?.phase===want,expected,{timeout:60000});}
async function geometry(overlay,motion){
  await overlay.waitFor();const measured=await overlay.evaluate(n=>{
    const img=n.parentElement.querySelector(':scope > img'),a=n.getBoundingClientRect(),b=img.getBoundingClientRect(),c=KalistarCardMedia.crop;
    const l=KalistarEquipmentFX.arenaLayouts[n.dataset.slot],contain=getComputedStyle(img).objectFit==='contain';
    const width=contain?Math.min(b.width,b.height*c.width/c.height):b.width,height=contain?Math.min(b.height,b.width*c.height/c.width):b.height;
    return {dx:Math.abs(a.left-b.left-(b.width-width)/2-(l.left-c.left)/c.width*width),dy:Math.abs(a.top-b.top-(b.height-height)/2-(l.top-c.top)/c.height*height),dw:Math.abs(a.width-l.width/c.width*width),motion:getComputedStyle(n.querySelector('.eq-orbit')).animationName};
  });
  assert(Math.max(measured.dx,measured.dy,measured.dw)<1.6,JSON.stringify(measured));
  assert.equal(measured.motion,motion==='reduce'?'none':'eq-continuous-orbit');return measured;
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,width,height,motion]of [['desktop',1440,1000,'no-preference'],['razr50',412,1007,'no-preference'],['compact',320,740,'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    for(const f of scenarios){
      if(process.env.KALISTAR_QA_ITEM&&process.env.KALISTAR_QA_ITEM!==f.id)continue;
      const context=await browser.newContext({viewport:{width,height},reducedMotion:motion,serviceWorkers:'block'});
      await context.route('**/*',async route=>{
        const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
        let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
        let file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep));
        if(source&&relative.startsWith('jeu/')&&/\.(js|css|webp|png|svg|woff2)$/.test(relative)){
          const candidate=path.resolve(__dirname,relative.slice(4));if(candidate.startsWith(__dirname+path.sep)&&fs.existsSync(candidate))file=candidate;
        }
        if(!fs.existsSync(file)){errors.push('Missing '+relative);return route.abort();}
        const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
        return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
      });
      await context.addInitScript(()=>{
        const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-relic-qa-only'):open.call(this,n+'-relic-qa-only',v);};
        window.__relicFx=[];
        new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.matches('.eq-relic-emblem,.eq-relic-gift'))window.__relicFx.push({className:n.className,kind:n.dataset.kind,id:n.dataset.weaponId});}).observe(document,{childList:true,subtree:true});
      });
      const p=await context.newPage(),label=name+'-'+f.id+'-'+f.side;
      p.on('pageerror',e=>errors.push(label+': '+e.message));p.on('response',r=>{if(r.status()>=400)errors.push(label+': '+r.status()+' '+r.url());});
      await p.goto(base+'/jeu/#weapons');await p.waitForFunction(()=>window.KALISTAR_READY);
      await openEquipment(p,f.id);await images(p);
      const overflow=await p.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>({class:n.className,width:[n.clientWidth,n.scrollWidth],height:[n.clientHeight,n.scrollHeight],rect:n.getBoundingClientRect().toJSON(),font:getComputedStyle(n).fontSize})));
      assert.deepEqual(overflow,[],label+' equipment copy overflow');
      if(!f.side)await capture(p,label+'-detail');await p.locator('[data-weapon-action=close]').click();
      const state=E.clone(f.before);E.rollAttack(state,f.attackDie);assert.equal(state.phase,'kalistel');nextDie(state,f.defenseDie);
      await bind(p,state);
      const overlay=p.locator('.slot[data-unit="'+f.uid+'"] .eq-overlay[data-weapon-id="'+f.id+'"]');
      if(f.id==='pod-042')assert.equal(await overlay.count(),0);else await geometry(overlay,motion);
      await capture(p,label+'-before');await click(p,'accept-attack');await phase(p,'defense');
      const accepted=await saved(p);E.assertState(accepted);
      if(f.id==='little-joys-box'){
        assert(accepted.duel.relicGrants.length>0);assert.equal(await overlay.count(),0,'spent box returns to native card');
        assert((await p.evaluate(()=>window.__relicFx)).some(e=>e.kind==='luck'));await capture(p,label+'-clovers');
      }
      await click(p,'roll');await phase(p,'result');let result=await saved(p);E.assertState(result);
      if(f.id==='white-materia'){
        const choice=p.locator('.eq-choice[data-trait="reraise"]');await choice.waitFor();
        assert((await p.evaluate(()=>window.__relicFx)).some(e=>e.kind==='sacrifice'));
        assert.equal(await p.locator('[data-action=next]:visible:enabled').count(),0);
        await capture(p,label+'-choice');await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);await choice.waitFor();
        await p.locator('[data-action=equipment-recipient][data-uid="'+f.recipientUid+'"]:visible').first().click();
        await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).equipment.ultimates.records.some(r=>r.status==='spent'));
        result=await saved(p);assert.equal(E.matchStats(result).units.find(u=>u.uid===f.uid).hearts,1);
        assert((await p.evaluate(()=>window.__relicFx)).some(e=>e.kind==='reraise'));await capture(p,label+'-heart');
      }else if(f.id==='pod-042'){
        assert.equal(result.equipment.ultimates.records[0].status,'ready');await geometry(overlay,motion);
        assert.equal(await p.locator('.eq-target-mark[data-target-uid="'+f.enemyUid+'"]').count(),1);await capture(p,label+'-mark');
        const riposte=E.clone(f.ready);riposte.turn=f.side;
        E.lock(riposte,riposte.players[f.side].board.findIndex(u=>u?.uid===f.uid),riposte.players[1-f.side].board.findIndex(u=>u?.uid===f.enemyUid));
        E.rollAttack(riposte,f.riposteAttackDie);nextDie(riposte,f.riposteDefenseDie);await bind(p,riposte);
        await click(p,'accept-attack');await phase(p,'defense');assert((await p.evaluate(()=>window.__relicFx)).some(e=>e.kind==='riposte'));
        await click(p,'roll');await phase(p,'result');result=await saved(p);
        assert.equal(result.duel.formula.equipmentAttack,60+(result.duel.formula.equipmentWeapon||0));
        assert(result.log.some(e=>e.text?.includes('Pod 042')||JSON.stringify(e).includes('Pod 042')));
        const recap=await p.evaluate(()=>({totals:document.querySelector('.duel-console .recap-totals').getBoundingClientRect().bottom,actions:document.querySelector('.duel-console .duel-actions').getBoundingClientRect().top}));
        assert(recap.totals<=recap.actions+1,'Equipment totals overlap the action: '+JSON.stringify(recap));
        await capture(p,label+'-riposte');
      }
      E.assertState(result);await p.reload();await p.waitForFunction(()=>window.KALISTAR_READY);
      assert.deepEqual(E.matchStats(await saved(p)),E.matchStats(result));
      await p.setViewportSize({width:width+13,height:height-11});await p.waitForTimeout(150);
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,label+' horizontal overflow');
      assert.equal(await p.locator('.eq-relic-emblem,.eq-relic-gift,.eq-relic-transfer').count(),0,'temporary effects cleaned');
      assert(!await p.locator('#toast.visible').count(),'unexpected error toast');
      results.push({viewport:name,id:f.id,side:f.side,accepted:true,reload:true,fx:true});console.log('PASS '+label);await context.close();
    }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results'+(process.env.KALISTAR_QA_VIEWPORT?'-'+process.env.KALISTAR_QA_VIEWPORT:'')+'.json'),JSON.stringify({passed:true,sourceOverlay:source,results,errors},null,2)+'\n');
}
main().catch(async e=>{
  console.error(e);console.error(errors);process.exitCode=1;
  for(const ctx of browser?.contexts()||[])for(const p of ctx.pages()){
    console.error(await p.evaluate(()=>({url:location.href,toast:document.querySelector('#toast')?.textContent,text:document.body.innerText.slice(-2200)})).catch(()=>null));
    await p.screenshot({path:path.join(out,'failure.jpg'),type:'jpeg'}).catch(()=>{});
  }
}).finally(()=>browser?.close());
