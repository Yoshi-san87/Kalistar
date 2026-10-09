'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_gotham_completion.cjs'))('playwright');
const M=require('./model.cjs'),set=require('./set.json');
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
    const fit=()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1);
    await page.goto(base+'jeu/#collection');await ready();
    await page.locator('.cb-collection-select select').selectOption('batman');
    const data=await page.evaluate(()=>KALISTAR_DATA);
    assert.equal(data.cards.filter(c=>c.faction==='Gotham').length,10);
    const screens=[];
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
      await page.setViewportSize({width,height});
      for(const c of set.cards){
        await page.locator('[data-binder-field=search]').fill(c.name);
        await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
        const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
        await images();assert(await fit(),name+' '+c.key);
        const shot=name+'-'+c.key+'.png';await page.screenshot({path:path.join(out,shot)});screens.push(shot);
        await page.locator('[data-binder-action=back]').click();
      }
      await page.locator('[data-binder-field=search]').fill('');
    }
    const ids=M.deck(),left=M.formation(data.cards,ids,'49901509',0),right=M.formation(data.cards,ids,'49901510',2);
    await page.evaluate(({ids,left,right})=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(ids,ids,{seed:'GOTHAM-COMPLETION',mode:'local',kalistel:false,deckCoverage:2});
      for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++){
        const wanted=[left,right][side][slot];E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===wanted).uid,slot);
      }
      E.start(s);E.lock(s,0,2);E.rollAttack(s,6);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
    },{ids,left,right});
    await page.goto(base+'jeu/?gotham-completion-qa=1#arena');await ready();
    await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
    for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
      await page.setViewportSize({width,height});await images();assert(await fit(),name+' arena');
      const shot=name+'-arena.png';await page.screenshot({path:path.join(out,shot)});screens.push(shot);
    }
    await page.reload();await ready();
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'GOTHAM-COMPLETION');
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,base,viewports:[[1440,1000],[412,915],[320,740]],cards:set.cards.map(c=>c.id),screens,arenaReload:true,errors,failures},null,2));
    console.log('PASS: Batman and Joker readers, three viewports, arena and restored match.');
  }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
