'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright'));
const DIST=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../../deploy/dist'));
const OUT=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../../work/astraball/placement-ai'));
const KEY='kalistar.astraball.match.v1';
const formation=(state,team)=>state.units.filter(u=>u.team===team).map(({id,x,y})=>({id,x,y}));
async function main(){
  const core=await import('../src/core/game.mjs'),{chooseTurn}=await import('../src/core/ai.mjs');
  const {createRoster}=await import('../src/roster.mjs');
  const roster=createRoster(JSON.parse(fs.readFileSync(path.join(DIST,'jeu/astraball/data/sprite-library.json'))));
  const apply=(state,cmd)=>{const result=core.applyCommand(state,cmd);assert.equal(result.ok,true,JSON.stringify(cmd));core.validateState(state);return result;};
  const server=http.createServer((req,res)=>{
    try{
      const pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
      if(pathname==='/favicon.ico'){res.writeHead(204).end();return;}
      const file=path.resolve(DIST,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
      if(!file.startsWith(DIST+path.sep))throw Error('Outside dist');
      res.setHeader('Content-Type',({'.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'})[path.extname(file)]||'application/octet-stream');
      res.end(fs.readFileSync(file));
    }catch{res.writeHead(404).end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const url='http://127.0.0.1:'+server.address().port+'/jeu/astraball/';
  let browser;const reports=[];
  try{
    fs.mkdirSync(OUT,{recursive:true});
    browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
    for(const [name,width,height] of [['desktop',1440,900],['razr',412,915],['compact',360,800]]){
      const variants=new Set();
      for(const seed of [1,37]){
        const initial=core.createMatch({seed,mode:'solo'}),expected=structuredClone(initial);
        apply(expected,{type:'ready',team:0});for(const cmd of chooseTurn(expected))apply(expected,cmd);
        const context=await browser.newContext({viewport:{width,height},isMobile:width<761,hasTouch:width<761,reducedMotion:'reduce'});
        await context.addInitScript(({key,state})=>{if(!localStorage.getItem(key))localStorage.setItem(key,JSON.stringify(state));},{key:KEY,state:initial});
        const page=await context.newPage(),errors=[];
        page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
        page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
        await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
        assert.equal(await page.locator('#modal').isVisible(),false);
        await page.locator('#formation-ready').click();
        await page.waitForFunction(()=>window.Astraball.snapshot().phase==='play'&&!window.Astraball.metrics().aiRunning&&!window.Astraball.metrics().busy);
        const opening=await page.evaluate(()=>window.Astraball.snapshot());
        assert.deepEqual(opening,expected,'actual solo setup executes the engine plan');
        assert.notDeepEqual(formation(opening,1),formation(initial,1));assert.deepEqual(formation(opening,0),formation(initial,0));
        variants.add(JSON.stringify(formation(opening,1)));
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth||document.documentElement.scrollHeight>innerHeight),false);
        await page.screenshot({path:path.join(OUT,name+'-opening-'+seed+'.png'),fullPage:true});

        // An actual UI shot opens the next setup with the AI receiving the ball.
        const goal=structuredClone(opening),scorer=goal.units.find(u=>u.team===0&&u.role==='scoreur');
        for(const entry of core.getInitiative(goal)){if(entry.id===scorer.id)break;core.getUnit(goal,entry.id).acted=true;}
        const y=[2,3,4].find(row=>!goal.units.some(u=>u.id!==scorer.id&&u.x===11&&u.y===row));
        Object.assign(scorer,{x:11,y});goal.activeId=scorer.id;goal.moved=false;goal.ball={holderId:scorer.id,x:11,y};core.validateState(goal);
        const afterGoal=structuredClone(goal),result=apply(afterGoal,{type:'shoot',x:12,y});
        assert.ok(result.events.some(e=>e.type==='goal'),'fixture shot succeeds');
        const next=structuredClone(afterGoal),plan=chooseTurn(next);for(const cmd of plan)apply(next,cmd);
        await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:goal});
        await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
        await page.locator('[data-mode="shoot"]').click();await page.locator('[data-goal-y="'+y+'"]').click();await page.locator('#confirm-action').click();
        await page.waitForFunction(()=>window.Astraball.snapshot().placement?.team===0&&!window.Astraball.metrics().aiRunning&&!window.Astraball.metrics().busy);
        assert.deepEqual(await page.evaluate(()=>window.Astraball.snapshot()),next,'goal replacement preserves turns and penalties');
        assert.notDeepEqual(formation(next,1),formation(opening,1));
        await page.screenshot({path:path.join(OUT,name+'-replacement-'+seed+'.png'),fullPage:true});
        await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
        assert.deepEqual(await page.evaluate(()=>window.Astraball.snapshot()),next,'human confirmation pending survives reload');

        const interrupted=structuredClone(afterGoal);for(const cmd of plan.slice(0,2))apply(interrupted,cmd);
        await page.evaluate(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:KEY,state:interrupted});
        await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
        await page.waitForFunction(()=>window.Astraball.snapshot().placement?.team===0&&!window.Astraball.metrics().aiRunning&&!window.Astraball.metrics().busy);
        const resumed=await page.evaluate(()=>window.Astraball.snapshot());
        assert.deepEqual(resumed.units,next.units);assert.deepEqual(resumed.ball,next.ball);assert.equal(resumed.rng,next.rng);
        if(seed===1){
          await page.locator('#settings').click();await page.locator('#locker-tab-teams').click();
          for(const [id,cm] of [['lanio',182],['gen',159],['vivi-ff9',120]]){
            const c=roster.entries.find(c=>c.characterId===id);
            await page.locator('[data-position="'+c.athlete.primary+'"]').click();
            await page.locator('#character-search').fill(c.name);
            await page.locator('[data-character="'+c.id+'"]').click();
            assert.match(await page.locator('.athlete-measures').innerText(),new RegExp(cm+' cm'));
            if(id==='vivi-ff9')assert.match(await page.locator('.athlete-sources').innerText(),/Taille d.adaptation Kalistar/);
            await page.screenshot({path:path.join(OUT,name+'-height-'+id+'.png'),fullPage:true});
          }
          await page.locator('#match-mode').selectOption('hotseat');await page.locator('#new-match').click();
          await page.waitForFunction(()=>!document.querySelector('#modal').open&&!window.Astraball.metrics().busy);
          const sized=await page.evaluate(()=>({state:window.Astraball.snapshot(),sprites:window.Astraball.metrics().sprites.units}));
          const height=id=>sized.sprites.find(s=>s.id===sized.state.units.find(u=>u.team===0&&u.athlete.id===id).id).sizing;
          assert.equal(height('lanio').height.cm,182);assert.equal(height('gen').height.cm,159);
          assert.ok(height('lanio').standingHeight>height('gen').standingHeight);
          assert.equal(height('vivi-ff9').height.cm,120);
          await page.screenshot({path:path.join(OUT,name+'-height-court.png'),fullPage:true});
        }
        assert.deepEqual(errors,[]);reports.push({name,seed,opening:formation(opening,1),replacement:formation(next,1),partialResume:true,errors});
        await context.close();
      }
      assert.equal(variants.size,2,'different matches do not repeat the same opening');
    }
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(reports,null,2)+'\n');
    console.log('PASS solo AI placements and heights: desktop/Razr/compact, varied openings, real goals, partial save reload, Lanio/Gen/Vivi, no errors.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
