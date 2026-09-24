'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__combat_layout__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/combat-effect-layout');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:412,height:1007},reducedMotion:'no-preference'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.locator('[data-action=start]').click();
  await page.locator('.formation[data-player="0"] .slot-card').first().click();
  await page.locator('.formation[data-player="1"] .slot-card').first().click();
  await page.waitForTimeout(600);
  const saved=await page.evaluate(()=>localStorage.getItem('kalistar.v4.game'));
  await page.evaluate(()=>{
    const native=Element.prototype.animate;
    window.fxSamples=[];window.fxSlow=false;
    window.fxSelector='.combat-shield,.combat-impact,.combat-emblem,.combat-life-wave,.combat-afterimage';
    window.measureFx=node=>{
      const card=node.closest('.slot').querySelector('.slot-card'),c=getComputedStyle(card),n=getComputedStyle(node);
      return {type:node.className,card:{left:card.offsetLeft,top:card.offsetTop,width:parseFloat(c.width),height:parseFloat(c.height)},
        effect:{left:parseFloat(n.left),top:parseFloat(n.top),width:parseFloat(n.width),height:parseFloat(n.height)}};
    };
    Element.prototype.animate=function(frames,options){
      if(this.matches(window.fxSelector))window.fxSamples.push(window.measureFx(this));
      const animation=native.call(this,frames,options);if(!window.fxSlow)animation.playbackRate=30;return animation;
    };
    // Renderer-only scenarios: none of these synthetic outcomes are persisted.
    window.startFx=(kind,side=0,slow=false,reduced=false)=>{
      window.fxSlow=slow;window.fxSamples=[];
      const s=JSON.parse(localStorage.getItem('kalistar.v4.game')),e=KalistarEngine.createEngine(KALISTAR_DATA);s.turn=side;e.lock(s,0,0);
      const before=e.clone(s);before.phase='defense';before.duel.attackValue=200;before.duel.defenseValue=250;
      const after=e.clone(before),d=after.duel;after.phase='result';d.formula={};d.magic=kind==='magic';
      if(kind==='death'||kind==='defeat'){d.attackValue=kind==='death'?'death':200;after.players[1-side].board[0]=null;}
      if(kind==='dodge')d.defenseValue='dodge';
      if(kind==='reraise')d.reraised=true;
      if(kind==='ward')d.formula.ward=60;
      if(kind==='second-chance')d.luckUsed=true;
      if(kind==='retry'){d.defenseValue='retry';after.phase='defense';}
      if(['guard','heart','potion','physical','clover'].includes(kind)){
        before.phase=kind;after.phase='result';
        d[{guard:'guardGranted',heart:'reraiseGranted',potion:'manaGranted',physical:'physicalGranted',clover:'cloverGranted'}[kind]]=s.players[side].board[1].uid;
      }
      window.fxAbort=new AbortController();window.fxDone=KalistarCombat.play({before,after,element:'HYDRO',color:'#68d7ed',reduced,signal:window.fxAbort.signal});
    };
  });
  function verify(samples,label){
    assert.ok(samples.length,'effects were rendered: '+label);
    for(const sample of samples)for(const key of ['left','top','width','height'])assert.ok(Math.abs(sample.card[key]-sample.effect[key])<1.1,`${label}: ${sample.type} ${key}, card=${sample.card[key]}, effect=${sample.effect[key]}`);
  }
  for(const [width,height] of [[412,1007],[390,844],[320,568],[844,390],[1440,1000],[2041,1383]]){
    await page.setViewportSize({width,height});await page.waitForTimeout(600);
    for(const side of [0,1])for(const kind of ['shield','ward','defeat','death','reraise','dodge','guard','heart','potion','physical','clover','second-chance','retry','magic']){
      const samples=await page.evaluate(async({kind,side})=>{window.startFx(kind,side);await window.fxDone;return window.fxSamples;},{kind,side});
      verify(samples,`${width}x${height}, side ${side}, ${kind}`);
      assert.equal(await page.locator('.combat-card-effect,.combat-magic').count(),0,'no residual effects');
    }
  }
  // Freeze native animations at their readable frame, including during rotation.
  for(const kind of ['shield','death','reraise','dodge']){
    await page.setViewportSize({width:412,height:1007});await page.waitForTimeout(600);
    await page.evaluate(kind=>window.startFx(kind,0,true),kind);
    const selector=kind==='shield'?'.combat-shield':kind==='reraise'?'.combat-life-wave':kind==='dodge'?'.combat-afterimage':'.combat-impact';
    await page.locator(selector).first().waitFor({state:'attached'});
    await page.evaluate(()=>{for(const a of document.querySelector('.battlefield').getAnimations({subtree:true})){a.pause();a.currentTime=a.effect.target.matches('.slot-card')?0:a.effect.getTiming().duration*.3;}});
    await page.screenshot({path:path.join(output,`${kind}-phone.png`),scale:'css'});
    if(kind==='shield'){
      await page.setViewportSize({width:844,height:390});await page.waitForTimeout(650);
      verify(await page.locator('.combat-shield').evaluateAll(nodes=>nodes.map(window.measureFx)),'active effect after rotation');
      await page.screenshot({path:path.join(output,'shield-rotated.png'),scale:'css'});
    }
    await page.evaluate(async()=>{window.fxAbort.abort();await window.fxDone;});
    assert.equal(await page.locator('.combat-card-effect,.combat-magic').count(),0,'cancellation cleans all effects');
  }
  await page.evaluate(async()=>{window.startFx('shield',0,false,true);await window.fxDone;});
  assert.equal(await page.locator('.combat-card-effect').count(),0,'reduced motion skips effects');
  assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v4.game')),saved,'visual verification never changes the match');
  assert.deepEqual(errors,[]);
  console.log('PASS: both teams, 14 outcomes, 6 phone/desktop sizes, live rotation, cancellation, reduced motion and unchanged game state.');
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();});
