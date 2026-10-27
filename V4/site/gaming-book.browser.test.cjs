'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const modules=createRequire(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/_gaming_qa.cjs'));
const {chromium}=modules('playwright'),{sceneFrame,playScene}=require('./test-support/gaming-book.cjs');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/gaming-book');
const origin='https://gaming-book.invalid',errors=[],checks=[];
const mime={'.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.mp4':'video/mp4','.jpg':'image/jpeg','.png':'image/png','.webp':'image/webp','.woff2':'font/woff2'};
const fixture='<!doctype html><html><head><meta charset="utf-8"><script src="assets/lucide.min.js" defer></script><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="gaming-book.css"><script src="dialog-history.js" defer></script><script src="gaming-book.js" defer></script></head><body><button id="open">Ouvrir</button><script>addEventListener("DOMContentLoaded",()=>{window.scene=KalistarGamingBook.create({userId:"qa-tokyo"});document.querySelector("button").onclick=()=>{window.result=null;scene.open().then(value=>window.result=value);};});</script></body></html>';
async function main(){
  fs.mkdirSync(output,{recursive:true});
  const browser=await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
  try{
    for(const [name,width,height] of [['pc',1440,1000],['razr',412,1007],['compact',360,740],['small',320,568],['landscape',1007,412]]){
      const context=await browser.newContext({viewport:{width,height},reducedMotion:'reduce',isMobile:width<500,hasTouch:width<500});
      const requests=[];
      await context.route('**/*',async route=>{
        const url=new URL(route.request().url());assert.equal(url.origin,origin);
        requests.push(url.pathname);
        if(url.pathname==='/jeu/')return route.fulfill({contentType:'text/html',body:fixture});
        const file=path.resolve(dist,decodeURIComponent(url.pathname.slice(1)));assert(file.startsWith(dist+path.sep));
        if(!fs.existsSync(file))throw Error('Missing '+file);
        return route.fulfill({contentType:mime[path.extname(file)]||'application/octet-stream',body:fs.readFileSync(file)});
      });
      const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
      await page.goto(origin+'/jeu/');await page.locator('#open').waitFor();
      assert(!requests.some(url=>url.includes('/gaming-book/')),'No scene media on an ordinary page');
      await page.locator('#open').click();let frame=await sceneFrame(page);
      await frame.waitForFunction(()=>KalistarMomoScene.snapshot().canContinue);
      const first=await frame.evaluate(()=>KalistarMomoScene.snapshot());
      await page.waitForTimeout(300);
      assert.equal((await frame.evaluate(()=>KalistarMomoScene.snapshot())).metrics.renders,first.metrics.renders,'Black reading hold rests');
      assert(!requests.some(url=>url.endsWith('.mp4')),'Video is lazy');
      await frame.locator('#continue').click();
      await frame.waitForFunction(()=>KalistarMomoScene.snapshot().story.beat===1);
      // Untrusted messages from the parent cannot complete the child session.
      await page.evaluate(()=>postMessage({channel:'kalistar-gaming-book-v1',type:'complete',token:'bad'},location.origin));
      assert(await page.locator('.gaming-book-dialog').isVisible());
      await page.goBack();await page.locator('.gaming-book-dialog').waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>result),false);assert(frame.isDetached(),'Removed iframe releases all loops/audio');
      await page.locator('#open').click();frame=await sceneFrame(page);
      assert.equal((await frame.evaluate(()=>KalistarMomoScene.snapshot())).story.beat,1,'Bookmark resumes the read page');
      await page.locator('.gaming-book-dialog > header button').click();
      await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
      await page.evaluate(()=>localStorage.setItem('kalistar-gaming-book:momo-v6:qa-tokyo',JSON.stringify({version:1,phase:'abandoned',beat:3,acknowledged:false,x:890})));
      await page.locator('#open').click();frame=await sceneFrame(page);
      await frame.waitForFunction(()=>KalistarMomoScene.snapshot().cinema.mood===.72);
      await page.screenshot({path:path.join(output,name+'-abandoned.png')});
      assert.equal((await frame.evaluate(()=>KalistarMomoScene.snapshot())).cinema.actor,1,'Momo remains visible against the darkened scene');
      await page.locator('.gaming-book-dialog > header button').click();
      await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
      await page.evaluate(()=>localStorage.setItem('kalistar-gaming-book:momo-v6:qa-tokyo',JSON.stringify({version:1,phase:'finding',beat:1,acknowledged:false,x:1130})));
      await page.locator('#open').click();frame=await sceneFrame(page);
      await frame.evaluate(()=>document.fonts.ready);await page.waitForTimeout(250);
      assert(await frame.locator('#world').evaluate(c=>{
        const a=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
        return a.some((n,i)=>i%4!==3&&n>40);
      }),'Scene canvas is not blank');
      const layout=await frame.evaluate(async()=>{
        const {passages}=await import('./story.mjs'),{narrationGlyphs}=await import('./narration.mjs');
        const el=document.querySelector('#narration'),s=getComputedStyle(el),r=el.getBoundingClientRect();
        const probe=document.createElement('div');probe.style.cssText='position:fixed;left:-9999px;white-space:pre-line;text-wrap:balance;overflow-wrap:break-word';probe.style.width=r.width+'px';probe.style.font=s.font;probe.style.lineHeight=s.lineHeight;document.body.append(probe);
        let max=0;for(const text of Object.values(passages).flat().map(p=>p.text)){probe.replaceChildren(...narrationGlyphs(text).map(glyph=>{const span=document.createElement('span');span.className='narration-letter';span.textContent=glyph;return span;}));max=Math.max(max,probe.getBoundingClientRect().height);}probe.remove();
        return {w:innerWidth,h:innerHeight,scrollW:document.documentElement.scrollWidth,scrollH:document.documentElement.scrollHeight,max,height:r.height,
          buttons:[...document.querySelectorAll('.scene-header button,.scene-footer button')].filter(e=>e.getClientRects().length&&getComputedStyle(e).visibility!=='hidden').map(e=>{const b=e.getBoundingClientRect();return {left:b.left,top:b.top,right:b.right,bottom:b.bottom};})};
      });
      assert.equal(layout.w,layout.scrollW,name+' no horizontal scroll');assert.equal(layout.h,layout.scrollH,name+' no vertical scroll');
      assert(layout.max<=layout.height+1,name+' all text fits '+JSON.stringify(layout));
      assert(layout.buttons.every(b=>b.left>=0&&b.top>=0&&b.right<=width+1&&b.bottom<=layout.h+1),name+' controls fit');
      await page.screenshot({path:path.join(output,name+'.png')});
      if(name==='pc'){
        const before=(await frame.evaluate(()=>KalistarMomoScene.snapshot())).metrics.renders;
        await page.emulateMedia({reducedMotion:'no-preference'});await page.waitForTimeout(500);
        assert((await frame.evaluate(()=>KalistarMomoScene.snapshot())).metrics.renders>before,'Normal motion renders the living scene');
        await frame.locator('#pause').click();await page.waitForTimeout(200);
        const paused=(await frame.evaluate(()=>KalistarMomoScene.snapshot())).metrics.renders;
        await page.waitForTimeout(400);
        assert.equal((await frame.evaluate(()=>KalistarMomoScene.snapshot())).metrics.renders,paused,'Pause stops redraws');
        await page.emulateMedia({reducedMotion:'reduce'});
      }
      await page.locator('.gaming-book-dialog > header button').click();
      // A finished page is presentation only; the host resolves once on explicit Continue.
      for(const phase of ['journey','nightWalk']){
        await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
        await page.evaluate(phase=>localStorage.setItem('kalistar-gaming-book:momo-v6:qa-tokyo',JSON.stringify({version:1,phase,beat:0,acknowledged:true,x:phase==='journey'?1300:1600})),phase);
        await page.locator('#open').click();frame=await sceneFrame(page);
        assert.equal((await frame.evaluate(()=>KalistarMomoScene.snapshot())).narration.text,'');
        await frame.locator('#flute').click();
        await frame.waitForFunction(()=>KalistarMomoScene.snapshot().story.phase==='playing');
        assert(await frame.locator('#continue').isHidden());
        await page.locator('.gaming-book-dialog > header button').click();
        await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
        await page.locator('#open').click();frame=await sceneFrame(page);
        const resumed=await frame.evaluate(()=>KalistarMomoScene.snapshot());
        assert.equal(resumed.story.phase,phase);assert(resumed.canMove);assert(resumed.canPlay);assert.equal(resumed.narration.text,'');
        assert.equal(resumed.story.nightStarted,phase==='nightWalk');
        await page.locator('.gaming-book-dialog > header button').click();
      }
      await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
      await page.evaluate(()=>localStorage.setItem('kalistar-gaming-book:momo-v6:qa-tokyo',JSON.stringify({version:1,phase:'ending',beat:0,acknowledged:true,x:1780})));
      await page.locator('#open').click();frame=await sceneFrame(page);
      await frame.locator('#exit').click();await page.locator('.gaming-book-dialog').waitFor({state:'detached'});
      assert.equal(await page.evaluate(()=>result),true);
      if(name==='pc'){
        await page.waitForFunction(()=>!history.state?.kalistarDialogBack);
        await page.evaluate(()=>localStorage.removeItem('kalistar-gaming-book:momo-v6:qa-tokyo'));
        await page.emulateMedia({reducedMotion:'no-preference'});
        await page.locator('#open').click();frame=await sceneFrame(page);
        await playScene(frame);
        await page.locator('.gaming-book-dialog').waitFor({state:'detached'});
        assert.equal(await page.evaluate(()=>result),true);checks.push('full typed narrative to film and host completion');
      }
      checks.push(name);await context.close();
    }
    assert.deepEqual(errors,[]);
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,checks,errors},null,2));
    console.log('PASS Gaming Book: '+checks.join(', ')+'; lazy media, pixels, all text, Back, resume, cleanup, guarded messages.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
