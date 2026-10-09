'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__prematch_qa__.cjs'))('playwright');
const built=process.env.KALISTAR_BUILT_SITE==='1',dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||(built?'https://kalistar-qa.invalid/Kalistar':'http://127.0.0.1:4304');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../revisions/2026-10-09-pre-match/qa/browser');
const results=[],errors=[];
async function main(){
  fs.mkdirSync(out,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true});
  try{for(const [name,viewport,motion]of [['desktop',{width:1440,height:1000},'no-preference'],['razr',{width:412,height:1007},'no-preference'],['compact',{width:320,height:568},'reduce']]){
    const context=await browser.newContext({viewport,reducedMotion:motion,serviceWorkers:'block'});
    if(built)await context.route('**/*',async route=>{
      const u=new URL(route.request().url());if(u.origin!==new URL(base).origin||!u.pathname.startsWith('/Kalistar/'))return route.abort();
      let relative=decodeURIComponent(u.pathname.slice('/Kalistar/'.length));if(relative.endsWith('/'))relative+='index.html';
      const file=path.resolve(dist,relative);assert(file.startsWith(dist+path.sep)&&fs.existsSync(file),'Missing built resource '+relative);
      const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.webmanifest':'application/manifest+json'};
      return route.fulfill({path:file,contentType:mime[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(n,v){return v===undefined?open.call(this,n+'-prematch-465-qa'):open.call(this,n+'-prematch-465-qa',v);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(name+': '+e.message));
    await page.goto(base+'/jeu/?prematch-qa=465#decks');await page.waitForFunction(()=>window.KALISTAR_READY);
    const team=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E);
      const team=T.fromPreset({name:'Les capitaines QA',cards:KALISTAR_DATA.decks.player});
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));return team;
    });
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    const open=async()=>{await page.locator('[data-deck-action=play]').click();await page.locator('#new-game-dialog[open]').waitFor();};
    const settled=()=>page.waitForFunction(()=>document.querySelector('#new-game-form').getAttribute('aria-busy')!=='true'&&!document.querySelector('#new-game-form [type=submit]').disabled);
    await open();assert.equal(await page.locator('#match-player-preview .match-captain').getAttribute('data-captain'),team.captain);
    assert.equal(await page.locator('.match-lineup-card,.match-position-coverage,.match-arena-choice').count(),0);
    assert.equal(await page.locator('#match-arena option').count()>1,true);
    await page.locator('#game-mode').selectOption('local');assert.equal(await page.locator('#match-enemy-title').innerText(),'JOUEUR 2');
    await page.waitForFunction(()=>[...document.querySelectorAll('#new-game-dialog img')].every(i=>i.complete&&i.naturalWidth)&&[...document.querySelectorAll('.match-captain-art')].every(i=>!i.src.includes('#v4-art')));
    const layout=await page.locator('#new-game-dialog').evaluate(el=>({scroll:el.scrollWidth,client:el.clientWidth,rect:el.getBoundingClientRect().toJSON(),height:innerHeight}));
    assert.ok(layout.scroll<=layout.client+1);assert.ok(layout.rect.y>=0&&layout.rect.bottom<=layout.height+1);
    await page.screenshot({path:path.join(out,name+'-preparation.png'),scale:'css'});
    for(const level of ['relaxed','balanced','tactical']){
      await page.locator('#match-difficulty').selectOption(level);
      if(level==='relaxed')await page.locator('[data-action=match-random-opponent]').click();
      await settled();assert.equal(await page.locator('#enemy-deck-preset').inputValue(),'random');
      assert.ok(await page.locator('#match-enemy-preview .match-captain').getAttribute('data-captain'));
    }
    const originalArena=await page.locator('#match-arena').inputValue();
    const originalArenaImage=await page.locator('#match-arena-summary>img').getAttribute('src');
    await page.locator('[data-action=match-random-arena]').click();
    if(motion!=='reduce'){
      await page.waitForFunction(()=>document.querySelector('#new-game-form').getAttribute('aria-busy')==='true');
      await page.waitForTimeout(120);assert.equal(await page.locator('#match-arena-summary>img').getAttribute('src'),originalArenaImage,'shuffle does not download intermediate arena illustrations');
      assert.equal(await page.locator('#new-game-form [type=submit]').isDisabled(),true);
      await page.locator('#new-game-form').evaluate(form=>form.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));
      assert.equal(await page.evaluate(()=>!!localStorage.getItem('kalistar.v4.game')),false);
    }
    await settled();assert.notEqual(await page.locator('#match-arena').inputValue(),originalArena);
    await page.locator('#match-arena').selectOption(originalArena);await settled();
    if(motion!=='reduce'){
      await page.locator('[data-action=match-random-opponent]').click();await page.goBack();
      await page.waitForFunction(()=>!document.querySelector('#new-game-dialog').open);
      await page.waitForTimeout(1100);assert.equal(await page.locator('.is-shuffling').count(),0);
      assert.equal(await page.evaluate(()=>!!localStorage.getItem('kalistar.v4.game')),false);
      await open();await page.locator('#game-mode').selectOption('local');
    }
    await page.locator('#enemy-deck-preset').selectOption('enemy');await settled();
    await page.locator('[data-action=match-random-opponent]').click();await settled();
    const captain=await page.locator('#match-enemy-preview .match-captain').getAttribute('data-captain');
    const arenaId=await page.locator('#match-arena').inputValue();
    await page.waitForFunction(()=>[...document.querySelectorAll('#new-game-dialog img')].every(i=>i.complete&&i.naturalWidth)&&[...document.querySelectorAll('.match-captain-art')].every(i=>!i.src.includes('#v4-art')));
    await page.screenshot({path:path.join(out,name+'-random-ready.png'),scale:'css'});
    await page.locator('.match-advanced summary').click();await page.locator('#game-seed').fill('PREMATCH-SNAPSHOT');
    await page.locator('#new-game-form [type=submit]').click();await page.waitForFunction(()=>!!localStorage.getItem('kalistar.v4.game'));
    const match=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
    assert.equal(match.composition.teams[1].captain,captain);assert.equal(match.arenaId,arenaId);assert.equal(match.seed,'PREMATCH-SNAPSHOT');
    assert.equal(match.composition.teams[0].name,team.name);assert.deepEqual(match.composition.teams[0].formation,team.formation);
    assert.equal(match.players[1].reserve.length,5);assert.equal(match.composition.teams[1].cards.length,10);
    const valid=await page.evaluate(s=>KalistarEngine.createEngine(KALISTAR_DATA).validateComposition(s.composition.teams[1]),match);assert.deepEqual(valid,[]);
    await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
    const resumed=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
    assert.deepEqual(resumed.composition,match.composition);assert.equal(resumed.arenaId,arenaId);
    results.push({name,passed:true,captain,arenaId,checks:['captains only','all three cohesion levels','arena random/manual','busy launch blocked','Back cancels draw','exact preview snapshot','reload','viewport fit']});
    await context.close();
  }}finally{await browser.close();}
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,built,results,errors},null,2)+'\n');
  console.log('PASS compact pre-match on desktop, Razr and compact Reduced Motion.');
}
main().catch(e=>{console.error(e);process.exitCode=1;});
