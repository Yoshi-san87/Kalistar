'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{DIST,inside}=require('../../deploy/build.cjs');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_faces.cjs'))('playwright');
const M=require('./model.cjs'),set=require('./set.json'),out=path.join(__dirname,'browser-proof');
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
  fs.mkdirSync(out,{recursive:true});browser=await chromium.launch({channel:'msedge',headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
  const page=await context.newPage(),errors=[],failures=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const base=process.env.KALISTAR_PAGES_URL||'http://127.0.0.1:'+server.address().port+'/Kalistar/';
  const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
  await page.goto(base+'jeu/#collection');await ready();
  const data=await page.evaluate(()=>({cards:KALISTAR_DATA.cards})),decks=M.qaDecks(data);
  for(const spec of set.cards){
   assert.equal(data.cards.filter(c=>c.id===spec.id).length,1);
   const active=data.cards.find(c=>c.id===spec.id);
   for(const field of ['title','description','race','atk','defense','magic','barriers'])assert.deepEqual(active[field],spec[field]);
   await page.locator('[data-binder-field=search]').fill(spec.name);
   await page.locator('.cb-card').first().waitFor();await images();
  }
  await page.locator('[data-binder-field=search]').fill('');
  const scopes=await page.locator('.cb-collection-select option').evaluateAll(items=>items.map(i=>i.value));
  assert(scopes.includes('final-fantasy'));
  await page.locator('.cb-collection-select select').selectOption('final-fantasy');
  for(const faction of ['FF6','FF15','FF13']){
   await page.locator('[data-binder-action=filters]').click();
   await page.locator('[data-binder-filter=faction]').selectOption(faction);
   await page.getByRole('button',{name:'Fermer les filtres',exact:true}).click();await images();
   const expected=new Set(set.cards.filter(c=>c.faction===faction).map(c=>c.characterId));
   assert.match(await page.locator('.cb-count').innerText(),new RegExp('^'+expected.size+' personnages'));
   await page.screenshot({path:path.join(out,'desktop-collection-'+faction+'.png')});
   const seen=new Set();
   for(let turns=0;turns<20;turns++){
    (await page.locator('.cb-pocket').evaluateAll(nodes=>nodes.map(n=>n.dataset.character))).forEach(id=>seen.add(id));
    const next=page.locator('.cb-spread [data-binder-action=next-page]');if(await next.isDisabled())break;
    const label=await page.locator('.cb-spread').getAttribute('aria-label');await next.click();
    await page.waitForFunction(label=>document.querySelector('.cb-spread').getAttribute('aria-label')!==label,label);await images();
   }
   assert.deepEqual([...seen].sort(),[...expected].sort());
  }
  await page.locator('[data-binder-action=filters]').click();
  await page.locator('[data-binder-filter=faction]').selectOption('');
  await page.getByRole('button',{name:'Fermer les filtres',exact:true}).click();
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});
   for(const key of ['terra','terra-transe','shadow','umaro','noctis','lunafreya','lightning','vanille']){
    const spec=set.cards.find(c=>c.key===key);
    await page.locator('[data-binder-field=search]').fill(spec.name);
    const character=page.locator('.cb-card').filter({has:page.locator('img')}).first();
    await character.click();await page.locator('.cb-reader').waitFor();
    const version=page.locator('[data-binder-action=version][data-id="'+spec.id+'"]');if(await version.isVisible())await version.click();
    const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
    await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    await page.screenshot({path:path.join(out,name+'-'+key+'.png')});
    await page.locator('[data-binder-action=back]').click();
   }
  }
  for(let team=0;team<3;team++){
   await page.evaluate(({decks,team})=>{
    const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(decks[team],decks[(team+1)%3],{seed:'TRILOGY-VISUAL-'+team,mode:'local',kalistel:false});
    E.autoDeploy(s,0);E.autoDeploy(s,1);E.start(s);E.assertState(s);
    localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
   },{decks,team});
   await page.goto(base+'jeu/?faces-qa='+team+'#arena');await ready();
   await page.waitForFunction(()=>document.body.classList.contains('arena-view'));
   for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
    await page.setViewportSize({width,height});await images();
    await page.screenshot({path:path.join(out,name+'-arena-'+team+'.png')});
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   }
   assert(await page.locator('.slot-card img').count()>=10);
   await page.reload();await ready();
   assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'TRILOGY-VISUAL-'+team);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,cards:set.cards.map(c=>c.id),viewports:[[1440,1000],[412,915],[320,740]],arenaReload:true,errors,failures},null,2)+'\n');
  console.log('PASS: FF6 FF15 FF13, eight readers, three widths and three restored matches.');
 }finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
