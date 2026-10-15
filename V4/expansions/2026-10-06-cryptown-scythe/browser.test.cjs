'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_scythe.cjs'))('playwright');
const M=require('./model.cjs'),spec=require('./set.json').cards[0],out=path.join(__dirname,'browser-proof');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function main(){
 const server=http.createServer((req,res)=>{
  try{const url=new URL(req.url,'http://localhost');assert(url.pathname.startsWith('/Kalistar/'));
   const rel=decodeURIComponent(url.pathname.slice('/Kalistar/'.length)),file=inside(DIST,rel.endsWith('/')?rel+'index.html':rel);
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
  const data=await page.evaluate(()=>({cards:KALISTAR_DATA.cards}));
  const decks=M.qaDecks(data);
  assert.equal(data.cards.filter(c=>c.id===spec.id).length,1);
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
   await page.setViewportSize({width,height});
   await page.locator('[data-binder-field=search]').fill(spec.name);
   await page.locator('.cb-card[data-id="'+spec.id+'"]').click();await page.locator('.cb-reader').waitFor();
   const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
   await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:path.join(out,name+'-morveth.png')});
   await page.locator('[data-binder-action=back]').click();
  }
  await page.evaluate(decks=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(decks[0],decks[1],{seed:'SCYTHE-VISUAL',mode:'local',kalistel:false});
   E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.assertState(s);
   if(!s.players[0].board.some(u=>u&&u.cardId==='49900603'))throw Error('New card not deployed');
   localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },decks);
  await page.goto(base+'jeu/?cryptown-qa=1#arena');await ready();
  await page.waitForFunction(()=>document.body.classList.contains('arena-view'));await images();
  await page.screenshot({path:path.join(out,'razr50-arena.png')});
  await page.setViewportSize({width:1440,height:1000});await images();
  await page.screenshot({path:path.join(out,'desktop-arena.png')});
  assert(await page.locator('.slot-card img').count()>=10);
  await page.evaluate(decks=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(decks[0],decks[1],{seed:'SCYTHE-VISUAL',mode:'local',kalistel:false});
   E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.lock(s,1,0);E.rollAttack(s,1);E.assertState(s);
   if(s.duel.attackValue!=='death')throw Error('Death face missing');
   localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },decks);
  await page.reload();await ready();await images();
  await page.screenshot({path:path.join(out,'desktop-death-ready.png')});
  await page.setViewportSize({width:412,height:915});await images();
  await page.screenshot({path:path.join(out,'razr50-death-ready.png')});

  await page.reload();await ready();
  assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'SCYTHE-VISUAL');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,card:spec.id,desktop:[1440,1000],phone:[412,915],arenaReload:true,deathFaceRestored:true,errors,failures},null,2)+'\n');
  console.log('PASS: Morveth reader, desktop/phone, arena and restored match.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
