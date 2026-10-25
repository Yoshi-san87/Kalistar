const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const modules=process.env.KALISTAR_NODE_MODULES||'C:/Users/guill/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const {chromium}=require(path.join(modules,'playwright'));
const sharp=require(path.join(modules,'sharp'));
const ROOT=path.resolve(__dirname,'../../..'),OUT=process.env.KALISTAR_VERIFICATION_DIR||path.join(ROOT,'work/astraball/browser');
let url=process.env.KALISTAR_URL||'http://127.0.0.1:4330/jeu/astraball/';
async function main(){
  fs.mkdirSync(OUT,{recursive:true});
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
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--ignore-gpu-blocklist']});
  const reports=[];
  try{
    for(const [name,width,height] of [['desktop',1440,900],['wide',1920,1080],['razr',412,915],['compact',360,800],['landscape',915,412]]){
      const context=await browser.newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce',isMobile:width<761,hasTouch:width<761});
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(url);
      try{await page.waitForFunction(()=>window.Astraball?.ready,null,{timeout:20000});}
      catch(error){throw new Error(name+' boot failed: '+errors.join('\n'),{cause:error});}
      assert.ok(await page.locator('svg.lucide').count()>=10,'Lucide icons are rendered');
      const initial=await page.evaluate(()=>window.Astraball.snapshot());
      const moves=core.legalMoves(initial);assert.ok(moves.length);
      const selected=moves.find(p=>p.path.length===1)||moves[0];
      const pos=await page.evaluate(p=>window.Astraball.cell(p.x,p.y),selected),bounds=await page.locator('#canvas-host').boundingBox();
      await page.mouse.click(bounds.x+pos.x,bounds.y+pos.y);
      await page.waitForFunction(()=>window.Astraball.snapshot().moved);
      await page.waitForFunction(()=>!window.Astraball.metrics().busy);
      assert.equal((await page.evaluate(()=>window.Astraball.snapshot())).activeId,initial.activeId);
      const beforeReload=await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot()));
      await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
      assert.equal(await page.evaluate(()=>JSON.stringify(window.Astraball.snapshot())),beforeReload);
      const overflow=await page.evaluate(()=>({x:document.documentElement.scrollWidth>innerWidth,y:document.documentElement.scrollHeight>innerHeight,canvas:document.querySelector('canvas').getBoundingClientRect().toJSON()}));
      assert.equal(overflow.x,false,'horizontal overflow '+name);
      assert.equal(overflow.y,false,'vertical overflow '+name);
      await page.screenshot({path:path.join(OUT,name+'.png'),fullPage:true});
      const pixels=await page.locator('canvas').screenshot();const stats=await sharp(pixels).stats();assert.ok(stats.channels[0].stdev>20,'canvas must contain art');
      const n=await page.evaluate(()=>window.Astraball.metrics().renders);await page.waitForTimeout(800);const idle=await page.evaluate(()=>window.Astraball.metrics().renders);assert.ok(idle-n<=2,'render loop should stop when idle');
      await page.locator('#help').click();await page.locator('#modal').waitFor({state:'visible'});await page.keyboard.press('Escape');await page.locator('#modal').waitFor({state:'hidden'});
      await page.locator('#settings').click();await page.locator('#match-mode').selectOption('hotseat');await page.locator('#new-match').click();
      assert.equal(await page.evaluate(()=>window.Astraball.snapshot().mode),'hotseat');
      await page.locator('#wait').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
      assert.equal((await page.evaluate(()=>window.Astraball.snapshot())).units.filter(u=>u.acted).length,1);
      reports.push({name,errors,overflow,canvasVariance:stats.channels[0].stdev,idleRenders:idle-n});assert.deepEqual(errors,[]);
      await context.close();
    }
    const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'}),page=await context.newPage();
    await page.goto(url);await page.waitForFunction(()=>window.Astraball?.ready);
    const fixture=core.createMatch({seed:7,mode:'hotseat'});
    fixture.units.filter(u=>u.role==='sentry').forEach(u=>u.acted=true);fixture.activeId='t0-momo';
    Object.assign(core.getUnit(fixture,'t0-momo'),{x:4,y:3});Object.assign(core.getUnit(fixture,'t0-kaylis'),{x:8,y:3});Object.assign(core.getUnit(fixture,'t1-voloden'),{x:6,y:3});fixture.ball={holderId:'t0-momo',x:4,y:3};core.validateState(fixture);
    await page.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),fixture);await page.reload();await page.waitForFunction(()=>window.Astraball?.ready);
    await page.locator('[data-mode="pass"]').click();await page.getByRole('button',{name:'Kaylis ×',exact:true}).click();
    assert.match(await page.locator('#target-description').textContent(),/Interception certaine/);
    await page.screenshot({path:path.join(OUT,'interception-preview.png')});await page.locator('#confirm-action').click();await page.waitForFunction(()=>!window.Astraball.metrics().busy);
    assert.equal(await page.evaluate(()=>window.Astraball.snapshot().ball.holderId),'t1-voloden');
    reports.push({scenario:'visible interception agrees with engine',passed:true});await context.close();
    const animated=await browser.newContext({viewport:{width:1440,height:900}}),motion=await animated.newPage(),animationErrors=[];
    motion.on('pageerror',e=>animationErrors.push(e.message));
    await motion.goto(url);await motion.waitForFunction(()=>window.Astraball?.ready);
    const goal=core.createMatch({seed:1,mode:'hotseat'});goal.units.filter(u=>['sentry','meneur'].includes(u.role)).forEach(u=>u.acted=true);goal.activeId='t0-kaylis';goal.score=[4,0];Object.assign(core.getUnit(goal,'t0-kaylis'),{x:9,y:0});goal.ball={holderId:'t0-kaylis',x:9,y:0};core.validateState(goal);
    await motion.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),goal);await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    await motion.locator('[data-mode="shoot"]').click();await motion.getByRole('button',{name:'U 1',exact:true}).click();await motion.locator('#confirm-action').click();
    await motion.locator('#celebration').waitFor({state:'visible'});await motion.screenshot({path:path.join(OUT,'goal-animation.png')});
    await motion.getByRole('heading',{name:'Fin de la rencontre'}).waitFor();assert.deepEqual(await motion.evaluate(()=>window.Astraball.snapshot().score),[6,0]);
    await motion.locator('#result-review').click();assert.equal(await motion.locator('#wait').isDisabled(),true);
    const charge=structuredClone(fixture);charge.seed=1;charge.rng=1;Object.assign(core.getUnit(charge,'t1-voloden'),{x:5,y:3});core.validateState(charge);
    await motion.evaluate(s=>localStorage.setItem('kalistar.astraball.match.v1',JSON.stringify(s)),charge);await motion.reload();await motion.waitForFunction(()=>window.Astraball?.ready);
    await motion.locator('[data-mode="charge"]').click();await motion.locator('#target-options button').filter({hasText:'Voloden'}).click();await motion.locator('#confirm-action').click();await motion.waitForFunction(()=>!window.Astraball.metrics().busy);
    const charged=await motion.evaluate(()=>window.Astraball.snapshot());assert.equal(core.getUnit(charged,'t1-voloden').penalty,3);assert.equal(core.getUnit(charged,'t1-voloden').x,6);
    assert.deepEqual(animationErrors,[]);reports.push({scenario:'animated two-point U, victory, charge and tempo',passed:true});await animated.close();
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
