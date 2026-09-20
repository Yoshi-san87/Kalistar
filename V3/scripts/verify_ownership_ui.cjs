'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http');
const {createRequire}=require('node:module'),{pathToFileURL}=require('node:url');
const runtime=process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium}=createRequire(path.join(runtime,'__ownership_ui__.cjs'))('playwright');
const root=path.resolve(__dirname,'..'),out=path.join(root,'verification-ownership');
fs.mkdirSync(out,{recursive:true});
const report={at:new Date().toISOString(),isolation:'Fresh nonpersistent Chrome contexts, ephemeral loopback origin. No access to user browser databases.',tests:[],screenshots:[],errors:[],missing:[]};
const server=http.createServer((req,res)=>{
  const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if(!file.startsWith(root+path.sep))return res.writeHead(403).end();
  try{res.setHeader('Content-Type',{'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}
  catch{if(!req.url.endsWith('/favicon.ico'))report.missing.push(req.url);res.writeHead(404).end();}
});
let browser,context,page,url,publicId,voucher,career;
const ready=()=>page.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB?.registry?.initialized);
const act=name=>page.locator(`[data-registry-action="${name}"]`);
const tab=name=>page.locator(`[data-registry-action="tab"][data-tab="${name}"]`);
const idle=async()=>{await page.waitForFunction(()=>document.querySelector('#account-dialog')?.getAttribute('aria-busy')!=='true');await page.evaluate(()=>KALISTAR_DB.idle());};
const counts=()=>page.evaluate(()=>[KALISTAR_DB.registry.owned('user-paris').length,KALISTAR_DB.registry.owned('user-tokyo').length]);
async function open(){await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));await page.locator('.account-button').click();await page.locator('#registry-profile').waitFor();}
async function profile(id){await open();await page.locator('#registry-profile').selectOption(id);await page.waitForFunction(id=>window.KALISTAR_READY&&window.KALISTAR_ACTIVE_USER===id,id);await ready();}
async function shot(name){const file=path.join(out,'ui-'+name+'.png');await page.screenshot({path:file,fullPage:false});report.screenshots.push(file);}
async function test(name,fn){await fn();report.tests.push({name,ok:true});console.log('PASS '+name);}
async function offer(){
  await open();await act('compose').click();await page.locator('[name="item"]').selectOption(publicId);await page.locator('#registry-transfer-form [type="submit"]').click();await idle();
  await page.locator('#registry-confirm-form [name="confirm"]').check();await page.locator('#registry-confirm-form [type="submit"]').click();await idle();
  assert.equal(await page.locator('.transfer-status.pending').count(),1);
}
async function geometry(label){
  const result=await page.evaluate(()=>{
    const d=document.querySelector('#account-dialog'),r=d.getBoundingClientRect();
    return {width:innerWidth,height:innerHeight,dialog:{x:r.x,y:r.y,width:r.width,height:r.height},overflow:d.scrollWidth>d.clientWidth+2,body:document.documentElement.scrollWidth>innerWidth+2,
      clipped:[...d.querySelectorAll('button,input,select')].filter(n=>n.getClientRects().length).filter(n=>{const b=n.getBoundingClientRect();return b.left<r.left-2||b.right>r.right+2;}).map(n=>n.textContent)};
  });report.tests.push({name:'geometry '+label,ok:!result.overflow&&!result.body&&!result.clipped.length,result});assert.equal(result.overflow,false);assert.equal(result.body,false);assert.deepEqual(result.clipped,[]);
}
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));url=`http://127.0.0.1:${server.address().port}/site/index.html`;
  browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']});context=await browser.newContext({viewport:{width:1440,height:1000}});page=await context.newPage();page.setDefaultTimeout(15000);
  page.on('pageerror',e=>report.errors.push(e.message));await page.goto(url);await ready();
  await test('Paris owns 41, Tokyo zero; real catalogue unchanged',async()=>{
    assert.deepEqual(await counts(),[41,0]);assert.match(await page.locator('.cb-count').innerText(),/40 personnages.*41 versions/);
    const result=await page.evaluate(()=>({cards:KALISTAR_DATA.cards.length,ids:KALISTAR_DB.registry.owned('user-paris').map(i=>i.id),id:KALISTAR_DB.registry.owned('user-paris','30000001')[0].id}));
    assert.equal(result.cards,41);assert.equal(new Set(result.ids).size,41);publicId=result.id;await shot('collection-paris');
  });
  await test('Local profile switch isolates collection, decks and favorites',async()=>{
    await page.locator('[data-binder-action="favorite"][data-id="30000001"]').click();await profile('user-tokyo');
    assert.equal(await page.locator('[data-character]').count(),0);assert.match(await page.locator('.cb-empty').innerText(),/première carte/);assert.equal(await page.locator('#deck-count').innerText(),'0');
    await page.locator('.cb-scopes [data-binder-action="scope"][data-id="catalogue"]').click();assert.match(await page.locator('.cb-count').innerText(),/40 personnages.*41 versions/);
    assert.equal(await page.locator('[data-action="add"]:enabled').count(),0);assert.equal(await page.locator('[data-binder-action=favorite][aria-pressed=true]').count(),0);await shot('catalogue-tokyo');
    await profile('user-paris');assert.equal(await page.locator('#deck-count').innerText(),'10');assert.equal(await page.locator('[data-binder-action=favorite][aria-pressed=true]').count(),1);
  });
  await test('Real bound match produces collectible career; AI does not mint ownership',async()=>{
    career=await page.evaluate(async()=>{
      const E=KalistarEngine.createEngine(KALISTAR_DATA),db=KALISTAR_DB;
      let g=E.newGame(KALISTAR_DATA.decks.player,KALISTAR_DATA.decks.enemy,{mode:'local',seed:'OWNERSHIP-UI-CAREER'});
      E.autoDeploy(g,0);E.autoDeploy(g,1);g=db.registry.bindGame('user-paris',g);E.start(g);
      for(let i=0;i<6000&&g.phase!=='over';i++){
        if(g.phase==='choose')E.lock(g,...E.aiChoice(g));else if(g.phase==='attack')E.rollAttack(g);else if(g.phase==='defense')E.rollDefense(g);else if(g.phase==='result')E.next(g);else if(g.phase==='replace')E.autoDeploy(g,g.replacing);
        else{const [grant,choice]={guard:['grantGuard','aiGuardChoice'],clover:['grantClover','aiCloverChoice'],potion:['grantPotion','aiPotionChoice'],physical:['grantPhysical','aiPhysicalChoice'],heart:['grantReraise','aiReraiseChoice']}[g.phase];E[grant](g,E[choice](g));}
      }
      if(g.phase!=='over')throw Error('Match not completed');await db.saveGame(g);return db.registry.career('user-paris','30000001');
    });assert.equal(career.games,1);assert.deepEqual(await counts(),[41,0]);
    await page.locator('[data-binder-field=search]').fill('30000001');await page.locator('[data-binder-action=open][data-id="30000001"]').click();
    await page.locator('[data-binder-action=tab][data-id=career]').click();assert.match(await page.locator('.cb-record').innerText(),/1 matchs terminés/);
    const metrics=await page.locator('.cb-career-grid dd').allInnerTexts();assert.deepEqual(metrics,[career.mvp,career.kills,career.holds,career.support,career.attack,career.defense].map(v=>Number(v||0).toLocaleString('fr-FR')));
    await page.locator('[data-binder-field=instance]').selectOption(publicId);assert.deepEqual(await page.locator('.cb-career-grid dd').allInnerTexts(),metrics);
    await page.locator('[data-binder-action=history]').click();await page.locator('#match-dialog[open]').waitFor();await page.locator('#match-dialog [data-action=close]').first().click();
    await page.locator('[data-binder-action=back]').click();await page.locator('[data-binder-field=search]').fill('');
  });
  await test('Two-step transfer preview does not mutate ownership',async()=>{
    await open();await act('compose').click();await page.locator('[name="item"]').selectOption(publicId);await page.locator('#registry-transfer-form [type="submit"]').click();await idle();
    assert.deepEqual(await counts(),[41,0]);assert.equal(await page.evaluate(()=>KALISTAR_DB.registry.transfers('user-paris').length),0);
    assert.match(await page.locator('.transfer-route').innerText(),/paris@gmail.com/);assert.match(await page.locator('.transfer-route').innerText(),/tokyo@gmail.com/);
    assert.equal(await page.locator('.transfer-card img').evaluate(i=>i.complete&&i.naturalWidth>=797&&Math.abs(i.height/i.width-i.naturalHeight/i.naturalWidth)<.02),true);await shot('transfer-review');await geometry('desktop-review');
    await page.setViewportSize({width:390,height:844});await shot('transfer-mobile');await geometry('mobile-review');await page.setViewportSize({width:1440,height:1000});
  });
  await test('Owner can cancel; recipient can reject; requests retain history',async()=>{
    await offer();await act('cancel').click();await idle();assert.deepEqual(await counts(),[41,0]);
    await offer();await profile('user-tokyo');await open();await act('review-receive').click();await act('cancel').click();await idle();assert.deepEqual(await counts(),[41,0]);
    const states=await page.evaluate(()=>KALISTAR_DB.registry.transfers('user-tokyo').map(t=>t.status));assert.ok(states.includes('cancelled')&&states.includes('rejected'));
  });
  await test('Recipient acceptance transfers same ID and career, survives reload',async()=>{
    await profile('user-paris');await offer();await profile('user-tokyo');await open();await act('review-receive').click();await shot('transfer-receive');
    await page.locator('#registry-confirm-form [name="confirm"]').check();await page.locator('#registry-confirm-form [type="submit"]').click();await idle();assert.deepEqual(await counts(),[40,1]);
    const result=await page.evaluate(id=>({item:KALISTAR_DB.registry.get(id),stats:KALISTAR_DB.registry.career('user-tokyo','30000001'),old:KALISTAR_DB.registry.career('user-paris','30000001')}),publicId);
    assert.equal(result.item.ownerId,'user-tokyo');assert.equal(result.stats.games,career.games);assert.equal(result.stats.kills,career.kills);assert.equal(result.old.games,0);
    await page.reload();await ready();assert.deepEqual(await counts(),[40,1]);assert.equal(await page.locator('[data-character]').count(),1);
  });
  await test('Explicit issue creates unclaimed item, secret is not in backup',async()=>{
    await profile('user-paris');await open();await tab('issue').click();await page.locator('#registry-issue-form [name="confirm"]').check();await page.locator('#registry-issue-form [type="submit"]').click();await idle();
    voucher=await page.locator('.registry-voucher dd code').allTextContents();assert.equal(voucher.length,2);assert.match(voucher[1],/^[a-f0-9]{64}$/);
    const backup=await page.evaluate(()=>KALISTAR_DB.exportBackup());assert.equal(backup.schema,3);assert.equal(backup.collectibles.length,42);assert.equal(JSON.stringify(backup).includes(voucher[1]),false);assert.deepEqual(await counts(),[40,1]);
    await shot('activation-voucher');await act('close').click();await open();await tab('issue').click();assert.equal(await page.locator('.activation-secret').count(),0);
  });
  await test('Activation rejects wrong code, succeeds once for Tokyo',async()=>{
    await profile('user-tokyo');await open();await tab('activation').click();
    async function claim(secret){await page.locator('[name="collectible"]').fill(voucher[0]);await page.locator('[name="secret"]').fill(secret);await page.locator('#registry-activate-form [type="submit"]').click();await idle();}
    await claim('0'.repeat(64));assert.match(await page.locator('.registry-feedback').innerText(),/refusee/);assert.deepEqual(await counts(),[40,1]);
    await claim(voucher[1]);assert.deepEqual(await counts(),[40,2]);await tab('activation').click();await claim(voucher[1]);assert.deepEqual(await counts(),[40,2]);assert.match(await page.locator('.registry-feedback').innerText(),/refusee/);
  });
  await test('Active game blocks transfer; explicit abandon releases without results',async()=>{
    await profile('user-paris');const matchId=await page.evaluate(async()=>{
      const db=KALISTAR_DB,E=KalistarEngine.createEngine(KALISTAR_DATA);let g=E.newGame(KALISTAR_DATA.decks.enemy,KALISTAR_DATA.decks.player,{mode:'local',seed:'LOCK-AND-RELEASE'});g=db.registry.bindGame('user-paris',g);await db.saveGame(g);return g.matchId;
    });await open();assert.equal(await act('abandon').count(),1);
    const lockedId=await page.evaluate(()=>KALISTAR_DB.registry.owned('user-paris',KALISTAR_DATA.decks.enemy[0])[0].id);
    await act('compose').click();await page.locator('[name="item"]').selectOption(lockedId);await page.locator('#registry-transfer-form [type="submit"]').click();await idle();await page.locator('#registry-confirm-form [name="confirm"]').check();await page.locator('#registry-confirm-form [type="submit"]').click();await idle();assert.match(await page.locator('.registry-feedback').innerText(),/partie non terminee/);
    await act('back').click();page.once('dialog',d=>d.accept());await act('abandon').click();await idle();assert.equal(await act('abandon').count(),0);
    const r=await page.evaluate(id=>({active:KALISTAR_DB.registry.activeGames('user-paris').length,archive:KALISTAR_DB.match(id)}),matchId);assert.equal(r.active,0);assert.equal(r.archive.finalized,false);
  });
  await test('Stockage reports actual browser estimate and responsive profile panel',async()=>{
    await open();await tab('storage').click();await idle();report.storage=await page.evaluate(async()=>({estimate:await navigator.storage.estimate(),jsonBytes:new Blob([JSON.stringify(await KALISTAR_DB.exportBackup())]).size}));
    await shot('storage');await page.setViewportSize({width:360,height:800});await tab('transfers').click();await geometry('360-profile');await shot('registry-360');
    await page.setViewportSize({width:2560,height:1440});await shot('registry-wide');await geometry('2560-profile');
  });
  await test('Full restore requires confirmation and clears stale resume pointers without changing owners',async()=>{
    await page.evaluate(()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close()));
    const backup=await page.evaluate(async()=>{const b=await KALISTAR_DB.exportBackup();localStorage.setItem('kalistar.v3.user-tokyo.game',JSON.stringify(b.matches[0].state));return b;});
    await page.locator('[data-binder-action="archives"]').click();page.once('dialog',d=>d.accept());
    await page.locator('#library-file').setInputFiles({name:'registre.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(backup))});
    await page.waitForFunction(()=>document.querySelector('#toast').textContent.includes('historique import'));
    assert.deepEqual(await counts(),[40,2]);assert.equal(await page.evaluate(()=>localStorage.getItem('kalistar.v3.user-tokyo.game')),null);
    assert.deepEqual(await page.evaluate(()=>KALISTAR_DB.registry.owned('user-tokyo').map(i=>i.id).sort()),backup.collectibles.filter(i=>i.ownerId==='user-tokyo').map(i=>i.id).sort());
  });
  await test('Direct file URL starts local registry and preserves original catalogue',async()=>{
    const isolated=await browser.newContext();const p=await isolated.newPage();await p.goto(pathToFileURL(path.join(root,'site/index.html')).href);await p.waitForFunction(()=>window.KALISTAR_READY&&window.KALISTAR_DB?.registry?.initialized);assert.deepEqual(await p.evaluate(()=>[KALISTAR_DB.registry.owned('user-paris').length,KALISTAR_DB.registry.owned('user-tokyo').length]),[41,0]);await isolated.close();
  });
  assert.deepEqual(report.errors,[]);assert.deepEqual(report.missing,[]);report.ok=true;
})().catch(e=>{report.ok=false;report.failure=e.stack;process.exitCode=1;console.error(e);}).finally(async()=>{
  if(!report.ok&&page)try{await shot('failure');}catch{}
  fs.writeFileSync(path.join(out,'ui-report.json'),JSON.stringify(report,null,2)+'\n');await browser?.close();await new Promise(r=>server.close(r));console.log(JSON.stringify({ok:report.ok,tests:report.tests.length,report:path.join(out,'ui-report.json')}));
});
