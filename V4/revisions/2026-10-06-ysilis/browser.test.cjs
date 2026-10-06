'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_ysilis.cjs'))('playwright');
const out=path.join(__dirname,'browser-proof');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
  const server=http.createServer((req,res)=>{
    try{const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith('/Kalistar/'));
      const rel=decodeURIComponent(url.pathname.slice(10)),file=inside(DIST,rel.endsWith('/')?rel+'index.html':rel);
      res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));
    }catch{res.writeHead(404);res.end();}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));let browser;
  try{
    fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'chrome',headless:true});
    const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
    const page=await context.newPage(),errors=[],failures=[];
    page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
    const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
    const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
    const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
    await page.goto(base+'jeu/#collection');await ready();
    const renamed=await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>c.faction==='Ysilis').map(c=>c.id).sort());
    assert.deepEqual(renamed,['30000005','49900701','49900707']);
    await page.locator('[data-binder-action=filters]').click();
    const filter=page.locator('[data-binder-filter=faction]');
    assert(await filter.locator('option[value=Ysilis]').count());assert.equal(await filter.locator('option[value=Niveria]').count(),0);
    await filter.selectOption('Ysilis');await page.locator('[data-binder-action=close-overlay]').last().click();
    assert.equal(await page.locator('.cb-card').count(),3);
    await images();await page.screenshot({path:path.join(out,'desktop-ysilis-filter.png')});
    await page.locator('[data-binder-field=search]').fill('MALINIA');
    await page.locator('.cb-card').first().click();await page.locator('.cb-reader').waitFor();
    await page.locator('[data-binder-action=tab][data-id=profile]').click();
    for(const [name,width,height] of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
      await page.setViewportSize({width,height});
      const pane=page.locator('[data-binder-action=pane][data-id=notes]');if(await pane.isVisible())await pane.click();
      await images();assert.equal(await page.locator('.cb-identity b').first().textContent(),'Ysilis');
      assert((await page.locator('.cb-identity img').first().getAttribute('src')).includes('Niveria.png'));
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
      await page.screenshot({path:path.join(out,name+'-ysilis-reader.png')});
    }
    const clues=await page.evaluate(()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{seed:'YSILIS'});
      E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);
      return {asset:KalistarCollaborations.asset('factions','Ysilis'),same:KalistarFactions.same('Niveria','Ysilis'),roundtrip:JSON.stringify(E.restoreGame(s))===JSON.stringify(s)};
    });
    assert.equal(clues.asset,'shared/factions/Niveria.png');assert(clues.same&&clues.roundtrip);
    assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
    fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,renamed,viewports:[[1440,1000],[412,915],[320,740]],clues,errors,failures},null,2)+'\n');
    console.log('PASS: Ysilis filter and reader, exact existing banner, desktop/phone, dependencies and save restore.');
  }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
