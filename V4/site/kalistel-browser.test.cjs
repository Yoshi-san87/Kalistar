'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__kalistel__.cjs'))('playwright');
const url=process.env.KALISTAR_URL||'http://127.0.0.1:4304',output=path.join(__dirname,'verification/kalistel');
let browser;
async function main(){
  fs.mkdirSync(output,{recursive:true});
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:process.argv.includes('--motion')||process.env.KALISTAR_MOTION==='full'?'no-preference':'reduce'});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url+'/jeu/#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
  await page.locator('[data-action=start]').click();
  const base=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
  async function stage(side=0,ai=false){
    await page.evaluate(async({base,side,ai})=>{
      await KALISTAR_DB.idle();
      const e=KalistarEngine.createEngine(KALISTAR_DATA),s=structuredClone(base);s.mode=ai?'ai':'local';s.turn=side;
      let candidate;
      for(const [slot,u] of s.players[side].board.entries()){
        const c=e.card(u),face=c.atk.findIndex(v=>typeof v==='number'&&v<e.mean(c.atk)*.75);
        if(face>=0){candidate={slot,die:6-face};break;}
      }
      e.lock(s,candidate.slot,0);e.rollAttack(s,candidate.die);e.assertState(s);
      await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
    },{base,side,ai});
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  }
  const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
  await stage();
  const pending=await state();assert.equal(pending.phase,'kalistel');
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.deepEqual(await state(),pending,'pending choice survives refresh without spending or rolling');
  assert.equal(await page.locator('.kalistel-control:enabled').count(),1);
  assert.equal(await page.locator('.challenger').count(),2,'duel cards remain enlarged during decision');
  for(const [width,height] of [[1440,1000],[412,1007],[390,844],[320,568],[844,390]]){
    await page.setViewportSize({width,height});
    await page.waitForFunction(()=>[...document.querySelectorAll('.kalistel-art img')].every(i=>i.complete&&i.naturalWidth));
    const geometry=await page.locator('.kalistel-control').evaluateAll(nodes=>nodes.map(n=>{
      const b=n.getBoundingClientRect(),d=n.parentNode.querySelector('.dice-stage').getBoundingClientRect(),style=getComputedStyle(n);
      return {x:b.x,right:b.right,width:b.width,height:b.height,overlap:Math.min(b.right,d.right)-Math.max(b.left,d.left),background:style.backgroundColor,text:n.textContent.trim()};
    }));
    for(const g of geometry){assert.ok(g.x>=0&&g.right<=width&&g.width>=44&&g.height>=44,JSON.stringify(g));assert.ok(g.overlap<=1,'gem never covers die');assert.equal(g.background,'rgba(0, 0, 0, 0)');assert.equal(g.text,'');}
    await page.screenshot({path:path.join(output,`choice-${width}x${height}.png`)});
  }
  await page.setViewportSize({width:412,height:1007});
  await page.locator('.kalistel-control:enabled').tap();
  if(await page.evaluate(()=>!matchMedia('(prefers-reduced-motion:reduce)').matches)){
    await page.waitForFunction(()=>{
      const canvas=document.querySelector('.kalistel-burst');
      return canvas&&canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data.some((v,i)=>i%4===3&&v>0);
    });
    const first=await page.locator('.kalistel-burst').evaluate(c=>c.toDataURL());
    await page.waitForTimeout(100);
    assert.notEqual(await page.locator('.kalistel-burst').evaluate(c=>c.toDataURL()),first,'crystal fragments actually move');
    await page.screenshot({path:path.join(output,'crystal-shatter-phone.png')});
    assert.equal(await page.locator('.kalistel-burst').evaluate(c=>getComputedStyle(c).pointerEvents),'none');
  }else assert.equal(await page.locator('.kalistel-burst').count(),0,'reduced motion skips travelling shards');
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).kalistel.spent.length===1);
  assert.equal(await page.locator('.kalistel-burst').count(),0,'burst is cleaned up before the next action');
  const used=await state();assert.equal(used.duel.attackRolls.length,2);assert.equal(used.duel.attacker,pending.duel.attacker);assert.equal(used.duel.target,pending.duel.target);
  assert.equal(await page.locator('.kalistel-control:enabled').count(),0);
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
  assert.deepEqual(await state(),used,'spent charge and rerolled die survive refresh');
  await page.screenshot({path:path.join(output,'spent-phone.png')});
  await stage();await page.locator('[data-action=accept-attack]').tap();
  assert.equal((await state()).kalistel.spent.length,0);assert.equal((await state()).duel.attackRolls.length,1);
  await page.evaluate(async()=>{
    const controller=new AbortController(),before=localStorage.getItem('kalistar.v4.game');
    const burst=KalistarCombat.shatterKalistel(document.querySelector('.kalistel-control'),{signal:controller.signal});
    controller.abort();await burst;
    if(document.querySelector('.kalistel-burst')||localStorage.getItem('kalistar.v4.game')!==before)throw Error('Burst cancellation must clean up without changing game state');
  });
  await stage(0,true);const waiting=await state();await page.waitForTimeout(1200);
  assert.deepEqual(await state(),waiting,'AI defense cannot run before the human decision');
  await stage(1);assert.equal(await page.locator('.kalistel-control:enabled').getAttribute('data-side'),'1');
  await page.locator('.kalistel-control:enabled').tap();
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).kalistel.spent.length===1);
  assert.equal((await state()).kalistel.spent[0].side,1);
  await stage(1,true);
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).kalistel.spent.length===1);
  assert.equal((await state()).kalistel.spent[0].side,1,'AI uses its own charge');
  assert.ok(await page.locator('.dice-stage canvas').first().evaluate(canvas=>{
    const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
    const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);return ctx.getImageData(0,0,copy.width,copy.height).data.some((v,i)=>i%4===3&&v>0);
  }),'dice remain nonblank after a reroll');
  assert.deepEqual(errors,[]);console.log('PASS: image-only controls, five viewports, touch, local players, AI, preserved choices and charges.');
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{await browser?.close();});
