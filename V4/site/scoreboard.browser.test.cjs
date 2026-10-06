'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__scoreboard_qa__.cjs'));
const built=process.env.KALISTAR_BUILT_SITE==='1',origin=built?'https://kalistar-score.invalid/Kalistar':process.env.KALISTAR_URL||'http://127.0.0.1:4304',url=origin+'/jeu/';
const dist=path.resolve(__dirname,'../deploy/dist');
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'verification/scoreboard-kalistar/local'));
async function geometry(page){
  return page.evaluate(()=>{
    const rect=n=>{const r=n.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};};
    const score=document.querySelector('.match-scoreboard'),rail=document.querySelector('.turn-timeline'),box=rect(score);
    const overlap=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>1&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1;
    return {box,rail:rail?rect(rail):null,inside:[...score.querySelectorAll('small,strong,img')].filter(n=>n.getBoundingClientRect().width).every(n=>{const r=rect(n),parent=rect(n.parentElement);return r.left>=parent.left-1&&r.right<=parent.right+1&&r.top>=parent.top-1&&r.bottom<=parent.bottom+1;}),
      score:[...score.querySelectorAll('strong')].map(n=>n.textContent),label:score.getAttribute('aria-label'),material:getComputedStyle(score).backgroundImage,font:getComputedStyle(score.querySelector('strong')).fontFamily,
      gem:score.querySelector('img').complete&&score.querySelector('img').naturalWidth>0,overflow:document.documentElement.scrollWidth>innerWidth+1,
      now:rail?.querySelector('.tt-now')?.textContent,announcement:rail?.querySelector('.tt-now')?.getAttribute('aria-label'),
      clashes:[...document.querySelectorAll('.mobile-duel-stats,[data-action=arena-menu]')].filter(n=>n.getBoundingClientRect().width).some(n=>overlap(box,rect(n))),
      animations:score.getAnimations({subtree:true}).length,title:rect(document.querySelector('.arena-toolbar>div:first-child')),toolbar:rect(document.querySelector('.arena-toolbar')),
      nodes:[...score.querySelectorAll('small,strong,img')].map(n=>({text:n.textContent,rect:rect(n),parent:rect(n.parentElement),font:getComputedStyle(n).font}))};
  });
}
async function restore(page,s){
  await page.evaluate(async s=>{await KALISTAR_DB.idle();await KALISTAR_DB.saveGame(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));},s);
  await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);await page.waitForSelector('.match-scoreboard');
  if(await page.locator('#match-dialog[open]').count())await page.locator('#match-dialog [data-action=close]').first().click();
  await page.waitForTimeout(200);
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  const errors=[],checks=[];
  try{
    const context=await browser.newContext({viewport:{width:1440,height:1000},serviceWorkers:'block'});
    if(built)await context.route(origin+'/**',route=>{
      const p=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,'');
      const file=path.resolve(dist,p.endsWith('/')?p+'index.html':p);
      if(!file.startsWith(dist+path.sep)||!fs.existsSync(file))return route.fulfill({status:404,body:p});
      const types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
      return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(()=>{const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-scoreboard-qa-only',version);};});
    const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url+'#arena');await page.waitForFunction(()=>window.KALISTAR_READY);
    const fixtures=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E),team=T.fromPreset({name:'Score QA',cards:KALISTAR_DATA.decks.player});
      const s=E.newGame(team,team,{seed:'SCOREBOARD-QA',mode:'local',turnOrder:'ABBA'});E.rollInitiative(s,[6,1]);
      const copy=()=>JSON.parse(JSON.stringify(s)),fixtures={zero:copy()};
      for(let steps=0;s.phase!=='over'&&steps<4000;steps++){
        if(s.phase==='choose')E.lock(s,...E.aiChoice(s));
        else if(s.phase==='attack')E.rollAttack(s);
        else if(s.phase==='kalistel')E.acceptAttack(s);
        else if(s.phase==='defense')E.rollDefense(s);
        else if(s.phase==='result')E.next(s);
        else if(s.phase==='replace')E.autoDeploy(s,s.replacing);
        else {const kind={clover:'Clover',potion:'Potion',physical:'Physical',heart:'Reraise',guard:'Guard'}[s.phase];E['grant'+kind](s,E['ai'+kind+'Choice'](s));}
        E.assertState(s);
        if(!fixtures.kill&&s.phase==='result'&&s.players.some(p=>p.dead.length))fixtures.kill=copy();
        if(s.phase==='over')fixtures.over=copy();
      }
      if(!fixtures.kill||!fixtures.over)throw Error('Incomplete real-combat scoreboard fixtures');return fixtures;
    });
    for(const [name,s]of Object.entries(fixtures)){
      await restore(page,s);const result=await geometry(page);
      assert.deepEqual(result.score,[String(s.players[1].dead.length),String(s.players[0].dead.length)]);
      assert.match(result.label,/Joueur 1/);assert(!result.now?.includes('Maintenant'));
      if(name==='zero')assert.match(result.announcement,/Round 1, tour 1, joueur 1, attaque/);
      checks.push({name,...result});
    }
    assert(fixtures.over.players.some(p=>p.dead.length===10),'real double-digit final score');
    const ai=structuredClone(fixtures.kill);ai.mode='ai';await restore(page,ai);
    assert.match(await page.locator('.match-scoreboard').getAttribute('aria-label'),/Le Veilleur/);
    for(const [width,height]of [[1920,1080],[1440,1000],[1024,768],[412,1007],[390,844],[320,568],[699,900],[844,390]]){
      await page.setViewportSize({width,height});await page.waitForTimeout(250);const result=await geometry(page);
      await page.screenshot({path:path.join(output,'arena-'+width+'.png')});
      if(!result.inside)console.log(JSON.stringify(result,null,2));
      assert(result.inside,'score labels, numerals and crystal fit at '+width);assert(!result.overflow,'page width at '+width);
      assert(result.gem);assert(result.material.includes('collection-reader-grimoire-v1.png'));assert(result.font.includes('Cinzel'));
      assert(!result.clashes,'score avoids duel stats and options at '+width);assert.equal(result.animations,0);
      assert(result.box.left>=0&&result.box.right<=width+1,'score fits viewport at '+width);
      if(width===1024){assert(result.title.width>=220,'arena title keeps its space');assert(result.toolbar.height<=180,'no tall toolbar from compressed title');}
      if(width<700||width<=950&&height<=500){assert(result.box.top>=result.rail.bottom);assert.equal(result.box.width,110);}
      checks.push({width,height,...result});
      if(width===1440)await page.locator('.match-scoreboard').screenshot({path:path.join(output,'desktop-scoreboard.png')});
      if(width===412)await page.screenshot({path:path.join(output,'phone-header.png'),clip:{x:0,y:0,width:412,height:150}});
    }
    for(const [width,height]of [[412,1007],[320,568]]){
      await page.setViewportSize({width,height});await restore(page,fixtures.over);const result=await geometry(page);
      assert(result.inside&&!result.clashes);assert(result.score.includes('10'));checks.push({name:'final-phone',width,height,...result});
      await page.screenshot({path:path.join(output,'final-'+width+'.png')});
    }
    await page.emulateMedia({reducedMotion:'reduce'});await restore(page,ai);assert.equal((await geometry(page)).animations,0);
    await page.setViewportSize({width:1024,height:768});await page.locator('[data-action=fullscreen]').click();
    await page.waitForFunction(()=>document.fullscreenElement===document.documentElement);await page.waitForTimeout(200);
    const immersive=await geometry(page);assert(immersive.inside&&!immersive.clashes);checks.push({name:'fullscreen',...immersive});
    await page.screenshot({path:path.join(output,'fullscreen-scoreboard.png')});
    await page.evaluate(()=>document.exitFullscreen());await page.waitForFunction(()=>!document.fullscreenElement);
    await page.setViewportSize({width:1440,height:1000});await page.goto(url+'?phone=razr50#arena');
    const frame=page.frameLocator('#phone-preview-frame');await frame.locator('.match-scoreboard').waitFor();
    assert.equal(await frame.locator('.match-scoreboard').evaluate(n=>n.getBoundingClientRect().width),110);
    assert.deepEqual(await frame.locator('[data-kills]').allTextContents(),[String(ai.players[1].dead.length),String(ai.players[0].dead.length)]);
    await page.screenshot({path:path.join(output,'razr50-preview.png')});
    assert.deepEqual(errors,[]);fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2)+'\n');
    console.log('PASS: real 0/kill/10 scores, reload, AI opponent, eight layouts, no overlaps, accessible timeline, Reduced Motion and Razr 50.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
