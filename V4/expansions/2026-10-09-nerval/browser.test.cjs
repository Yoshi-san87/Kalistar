'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_nerval.cjs'))('playwright');
const {deck,formation}=require('./fixtures.cjs');
const out=path.join(__dirname,process.env.KALISTAR_PAGES_URL?'public-browser-proof':'browser-proof');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const server=http.createServer((req,res)=>{try{
    const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith('/Kalistar/'));
    const rel=decodeURIComponent(url.pathname.slice('/Kalistar/'.length)),f=inside(DIST,rel.endsWith('/')?rel+'index.html':rel);
    res.setHeader('Content-Type',mime[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));
  }catch{res.writeHead(404);res.end();}});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));let browser;
  try{
    fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],failures=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
    const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
    const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
    const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
    await page.goto(base+'jeu/#collection');await ready();
    assert.equal(await page.evaluate(()=>KALISTAR_DATA.cards.find(c=>c.id==='49901402').element),'LUXO');
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
      await page.setViewportSize({width,height});await page.locator('[data-binder-field=search]').fill('NERVAL');
      await page.locator('.cb-card[data-id="49901402"]').click();await page.locator('.cb-reader').waitFor();
      const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
      await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(out,name+'-card.png')});await page.locator('[data-binder-action=back]').click();
    }
    const data=await page.evaluate(()=>KALISTAR_DATA),slots=formation(data.cards,deck,'49901402',4);
    await page.evaluate(({deck,slots})=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(deck,deck,{seed:'NERVAL-VISUAL',mode:'local',kalistel:false,deckCoverage:2});
      for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[slot]).uid,slot);
      E.start(s);E.lock(s,4,4);E.rollAttack(s,5);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
    },{deck,slots});
    await page.goto(base+'jeu/?nerval-qa=1#arena');await ready();await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
      await page.setViewportSize({width,height});await images();await page.screenshot({path:path.join(out,name+'-arena.png')});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    }
    await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'NERVAL-VISUAL');
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,card:'49901402',base,viewports:[[1440,1000],[412,915],[320,740]],arenaReload:true,errors,failures},null,2));
    console.log('PASS: Nerval desktop/mobile readers and duel, restored match.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
