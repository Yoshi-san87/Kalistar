'use strict';
const L=require('../../atelier/lib.cjs'),{fs,path,assert,read,write,ROOT}=L;
const {createRequire}=require('node:module'),crypto=require('node:crypto');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const assets=read(path.join(__dirname,'installation.json')).outputs;
const entries=require('../../donnees/arenes-collaborations.json').filter(a=>a.id.startsWith('mgs'));
async function ready(page){
  await page.waitForFunction(()=>window.KALISTAR_READY===true);
  await page.waitForFunction(()=>[...document.images].filter(i=>{const r=i.getBoundingClientRect();return r.width&&r.height&&r.top<innerHeight&&r.bottom>0&&r.left<innerWidth&&r.right>0;}).every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
}
async function main(){
  const url=process.env.KALISTAR_ARENAS_URL||'http://127.0.0.1:4304/jeu/',mode=process.env.KALISTAR_ARENAS_URL?'public':'local';
  const out=path.join(__dirname,'qa',mode);fs.mkdirSync(out,{recursive:true});
  const report={passed:false,url,arenas:[],errors:[],httpFailures:[]};let browser;
  try{
    const runtime=path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
    const {chromium}=createRequire(path.join(runtime,'_mgs_arenas.cjs'))('playwright');
    browser=await chromium.launch({channel:'chrome',headless:true});
    for(const asset of assets){
      const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce',serviceWorkers:'block'});
      try{
        await context.route('**/*',route=>{const r=route.request(),u=new URL(r.url());return r.method()==='GET'&&(u.origin===new URL(url).origin||['data:','blob:'].includes(u.protocol))?route.continue():route.abort();});
        const page=await context.newPage();page.setDefaultTimeout(30000);
        page.on('pageerror',e=>report.errors.push(e.message));page.on('response',r=>{if(r.status()>=400)report.httpFailures.push(r.url());});
        await page.goto(url+'#arena');await ready(page);
        const arena=await page.evaluate(id=>KALISTAR_DATA.arenas.find(a=>a.id===id),asset.id);assert(arena);
        const expected=entries.find(a=>a.id===asset.id);
        for(const f of ['name','subtitle','element','elementBonus','homeCharacters','homeAttack','homeDefense'])assert.deepEqual(arena[f],expected[f]);
        const imageUrl=new URL(arena.image,url).href,r=await page.request.get(imageUrl);assert.equal(r.status(),200);assert.equal(digest(await r.body()),asset.sha256);
        await page.locator('[data-view=arena]').first().click();await ready(page);
        await page.locator('[data-action=arena-picker]:visible').first().click();
        const option=page.locator('#arena-form label.arena-option').filter({has:page.locator('input[value="'+asset.id+'"]')});
        await option.click();assert(await option.locator('input').isChecked());
        await page.locator('#arena-form button[type=submit]').click();await ready(page);
        assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).arenaId),asset.id);
        const background=await page.locator('.game-shell').evaluate(n=>getComputedStyle(n).getPropertyValue('--arena-image'));
        assert(background.includes(asset.id+'.png'));
        await page.locator('[data-action=auto-formation]:visible').first().click();await page.locator('[data-action=start]:visible').first().click();await ready(page);
        await page.screenshot({path:path.join(out,asset.id+'-desktop.png'),animations:'disabled'});
        const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
        await page.setViewportSize({width:390,height:844});await ready(page);
        assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
        assert(await page.locator('.slot-card img').count()>=10);
        await page.screenshot({path:path.join(out,asset.id+'-phone.png'),animations:'disabled'});
        await page.reload();await ready(page);
        const restored=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')));
        assert.equal(restored.arenaId,asset.id);assert.equal(restored.matchId,saved.matchId);
        report.arenas.push({id:asset.id,sha256:asset.sha256,desktop:true,phone:true,restored:true});
      }finally{await context.close();}
    }
    assert.equal(report.arenas.length,3);assert.deepEqual(report.errors,[]);assert.deepEqual(report.httpFailures,[]);report.passed=true;
  }catch(e){report.failure=e.stack;process.exitCode=1;}
  finally{await browser?.close();write(path.join(out,'report.json'),report);console.log(JSON.stringify(report));}
}
main();
