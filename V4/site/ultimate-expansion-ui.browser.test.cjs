'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const F=require('./fixtures/ultimate-expansion.cjs'),UI=require('./ultimate-ui.js');
const {openEquipment}=require('./equipment-browser-test-helpers.cjs');
const modules=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(modules,'__ultimate_ui__.cjs'))('playwright');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const data=JSON.parse(fs.readFileSync(path.join(dist,'jeu/catalogue.json'),'utf8'));
const out=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-12-ultimate-expansion/verification'));
const base='https://kalistar-ultimate-ui.invalid/Kalistar',results=[],errors=[];let browser,serial=0;
const saved=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
async function settled(p){await p.waitForFunction(()=>window.KALISTAR_READY);await p.evaluate(()=>document.fonts.ready);}
async function capture(p,name){
  await p.waitForFunction(()=>[...document.querySelectorAll('.slot-card>img,.ultimate-choice img,#weapons-dialog[open] img,.eq-overlay img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));
  await p.screenshot({path:path.join(out,name+'.jpg'),type:'jpeg',quality:88,animations:'disabled'});
}
async function contextFor(view,catalogue=data){
  const context=await browser.newContext({viewport:{width:view.width,height:view.height},reducedMotion:view.motion,serviceWorkers:'block'});
  await context.route('**/*',async route=>{
    const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
    let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
    if(relative==='jeu/catalogue.json')return route.fulfill({json:catalogue});
    let file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep));
    if(relative==='jeu/index.html')return route.fulfill({contentType:'text/html',body:fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('data-hosting="local"','data-hosting="static"')});
    if(relative.startsWith('jeu/')&&/\.(js|css|webp|png|svg|woff2)$/.test(relative)){
      const candidate=path.resolve(__dirname,relative.slice(4));if(candidate.startsWith(__dirname+path.sep)&&fs.existsSync(candidate))file=candidate;
    }
    if(!fs.existsSync(file)){errors.push('Missing '+relative);return route.fulfill({status:404,body:''});}
    const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
    return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
  await context.addInitScript(()=>{
    const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-ultimate-ui-qa'):open.call(this,n+'-ultimate-ui-qa',v);};
    window.__ultimateFx=[];
    new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1&&n.matches('.eq-relic-emblem,.eq-relic-gift,.eq-relic-transfer'))window.__ultimateFx.push({className:n.className,kind:n.dataset.kind,trait:n.dataset.trait,text:n.textContent});}).observe(document,{childList:true,subtree:true});
    const animate=Element.prototype.animate;Element.prototype.animate=function(frames,options){const animation=animate.call(this,frames,options);if(window.__ultimateHold&&this.classList.contains('eq-relic-emblem')){animation.pause();animation.currentTime=100;}else animation.playbackRate=6;return animation;};
  });
  const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));return {context,p};
}
async function bind(p,f){
  await p.goto(base+'/jeu/#weapons');await settled(p);
  await p.evaluate(async state=>{
    const bound=KALISTAR_DB.registry.bindGame(KALISTAR_ACTIVE_USER,state);await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(bound);
    localStorage.setItem('kalistar.v4.game',JSON.stringify(bound));
  },f.s);
  await p.goto(base+'/jeu/?ultimate-ui-qa='+ ++serial+'#arena');await settled(p);
}
function seedDie(f,die){
  for(let n=1;n<200000;n++){let x=n;x^=x<<13;x^=x>>>17;x^=x<<5;if(Math.floor((x>>>0)/4294967296*6)+1===die){f.s.rng=n;f.E.assertState(f.s);return;}}
  throw Error('Missing deterministic die');
}
async function phase(p,want){await p.waitForFunction(want=>JSON.parse(localStorage.getItem('kalistar.v4.game')||'null')?.phase===want,want,{timeout:60000});}
async function option(p,value){await p.locator('[data-action=equipment-option][data-value="'+value+'"]:visible').click();}
async function checkChoice(p,view){
  const geometry=await p.locator('.ultimate-choice').evaluate(n=>{
    const rect=n.getBoundingClientRect();return {width:rect.width,x:rect.x,right:rect.right,overflow:n.scrollWidth-n.clientWidth,buttons:[...n.querySelectorAll('button')].map(b=>({height:b.getBoundingClientRect().height,overflow:b.scrollWidth-b.clientWidth,text:b.textContent}))};
  });
  assert(geometry.x>=-1&&geometry.right<=view.width+1,JSON.stringify(geometry));assert(geometry.overflow<=1,JSON.stringify(geometry));
  assert(geometry.buttons.every(b=>b.height>=43&&b.overflow<=1),JSON.stringify(geometry));
  if(view.width<700){assert.equal(await p.locator('.duel-console>.duel-die:visible').count(),0,'phone choice replaces dice');assert((await p.locator('.duel-console').boundingBox()).height<220,'phone choice remains compact');}
  assert.equal(await p.locator('[data-action="roll"]:visible:enabled,[data-action="next"]:visible:enabled,[data-action="auto-replace"]:visible:enabled,[data-action="lock"]:visible:enabled').count(),0);
}
async function assertClean(p){
  await p.waitForFunction(()=>!document.querySelector('.eq-relic-emblem,.eq-relic-gift,.eq-relic-transfer'));
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,'page horizontal overflow');
  assert.equal(await p.locator('#toast.visible').count(),0,'unexpected error toast');
}
async function geometry(p,id){
  const node=p.locator('.slot .eq-overlay[data-weapon-id="'+id+'"]');if(!await node.count())return;
  const result=await node.first().evaluate(n=>{
    const image=n.parentElement.querySelector(':scope>img'),a=n.getBoundingClientRect(),b=image.getBoundingClientRect(),crop=KalistarCardMedia.crop,l=KalistarEquipmentFX.arenaLayouts.relic;
    const width=Math.min(b.width,b.height*crop.width/crop.height),height=width*crop.height/crop.width;
    return {dx:Math.abs(a.left-b.left-(b.width-width)/2-(l.left-crop.left)/crop.width*width),dy:Math.abs(a.top-b.top-(b.height-height)/2-(l.top-crop.top)/crop.height*height),dw:Math.abs(a.width-l.width/crop.width*width)};
  });
  assert(Math.max(result.dx,result.dy,result.dw)<2,JSON.stringify(result));
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const view of [{name:'desktop',width:1440,height:1000,motion:'no-preference'},{name:'razr50',width:412,height:1007,motion:'no-preference'},{name:'compact',width:320,height:740,motion:'reduce'}]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==view.name)continue;
    if(!process.env.KALISTAR_QA_ITEM||process.env.KALISTAR_QA_ITEM==='cards'){
      const {context,p}=await contextFor(view);await p.goto(base+'/jeu/#weapons');await settled(p);
      for(const id of F.IDS){
        await openEquipment(p,id);await p.evaluate(()=>document.fonts.ready);
        const overflow=await p.locator('#weapons-dialog :is(.wc-title,.wc-rule-condition,.wc-rule-effect,.wc-flavour,.wc-activation,.wc-bearers,.wc-power)').evaluateAll(ns=>ns.filter(n=>n.scrollWidth>n.clientWidth+2||n.scrollHeight>n.clientHeight+2).map(n=>({className:n.className,w:n.clientWidth,sw:n.scrollWidth,h:n.clientHeight,sh:n.scrollHeight,text:n.textContent})));
        assert.deepEqual(overflow,[],view.name+' '+id+' card overflow');
        assert(!/undefined|NaN/.test(await p.locator('#weapons-dialog').innerText()));
        if(['exiled-king-seal','gotham-riddle-box','log-pose','pod-153'].includes(id))await capture(p,view.name+'-card-'+id);
        await p.locator('[data-weapon-action=close]').click();
      }
      results.push({viewport:view.name,cards:F.IDS.length});await context.close();console.log('PASS '+view.name+' cards');
    }
    for(const id of ['exiled-king-seal','gotham-riddle-box','log-pose','gotham-ivy-seed','griever-pendant','kalistar-nestown-beacon']){
      if(process.env.KALISTAR_QA_ITEM&&process.env.KALISTAR_QA_ITEM!==id)continue;
      const f=await F.fixture(id,{supports:['luck','mana'],mutate:id==='log-pose'?(d,c)=>c.slice(5).forEach(c=>{c.positions=[3];}):undefined});
      if(id==='exiled-king-seal'){F.outnumber(f);F.lock(f);F.attack(f);seedDie(f,6);}
      if(id==='gotham-riddle-box'){F.support(f,f.u,f.ally,'luck');F.next(f);F.lock(f);f.s.mode='ai';seedDie(f,6);}
      if(id==='log-pose'){F.killAlly(f);F.next(f);F.duel(f,f.enemy,f.ally,5);F.next(f,{deploy:false});F.step(f,'deploy',0,f.s.players[0].reserve[0].uid,2);}
      if(id==='gotham-ivy-seed')F.twoSupports(f);
      if(id==='griever-pendant'){F.outnumber(f,2,[f.u,f.ally]);F.lock(f,f.u,f.enemy);F.attack(f,4);seedDie(f,6);}
      if(id==='kalistar-nestown-beacon'){F.killAlly(f);F.next(f);F.killAlly(f);F.next(f,{deploy:false});assert.equal(f.s.phase,'replace');}
      const {context,p}=await contextFor(view,f.data);await bind(p,f);const prefix=view.name+'-'+id;
      if(id==='exiled-king-seal'){
        await p.locator('[data-action=roll]:visible').click();await phase(p,'result');await p.locator('.ultimate-choice').waitFor();await checkChoice(p,view);await capture(p,prefix+'-choice');
        await option(p,f.ally);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).match.ultimateGrants?.length===1);
        assert.equal(await p.locator('[data-action=equipment-option][data-value="'+f.ally+'"]').count(),0,'no repeat recipient');
        await p.reload();await settled(p);await p.locator('.ultimate-choice').waitFor();await option(p,f.ally2);
        await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).match.ultimateGrants?.length===2);assert.equal(await p.locator('.ultimate-choice').count(),0);
      }else if(id==='gotham-riddle-box'){
        await p.locator('.ultimate-choice').waitFor();await checkChoice(p,view);await capture(p,prefix+'-before-enemy-roll');
        await p.waitForTimeout(1200);assert.equal((await saved(p)).duel.attackRolls.length,0,'enemy AI waits for human prediction');
        await p.reload();await settled(p);await p.locator('.ultimate-choice').waitFor();await p.waitForTimeout(1200);assert.equal((await saved(p)).duel.attackRolls.length,0,'reload still waits');
        await option(p,'even');await phase(p,'defense');assert.equal((await saved(p)).duel.attackRolls.length,1);assert.equal(await p.locator('.ultimate-choice').count(),0);
        await capture(p,prefix+'-prediction-resolved');await geometry(p,id);
        const after=await saved(p);await p.evaluate(({before,after})=>{window.__ultimateHold=true;window.__ultimatePending=KalistarEquipmentFX.play({before,after});},{before:f.s,after});
        await p.locator('.eq-relic-emblem').waitFor();await capture(p,prefix+'-activation');await p.setViewportSize({width:view.width+8,height:view.height-8});
        await p.evaluate(async()=>{await window.__ultimatePending;window.__ultimateHold=false;});await assertClean(p);await geometry(p,id);
      }else if(id==='log-pose'){
        await p.locator('.ultimate-choice').waitFor();await checkChoice(p,view);await capture(p,prefix+'-reinforcement-choice');
        const button=p.locator('[data-action=equipment-option][data-value=physical]');assert.match(await button.innerText(),/Puissance/);
        await option(p,'physical');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).match.ultimateGrants?.some(g=>g.weaponId==='log-pose'));
        const after=await saved(p),g=after.match.ultimateGrants.find(g=>g.weaponId==='log-pose');assert.equal(g.kind,'physical');assert.equal(after.players[0].board.find(u=>u?.uid===g.recipient).physical,60);
        assert((await p.evaluate(()=>__ultimateFx)).some(e=>e.kind==='grant'),'deployment gift animated without a current duel');
      }else if(id==='gotham-ivy-seed'){
        await p.locator('.ultimate-choice').waitFor();await checkChoice(p,view);assert(await p.locator('[data-action=equipment-recipient][data-side="1"]').count()>0,'enemy selectable for human Ivy');
        await capture(p,prefix+'-enemy-choice');await option(p,f.enemy);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).equipment.rituals.records['0-0'].status==='ready');
        await p.locator('.eq-target-mark[data-target-uid="'+f.enemy+'"]').waitFor();
      }else if(id==='griever-pendant'){
        const before=await saved(p);assert.equal(UI.total(before,'ATK'),60);
        const row=p.locator('.duel-console [data-bonus=ultimateAttack]');assert.match(await row.innerText(),/60/);
        const total=await p.locator('.duel-console .recap-totals strong').first().innerText();assert.equal(Number(total),before.duel.attackValue+60,'preview includes ultimate before DEF');
        await capture(p,prefix+'-bonus-before-defense');await p.locator('[data-action=roll]:visible').click();await phase(p,'result');
        const after=await saved(p);assert.equal(after.duel.formula.ultimateAttack,60);await capture(p,prefix+'-resolved-bonus');await geometry(p,id);
      }else if(id==='kalistar-nestown-beacon'){
        await p.locator('[data-action=auto-replace]:visible').click();
        await p.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).match.ultimateGrants?.filter(g=>g.weaponId==='kalistar-nestown-beacon').length===2);
        await p.waitForFunction(()=>window.__ultimateFx.some(e=>e.kind==='grant'));
        await assertClean(p);const after=await saved(p),grants=after.match.ultimateGrants.filter(g=>g.weaponId===id),u=after.players[0].board.find(u=>u?.uid===grants[0].recipient);
        assert.equal(u.ward,60);assert.equal(u.luck,1);assert((await p.evaluate(()=>__ultimateFx)).some(e=>e.className==='eq-relic-emblem'&&e.kind==='grant'));
        await capture(p,prefix+'-deployment-gifts');
      }
      await assertClean(p);const state=await saved(p);f.E.assertState(state);
      await p.reload();await settled(p);const restored=await saved(p);assert.deepEqual(f.E.matchStats(restored),f.E.matchStats(state));
      assert.equal((await p.evaluate(()=>__ultimateFx)).length,0,'no event replay on reload');
      await p.setViewportSize({width:view.width+8,height:view.height-8});await p.waitForTimeout(150);await assertClean(p);
      results.push({viewport:view.name,id,reload:true,choice:true,animations:true});await context.close();console.log('PASS '+prefix);
    }
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'ui-results'+(process.env.KALISTAR_QA_VIEWPORT?'-'+process.env.KALISTAR_QA_VIEWPORT:'')+(process.env.KALISTAR_QA_ITEM?'-'+process.env.KALISTAR_QA_ITEM:'')+'.json'),JSON.stringify({passed:true,sourceOverlay:true,testOnlyFaces:true,results,errors},null,2)+'\n');
}
main().catch(async e=>{
  console.error(e);console.error(errors);process.exitCode=1;
  for(const c of browser?.contexts()||[])for(const p of c.pages()){
    console.error(await p.evaluate(()=>({url:location.href,toast:document.querySelector('#toast')?.textContent,text:document.body.innerText.slice(-1800)})).catch(()=>null));
    await p.screenshot({path:path.join(out,'ui-failure.jpg'),type:'jpeg'}).catch(()=>{});
  }
}).finally(()=>browser?.close());
