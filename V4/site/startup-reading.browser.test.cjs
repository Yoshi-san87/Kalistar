'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_reading_qa.cjs'));
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const output=path.resolve(process.env.KALISTAR_VERIFICATION_DIR||path.join(__dirname,'../../work/qa/startup-reading'));
const base='https://kalistar-reading-qa.invalid/jeu/';
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function serve(context,{slow=null,broken=false}={}){
  await context.route('https://kalistar-reading-qa.invalid/**',async route=>{
    const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
    if(pathname.endsWith('/catalogue.json')&&slow)await slow;
    if(broken&&/\/media\/.*\.png$/.test(pathname))return route.fulfill({status:404,body:'QA missing card'});
    let file=path.resolve(dist,'.'+pathname+(pathname.endsWith('/')?'index.html':''));assert(file.startsWith(dist+path.sep));
    if(process.env.KALISTAR_TEST_SOURCE==='1'&&pathname.startsWith('/jeu/')&&/\.(js|css)$/.test(pathname)){
      const source=path.join(__dirname,pathname.slice(5));if(fs.existsSync(source))file=source;
    }
    const body=process.env.KALISTAR_TEST_SOURCE==='1'&&pathname==='/jeu/'?fs.readFileSync(path.join(__dirname,'index.html'),'utf8').replace('data-hosting="local"','data-hosting="static"'):fs.existsSync(file)?fs.readFileSync(file):null;
    return route.fulfill({status:body?200:404,body:body||'Missing QA asset',contentType:mime[path.extname(file)]||'application/octet-stream'});
  });
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await runtime('playwright').chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    for(const profile of [{name:'desktop',width:1440,height:1000},{name:'large',width:2560,height:1440},{name:'razr',width:412,height:1007,mobile:true},{name:'phone',width:390,height:844,mobile:true},{name:'compact',width:320,height:640,mobile:true},{name:'long-story',width:360,height:740,mobile:true,long:true},{name:'landscape',width:1007,height:412,mobile:true},{name:'reduced',width:390,height:844,reduced:true}]){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference'});
      await serve(context);await context.addInitScript(long=>{Math.random=()=>{const cards=window.KALISTAR_DATA?.cards;if(!long||!cards)return 0;const index=cards.reduce((best,c,i)=>c.description.length>cards[best].description.length?i:best,0);return (index+.1)/cards.length;};},!!profile.long);
      const page=await context.newPage(),errors=[],media=new Set();page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/\/media\/.*\.png/.test(r.url()))media.add(r.url());});
      await page.goto(base+'#home');await page.waitForFunction(()=>window.KALISTAR_PREPARED);
      const gate=page.locator('.startup-reading'),button=page.locator('[data-startup-enter]');await button.waitFor();await page.evaluate(()=>document.fonts.ready);
      await page.waitForFunction(()=>document.querySelector('.startup-reading').classList.contains('has-card'));
      await page.waitForTimeout(profile.reduced?50:3100);
      assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);assert.equal(await page.locator('#home-root,.cloud-sync-dialog,.lineup-intro').count(),0);
      assert.equal(await page.locator('#app').evaluate(n=>n.inert),true);
      assert.equal(await button.isEnabled(),true);
      assert.equal(await page.evaluate(()=>document.querySelector('.startup-reading__story').textContent===KALISTAR_DATA.cards.find(c=>c.id===document.querySelector('.startup-reading').dataset.cardId).description),true);
      const geometry=await gate.evaluate(root=>{
        const rect=selector=>{const r=root.querySelector(selector).getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};};
        return {width:root.clientWidth,scroll:root.scrollWidth,card:rect('.startup-reading__card'),copy:rect('.startup-reading__copy'),button:rect('[data-startup-enter]'),textFits:[...root.querySelectorAll('h1,h2,p')].every(el=>el.scrollWidth<=el.clientWidth+1),running:root.getAnimations({subtree:true}).filter(a=>a.playState==='running').length};
      });
      assert(geometry.scroll<=geometry.width+1,profile.name+' no horizontal scroll');assert(geometry.textFits,profile.name+' text fits');assert.equal(geometry.running,0,'no permanent animation or idle CPU loop');
      assert(geometry.card.left>=0&&geometry.card.right<=profile.width);
      if(profile.width>=700)assert(geometry.card.right<geometry.copy.left,'desktop separates card and reading');
      else assert(geometry.card.bottom<geometry.copy.top,'phone stacks reading below card');
      if(profile.width<700){
        assert(geometry.button.bottom<=profile.height,'Enter stays within the phone viewport');
        const copy=page.locator('.startup-reading__copy');await copy.focus();await page.keyboard.press('End');
        await page.waitForFunction(()=>{const el=document.querySelector('.startup-reading__copy');return el.scrollHeight<=el.clientHeight+1||el.scrollTop>0;});
        assert(await copy.evaluate(el=>el.scrollHeight<=el.clientHeight+1||el.scrollTop>0),'long reading remains keyboard-scrollable');
        await copy.evaluate(el=>{el.scrollTop=0;});
      }
      assert(media.size<=8,'bounded first-view warmup and one reading card');
      await page.screenshot({path:path.join(output,profile.name+'.png')});
      const chosen=await gate.getAttribute('data-card-id');await page.waitForTimeout(150);assert.equal(await gate.getAttribute('data-card-id'),chosen,'no automatic carousel during reading');
      await button.scrollIntoViewIfNeeded();await button.focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>window.KALISTAR_READY);
      assert.equal(await gate.count(),0);assert.equal(await page.locator('#home-root').count(),1);assert.deepEqual(errors,[]);
      await page.locator('[data-home-category=collection]').click();await page.locator('.cb-spread').waitFor();assert.equal(await gate.count(),0,'ordinary navigation never reopens the reading gate');
      results.push({profile:profile.name,geometry,oneCard:true,explicitEntry:true,errors});await context.close();
    }
    for(const scenario of ['slow','broken-image']){
      const context=await browser.newContext({viewport:{width:390,height:844},reducedMotion:'reduce'});let release;
      const slow=scenario==='slow'?new Promise(resolve=>{release=resolve;}):null;
      await serve(context,{slow,broken:scenario==='broken-image'});await context.addInitScript(()=>{Math.random=()=>0;});
      const page=await context.newPage();await page.goto(base+'#home');
      if(slow){await page.locator('.startup-reading').waitFor();assert.equal(await page.locator('[data-startup-enter]').isVisible(),false);assert.equal(await page.evaluate(()=>!!window.KALISTAR_READY),false);release();}
      await page.locator('[data-startup-enter]').waitFor();
      if(scenario==='broken-image'){await page.locator('.startup-reading.image-unavailable').waitFor();assert.equal(await page.locator('.startup-reading__turn').evaluate(n=>getComputedStyle(n).transform),'matrix3d(-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1)');}
      await page.locator('[data-startup-enter]').click();await page.waitForFunction(()=>window.KALISTAR_READY);results.push({scenario,passed:true});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify(results,null,2)+'\n');console.log('PASS reading: desktop/phone, one authored story, bounded assets, dormant app, explicit entry, slow data and missing image.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
