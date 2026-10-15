const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {chromium}=require('C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification/challenge');
const read=n=>JSON.parse(fs.readFileSync(path.join(root,'donnees',n+'.json')));
const data={cards:read('cartes'),rules:read('regles'),demo:read('regles_demo'),elements:read('elements'),weapons:read('armes')},E=require('../site/engine.js').createEngine(data),decks=read('decks_demo');
const url='file:///'+root.replace(/\\/g,'/')+'/site/index.html#arena';
const dodge=process.argv.includes('--dodge'),prefix=dodge?'dodge':'reanimation';
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'});
 const page=await browser.newPage({viewport:{width:1920,height:1080},reducedMotion:'no-preference'}),events=[];page.on('pageerror',e=>events.push(e.message));
 try{
  const s=E.newGame(decks.player,decks.enemy,{mode:'local',seed:'LIFE-QA'});E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.lock(s,0,dodge?3:0);E.rollAttack(s,6);s.players[1].board[0].reraise=dodge?0:1;s.rng=1;
  await page.goto(url);await page.evaluate(s=>localStorage.setItem('kalistar.v2.game',JSON.stringify(s)),s);await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.waitForTimeout(550);
  await page.evaluate(()=>{
   window.lifeSamples=[];const start=performance.now();const tick=()=>{
    const field=document.querySelector('.battlefield'),target=document.querySelector('.combat-target .slot-card');
    lifeSamples.push({ms:Math.round(performance.now()-start),stage:field?.dataset.reanimation,reaction:field?.dataset.reaction,afterimages:document.querySelectorAll('.combat-afterimage').length,phase:JSON.parse(localStorage.getItem('kalistar.v2.game')).phase,opacity:target?getComputedStyle(target).opacity:null,toast:document.querySelector('#toast').textContent});
    if(performance.now()-start<5000)requestAnimationFrame(tick);
   };tick();
  });
  await page.locator('[data-action="roll"]').click();
  await page.waitForFunction(dodge=>lifeSamples.some(s=>dodge?s.afterimages===2:s.stage==='reviving'),dodge,{timeout:10000});
  await page.waitForTimeout(dodge?90:350);await page.screenshot({path:path.join(out,prefix+'-dedicated.png'),fullPage:true});
  await page.waitForFunction(()=>!document.querySelector('#app').classList.contains('rolling'));
  const after=E.clone(s);E.rollDefense(after);assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game'))),after);
  assert(await page.evaluate(dodge=>dodge?lifeSamples.some(s=>s.afterimages===2):lifeSamples.some(s=>s.stage==='fading')&&lifeSamples.some(s=>s.stage==='reviving'),dodge));console.log(prefix+' verified');
 }finally{
  fs.writeFileSync(path.join(out,prefix+'-samples.json'),JSON.stringify({events,samples:await page.evaluate(()=>window.lifeSamples||[]),state:await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v2.game')))},null,2));
  await page.screenshot({path:path.join(out,prefix+'-final.png'),fullPage:true});await browser.close();
 }
})().catch(e=>{console.error(e);process.exit(1)});
