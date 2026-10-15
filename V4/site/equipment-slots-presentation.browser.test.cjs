'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__equipment_slots_visual__.cjs'))('playwright');
const sharp=createRequire(path.join(runtime,'__equipment_slots_visual__.cjs'))('sharp');
const base=process.env.KALISTAR_URL||'http://127.0.0.1:4304',out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-equipment-slots/qa/presentation');
const results=[],errors=[];let browser,navigation=0;
async function ready(page){await page.goto(base+'/jeu/?equipment-slots-visual='+ ++navigation+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);}
async function images(page){await page.waitForFunction(()=>[...document.querySelectorAll('.slot-card > img,.eq-overlay img,.eq-detail-overlay img')].every(i=>!i.getBoundingClientRect().width||i.complete&&i.naturalWidth));}
async function fixture(page,side,fail=false){
  return page.evaluate(async({side,fail})=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),cards=KALISTAR_DATA.cards,attacker=cards.find(c=>c.characterId==='balmhyr'),defender=fail?cards.filter(c=>c.characterId==='vivi-ff9').sort((a,b)=>a.defense[0]-b.defense[0])[0]:attacker;
    const deckWith=c=>KALISTAR_DATA.decks.player.includes(c.id)?KALISTAR_DATA.decks.player:KALISTAR_DATA.decks.player.map((_,i)=>KALISTAR_DATA.decks.player.map((id,j)=>i===j?c.id:id)).find(ids=>!E.validatePlayableDeck(ids).length);
    if(!deckWith(attacker)||!deckWith(defender))throw Error('No playable equipment fixture.');
    const loadouts=[KalistarEquipment.emptyLoadout(),KalistarEquipment.emptyLoadout()];loadouts[side].weapon[attacker.characterId]='fallen-king-axe';loadouts[1-side].shield[defender.characterId]=fail?'ff9-vivi-hat':'durane-rampart';
    let s=E.newGame(side?deckWith(defender):deckWith(attacker),side?deckWith(attacker):deckWith(defender),{mode:'local',seed:'EQUIPMENT-SLOTS-VISUAL',kalistel:false,equipment:loadouts});
    E.autoDeploy(s,0);E.autoDeploy(s,1);
    for(const [player,c]of [[side,attacker],[1-side,defender]]){
      const p=s.players[player];if(!p.board.some(u=>u?.cardId===c.id)){const u=p.reserve.find(u=>u.cardId===c.id);E.recall(s,player,c.positions[0]-1);E.deploy(s,player,u.uid,c.positions[0]-1);}
    }
    E.start(s);s.turn=side;const a=s.players[side].board.findIndex(u=>u?.cardId===attacker.id),b=s.players[1-side].board.findIndex(u=>u?.cardId===defender.id);E.lock(s,a,b);E.rollAttack(s,6);if(s.phase==='kalistel')E.acceptAttack(s);E.assertState(s);
    const next=E.clone(s);E.rollDefense(next,6);E.assertState(next);if(!next.duel.formula?.equipmentProtection)throw Error('Real DEF6 protection did not apply.');
    const killed=next.players[1-side].dead.some(u=>u.uid===next.duel.target);if(killed!==fail)throw Error('Wrong real combat outcome: '+JSON.stringify(next.duel.formula));
    await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));return {before:s,after:next,side,uid:s.duel.attacker,target:s.duel.target};
  },{side,fail});
}
async function geometry(page,selector='.eq-overlay'){
  return page.locator(selector).evaluateAll(ns=>ns.map(n=>{
    const img=n.parentElement.querySelector(':scope > img'),r=n.getBoundingClientRect(),i=img.getBoundingClientRect(),c=KalistarCardMedia.crop,a=(n.dataset.arena==='true'?KalistarEquipmentFX.arenaLayouts:KalistarEquipmentFX.layouts)[n.dataset.slot],style=getComputedStyle(img);
    const ratio=c.width/c.height,w=style.objectFit==='contain'?Math.min(i.width,i.height*ratio):i.width,h=style.objectFit==='contain'?Math.min(i.height,i.width/ratio):i.height;
    return {slot:n.dataset.slot,dx:Math.abs(r.left-i.left-(i.width-w)/2-(a.left-c.left)/c.width*w),dy:Math.abs(r.top-i.top-(i.height-h)/2-(a.top-c.top)/c.height*h),dw:Math.abs(r.width-a.width/c.width*w),visibility:getComputedStyle(n).visibility};
  }));
}
function assertGeometry(samples,label){assert(samples.length,label+' contains overlays');for(const sample of samples)assert(Math.max(sample.dx,sample.dy,sample.dw)<1.4,label+' '+JSON.stringify(sample));}
async function installRecorder(page){
  await page.evaluate(()=>{
    const native=Element.prototype.animate;window.equipmentFxSamples=[];window.equipmentFxHold=false;
    Element.prototype.animate=function(frames,options){
      if(this.matches('.eq-use,.combat-shield'))window.equipmentFxSamples.push({className:this.className,slot:this.dataset.slot,id:this.dataset.weaponId,art:this.querySelector('img')?.getAttribute('src')||null,shield:!!this.querySelector('.lucide,[data-lucide]')});
      const a=native.call(this,frames,options);if(this.matches('.eq-use')&&window.equipmentFxHold||this.matches('.combat-shield')&&window.equipmentShieldHold){a.pause();a.currentTime=options.duration*.4;}else a.playbackRate=15;return a;
    };
  });
}
async function main(){
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  for(const [name,viewport,motion]of [['desktop',{width:1440,height:1000},'no-preference'],['razr',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    if(process.env.KALISTAR_QA_VIEWPORT&&process.env.KALISTAR_QA_VIEWPORT!==name)continue;
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-equipment-slots-presentation-qa'):open.call(this,n+'-equipment-slots-presentation-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));await ready(page);
    for(const side of [0,1]){
      const f=await fixture(page,side);await ready(page);await images(page);await installRecorder(page);
      await page.locator('.eq-overlay[data-slot=weapon]').waitFor();assertGeometry(await geometry(page),name+' side'+side+' focused');
      assert.equal(await page.locator('.eq-overlay .eq-tab').count(),0,'direct equipment has no bonus plate');
      const resting=page.locator('.eq-overlay[data-slot=shield] .eq-orbit'),fixed=await resting.evaluate(n=>({animation:getComputedStyle(n).animationName,transform:getComputedStyle(n).transform}));
      assert.equal(fixed.animation,'none');await page.waitForTimeout(150);assert.equal(await resting.evaluate(n=>getComputedStyle(n).transform),fixed.transform,'inactive protection stays still');
      await page.screenshot({path:path.join(out,name+'-side'+side+'-resting-protection.png'),scale:'css'});
      const ordinary=await page.evaluate(()=>{KalistarFocus.capture();window.eqChallengers=[...document.querySelectorAll('.slot.challenger')];eqChallengers.forEach(n=>n.classList.remove('challenger'));for(const n of document.querySelectorAll('.formation .slot')){n.style.removeProperty('transform');n.style.removeProperty('opacity');n.style.removeProperty('--focus-scale');delete n._kalistarFocusTransform;}return true;});assert(ordinary);await page.waitForTimeout(100);assertGeometry(await geometry(page),name+' normal');
      const normalScale=await page.locator('.slot:has(.eq-overlay)').first().evaluate(n=>n.getBoundingClientRect().width/n.offsetWidth);assert(Math.abs(normalScale-1)<.02,'ordinary card really has scale 1');
      await page.evaluate(()=>{eqChallengers.forEach(n=>n.classList.add('challenger'));KalistarFocus.mount(document.querySelectorAll('.formation'));});await page.waitForTimeout(600);assertGeometry(await geometry(page),name+' refocused');
      await page.evaluate(async f=>{window.eqAbort=new AbortController();await KalistarDice.play(1-f.side,6,true,window.eqAbort.signal);window.eqRestingProtection=document.querySelector('.eq-overlay[data-slot=shield]');window.eqAfter=f.after;window.eqBefore=f.before;window.eqPlay=KalistarEquipmentFX.play({before:f.before,after:f.after,signal:window.eqAbort.signal});},{...f});
      await page.evaluate(()=>window.eqPlay);await images(page);assertGeometry(await geometry(page),name+' active DEF6');
      assert(await page.evaluate(()=>eqRestingProtection===document.querySelector('.eq-overlay[data-slot=shield]')),'activation reuses the visible medallion');
      const synchronization=await page.locator('.eq-overlay:is([data-slot=weapon],[data-slot=shield])').evaluateAll(ns=>ns.map(n=>{
        const marker=n.parentElement.querySelector(`.ritual-result[data-face="6"][data-role="${n.dataset.slot==='weapon'?'ATK':'DEF'}"]`);return {slot:n.dataset.slot,delay:n.style.getPropertyValue('--eq-loop-delay'),markerDelay:marker?.style.getPropertyValue('--eq-loop-delay'),direction:getComputedStyle(n.querySelector('.eq-radar')).animationDirection,iterations:getComputedStyle(n.querySelector('.eq-radar')).animationIterationCount};
      }));
      for(const s of synchronization){assert.equal(s.delay,s.markerDelay,name+' shared D6 epoch '+s.slot);assert.equal(s.direction,'normal');if(motion!=='reduce')assert.equal(s.iterations,'infinite');}
      await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,name+'-side'+side+'-active.png'),scale:'css'});
      await page.setViewportSize({width:viewport.width+31,height:viewport.height-23});await page.waitForTimeout(120);assertGeometry(await geometry(page),name+' resize');await page.setViewportSize(viewport);
      await page.locator(`.slot[data-unit="${f.uid}"] [data-action=detail]`).click();await page.locator('.eq-detail-overlay').waitFor();await images(page);assertGeometry(await geometry(page,'.eq-detail-overlay'),name+' real arena popup');
      await page.evaluate(()=>{
        const c=document.querySelector('#detail-dialog .detail-visual'),W=KalistarWeapons.weapons;KalistarEquipmentFX.mountDetail(c,[{weapon:W.find(w=>w.id==='fallen-king-axe'),slot:'weapon',active:null},{weapon:W.find(w=>w.id==='durane-rampart'),slot:'shield',active:null},{weapon:W.find(w=>w.id==='exiled-king-seal'),slot:'relic',active:null}],{bonus:false});
      });await images(page);assert.equal(await page.locator('.eq-detail-overlay').count(),3);assert.equal(await page.locator('.eq-detail-overlay .eq-tab').count(),0);assertGeometry(await geometry(page,'.eq-detail-overlay'),name+' three-slot deck popup');
      await page.screenshot({path:path.join(out,name+'-side'+side+'-three-slot-popup.png'),scale:'css'});await page.locator('#detail-dialog [data-action=close]').click();await page.waitForFunction(()=>!document.querySelector('.eq-detail-overlay'));assert.equal(await page.locator('.eq-detail-overlay').count(),0);
      const combat=await page.evaluate(async()=>{
        await KalistarCombat.play({before:eqBefore,after:eqAfter,element:'MINERO',color:'#c1c8cb',reduced:false,signal:eqAbort.signal});return equipmentFxSamples;
      });assert(combat.some(s=>s.className.includes('combat-equipped-protection')&&s.art&&s.id==='durane-rampart'));assert(!combat.some(s=>s.className.includes('combat-shield')&&!s.className.includes('combat-equipped-protection')&&s.shield));
      if(motion==='reduce')assert(!combat.some(s=>s.className==='eq-use'),'reduced motion has no flying item');else assert(combat.some(s=>s.className==='eq-use'&&s.slot==='shield'));
      if(side===0&&motion!=='reduce'){
        await page.evaluate(()=>{equipmentShieldHold=true;window.blockAbort=new AbortController();window.blockPlay=KalistarCombat.play({before:eqBefore,after:eqAfter,element:'MINERO',color:'#c1c8cb',reduced:false,signal:blockAbort.signal});});
        await page.locator('.combat-equipped-protection').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.combat-equipped-protection img')].every(i=>i.complete&&i.naturalWidth));await page.screenshot({path:path.join(out,name+'-equipped-block.png'),scale:'css'});
        await page.evaluate(async()=>{blockAbort.abort();await blockPlay;equipmentShieldHold=false;});
      }
      await page.evaluate(()=>{eqAbort.abort();KalistarEquipmentFX.capture({reset:true});});assert.equal(await page.locator('.eq-use,.eq-transfer,.eq-gift,.eq-overlay,.combat-card-effect').count(),0);
      await page.evaluate(async f=>{await KALISTAR_DB.saveGame(f.after);localStorage.setItem('kalistar.v4.game',JSON.stringify(f.after));},f);await ready(page);await images(page);assert.equal(await page.locator('.eq-overlay.is-active').count(),2,'both retained D6 items survive reload');assertGeometry(await geometry(page),name+' retained result reload');await page.screenshot({path:path.join(out,name+'-side'+side+'-restored-result.png'),scale:'css'});
      await page.evaluate(()=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));E.next(s);E.assertState(s);KalistarEquipmentFX.capture();KalistarEquipmentFX.mount(s,E);});await page.waitForTimeout(450);
      assert.equal(await page.locator('.eq-overlay').count(),2,'both equipped circles stay visible after the duel');assert.equal(await page.locator('.eq-overlay.is-active,.ritual-result[data-equipment-six],.eq-overlay .eq-tab').count(),0,'deactivation stops motion and D6 sync, without a plate');
      assert((await page.locator('.eq-overlay .eq-orbit').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).animationName))).every(n=>n==='none'));
      await page.screenshot({path:path.join(out,name+'-side'+side+'-resting-equipment.png'),scale:'css'});
      await page.evaluate(()=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.restoreGame(JSON.parse(localStorage.getItem('kalistar.v4.game')));KalistarEquipmentFX.mount({...s,phase:'over'},E);});
      assert.equal(await page.locator('.eq-overlay').count(),2,'finished board keeps equipped objects visible');assert.equal(await page.locator('.eq-overlay.is-active,.eq-use,.eq-transfer,.eq-gift').count(),0,'finished board has no active equipment effects');
      results.push({name,side,scenario:'real Block, focus, resize, three-slot popup, synchronized D6, reload and deactivation',passed:true});
    }
    const failure=await fixture(page,0,true);await ready(page);await images(page);await installRecorder(page);
    await page.evaluate(async f=>{window.eqAbort=new AbortController();window.eqBefore=f.before;window.eqAfter=f.after;await KalistarDice.play(1,6,true,eqAbort.signal);window.equipmentFxHold=!matchMedia('(prefers-reduced-motion:reduce)').matches;window.eqPlay=KalistarEquipmentFX.play({before:f.before,after:f.after,signal:eqAbort.signal});},failure);
    if(motion!=='reduce'){
      await page.locator('.eq-use[data-slot=shield]').waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.eq-use img')].every(i=>i.complete&&i.naturalWidth));
      const used=await page.locator('.eq-use[data-slot=shield]').evaluate(n=>({opacity:Number(getComputedStyle(n).opacity),width:n.getBoundingClientRect().width,artWidth:n.querySelector('img').getBoundingClientRect().width}));assert(used.opacity>.6&&used.width>20&&used.artWidth>20,'actual protection art is visibly rendered');
      await images(page);await page.screenshot({path:path.join(out,name+'-failed-defense-protection.png'),scale:'css'});
      const use=page.locator('.eq-use[data-slot=shield]'),clip=await use.boundingBox(),shown=await page.screenshot({clip});await use.evaluate(n=>n.style.visibility='hidden');const hidden=await page.screenshot({clip});await use.evaluate(n=>n.style.removeProperty('visibility'));
      const a=await sharp(shown).ensureAlpha().raw().toBuffer(),b=await sharp(hidden).ensureAlpha().raw().toBuffer();let changedPixels=0;for(let i=0;i<a.length;i+=4)if(Math.max(Math.abs(a[i]-b[i]),Math.abs(a[i+1]-b[i+1]),Math.abs(a[i+2]-b[i+2]))>12)changedPixels++;
      assert(changedPixels>100,'used protection contributes real visible pixels');results.push({name,scenario:'protection artwork pixel check',changedPixels,passed:true});
      await use.screenshot({path:path.join(out,name+'-protection-use-detail.png')});await page.setViewportSize({width:viewport.height,height:viewport.width});await page.waitForTimeout(150);assertGeometry(await geometry(page),name+' live activation rotation');await page.screenshot({path:path.join(out,name+'-rotated-during-activation.png'),scale:'css'});await page.setViewportSize(viewport);
      await page.evaluate(()=>{for(const a of document.querySelectorAll('.eq-use'))for(const animation of a.getAnimations())animation.play();});
    }
    await page.evaluate(()=>window.eqPlay);
    const failureSamples=await page.evaluate(async()=>{await KalistarCombat.play({before:eqBefore,after:eqAfter,element:'MINERO',color:'#c1c8cb',reduced:false,signal:eqAbort.signal});return equipmentFxSamples;});
    if(motion!=='reduce')assert(failureSamples.some(s=>s.slot==='shield'&&s.id==='ff9-vivi-hat'),'failed protection appeared before defeat');assert(!failureSamples.some(s=>s.className.includes('combat-equipped-protection')),'failed defense must not pretend to Block');
    await page.evaluate(()=>{eqAbort.abort();KalistarEquipmentFX.capture({reset:true});});
    await page.evaluate(async f=>{window.eqAbort=new AbortController();const after=structuredClone(f.after);after.duel.equipment.protection=null;after.duel.formula.equipmentProtection=0;after.players[1].board[f.after.duel.targetSlot]=f.before.players[1].board[f.after.duel.targetSlot];await KalistarCombat.play({before:f.before,after,element:'MINERO',color:'#c1c8cb',reduced:false,signal:eqAbort.signal});eqAbort.abort();},failure);
    const generic=await page.evaluate(()=>equipmentFxSamples);assert(generic.some(s=>s.className.includes('combat-shield')&&!s.className.includes('combat-equipped-protection')&&s.shield),'ordinary Block keeps the original shield');
    await page.evaluate(()=>KalistarEquipmentFX.mount({phase:'over'},null));assert.equal(await page.locator('.eq-overlay,.eq-use,.eq-transfer,.eq-gift,.combat-card-effect').count(),0,'end of match cleanup');
    results.push({name,scenario:'real failed defense, original Block, reduced motion, finish cleanup',passed:true});await context.close();
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,results,errors},null,2));console.log(JSON.stringify({passed:true,scenarios:results.length,captures:fs.readdirSync(out).filter(n=>n.endsWith('.png')).length}));
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
