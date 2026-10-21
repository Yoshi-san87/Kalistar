'use strict';
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {createRequire}=require('node:module'),{inside}=require('../../deploy/build.cjs');
const DIST=path.resolve(process.env.KALISTAR_DIST||require('../../deploy/build.cjs').DIST);
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'_crystals.cjs'))('playwright');
const plan=require('./plan.json'),before=require('./before.json'),{formation,deckFor}=require('../../expansions/2026-10-15-collab-scenes-45/fixtures.cjs');
const sha=b=>require('node:crypto').createHash('sha256').update(b).digest('hex');
const out=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../../work/qa/collab-kalistels/game');
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
  const page=await context.newPage(),errors=[],failures=[],readers=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failures.push(r.url());});
  const base='http://127.0.0.1:'+server.address().port+'/Kalistar/';
  const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY);
  const images=()=>page.waitForFunction(()=>[...document.images].filter(i=>i.getClientRects().length).every(i=>i.complete&&i.naturalWidth>0));
  await page.goto(base+'jeu/#collection');await ready();
  assert.deepEqual(await page.evaluate(()=>KALISTAR_DATA.cards.filter(c=>KalistarCollaborations.of(c)&&c.element==='NONE').map(c=>c.id)),[plan.exception.id]);
  const migration=await page.evaluate(async entries=>{
   const data=KALISTAR_DATA,old=structuredClone(data);
   for(const prior of entries){const c=old.cards.find(c=>c.id===prior.id);for(const k of ['element','color','hue'])c[k]=prior.profile[k];}
   const name='kalistar-v4-cards-crystals-qa-'+crypto.randomUUID(),owner=KalistarOwnership.PARIS;
   let db=await KalistarLocalDB.open(old,{name}),backup=await db.exportBackup(),count=db.registry.owned(owner).length;db.close();
   db=await KalistarLocalDB.open(data,{name});await db.importBackup(backup);const after=db.registry.owned(owner).length;db.close();
   db=await KalistarLocalDB.open(data,{name});const reload=db.registry.owned(owner).length;db.close();
   return {before:count,after,reload};
  },before.entries);assert.equal(migration.before,migration.after);assert.equal(migration.reload,migration.after);
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915],['narrow',320,740]]){
   await page.setViewportSize({width,height});await page.goto(base+'jeu/?crystal-qa='+name+'#collection');await ready();
   for(const c of plan.cards){
    await page.locator('[data-binder-field=search]').fill(c.id);
    await page.locator('.cb-card[data-id="'+c.id+'"]').click();await page.locator('.cb-reader').waitFor();
    const pane=page.locator('[data-binder-action=pane][data-id=visual]');if(await pane.isVisible())await pane.click();
    await images();assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
    assert.equal(await page.evaluate(id=>KALISTAR_DATA.cards.find(c=>c.id===id).element,c.id),c.element);
    const renderedHash=await page.locator('.cb-hero-image').evaluate(async i=>{
     const response=await fetch(i.dataset.v4MediaSource||i.currentSrc);if(!response.ok)throw Error('Native image unavailable');
     const hash=await crypto.subtle.digest('SHA-256',await response.arrayBuffer());return [...new Uint8Array(hash)].map(n=>n.toString(16).padStart(2,'0')).join('');
    });
    assert.equal(renderedHash,sha(fs.readFileSync(path.resolve(__dirname,'../../creations',c.id,'card.png'))));
    if(['ward','shadow','cina','edgar'].includes(c.key))await page.screenshot({path:path.join(out,name+'-'+c.key+'.png')});
    readers.push({viewport:name,id:c.id,element:c.element});await page.locator('[data-binder-action=back]').click();
   }
  }
  const data=await page.evaluate(()=>KALISTAR_DATA),a=data.cards.find(c=>c.id===plan.cards[0].id),b=data.cards.find(c=>c.id===plan.cards[1].id);
  const decks=[deckFor(a),deckFor(b)],slots=[formation(data.cards,decks[0],a.id,a.role-1),formation(data.cards,decks[1],b.id,b.role-1)];
  await page.evaluate(({decks,slots,a,b})=>{
   const E=KalistarEngine.createEngine(KALISTAR_DATA),s=E.newGame(...decks,{seed:'CRYSTALS-RELOAD',mode:'local',kalistel:false,deckCoverage:2});
   for(let side=0;side<2;side++)for(let slot=0;slot<5;slot++)E.deploy(s,side,s.players[side].reserve.find(u=>u.cardId===slots[side][slot]).uid,slot);
   E.start(s);E.lock(s,a.role-1,b.role-1);E.rollAttack(s,6);E.assertState(s);localStorage.setItem('kalistar.v4.game',JSON.stringify(s));
  },{decks,slots,a,b});
  await page.goto(base+'jeu/?crystal-duel=1#arena');await ready();
  for(const [name,width,height]of [['desktop',1440,1000],['razr50',412,915]]){
   await page.setViewportSize({width,height});await images();
   assert(await page.evaluate(ids=>ids.every(id=>document.querySelector('.formation .inspect[data-id="'+id+'"]')?.closest('.slot')?.querySelector('.slot-card > img')?.naturalWidth>0),[a.id,b.id]));
   await page.screenshot({path:path.join(out,name+'-arena.png')});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  await page.reload();await ready();assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).seed),'CRYSTALS-RELOAD');
  assert.deepEqual(errors,[]);assert.deepEqual(failures,[]);
  fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({passed:true,driverHash:sha(fs.readFileSync(__filename)),buildHash:sha(fs.readFileSync(path.join(DIST,'release.json'))),readers,migration,arenaReload:true,errors,failures},null,2));
  console.log('PASS: 33 native readers, Koby NONE, existing ownership preserved, arena and reload.');
 }finally{if(browser)await browser.close();await new Promise(r=>server.close(r));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
