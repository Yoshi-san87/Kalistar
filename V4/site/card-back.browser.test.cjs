'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_back_qa.cjs'));
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/obsidian-back');
const back='assets/back-obsidian-v1.webp';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.mp4':'video/mp4'};
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const base='https://kalistar-back-qa.invalid/jeu/';
  const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true});
  const results=[];
  try{
    for(const profile of [{name:'desktop',width:1440,height:1000},{name:'razr',width:412,height:1007,mobile:true},{name:'reduced',width:390,height:844,mobile:true,reduced:true}]){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference'});
      await context.route('https://kalistar-back-qa.invalid/**',route=>{
        const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
        const file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));
        assert(file.startsWith(dist+path.sep));
        return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,body:'Missing QA asset'});
      });
      const page=await context.newPage(),errors=[];
      page.on('pageerror',e=>errors.push(e.message));
      page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(base+'#decks');
      await page.waitForFunction(()=>window.KALISTAR_READY);
      await page.locator('[data-deck-action=captain][data-slot="0"]').click();
      await page.locator('[data-deck-action=play]').click();
      await page.locator('#game-mode').selectOption('ai');
      await page.locator('.match-advanced summary').click();
      await page.locator('#game-seed').fill('PAGES-QA-2');
      await page.locator('#new-game-form [type=submit]').click();
      await page.waitForFunction(()=>document.querySelector('.lineup-intro')?.dataset.step==='weapon');
      const backs=await page.locator('.li-card-back,.li-stack img').evaluateAll(images=>images.map(i=>({src:i.getAttribute('src'),width:i.naturalWidth,height:i.naturalHeight})));
      assert(backs.length>=2);
      assert(backs.every(i=>i.src.endsWith('assets/back-obsidian-v1.webp')&&i.width===897&&i.height===1497));
      await page.screenshot({path:path.join(output,profile.name+'-opening.png')});
      await page.locator('.li-skip').click();
      await page.waitForSelector('.lineup-intro',{state:'detached'});
      const matchId=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId);
      if(profile.mobile){
        await page.locator('[data-action=arena-menu]').click();
        await page.locator('#mobile-dialog [data-action=reserves][data-side="1"]').click();
      }else await page.locator('.resources [data-action=reserves][data-side="1"]').click();
      await page.locator('#detail-dialog[open]').waitFor();
      await page.waitForFunction(()=>[...document.querySelectorAll('#detail-dialog .archive-list img')].every(i=>i.complete&&i.naturalWidth>0));
      const reserves=await page.locator('#detail-dialog .archive-list img').evaluateAll(images=>images.map(i=>i.getAttribute('src')));
      assert.equal(reserves.length,5);assert(reserves.every(src=>src===back));
      assert.equal(await page.locator('#detail-dialog [data-action=detail]').count(),0,'hidden reserves do not expose the card front');
      await page.screenshot({path:path.join(output,profile.name+'-reserves.png')});
      await page.locator('#detail-dialog [data-action=close]').click();
      await page.reload();await page.waitForFunction(()=>window.KALISTAR_READY);
      assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).matchId),matchId);
      await page.evaluate(()=>KalistarPageTransitions.enter('decks'));
      if(profile.reduced)assert.equal(await page.locator('.crossing-deck').count(),0);
      else{
        const images=await page.locator('.crossing-deck img').evaluateAll(nodes=>nodes.map(i=>i.getAttribute('src')));
        assert.equal(images.length,3);assert(images.every(src=>src===back));
      }
      await page.evaluate(()=>KalistarPageTransitions.cancel());
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
      const image=Buffer.from(await page.evaluate(async src=>Array.from(new Uint8Array(await (await fetch(src)).arrayBuffer())),back));
      const expected=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../revisions/2026-10-18-obsidian-back/provenance.json'),'utf8'));
      assert.equal(crypto.createHash('sha256').update(image).digest('hex'),expected.output.sha256);
      assert.deepEqual(errors,[]);
      results.push({profile:profile.name,introBacks:backs.length,hiddenReserves:reserves.length,restoredMatch:true,errors});
      await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');
    console.log('PASS Obsidian back: PC/Razr/reduced motion, lineup, reserves, transitions, reload, exact image.');
  }finally{await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
