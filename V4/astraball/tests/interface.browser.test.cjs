const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright'));
const sharp=require(path.join(modules,'sharp'));
const ROOT=path.resolve(__dirname,'../../..'),OUT=process.env.KALISTAR_VERIFICATION_DIR||path.join(ROOT,'work/astraball/browser');
let url=process.env.KALISTAR_URL||'http://127.0.0.1:4330/jeu/astraball/';
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
  const atlasProof=require('../sources/sprites-v1/atlas-report.json');
  const {BALLS}=await import('../src/appearance.mjs');
  const {GOAL_ART}=await import('../src/goals.mjs');
  for(const goal of Object.values(GOAL_ART)){
    const file=process.env.KALISTAR_DIST?path.join(process.env.KALISTAR_DIST,'jeu/astraball',goal.url):path.resolve(__dirname,'..',goal.url);
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,512);assert.equal(info.height,768);
    let clear=0,solid=0;
    for(let i=3;i<data.length;i+=4){if(data[i]===0)clear++;if(data[i]>230)solid++;}
    assert.ok(clear>512*768*.65,'genuine transparent goal cutout');
    assert.ok(solid>512*768*.04,'visible goal object');
    const x=Math.round((goal.near[0]+goal.far[0])/2),y=Math.round((goal.farTop[1]+goal.far[1])/2);
    assert.equal(data[(y*512+x)*4+3],0,'open goal interior, no background or net');
    assert.equal(data[3],0);assert.ok(fs.statSync(file).size<130000);
  }
  for(const ball of BALLS){
    const file=process.env.KALISTAR_DIST?path.join(process.env.KALISTAR_DIST,'jeu/astraball',ball.url):path.resolve(__dirname,'..',ball.url);
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,256);assert.equal(info.height,256);
    assert.equal(data[3],0);assert.ok(data[(128*256+128)*4+3]>=230,'solid or translucent glass core');
    assert.ok(fs.statSync(file).size<40000,'ball texture budget '+ball.id);
  }
  for(const character of atlasProof.characters){
    const file=process.env.KALISTAR_DIST?path.join(process.env.KALISTAR_DIST,'jeu/astraball',character.file):path.resolve(__dirname,'..',character.file);
    const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
    assert.equal(info.width,384);assert.equal(info.height,384);
    let opaque=0;
    for(let y=0;y<384;y++)for(let x=0;x<384;x++){
      const alpha=data[(y*384+x)*4+3];assert.ok(alpha===0||alpha===255,'crisp alpha '+character.id);
      if(x%96<3||x%96>=93||y%96<3||y%96>=90)assert.equal(alpha,0,'transparent atlas gutters '+character.id);
      if(alpha)opaque++;
    }
    assert.ok(opaque>10000&&opaque<100000,'visible independent sprites '+character.id);
    const hashes=[];for(let i=4;i<12;i++)hashes.push(require('node:crypto').createHash('sha256').update(await sharp(file).extract({left:i%4*96,top:Math.floor(i/4)*96,width:96,height:96}).raw().toBuffer()).digest('hex'));
    assert.equal(new Set(hashes.slice(0,4)).size,4,'four distinct running frames '+character.id);
    assert.equal(new Set(hashes.slice(4)).size,4,'four distinct action frames '+character.id);
  }
  let server;
  if(process.env.KALISTAR_DIST){
    const dist=path.resolve(process.env.KALISTAR_DIST);
    const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2'};
    server=require('node:http').createServer((req,res)=>{
      try{
        const relative=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
        const file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        if(!file.startsWith(dist+path.sep))throw Error('Outside dist');
        res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; object-src 'none'; base-uri 'none'");
        res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
        res.end(fs.readFileSync(file));
      }catch{res.writeHead(404).end();}
    });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    url='http://127.0.0.1:'+server.address().port+'/jeu/astraball/';
  }
  const core=await import(pathToFileURL(path.resolve(__dirname,'../src/core/game.mjs')));
  const createPlaying=options=>{const state=core.createMatch(options);while(state.phase==='placement')assert.equal(core.applyCommand(state,{type:'ready',team:state.placement.team}).ok,true);return state;};
  async function confirmFormations(page){
    while(await page.evaluate(()=>window.Astraball.snapshot().phase==='placement')){
      await page.waitForFunction(()=>!window.Astraball.metrics().busy&&!window.Astraball.metrics().aiRunning);
      if(await page.evaluate(()=>window.Astraball.snapshot().phase!=='placement'))break;
      await page.locator('#formation-ready').click();
      await page.waitForFunction(()=>!window.Astraball.metrics().busy&&!window.Astraball.metrics().aiRunning);
    }
  }
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const reports=[];
  try{
    await require('./action-wheel-cases.cjs')({browser,url,OUT,core});
    await require('./locker-cases.cjs')({browser,url,OUT,sharp});
    for(const [name,width,height] of [['desktop',1440,900],['wide',1920,1080],['razr',412,915],['compact',360,800],['landscape',915,412]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:width<761,hasTouch:width<761});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(url);
      try{await page.waitForFunction(()=>window.Astraball?.ready,null,{timeout:20000});}
      catch(error){throw new Error(name+' boot failed: '+errors.join('\n'),{cause:error});}
      await page.getByRole('heading',{name:'Avant le coup d’envoi'}).waitFor();
      assert.equal(await page.locator('input[name="arena"]:checked').inputValue(),'kalistopolis-official');
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.arena),'kalistopolis-official');
      assert.equal(await page.locator('.ball-choice').count(),6);
      await page.locator('#locker-tab-ball').click();
      await page.locator('.ball-choice').filter({has:page.locator('input[value="orbital"]')}).click();
      assert.equal(await page.locator('input[name="ball"][value="orbital"]').isChecked(),true);
      assert.match(await page.locator('#ball-name').textContent(),/Noyau orbital/);
      await page.screenshot({path:path.join(OUT,name+'-vestiaire.png'),fullPage:true});
      await page.locator('#new-match').click();
      await page.waitForFunction(()=>!document.querySelector('#modal').open);
      assert.equal(await page.evaluate(()=>window.Astraball.snapshot().phase),'placement');
      await page.locator('#zoom-reset').click();
      const deployment=await page.evaluate(()=>window.Astraball.snapshot());
      const destination=core.legalPlacements(deployment,'t0-momo').find(c=>c.x===5&&c.y===3);assert.ok(destination);
      const spot=await page.evaluate(p=>window.Astraball.cell(p.x,p.y),destination),host=await page.locator('#canvas-host').boundingBox();
      if(width<761)await page.touchscreen.tap(host.x+spot.x,host.y+spot.y);else await page.mouse.click(host.x+spot.x,host.y+spot.y);
      await page.waitForFunction(()=>!window.Astraball.metrics().busy&&window.Astraball.snapshot().units.find(u=>u.id==='t0-momo').x===5);
      assert.equal(await page.evaluate(()=>window.Astraball.snapshot().ball.x),5);
      assert.equal(await page.locator('#actions').isVisible(),false);
      const placementSave=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),placementSave);
      await page.screenshot({path:path.join(OUT,name+'-placement.png'),fullPage:true});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false,'placement fits '+name);
      await confirmFormations(page);
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.ball),'orbital');
      assert.ok(await page.locator('svg.lucide').count()>=10,'Lucide icons are rendered');
      const initial=await page.evaluate(()=>window.Astraball.snapshot());
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().sprites.count),10);
      const moves=core.legalMoves(initial);assert.ok(moves.length);
      const selected=moves.find(p=>p.path.length===1)||moves[0];
      await page.locator('[data-mode="move"]').click();
      const pos=await page.evaluate(p=>window.Astraball.cell(p.x,p.y),selected),bounds=await page.locator('#canvas-host').boundingBox();
      await page.mouse.click(bounds.x+pos.x,bounds.y+pos.y);
      assert.deepEqual(await page.evaluate(()=>window.Astraball.snapshot()),initial,'move selection waits for confirmation');
      await page.locator('#confirm-action').click();
      await page.waitForFunction(()=>window.Astraball.snapshot().moved);
      await page.waitForFunction(()=>!window.Astraball.metrics().busy);
      assert.equal((await page.evaluate(()=>window.Astraball.snapshot())).activeId,initial.activeId);
      // Camera changes are purely visual, with no duplicated goal labels or game mutations.
      const cameraState=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
      await page.locator('#camera-toggle').click();
      assert.equal(await page.locator('#height-label').innerText(),'Cadrage vertical');
      assert.equal(await page.locator('#camera-height').isEnabled(),true);
      assert.equal(await page.locator('#camera-panel [data-view="horizontal"]').getAttribute('aria-pressed'),'true');
      assert.equal(await page.locator('#camera-panel [data-view="isometric"]').isDisabled(),true);
      assert.equal(await page.locator('#camera-panel [data-view="isometric"]').getAttribute('aria-pressed'),'false');
      for(const height of [0,100,60]){
        await page.locator('#camera-height').fill(String(height));await page.locator('#camera-height').dispatchEvent('input');
        assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.height),height);
        const scale=await page.evaluate(()=>window.Astraball.metrics().viewport.sceneScale);
        assert.equal(scale.x,scale.y,'pixel camera keeps the image proportions');
        await page.screenshot({path:path.join(OUT,name+'-height-'+height+'.png')});
      }
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().floorLabels),0);
      assert.deepEqual(await page.evaluate(()=>window.Astraball.metrics().goals.map(goal=>goal.team)),[0,1]);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),cameraState);
      await page.locator('#camera-toggle').click();
      // Classics retain both projections and the original plane-height control.
      await page.locator('#settings').click();await page.locator('#locker-tab-arena').click();
      await page.locator('.arena-choice').filter({has:page.locator('input[name="arena"][value="resonances"]')}).click();
      await page.locator('#apply-options').click();await page.waitForFunction(()=>!document.querySelector('#modal').open);
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.arena),'resonances');
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),cameraState);
      await page.locator('#camera-toggle').click();
      assert.equal(await page.locator('#height-label').innerText(),'Hauteur');
      assert.equal(await page.locator('#camera-panel [data-view="isometric"]').isEnabled(),true);
      for(const height of [0,100,60]){
        await page.locator('#camera-height').fill(String(height));await page.locator('#camera-height').dispatchEvent('input');
        assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.height),height);
        await page.screenshot({path:path.join(OUT,name+'-classic-height-'+height+'.png')});
      }
      await page.locator('#camera-panel [data-view="isometric"]').click();
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.view),'isometric');
      assert.equal(await page.locator('#camera-height').isDisabled(),true);
      await page.screenshot({path:path.join(OUT,name+'-isometric.png')});
      await page.locator('#camera-panel [data-view="horizontal"]').click();
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().appearance.view),'horizontal');
      assert.equal(await page.locator('#camera-height').isEnabled(),true);
      await page.locator('#camera-toggle').click();
      assert.equal(await page.evaluate(()=>window.Astraball.metrics().floorLabels),0);
      assert.deepEqual(await page.evaluate(()=>window.Astraball.metrics().goals.map(goal=>goal.team)),[0,1]);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),cameraState);
      await page.locator('#settings').click();await page.locator('#locker-tab-arena').click();
      await page.locator('.arena-choice').filter({has:page.locator('input[name="arena"][value="kalistopolis-official"]')}).click();
      await page.locator('#apply-options').click();await page.waitForFunction(()=>!document.querySelector('#modal').open);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),cameraState);
      const beforeReload=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),beforeReload);
      assert.deepEqual(await page.evaluate(()=>window.Astraball.metrics().appearance),{view:'horizontal',height:60,ball:'orbital',arena:'kalistopolis-official'});
      assert.equal(await page.locator('#modal').isVisible(),false,'resume does not reopen kickoff');
      const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth,y:document.documentElement.scrollHeight>innerHeight,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
      assert.equal(overflow.x,false,'horizontal overflow '+name);
      assert.equal(overflow.y,false,'vertical overflow '+name);
      await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
      const pixels=await page.locator('canvas').screenshot();const stats=await sharp(pixels).stats();assert.ok(stats.channels[0].stdev>20,'canvas must contain art');
      const n=await page.evaluate(()=>window.Astraball.metrics().renders);await page.waitForTimeout(800);const idle=await page.evaluate(()=>window.Astraball.metrics().renders);assert.ok(idle-n<=2,'render loop should stop when idle');
      await page.locator('#help').click();await page.locator('#modal').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});
      await page.locator('#settings').click();await page.locator('#match-mode').selectOption('hotseat');await page.locator('#new-match').click();
      await page.waitForFunction(()=>!document.querySelector('#modal').open);
      assert.equal(await page.evaluate(()=>window.Astraball.snapshot().mode),'hotseat');
      await confirmFormations(page);
      await page.locator('#wait').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
      assert.equal((await page.evaluate(()=>window.Astraball.snapshot())).units.filter(u=>u.acted).length,1);
      const clearShot=createPlaying({seed:1536,mode:'hotseat'});
      clearShot.units.filter(u=>['sentry','meneur'].includes(u.role)).forEach(u=>u.acted=true);
      clearShot.activeId='t0-kaylis';Object.assign(core.getUnit(clearShot,'t0-kaylis'),{x:8,y:0});
      clearShot.ball={holderId:'t0-kaylis',x:8,y:0};core.validateState(clearShot);
      await page.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),clearShot);
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      await page.locator('[data-mode="shoot"]').click();
      assert.equal(await page.locator('#target-options [data-target="2"]').isDisabled(),true,'out-of-range shot stays unavailable');
      await page.getByRole('button',{name:'Viser à gauche',exact:true}).click();
      assert.equal(await page.locator('#target-description').textContent(),'Tir assuré · 2 points');
      await page.screenshot({path:path.join(OUT,name+'-guaranteed-shot.png')});
      await page.locator('#confirm-action').click();
      await page.waitForFunction(()=>!window.Astraball.metrics().busy&&window.Astraball.snapshot().phase==='placement');
      const scored=await page.evaluate(()=>window.Astraball.snapshot());
      assert.deepEqual(scored.score,[2,0]);assert.equal(scored.rng,clearShot.rng);
      assert.ok(scored.log.some(e=>e.type==='shot'&&e.success&&e.chance===100));
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      assert.deepEqual(await page.evaluate(()=>window.Astraball.snapshot()),scored);
      reports.push({name,errors,overflow,canvasVariance:stats.channels[0].stdev,idleRenders:idle-n,guaranteedShot:true});assert.deepEqual(errors,[]);
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
    const fixture=createPlaying({seed:7,mode:'hotseat'});
    fixture.units.filter(u=>u.role==='sentry').forEach(u=>u.acted=true);fixture.activeId='t0-momo';
    Object.assign(core.getUnit(fixture,'t0-momo'),{x:4,y:3});Object.assign(core.getUnit(fixture,'t0-kaylis'),{x:8,y:3});Object.assign(core.getUnit(fixture,'t1-voloden'),{x:6,y:3});fixture.ball={holderId:'t0-momo',x:4,y:3};core.validateState(fixture);
    await page.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),fixture);await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
    await page.locator('[data-mode="pass"]').click();await page.locator('[data-target-id="t0-kaylis"]').click();
    assert.match(await page.locator('#target-description').textContent(),/Interception certaine/);
    await page.screenshot({path:path.join(OUT,'interception-preview.png')});await page.locator('#confirm-action').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
    assert.equal(await page.evaluate(()=>window.Astraball.snapshot().ball.holderId),'t1-voloden');
    reports.push({scenario:'visible interception agrees with engine',passed:true});await context.close();
    const looks=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),lookPage=await looks.newPage();
    await lookPage.goto(url);await lookPage.waitForFunction(()=>window.Astraball?.ready);
    await lookPage.locator('#locker-tab-arena').click();
    await lookPage.locator('.arena-choice').filter({has:lookPage.locator('input[name="arena"][value="resonances"]')}).click();
    for(const ball of BALLS){
      if(!await lookPage.locator('#modal').isVisible())await lookPage.locator('#settings').click();
      await lookPage.locator('#locker-tab-ball').click();
      await lookPage.locator('.ball-choice').filter({has:lookPage.locator('input[value="'+ball.id+'"]')}).click();
      await lookPage.locator('#match-mode').selectOption('hotseat');
      await lookPage.locator('#new-match').click();
      await lookPage.waitForFunction(()=>!document.querySelector('#modal').open);
      await confirmFormations(lookPage);
      assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().appearance.arena),'resonances');
      assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().appearance.ball),ball.id);
      assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().ballTexture),true);
      // Real pointer selection remains playable in either view at minimum and maximum depth.
      for(const view of ['horizontal','isometric']){
        await lookPage.locator('#camera-toggle').click();
        assert.equal(await lookPage.locator('#camera-panel [data-view="'+view+'"]').isEnabled(),true);
        await lookPage.locator('#camera-panel [data-view="'+view+'"]').click();
        assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().appearance.view),view);
        if(view==='horizontal'){await lookPage.locator('#camera-height').fill(ball.id==='founders'?'0':'100');await lookPage.locator('#camera-height').dispatchEvent('input');}
        await lookPage.locator('#camera-toggle').click();
        const sample=await lookPage.evaluate(()=>window.Astraball.snapshot()),move=core.legalMoves(sample).find(m=>m.path.length===1);
        await lookPage.locator('[data-mode="move"]').click();
        const point=await lookPage.evaluate(p=>window.Astraball.cell(p.x,p.y),move),bounds=await lookPage.locator('#canvas-host').boundingBox();
        await lookPage.mouse.click(bounds.x+point.x,bounds.y+point.y);await lookPage.locator('#confirm-action').click();await lookPage.waitForFunction(()=>window.Astraball.snapshot().moved&&!window.Astraball.metrics().busy);
        await lookPage.locator('#wait').click();await lookPage.waitForFunction(()=>!window.Astraball.metrics().busy);
      }
      await lookPage.reload();await lookPage.waitForFunction(()=>window.Astraball?.ready);
      assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().appearance.ball),ball.id);
      assert.equal(await lookPage.evaluate(()=>window.Astraball.metrics().appearance.view),'isometric');
    }
    reports.push({scenario:'six transparent ball styles, persistence, real moves in both views at low/high camera',passed:true});await looks.close();
    const animated=await browser.newContext({viewport:{width:1440,height:900}}),motion=await animated.newPage(),animationErrors=[];
    motion.on('pageerror',e=>animationErrors.push(e.message));
    await motion.goto(url);await motion.waitForFunction(()=>window.Astraball?.ready);await motion.locator('#new-match').click();
    await motion.waitForFunction(()=>!document.querySelector('#modal').open);
    await motion.waitForTimeout(2200);
    const resting=await motion.evaluate(()=>window.Astraball.metrics());await motion.waitForTimeout(800);
    const idleRenders=await motion.evaluate(()=>window.Astraball.metrics().renders)-resting.renders;
    assert.ok(idleRenders>=2&&idleRenders<=4,'placement idle continues at four frames/s after the former timeout');
    assert.ok(await motion.evaluate(()=>window.Astraball.metrics().sprites.frameChanges)>resting.sprites.frameChanges);
    await motion.locator('#help').click();
    const paused=await motion.evaluate(()=>window.Astraball.metrics().renders);await motion.waitForTimeout(800);
    assert.equal(await motion.evaluate(()=>window.Astraball.metrics().renders),paused,'dialog suspends idle');
    await motion.locator('#close-dialog').click();
    const resumed=await motion.evaluate(()=>window.Astraball.metrics().renders);await motion.waitForTimeout(800);
    assert.ok(await motion.evaluate(()=>window.Astraball.metrics().renders)>resumed,'idle resumes after closing dialog');
    await motion.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    const hidden=await motion.evaluate(()=>window.Astraball.metrics().renders);await motion.waitForTimeout(800);
    assert.equal(await motion.evaluate(()=>window.Astraball.metrics().renders),hidden,'hidden tab suspends idle');
    await motion.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await confirmFormations(motion);
    const running=await motion.evaluate(()=>window.Astraball.snapshot());
    const longMove=core.legalMoves(running).find(m=>m.path.length===4);assert.ok(longMove);
    await motion.locator('[data-mode="move"]').click();
    const movePoint=await motion.evaluate(p=>window.Astraball.cell(p.x,p.y),longMove),courtBounds=await motion.locator('#canvas-host').boundingBox();
    const moveRendersBefore=await motion.evaluate(()=>window.Astraball.metrics().renders);
    await motion.evaluate(()=>{window.__spriteFrames=[];window.__spriteTimes=[];let last=performance.now();const until=last+1800;const sample=now=>{if(window.Astraball.metrics().busy){window.__spriteFrames.push(window.Astraball.metrics().sprites.units.filter(u=>u.pose==='run'));window.__spriteTimes.push(now-last);}last=now;if(now<until)requestAnimationFrame(sample);};requestAnimationFrame(sample);});
    await motion.mouse.click(courtBounds.x+movePoint.x,courtBounds.y+movePoint.y);
    await motion.locator('#confirm-action').click();
    await motion.waitForFunction(()=>window.Astraball.metrics().sprites.units.some(u=>u.pose==='run'));
    await motion.screenshot({path:path.join(OUT,'running-sprites.png')});
    await motion.waitForFunction(()=>!window.Astraball.metrics().busy);
    const movement=await motion.evaluate(()=>({frames:window.__spriteFrames.flat(),times:window.__spriteTimes}));
    const moveRenders=await motion.evaluate(()=>window.Astraball.metrics().renders)-moveRendersBefore;
    assert.ok(moveRenders<=90,'movement render budget at high refresh rates');
    assert.equal(new Set(movement.frames.map(f=>f.frame)).size,4,'actual run clip advances all four poses');
    assert.ok(new Set(movement.frames.map(f=>Math.round(f.x))).size>10,'runner traverses the pitch');
    const sorted=movement.times.filter(t=>t>0).sort((a,b)=>a-b);
    const waiting=await motion.evaluate(()=>window.Astraball.metrics().renders);await motion.waitForTimeout(2200);
    assert.ok(await motion.evaluate(()=>window.Astraball.metrics().renders)>waiting+5,'idle loops during the action choice too');
    reports.push({scenario:'looping 4Hz idle, modal/visibility pause and real four-frame running',idleRendersPer800ms:idleRenders,uniqueFrames:4,moveRenders,browserRafP95Ms:sorted[Math.floor(sorted.length*.95)]});
    const goal=createPlaying({seed:1,mode:'hotseat'});goal.units.filter(u=>['sentry','meneur'].includes(u.role)).forEach(u=>u.acted=true);goal.activeId='t0-kaylis';goal.score=[4,0];Object.assign(core.getUnit(goal,'t0-kaylis'),{x:9,y:0});goal.ball={holderId:'t0-kaylis',x:9,y:0};core.validateState(goal);
    await motion.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),goal);await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    await motion.locator('[data-mode="shoot"]').click();await motion.getByRole('button',{name:'Viser à gauche',exact:true}).click();await motion.locator('#confirm-action').click();
    await motion.locator('#celebration').waitFor({state:'visible'});await motion.screenshot({path:path.join(OUT,'goal-animation.png')});
    const goalPoses=await motion.evaluate(()=>window.Astraball.metrics().sprites.poses);assert.ok(goalPoses.throw>0&&goalPoses.celebrate>=5);
    await motion.getByRole('heading',{name:'Fin de la rencontre'}).waitFor();assert.deepEqual(await motion.evaluate(()=>window.Astraball.snapshot().score),[6,0]);
    await motion.locator('#result-review').click();assert.equal(await motion.locator('#wait').isDisabled(),true);
    const rematch=structuredClone(goal);rematch.score=[0,0];
    await motion.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),rematch);await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    await motion.locator('[data-mode="shoot"]').click();await motion.getByRole('button',{name:'Viser à gauche',exact:true}).click();await motion.locator('#confirm-action').click();
    await motion.waitForFunction(()=>!window.Astraball.metrics().busy&&window.Astraball.snapshot().phase==='placement');
    const replacement=await motion.evaluate(()=>window.Astraball.snapshot());assert.equal(replacement.placement.team,1);
    await motion.screenshot({path:path.join(OUT,'goal-replacement.png')});
    await motion.locator('#formation-ready').click();await motion.waitForFunction(()=>!window.Astraball.metrics().busy);
    const partial=await motion.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
    await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    assert.equal(await motion.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),partial,'opponent ready persists');
    await confirmFormations(motion);
    const resumedGoal=await motion.evaluate(()=>window.Astraball.snapshot());
    assert.deepEqual(resumedGoal.units,replacement.units);assert.equal(resumedGoal.activeId,replacement.activeId);assert.deepEqual(resumedGoal.score,[2,0]);
    reports.push({scenario:'goal opens placement, hotseat confirmation persists and no spent turn returns',passed:true});
    const charge=structuredClone(fixture);charge.seed=1;charge.rng=1;Object.assign(core.getUnit(charge,'t1-voloden'),{x:5,y:3});core.validateState(charge);
    await motion.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),charge);await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    await motion.locator('[data-mode="charge"]').click();await motion.locator('#target-options button').filter({hasText:'Voloden'}).click();await motion.locator('#confirm-action').click();await motion.waitForFunction(()=>!window.Astraball.metrics().busy);
    const charged=await motion.evaluate(()=>window.Astraball.snapshot());assert.equal(core.getUnit(charged,'t1-voloden').penalty,3);assert.equal(core.getUnit(charged,'t1-voloden').x,6);
    const chargePoses=await motion.evaluate(()=>window.Astraball.metrics().sprites.poses);assert.ok(chargePoses.charge>0&&chargePoses.hit>0&&chargePoses.guard>0);
    assert.deepEqual(animationErrors,[]);reports.push({scenario:'animated two-point U, victory, charge and tempo',passed:true});await animated.close();
    const mobileMotion=await browser.newContext({viewport:{width:412,height:915},deviceScaleFactor:2,isMobile:true,hasTouch:true}),phone=await mobileMotion.newPage(),phoneErrors=[];
    phone.on('pageerror',e=>phoneErrors.push(e.message));await phone.goto(url);await phone.waitForFunction(()=>window.Astraball?.ready);await phone.locator('#new-match').click();
    await phone.waitForFunction(()=>!document.querySelector('#modal').open);
    await confirmFormations(phone);
    const phoneState=await phone.evaluate(()=>window.Astraball.snapshot()),phoneMove=core.legalMoves(phoneState).find(m=>m.path.length===1);
    await phone.locator('[data-mode="move"]').click();
    const phonePoint=await phone.evaluate(p=>window.Astraball.cell(p.x,p.y),phoneMove),phoneBounds=await phone.locator('#canvas-host').boundingBox();
    await phone.touchscreen.tap(phoneBounds.x+phonePoint.x,phoneBounds.y+phonePoint.y);
    await phone.locator('#confirm-action').click();
    await phone.waitForFunction(()=>window.Astraball.metrics().sprites.units.some(u=>u.pose==='run'));
    await phone.screenshot({path:path.join(OUT,'razr-running.png')});await phone.waitForFunction(()=>!window.Astraball.metrics().busy);
    assert.ok(await phone.evaluate(()=>window.Astraball.metrics().sprites.poses.run)>0);
    assert.equal(await phone.evaluate(()=>document.documentElement.scrollHeight>innerHeight),false);
    assert.deepEqual(phoneErrors,[]);reports.push({scenario:'Razr touch with normal sprite animation and 2x pixels',passed:true});await mobileMotion.close();
    const hosted=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
    await hosted.route('**/cloud-session.js*',route=>route.fulfill({contentType:'text/javascript',body:"window.KalistarCloudSession={required:()=>true,get:async()=>({check:async()=>({user:{id:'qa-user'},access:{localProfile:'qa-tokyo'}}),subscribe:()=>{}})};"}));
    const profileState=core.createMatch({seed:11,mode:'hotseat'});profileState.score=[2,1];
    await hosted.addInitScript(state=>{
      localStorage.setItem('kalistar.astraball.match.v1.qa-tokyo',JSON.stringify(state));
      localStorage.setItem('kalistar.astraball.match.v1.qa-paris','untouched');
    },profileState);
    const hostedPage=await hosted.newPage();await hostedPage.goto(url);await hostedPage.waitForFunction(()=>window.Astraball?.ready);
    assert.deepEqual(await hostedPage.evaluate(()=>window.Astraball.snapshot().score),[2,1]);
    assert.equal(await hostedPage.evaluate(()=>localStorage.getItem('kalistar.astraball.match.v1.qa-paris')),'untouched');
    reports.push({scenario:'existing auth guard and isolated per-profile local saves',passed:true});await hosted.close();
    fs.writeFileSync(path.join(OUT,'results.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
  }finally{await browser.close();if(server)await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
