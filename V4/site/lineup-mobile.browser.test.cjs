'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'__lineup_mobile_qa__.cjs'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../revisions/2026-10-10-mobile-lineup/qa');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const online=process.env.KALISTAR_URL;
const url=online||'https://kalistar-qa.invalid/Kalistar/jeu/';
const scenario=process.env.KALISTAR_LINEUP_SCENARIO||'normal';
const readGame=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try{
    const context=await browser.newContext({viewport:{width:scenario==='reduced'?320:412,height:1007},isMobile:true,hasTouch:true,deviceScaleFactor:2.625,serviceWorkers:'block',reducedMotion:scenario==='reduced'?'reduce':'no-preference',userAgent:'Mozilla/5.0 (Linux; Android 14; motorola razr 50) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36'});
    if(!online)await context.route('https://kalistar-qa.invalid/**',route=>{
      const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),candidate=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
      assert(candidate.startsWith(dist+path.sep));
      const file=relative==='jeu/lineup-intro.js'&&process.env.KALISTAR_LINEUP_SOURCE?path.resolve(process.env.KALISTAR_LINEUP_SOURCE):candidate;
      if(!fs.existsSync(file))return route.fulfill({status:404,body:'QA missing asset '+relative});
      return route.fulfill({body:fs.readFileSync(file),contentType:{'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'}[path.extname(file)]||'application/octet-stream'});
    });
    await context.addInitScript(scenario=>{
      const open=IDBFactory.prototype.open;IDBFactory.prototype.open=function(name,version){return open.call(this,name+'-mobile-lineup-qa-only',version);};
      const media=window.matchMedia.bind(window);
      window.matchMedia=query=>query.includes('display-mode: standalone')?{...media(query),matches:true}:media(query);
      window.lineupSteps=[];window.lineupFaults=0;
      document.addEventListener('kalistar:lineup-step',event=>window.lineupSteps.push({...event.detail,time:performance.now()}));
      const animate=Element.prototype.animate;
      Element.prototype.animate=function(...args){
        if(this.closest('.lineup-intro')){
          if(scenario==='unavailable-animation'||scenario==='rejected-clue'&&this.matches('.li-clue-symbol')&&!lineupFaults){lineupFaults++;throw new DOMException('QA: mobile compositor rejected animation','NotSupportedError');}
          const animation=animate.apply(this,args);
          if(scenario==='cancelled-flight'&&this.matches('.li-flight')&&!lineupFaults){lineupFaults++;setTimeout(()=>animation.cancel(),80);}
          return animation;
        }
        return animate.apply(this,args);
      };
    },scenario);
    const page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.stack));
    page.on('console',m=>{if(m.type()==='error'){errors.push(m.text());console.error(m.text());}});
    page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
    await page.goto(url+'#decks');await page.waitForSelector('.team-page');
    await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),T=KalistarTeamComposition.create(E);
      const team=T.normalize({name:'Mobile lineup QA',cards:KALISTAR_DATA.decks.player});
      team.captain=team.formation[2];
      if(E.validateComposition(team).length)throw Error(E.validateComposition(team).join(' '));
      localStorage.setItem('kalistar.v4.teamDraft',JSON.stringify(team));
    });
    await page.reload();await page.waitForSelector('.team-page');
    await page.locator('[data-deck-action=play]').tap();
    await page.locator('#game-mode').selectOption('local');
    await page.locator('#new-game-form [type=submit]').tap();
    await page.waitForSelector('.lineup-intro');
    const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
    try{
      await page.waitForFunction(()=>document.querySelector('.lineup-intro')?.dataset.step==='weapon',null,{timeout:8000});
      if(scenario==='rotation'){
        await page.setViewportSize({width:412,height:900});await page.waitForTimeout(80);
        await page.setViewportSize({width:844,height:390});await page.waitForTimeout(80);
        await page.setViewportSize({width:412,height:1007});
      }
      const shot=name=>page.screenshot({path:path.join(output,name+'.jpg'),type:'jpeg',quality:82});
      await shot('razr-p1-weapon');
      await page.waitForFunction(()=>document.querySelector('.lineup-intro')?.dataset.position==='5'&&document.querySelector('.lineup-intro')?.dataset.step==='reveal',null,{timeout:35000});
      const faces=await page.locator('.li-rotor').evaluateAll(nodes=>nodes.map(node=>getComputedStyle(node).transform));
      assert(faces.every(transform=>scenario==='reduced'?transform==='none':transform.startsWith('matrix3d(-1')||transform.startsWith('matrix(-1')),'static fallback still shows the card front');
      assert(await page.locator('.li-flight').evaluateAll(nodes=>nodes.every(node=>{const r=node.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+.1&&r.top>=50&&r.bottom<innerHeight;})));
      await shot('razr-p5-reveal');
      await page.waitForFunction(()=>document.querySelector('.lineup-intro')?.dataset.step==='tipoff',null,{timeout:8000});
      await shot('razr-tipoff');
      await page.waitForSelector('.lineup-intro',{state:'detached',timeout:15000});
      const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
      assert.equal(after.phase,'choose');assert.equal(after.match.events.length,0);
      for(const key of ['players','equipment','composition','collection','rng','kalistel','matchId'])assert.deepEqual(after[key],before[key],'presentation preserves '+key);
      const steps=await page.evaluate(()=>lineupSteps);
      for(let p=1;p<=5;p++){
        const entries=steps.filter(s=>s.position===p&&s.step!=='loading');
        assert.deepEqual(entries.map(s=>s.step),['title','depart','weapon','crystal','faction','suspense','flip','reveal','arrive']);
        const beat=step=>entries.find(s=>s.step===step).time;
        assert(beat('arrive')-beat('reveal')>=1100,'card reading time is unchanged');
        assert(beat('flip')-beat('suspense')>=350,'identity suspense is preserved');
        assert(beat('weapon')-beat('depart')>=(scenario==='reduced'?0:350),'flight retains its deadline');
      }
      if(['rejected-clue','unavailable-animation','cancelled-flight'].includes(scenario))assert(await page.evaluate(()=>lineupFaults)>0,'fault injection actually ran');
      assert.equal(await page.locator('.lineup-intro,.lineup-unrevealed,.lineup-underlay,.game-shell[inert],.masthead[inert]').count(),0);
      assert.equal(await page.locator('.formation .slot-card:visible').count(),10);
      // An explicit touch on Passer still dismisses immediately, without delayed callbacks.
      await page.locator('[data-action=arena-menu]').tap();await page.locator('#mobile-dialog [data-view=decks]').tap();
      await page.locator('[data-deck-action=play]').tap();
      page.once('dialog',d=>d.accept());await page.locator('#new-game-form [type=submit]').tap();
      await page.waitForSelector('.lineup-intro');await page.locator('.li-skip').tap();await page.waitForTimeout(1000);
      assert.equal(await page.locator('.lineup-intro,.lineup-unrevealed,.lineup-underlay,.game-shell[inert]').count(),0);
      assert.equal((await readGame(page)).phase,'choose');
      assert.deepEqual(errors,[]);results.push({profile:'Android Razr touch, standalone',scenario,steps,passed:true});
    }finally{
      fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({results,errors,steps:await page.evaluate(()=>lineupSteps)},null,2)+'\n');
    }
    console.log(JSON.stringify({passed:true,checks:results.length,errors}));
  }finally{await browser.close();}
}
if(process.argv.includes('--all')){
  const {execFileSync}=require('node:child_process'),checks=[];
  for(const scenario of ['normal','rejected-clue','unavailable-animation','cancelled-flight','rotation','reduced']){
    execFileSync(process.execPath,[__filename],{stdio:'inherit',env:{...process.env,KALISTAR_LINEUP_SCENARIO:scenario,KALISTAR_VERIFICATION_DIR:path.join(output,scenario)}});checks.push(scenario);
  }
  fs.writeFileSync(path.join(output,'summary.json'),JSON.stringify({passed:true,checks},null,2)+'\n');
}else main().catch(e=>{console.error(e);process.exitCode=1;});
