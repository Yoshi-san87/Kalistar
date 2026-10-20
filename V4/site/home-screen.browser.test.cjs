'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{createRequire}=require('node:module');
const runtime=createRequire(path.join(process.env.KALISTAR_NODE_MODULES||path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules'),'_home_browser.cjs'));
const {chromium}=runtime('playwright');
const output=process.env.KALISTAR_VERIFICATION_DIR||path.resolve(__dirname,'../../work/qa/home-sanctum');
const dist=path.resolve(process.env.KALISTAR_DIST||path.join(__dirname,'../deploy/dist'));
const base=process.env.KALISTAR_URL||'https://kalistar-home-qa.invalid/Kalistar/jeu/#home';
const profiles=[
  {name:'desktop',width:1440,height:1000},{name:'wide',width:1920,height:1080},
  {name:'qhd',width:2560,height:1440},{name:'ultrawide',width:3440,height:1440},
  {name:'laptop',width:1024,height:768},{name:'razr',width:412,height:1007,mobile:true},
  {name:'phone',width:390,height:844,mobile:true},{name:'compact',width:320,height:740,mobile:true},
  {name:'phone-long-name',width:360,height:800,mobile:true,longName:true},
  {name:'razr-landscape',width:1007,height:412,mobile:true},{name:'short-desktop',width:950,height:500},
  {name:'reduced',width:412,height:1007,mobile:true,reduced:true}
];
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2'};
async function ready(page){
  await page.waitForSelector('.home-card');
  await page.waitForFunction(()=>[...document.querySelectorAll('.kalistar-home img')].every(i=>i.complete&&i.naturalWidth>0&&!i.src.includes('#v4-')));
  await page.evaluate(()=>document.fonts.ready);
}
async function geometry(page,profile){
  const actual=await page.evaluate(()=>{
    const rect=selector=>{const r=document.querySelector(selector).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    const fit=selector=>[...document.querySelectorAll(selector)].every(n=>n.scrollWidth<=n.clientWidth+1);
    return {width:innerWidth,overflow:document.documentElement.scrollWidth,home:rect('.kalistar-home'),card:rect('.home-card'),copy:rect('.home-card-copy'),explore:rect('.home-explore'),
      textFits:fit('.home-card-copy h2,.home-card-title,.home-play-row strong,.home-portals>button,.home-explore strong'),
      commands:[...document.querySelectorAll('.home-gallery-controls button,.home-play-row button,.home-portals>button,.home-explore button')].map(n=>({width:n.getBoundingClientRect().width,height:n.getBoundingClientRect().height})),
      backdrop:document.querySelector('.home-world img').currentSrc};
  });
  assert.equal(actual.overflow,actual.width,profile.name+' no horizontal page overflow');
  assert(actual.card.x>=-.5&&actual.card.right<=actual.width+.5,profile.name+' whole main card remains visible');
  assert(actual.card.right<actual.copy.x,profile.name+' main card never overlaps the character text');
  assert(actual.textFits,profile.name+' names, titles and command text fit');
  assert(actual.commands.every(c=>c.width>=44&&c.height>=44),profile.name+' comfortable touch and keyboard targets');
  if(actual.width<=699)assert(actual.backdrop.endsWith('sanctum-phone-v1.webp'),'phone loads the smaller portrait painting');
  if(!profile.mobile&&profile.height>=950)assert(actual.explore.y<profile.height-25,profile.name+' next section is visible in the first viewport');
  if(!profile.mobile){
    assert(actual.home.bottom>=profile.height-1,profile.name+' scenery fills the viewport without a blank lower band');
    if(profile.height>=1400)assert(actual.card.height>=650,profile.name+' tall desktop makes the cards substantially larger');
  }
  return actual;
}
async function main(){
  fs.mkdirSync(output,{recursive:true});const browser=await chromium.launch({channel:'chrome',headless:true}),results=[];
  try{
    for(const profile of profiles.filter(p=>!process.env.KALISTAR_HOME_PROFILES||process.env.KALISTAR_HOME_PROFILES.split(',').includes(p.name))){
      const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},isMobile:!!profile.mobile,hasTouch:!!profile.mobile,reducedMotion:profile.reduced?'reduce':'no-preference',serviceWorkers:'block'});
      if(!process.env.KALISTAR_URL)await context.route('https://kalistar-home-qa.invalid/**',route=>{
        const relative=decodeURIComponent(new URL(route.request().url()).pathname).replace(/^\/Kalistar\//,''),file=path.resolve(dist,relative.endsWith('/')?relative+'index.html':relative);
        assert(file.startsWith(dist+path.sep));
        return fs.existsSync(file)?route.fulfill({body:fs.readFileSync(file),contentType:mime[path.extname(file)]||'application/octet-stream'}):route.fulfill({status:404,body:'Missing QA asset'});
      });
      await context.addInitScript(longName=>{Math.random=()=>{const cards=window.KALISTAR_DATA?.cards;if(!longName||!cards?.length)return 0;const index=cards.reduce((best,c,i)=>c.name.length>cards[best].name.length?i:best,0);return(index+.1)/cards.length;};},!!profile.longName);
      const page=await context.newPage(),errors=[];
      page.on('pageerror',error=>errors.push(error.message));page.on('response',r=>{if(r.status()>=400)errors.push(r.status()+' '+r.url());});
      await page.goto(base);await ready(page);await page.waitForTimeout(profile.reduced?80:1600);
      const layout=await geometry(page,profile);
      assert.equal(await page.locator('.home-portals>button').count(),4);
      assert.equal(await page.locator('.home-satellite').count(),2);
      await page.screenshot({path:path.join(output,profile.name+'.png')});
      const first=await page.locator('.home-card').getAttribute('data-home-detail');
      await page.locator('[data-home-control=next]').click();await ready(page);
      assert.notEqual(await page.locator('.home-card').getAttribute('data-home-detail'),first);
      assert.equal(await page.locator('[data-home-control=pause]').getAttribute('aria-pressed'),'true');
      await page.locator('[data-home-control=previous]').click();await ready(page);
      assert.equal(await page.locator('.home-card').getAttribute('data-home-detail'),first);
      assert(await page.locator('.home-announcement').innerText());
      await page.locator('.home-card').focus();await page.keyboard.press('Enter');await page.locator('#detail-dialog[open]').waitFor();
      assert.equal(await page.locator('#home-root').getAttribute('data-home-paused'),'true');
      await page.goBack();await page.locator('#detail-dialog').waitFor({state:'hidden'});assert(page.url().endsWith('#home'),'Back closes the card without leaving Home');
      assert.equal(await page.locator('.home-card').getAttribute('data-home-detail'),first,'a popup repaint preserves the chosen card');
      assert.equal(await page.locator('[data-home-control=pause]').getAttribute('aria-pressed'),'true','manual pause survives a popup repaint');
      if(profile.reduced){
        assert(await page.locator('[data-home-control=pause]').isDisabled());
        assert.equal(await page.locator('.home-card').evaluate(n=>getComputedStyle(n).animationName),'none');
        assert.equal(await page.locator('.home-world img').evaluate(n=>getComputedStyle(n).animationName),'none');
      }
      if(profile.name==='phone'){
        const before=await page.locator('.home-card').getAttribute('data-home-detail');
        await page.evaluate(()=>{window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true}));window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true}));});
        await page.locator('[data-home-control=next]').click();await ready(page);
        assert.notEqual(await page.locator('.home-card').getAttribute('data-home-detail'),before,'Home remains interactive after a cached-page lifecycle');
      }
      if(profile.name==='desktop'){
        await page.locator('[data-home-control=pause]').click();await page.locator('.home-heading').click();await page.mouse.move(0,0);
        assert.equal(await page.locator('[data-home-control=pause]').getAttribute('aria-pressed'),'false','Resume works with a real pointer click');
        await page.waitForTimeout(9300);await ready(page);
        assert.notEqual(await page.locator('.home-card').getAttribute('data-home-detail'),first,'automatic reveal advances when nothing is being read '+JSON.stringify(await page.evaluate(()=>({paused:document.querySelector('#home-root').dataset.homePaused,pressed:document.querySelector('[data-home-control=pause]').getAttribute('aria-pressed'),focus:document.activeElement.outerHTML.slice(0,200),hidden:document.hidden,dialogs:document.querySelectorAll('dialog[open]').length}))));
        await page.locator('.home-card').click();await page.locator('#detail-dialog[open]').waitFor();
        const stopped=await page.locator('.home-card').getAttribute('data-home-detail');await page.waitForTimeout(9300);
        assert.equal(await page.locator('.home-card').getAttribute('data-home-detail'),stopped,'no carousel movement behind an open card');
        await page.goBack();await page.locator('#detail-dialog').waitFor({state:'hidden'});
        for(const [category,selector] of [['collection','.cb-page'],['weapon','.weapons-page'],['shield','.weapons-page'],['relic','.weapons-page']]){
          await page.locator('[data-home-category='+category+']').click();await page.locator(selector).waitFor();
          if(category!=='collection')assert.equal(await page.locator('[data-equipment-category='+category+']').getAttribute('aria-pressed'),'true');
          await page.locator('.brand').click();await ready(page);
        }
        for(const [route,selector] of [['decks','.team-page'],['story','.story-library'],['map','.kalistar-map'],['guide','.guide-view']]){
          await page.locator('[data-home-route='+route+']').click();await page.locator(selector).waitFor();
          await page.locator('.brand').click();await ready(page);
        }
        await page.locator('.home-play').click();await page.waitForFunction(()=>document.querySelector('#new-game-dialog[open],.arena-layout,.team-page'));
        if(await page.locator('#new-game-dialog[open]').count())await page.locator('#new-game-dialog [data-action=close]').click();
        await page.locator('.brand').click();await ready(page);
        for(let i=0;i<5;i++){await page.locator('[data-home-route=decks]').click();await page.locator('.team-page').waitFor();await page.locator('.brand').click();await ready(page);}
        assert.equal(await page.locator('.kalistar-home').count(),1,'repeated navigation mounts only one Home');
        await page.reload();await ready(page);assert.equal(await page.locator('.home-play-row .home-deck small b').innerText(),'10/10');
      }
      if(profile.name==='razr'){
        const app=page.locator('#app');assert(await app.evaluate(n=>n.scrollHeight>n.clientHeight),'phone can scroll down to the universe links');
        const cdp=await context.newCDPSession(page),box=await page.locator('.home-gallery').boundingBox();
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width-25,y:box.y+130}]});
        for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width-25-i*25,y:box.y+130}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await ready(page);
        assert.notEqual(await page.locator('.home-card').getAttribute('data-home-detail'),first,'horizontal touch gesture changes card');
        assert.equal(await page.locator('#detail-dialog[open]').count(),0,'swiping does not accidentally inspect a card');
        const beforeScroll=await app.evaluate(n=>n.scrollTop);
        await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:profile.width-30,y:720}]});
        for(let i=1;i<=5;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:profile.width-30,y:720-i*70}]});
        await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(250);
        assert(await app.evaluate((n,before)=>n.scrollTop>before,beforeScroll),'vertical finger gesture really scrolls Home');
        await page.setViewportSize({width:1007,height:412});await geometry(page,{...profile,name:'razr-resized'});
      }
      assert.deepEqual(errors,[],profile.name+' no script or HTTP errors');
      results.push({profile:profile.name,passed:true,layout});await context.close();
    }
    fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({passed:true,profiles:results},null,2));console.log('PASS Home: '+results.map(r=>r.profile).join(', ')+'; carousel, dialogs, Back, navigation, reload, touch, reduced motion.');
  }finally{await browser.close();}
}
main().catch(error=>{console.error(error);process.exitCode=1;});
