'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__ai_qa__.cjs'))('playwright');
const dist=path.resolve(__dirname,'../deploy/dist'),base='https://kalistar-qa.invalid/Kalistar';
const out=path.resolve(__dirname,'../revisions/2026-10-13-ai-opponents/browser');
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  const results=[],errors=[];
  try{for(const [name,viewport,motion] of [['desktop',{width:1440,height:1000},'no-preference'],['razr',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    await context.route('**/*',route=>{
      const url=new URL(route.request().url());if(url.origin!==new URL(base).origin)return route.abort();
      const relative=decodeURIComponent(url.pathname.slice('/Kalistar/'.length))+(url.pathname.endsWith('/')?'index.html':'');
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing '+relative);
      return route.fulfill({path:file,contentType:({'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.svg':'image/svg+xml'})[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-ai-qa'):open.call(this,n+'-ai-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/#decks');await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.evaluate(()=>{const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E);localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(T.fromPreset({name:'Equipe QA',cards:KALISTAR_DATA.decks.player})));});
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    await page.locator('[data-deck-action=play]').click();
    assert.equal(await page.locator('#match-ai-profile option').count(),5);
    const unchanged=async()=>({enemy:await page.locator('#enemy-deck-preset').inputValue(),captain:await page.locator('#match-enemy-preview .match-captain').getAttribute('data-captain'),arena:await page.locator('#match-arena').inputValue(),difficulty:await page.locator('#match-difficulty').inputValue(),seed:await page.locator('#game-seed').inputValue()});
    const original=await unchanged();
    for(const id of ['kael','maelis','nox','lyra','soren']){
      await page.locator('#match-ai-profile').selectOption(id);assert.deepEqual(await unchanged(),original);
      assert(await page.locator('#match-ai-summary strong').innerText());
    }
    await page.locator('#game-mode').selectOption('local');assert.equal(await page.locator('#match-ai-controls').isVisible(),false);assert.equal(await page.locator('#match-ai-profile').isDisabled(),true);
    await page.locator('#game-mode').selectOption('ai');await page.locator('#match-ai-profile').selectOption('lyra');
    await page.locator('[data-action=match-random-opponent]').click();
    await page.waitForFunction(()=>document.querySelector('#new-game-form').getAttribute('aria-busy')!=='true');
    assert.equal(await page.locator('#match-ai-profile').inputValue(),'lyra');
    await page.locator('#enemy-deck-preset').selectOption('enemy');
    await page.waitForFunction(()=>[...document.querySelectorAll('#new-game-dialog img')].every(i=>i.complete&&i.naturalWidth));
    const layout=await page.locator('#new-game-dialog').evaluate(el=>({client:el.clientWidth,scroll:el.scrollWidth,rect:el.getBoundingClientRect().toJSON(),height:innerHeight}));
    assert(layout.scroll<=layout.client+1);assert(layout.rect.top>=0&&layout.rect.bottom<=layout.height+1);
    await page.locator('#match-ai-profile').scrollIntoViewIfNeeded();await page.screenshot({path:path.join(out,name+'-opponents.png'),scale:'css'});
    await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('AI-PROFILE-QA-2');
    await page.locator('#new-game-form [type=submit]').click();await page.waitForFunction(()=>!!localStorage.getItem('kalistar.v4.game'));
    const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
    assert.deepEqual(saved.ai,{version:1,profiles:[null,'lyra']});
    await page.evaluate(()=>{localStorage.setItem('kalistar.v4.aiProfile','"nox"');});
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).ai),saved.ai);
    await page.locator('.li-skip').click();
    await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).phase!=='choose'&&JSON.parse(localStorage.getItem('kalistar.v4.game')).phase!=='initiative',{},{timeout:30000});
    assert((await page.locator('.arena-toolbar').innerText()).includes('Lyra'));
    await page.evaluate(()=>{location.hash='decks';});
    await page.waitForFunction(()=>!document.querySelector('.lineup-intro')&&location.hash==='#decks');
    const inspection=await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),saved=JSON.parse(localStorage.getItem('kalistar.v4.game'));
      const s=E.newGame(...saved.composition.teams,{mode:'ai',seed:saved.seed,turnOrder:'ABBA',aiProfile:'lyra'});
      while(s.phase==='initiative')E.rollInitiative(s);
      s.ai.profiles=[s.ai.profiles[1],s.ai.profiles[1]];
      let frames=0,run=true;const tick=()=>{if(run){frames++;requestAnimationFrame(tick);}};requestAnimationFrame(tick);
      const start=performance.now(),before=JSON.stringify(s),pair=await E.aiChoiceAsync(s);run=false;
      return {pair,ms:performance.now()-start,frames,immutable:JSON.stringify(s)===before,name:KalistarAI.name(s)};
    });
    assert(inspection.immutable);assert.equal(inspection.name,'Lyra');assert(inspection.frames>=2,'UI paints during reasoning');
    results.push({name,layout,inspection,passed:true});await context.close();
  }}finally{await browser.close();}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors},null,2)+'\n');
  console.log(JSON.stringify(results,null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;});
