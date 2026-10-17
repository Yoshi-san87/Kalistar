'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {createRequire} = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const {chromium} = createRequire(path.join(runtime, '__journey_view_qa__.cjs'))('playwright');
const root = path.resolve(__dirname, '../..');
const dist = path.resolve(process.env.KALISTAR_DIST || path.join(__dirname, '../deploy/dist'));
const frozen = process.env.KALISTAR_BUILT_SITE === '1' || process.env.KALISTAR_DIST !== undefined;
const output = process.env.KALISTAR_VERIFICATION_DIR || path.join(root, 'work/qa/journeys-view');
const origin = 'https://kalistar-journey-view.invalid';
const currentModules = new Set(['journey-view.js', 'journey-view.css', 'journey-definitions.js']);
const shell = fs.readFileSync(path.join(frozen ? path.join(dist,'jeu') : __dirname,'index.html'),'utf8');
const shellStyles = shell.match(/<link[^>]+rel="stylesheet"[^>]*>/g).join('\n');
const masthead = shell.match(/<header class="masthead">[\s\S]*?<\/header>/)[0];
const types = {'.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.woff2':'font/woff2'};
// The harness has no application boot, server commands, account or browser storage.
const fixture = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base href="/jeu/"><title>Kalistar Journey View QA</title>
${shellStyles}
<script defer src="assets/lucide.min.js"></script><script defer src="ui-system.js"></script><script defer src="dialog-history.js"></script><script defer src="card-media.js"></script><script defer src="journey-definitions.js"></script><script defer src="journey-view.js"></script>
</head><body class="journeys-view">${masthead}<main id="app"><div id="journey-root"></div></main><script>
window.addEventListener('DOMContentLoaded',async()=>{
  const data=await fetch('catalogue.json').then(response=>response.json());
  const freeze=value=>{if(value&&typeof value==='object'){Object.freeze(value);Object.values(value).forEach(freeze);}return value;};
  const state={status:'ready',isAdmin:false,books:KalistarJourneyDefinitions.catalogue(data),progress:{}};
  window.harness={data,state,calls:[],behavior:{},notices:[],release:null};
  async function action(name,...args){
    harness.calls.push({name,args});
    const behavior=harness.behavior[name];
    if(behavior==='defer')await new Promise(resolve=>{harness.release=resolve;});
    if(behavior==='reject')throw Error('Erreur QA '+name);
    if(name==='acknowledge')harness.state.progress[args[0]].acknowledged=true;
    if(name==='claim'&&behavior==='reveal'){
      harness.state.progress[args[0]].claimed=true;harness.view.refresh();
      const book=harness.state.books.find(item=>item.id===args[0]);
      await harness.view.revealReward(data.cards.find(card=>card.id===book.rewardModelId));
    }
  }
  harness.view=KalistarJourneyView.create({data,
    image:async card=>KalistarCardMedia.image(card),art:async card=>KalistarCardMedia.image(card,'art'),
    getState:()=>freeze(structuredClone(harness.state)),
    onStart:id=>action('start',id),onResume:id=>action('resume',id),onClaim:id=>action('claim',id),
    onAcknowledge:id=>action('acknowledge',id),onPreview:(id,index)=>action('preview',id,index),
    onDetail:id=>action('detail',id),onRefresh:()=>action('refresh'),toast:message=>harness.notices.push(message)});
  harness.mount=()=>harness.view.mount(document.querySelector('#journey-root'));
  harness.progress=(index,value)=>{harness.state.progress[harness.state.books[index].id]={cleared:0,completed:false,claimed:false,acknowledged:false,activeAttempt:null,...value};harness.view.refresh();};
  harness.mount();window.fixtureReady=true;
  lucide.createIcons();
});
</script></body></html>`;

async function routeFixture(context) {
  await context.route(origin+'/**', async route => {
    const name = decodeURIComponent(new URL(route.request().url()).pathname);
    if (name === '/') return route.fulfill({contentType:'text/html', body:fixture});
    const relative = name.replace(/^\//, '');
    // Default: current UI over the existing build's real catalogue and assets.
    // Either explicit build selector checks frozen modules without source overrides.
    const current = !frozen && name.startsWith('/jeu/') && currentModules.has(name.slice(5));
    const directory = current ? __dirname : dist;
    const file = path.resolve(directory, current ? name.slice(5) : relative);
    if (!file.startsWith(directory+path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return route.fulfill({status:404, body:name});
    return route.fulfill({body:await fs.promises.readFile(file), contentType:types[path.extname(file)] || 'application/octet-stream'});
  });
}
const action = name => `[data-jv-action="${name}"]`;
async function imagesReady(page) {
  const selector = '.jv-cover-card img,.jv-scene img,.jv-reward-prize img';
  await page.waitForFunction(selector => [...document.querySelectorAll(selector)].every(image => image.complete && image.naturalWidth > 0 && (image.dataset.v4Cropped || image.src.startsWith('blob:'))), selector);
  await page.evaluate(async selector => {
    await Promise.all([...document.querySelectorAll(selector)].map(image => image.decode()));
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  }, selector);
}
async function assertLayout(page, label) {
  const geometry = await page.evaluate(() => {
    const rect = node => node.getBoundingClientRect();
    const within = (a,b) => a.left >= b.left-1 && a.right <= b.right+1 && a.top >= b.top-1 && a.bottom <= b.bottom+1;
    const textFits = node => {
      const range = document.createRange(); range.selectNodeContents(node);
      return node.scrollWidth <= node.clientWidth+1 && within(range.getBoundingClientRect(),rect(node));
    };
    return {overflow:document.documentElement.scrollWidth-innerWidth,
      appBottom:rect(document.querySelector('#app')).bottom,
      navTop:rect(document.querySelector('.main-nav')).top,
      mobileNav:getComputedStyle(document.querySelector('.main-nav')).position==='fixed',
      regions:[...document.querySelectorAll('.jv-filters,.jv-route,.jv-stage-actions,.jv-stage-heading,.jv-library-heading,.jv-reward-ceremony')].map(node => ({name:node.className,fits:node.scrollWidth <= node.clientWidth+1})),
      covers:[...document.querySelectorAll('.jv-cover-object')].map(node => {
        const inscription = rect(node.querySelector('.jv-cover-inscription')), card = rect(node.querySelector('.jv-cover-card'));
        return {inside:within(inscription,rect(node)),separate:inscription.bottom+3 <= card.top,text:[...node.querySelectorAll('.jv-cover-title,.jv-cover-character')].every(textFits)};
      }),
      headings:[...document.querySelectorAll('.jv-stage-heading h3,.jv-illustrated-page h2,.jv-reward h2')].every(textFits),
      stations:[...document.querySelectorAll('.jv-route button')].every(node => rect(node).width >= 44 && rect(node).height >= 44)};
  });
  assert.ok(geometry.overflow <= 1, label+': no document overflow '+JSON.stringify(geometry));
  assert.ok(!geometry.mobileNav || geometry.appBottom <= geometry.navTop+1,label+': content stays above bottom navigation '+JSON.stringify(geometry));
  assert.ok(geometry.regions.every(region => region.fits), label+': regions fit '+JSON.stringify(geometry));
  assert.ok(geometry.covers.every(cover => cover.inside && cover.separate && cover.text), label+': cover inscriptions clear the reward card '+JSON.stringify(geometry));
  assert.ok(geometry.headings && geometry.stations, label+': readable headings and touch-sized stations '+JSON.stringify(geometry));
}
async function cleanupProbe(page) {
  const result = await page.evaluate(async () => {
    const host = document.createElement('div'); host.style.cssText = 'position:fixed;inset:0;height:600px'; document.body.append(host);
    const Original = globalThis.ResizeObserver;
    let observers = 0;
    globalThis.ResizeObserver = class {
      constructor(callback) { this.inner = new Original(callback); observers++; this.active = true; }
      observe(node) { this.inner.observe(node); }
      disconnect() { this.inner.disconnect(); if (this.active) observers--; this.active = false; }
    };
    const state = {status:'ready',books:harness.state.books,progress:{},isAdmin:false}, delayed = [];
    let starts = 0, acknowledgements = 0;
    const probe = KalistarJourneyView.create({data:harness.data,getState:()=>state,
      image:() => new Promise(resolve=>delayed.push(resolve)),art:() => new Promise(resolve=>delayed.push(resolve)),
      onStart:async()=>{starts++;},onAcknowledge:async()=>{acknowledgements++;}});
    try {
      probe.mount(host); await Promise.resolve();
      const previous = [...host.querySelectorAll('img[data-jv-media]')];
      probe.destroy();
      delayed.splice(0).forEach(resolve=>resolve('/late-media-must-not-load.png'));
      await Promise.resolve(); await Promise.resolve();
      const lateMediaIgnored = previous.every(image=>!image.hasAttribute('src'));
      for (let count=0;count<4;count++) { probe.mount(host); probe.refresh(); probe.destroy(); }
      probe.mount(host); host.querySelector('[data-jv-action="open"]').click(); host.querySelector('[data-jv-action="start"]').click();
      await Promise.resolve(); await Promise.resolve();
      const book = state.books[0]; state.progress[book.id] = {cleared:4,completed:true,claimed:true,acknowledged:false};
      probe.refresh(); const rewardPromise = probe.revealReward(harness.data.cards.find(card=>card.id===book.rewardModelId));
      probe.destroy();
      const rewardCancelled = await rewardPromise === false;
      delayed.splice(0).forEach(resolve=>resolve('/late-media-must-not-load.png'));
      host.innerHTML = '<button data-jv-action="start">Detached command</button>'; host.firstChild.click();
      return {lateMediaIgnored,rewardCancelled,starts,acknowledgements,observers,dialogs:document.querySelectorAll('dialog[open]').length,views:host.querySelectorAll('.jv-view').length};
    } finally { probe.destroy(); host.remove(); globalThis.ResizeObserver = Original; }
  });
  assert.deepEqual(result,{lateMediaIgnored:true,rewardCancelled:true,starts:1,acknowledgements:0,observers:0,dialogs:0,views:0});
}
async function main() {
  assert.ok(fs.existsSync(path.join(dist,'jeu/catalogue.json')), 'An existing V4/deploy/dist build is required; this test never builds or changes it.');
  fs.mkdirSync(output,{recursive:true});
  const browser = await chromium.launch({channel:'chrome',headless:true});
  const context = await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  await routeFixture(context);
  const page = await context.newPage(), errors = [], failures = [];
  page.setDefaultTimeout(30000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.status() >= 400) failures.push(response.url()+':'+response.status());});
  const capture = async name => { await imagesReady(page); await page.screenshot({path:path.join(output,name+'.png')}); };
  const open = async (index=0) => page.locator(action('open')).nth(index).click();
  try {
    await page.goto(origin); await page.waitForFunction(()=>window.fixtureReady);
    assert.equal(await page.locator('.jv-cover').count(),3);
    assert.equal(await page.locator('.jv-library-heading h1').textContent(),'Fragment');
    assert.equal(await page.locator('.jv-cover-card img').count(),3,'all three real reward models are present');
    assert.deepEqual(await page.evaluate(()=>harness.state.books.map(book=>book.stages.length)),[4,4,4]);
    for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport);
      await page.locator('.jv-shelf').evaluate(node=>{node.scrollLeft=0;node.dispatchEvent(new Event('scroll'));});
      await assertLayout(page,'library '+viewport.width); await capture('library-'+viewport.width);
      if (viewport.width <= 760) {
        assert.equal(await page.locator('.jv-filters').isVisible(),false);
        await page.locator(action('toggle-filters')).click();
        assert.equal(await page.locator(action('toggle-filters')).getAttribute('aria-expanded'),'true');
        await assertLayout(page,'filters '+viewport.width); await capture('filters-'+viewport.width);
        await page.locator('[data-jv-filter="search"]').fill('momo');assert.equal(await page.locator('.jv-cover').count(),1);
        await page.locator(action('reset-filters')).first().click();
        await page.locator(action('toggle-filters')).click();
        await page.locator(action('shelf-right')).click(); await page.waitForFunction(()=>document.querySelector('.jv-shelf').scrollLeft>0);
        await page.locator(action('shelf-left')).click();
      }
      await page.locator('.jv-shelf').focus(); await page.keyboard.press('Home');
      assert.equal(await page.locator('.jv-cover').first().evaluate(node=>node===document.activeElement),true);
      await page.keyboard.press('End'); assert.equal(await page.locator('.jv-cover').last().evaluate(node=>node===document.activeElement),true);
      await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('.jv-cover').nth(1).evaluate(node=>node===document.activeElement),true);
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-jv-filter="search"]').fill('elan'); assert.equal(await page.locator('.jv-cover').count(),1,'accent-insensitive reward-title search');
    await page.locator('[data-jv-filter="search"]').fill('introuvable'); assert.equal(await page.locator('.jv-cover').count(),0);
    await page.locator(action('reset-filters')).last().click();
    await page.locator('[data-jv-filter="character"]').selectOption('balmhyr'); assert.equal(await page.locator('.jv-cover').count(),1);
    await page.locator('[data-jv-filter="element"]').selectOption('RAINBOW'); assert.equal(await page.locator('.jv-cover').count(),0);
    await page.locator(action('reset-filters')).first().click();
    await page.evaluate(()=>harness.progress(0,{cleared:1}));
    await page.locator('[data-jv-filter="status"]').selectOption('started'); assert.equal(await page.locator('.jv-cover').count(),1);
    await page.locator(action('reset-filters')).first().click(); await page.evaluate(()=>harness.progress(0,{}));
    for (const index of [1,2]) {
      await open(index); await assertLayout(page,'book '+index);
      assert.deepEqual(await page.locator('[data-jv-action="stage"] .jv-station-label').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['1/4','2/4','3/4','4/4']);
      await capture('book-'+index); await page.locator(action('library')).click();
    }
    await page.locator('.jv-cover').first().focus(); await page.keyboard.press('Enter');
    assert.equal(await page.locator('.jv-book-opening').evaluate(node=>getComputedStyle(node).animationName),'none');
    assert.equal(await page.locator('[data-jv-action="stage"]:disabled').count(),3);
    assert.deepEqual(await page.locator('[data-jv-action="stage"] .jv-station-label').evaluateAll(nodes=>nodes.map(node=>node.firstChild.textContent)),['1/4','2/4','3/4','4/4']);
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].intro[0]));
    await assertLayout(page,'reader desktop'); await capture('reader-1440');
    await page.locator(action('start')).click(); assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].cleared),0,'callback success alone never advances progress');
    await page.evaluate(()=>{harness.behavior.start='reject';}); await page.locator(action('start')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA start/);
    await page.evaluate(()=>{harness.behavior.start='defer';harness.calls=[];});
    await page.locator(action('start')).evaluate(node=>{node.click();node.click();node.click();});
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='start').length),1);
    assert.equal(await page.locator(action('start')).isDisabled(),true);
    await page.evaluate(()=>{harness.release();harness.behavior.start='noop';}); await page.locator(action('start')+':enabled').waitFor();
    await page.evaluate(()=>harness.progress(0,{cleared:1}));
    assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].outro[0]),'victory reveals approved outro');
    await page.locator(action('intro')).click(); assert.equal(await page.locator('.jv-reading>p').first().textContent(),await page.evaluate(()=>harness.state.books[0].stages[0].intro[0]));
    await page.locator(action('current')).click();
    await page.evaluate(()=>harness.progress(0,{cleared:1,activeAttempt:{id:'attempt-qa',stage:1,phase:'combat'}}));
    assert.equal(await page.locator(action('start')).count(),0); await page.locator(action('resume')).click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'resume');
    for (const viewport of [{width:1024,height:768},{width:800,height:600},{width:412,height:1007},{width:390,height:844},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport); await assertLayout(page,'reader '+viewport.width); await capture('reader-'+viewport.width);
      await page.locator(action('resume')).scrollIntoViewIfNeeded(); assert.equal(await page.locator(action('resume')).isVisible(),true);
      assert.equal(await page.locator(action('resume')).evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'combat command is not covered by the bottom navigation');
    }
    await page.evaluate(()=>{harness.state.isAdmin=true;harness.view.refresh();});
    await page.locator('[data-jv-action="stage"][data-jv-stage="3"]').click(); await page.locator(action('preview')).click();
    assert.deepEqual(await page.evaluate(()=>harness.calls.at(-1)),{name:'preview',args:['momo-petits-bonheurs',3]});
    assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].cleared),1);
    await page.evaluate(()=>{harness.state.isAdmin=false;harness.view.refresh();}); assert.equal(await page.locator(action('preview')).count(),0);
    await page.setViewportSize({width:1440,height:1000}); await page.evaluate(()=>harness.progress(0,{cleared:4,completed:true})); await capture('completed-unclaimed');
    await page.evaluate(()=>{harness.behavior.claim='reject';}); await page.locator(action('claim')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA claim/);
    await page.evaluate(()=>{harness.behavior.claim='reveal';harness.behavior.acknowledge='reject';harness.calls=[];});
    await page.locator(action('claim')).click(); await page.locator('.jv-reward[open]').waitFor();
    await page.locator('.jv-reward-prize').click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'detail','detail stays usable while parent awaits ceremony');
    for (const viewport of [{width:1440,height:1000},{width:412,height:1007},{width:320,height:568},{width:844,height:390}]) {
      await page.setViewportSize(viewport); await assertLayout(page,'reward '+viewport.width); await capture('reward-'+viewport.width);
      const bounds = await page.locator(action('acknowledge')).evaluate(node=>({button:node.getBoundingClientRect().toJSON(),dialog:node.closest('dialog').getBoundingClientRect().toJSON()}));
      assert.ok(bounds.button.bottom<=bounds.dialog.bottom+1,'ceremony command fully visible '+viewport.width);
    }
    await page.locator(action('acknowledge')).click(); assert.match(await page.locator('.jv-reward-error').textContent(),/Erreur QA acknowledge/);
    await page.evaluate(()=>{harness.behavior.acknowledge='noop';}); await page.keyboard.press('Escape'); await page.locator('.jv-reward').waitFor({state:'detached'});
    await page.waitForFunction(()=>document.querySelector('.jv-view').getAttribute('aria-busy')==='false');
    assert.equal(await page.evaluate(()=>harness.state.progress[harness.state.books[0].id].acknowledged),true);
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='claim').length),1); assert.equal(await page.locator(action('claim')).count(),0);
    await page.locator(action('reward-page')).click(); await capture('completed-reward-page');
    await page.locator(action('library')).click(); await open(); assert.equal(await page.locator(action('claim')).count(),0,'finished books remain readable without another claim');
    await page.locator('[data-jv-action="stage"][data-jv-stage="0"]').click(); assert.equal(await page.locator(action('start')).count(),0);
    await page.evaluate(()=>{harness.progress(0,{cleared:4,completed:true,claimed:true});void harness.view.revealReward(harness.data.cards.find(card=>card.id==='30000001'),{alreadyOwned:true});});
    assert.match(await page.locator('.jv-reward h2').textContent(),/collection/); await page.locator(action('acknowledge')).click();
    await page.emulateMedia({reducedMotion:'no-preference'}); await page.locator(action('library')).click(); await open();
    assert.equal(await page.locator('.jv-book-opening').evaluate(node=>getComputedStyle(node).animationName),'jv-book-open');
    await page.evaluate(()=>{harness.progress(0,{cleared:4,completed:true,claimed:true});void harness.view.revealReward(harness.data.cards.find(card=>card.id==='30000001'));});
    assert.equal(await page.locator('.jv-reward-prize').evaluate(node=>getComputedStyle(node).animationName),'jv-card-arrive'); await page.locator(action('acknowledge')).click();
    await page.emulateMedia({reducedMotion:'reduce'}); await page.locator('[data-jv-action="stage"][data-jv-stage="2"]').click();
    const passageBefore = await page.locator('.jv-reading').textContent();
    await page.evaluate(()=>{harness.view.destroy();harness.mount();harness.view.refresh();harness.view.refresh();});
    assert.equal(await page.locator('[data-jv-action="stage"][data-jv-stage="2"]').getAttribute('aria-current'),'step');
    assert.equal(await page.locator('.jv-reading').textContent(),passageBefore,'book, station and passage survive destruction/remount');
    await page.locator(action('library')).click(); await open(1); await page.evaluate(()=>{harness.calls=[];}); await page.locator(action('start')).click();
    assert.equal(await page.evaluate(()=>harness.calls.filter(call=>call.name==='start').length),1,'remount has one handler');
    await page.evaluate(()=>{harness.behavior.start='defer';}); await page.locator(action('start')).click();
    await page.evaluate(()=>{harness.view.destroy();harness.release();}); await page.waitForTimeout(30);
    assert.equal(await page.locator('.jv-view,.jv-reward').count(),0,'late action cannot repaint destroyed view');
    await page.evaluate(()=>{harness.mount();harness.state.status='loading';harness.view.refresh();}); assert.match(await page.locator('.jv-message').textContent(),/Ouverture/);
    await page.evaluate(()=>{harness.state.status='error';harness.state.error='<script>no</script>';harness.view.refresh();});
    assert.equal(await page.locator('.jv-message script').count(),0); assert.match(await page.locator('.jv-message').textContent(),/<script>/);
    await page.locator(action('refresh')).click(); assert.equal(await page.evaluate(()=>harness.calls.at(-1).name),'refresh');
    await page.evaluate(()=>{harness.behavior.refresh='reject';}); await page.locator(action('refresh')).click(); assert.match(await page.locator('.jv-error').textContent(),/Erreur QA refresh/);
    await page.evaluate(()=>{harness.state.status='ready';harness.view.refresh();}); await cleanupProbe(page);
    assert.deepEqual(errors,[]); assert.deepEqual(failures,[]);

    const touch = await browser.newContext({viewport:{width:412,height:1007},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
    try {
      await routeFixture(touch); const phone = await touch.newPage(); await phone.goto(origin); await phone.waitForFunction(()=>window.fixtureReady);
      const shelf = await phone.locator('.jv-shelf').boundingBox(), cdp = await touch.newCDPSession(phone);
      const y = shelf.y+90, from = shelf.x+shelf.width*.85, to = shelf.x+shelf.width*.2;
      await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:from,y}]});
      for (let step=1;step<=10;step++) { await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:from+(to-from)*step/10,y}]}); await phone.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]}); await phone.waitForFunction(()=>document.querySelector('.jv-shelf').scrollLeft>60);
      await phone.locator('.jv-shelf').focus(); await phone.keyboard.press('End');
      const before = await phone.locator('.jv-shelf').evaluate(node=>node.scrollLeft);
      await phone.locator('.jv-cover').last().tap(); await phone.locator(action('library')).tap();
      assert.ok(Math.abs(await phone.locator('.jv-shelf').evaluate(node=>node.scrollLeft)-before)<2,'closing the last book restores the shelf position');
      await imagesReady(phone); await phone.screenshot({path:path.join(output,'touch-412.png')}); await cdp.detach();
    } finally { await touch.close(); }
    console.log(JSON.stringify({ok:true,books:3,combatsPerBook:4,viewports:7,source:frozen?'frozen-build':'current-view-with-built-assets',dist,output,checks:['cover-text-bounds','filters','keyboard','touch-swipe','four-stations','approved-narration','frozen-state','busy','async-errors','resume','admin-only-preview','claim-once','ack-retry','already-owned','reduced-motion','remount-selection','late-action','late-media','observer-cleanup','modal-cleanup','onRefresh']},null,2));
  } finally { await browser.close(); }
}
main().catch(error=>{console.error(error);process.exitCode=1;});
