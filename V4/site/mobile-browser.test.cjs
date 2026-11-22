'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const runtime = process.env.KALISTAR_NODE_MODULES || path.join(process.env.USERPROFILE, '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules');
const { chromium } = createRequire(path.join(runtime, '__mobile_browser__.cjs'))('playwright');
const url = process.env.KALISTAR_URL || 'http://127.0.0.1:4304';
const output = process.env.KALISTAR_VERIFICATION_DIR || path.resolve(__dirname, '../../work/qa/collection-fixed-mobile');
const failures = [];
let browser;
async function main() {
  fs.mkdirSync(output, { recursive: true });
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: process.env.KALISTAR_MOTION === 'full' ? 'no-preference' : 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror', e => failures.push(e.message));
  const capture = name => page.screenshot({ path: path.join(output, name + '.png'), fullPage: true });
  async function loaded() {
    await page.waitForFunction(() => [...document.images].filter(i => {const r=i.getBoundingClientRect();return r.width&&r.height&&r.bottom>0&&r.top<innerHeight;}).every(i => i.complete && i.naturalWidth));
  }
  async function withinViewport(selector) {
    const rects = await page.locator(selector).evaluateAll(nodes => nodes.filter(n => n.getClientRects().length).map(n => {
      const r = n.getBoundingClientRect(); return { x: r.x, y: r.y, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
    }));
    const { width, height } = page.viewportSize();
    for (const r of rects) assert.ok(r.x >= -1 && r.y >= -1 && r.right <= width + 1 && r.bottom <= height + 1, selector + ': ' + JSON.stringify(r));
  }
  async function settledFormation() {
    await page.waitForFunction(()=>[...document.querySelectorAll('.slot')].every(n=>n.getAnimations().every(a=>a.playState!=='running')));
  }
  async function noCardOverlap() {
    const rects=await page.locator('.slot-card').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
    const controls=await page.locator('.duel-actions,.match-scoreboard,[data-action=arena-menu],.side-heading,.mobile-duel-stats').evaluateAll(nodes=>nodes.map(n=>n.getBoundingClientRect().toJSON()));
    const overlaps=(a,b)=>Math.min(a.right,b.right)-Math.max(a.left,b.left)>2&&Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>2;
    rects.forEach((r,i)=>{
      for(const other of rects.slice(i+1))assert.ok(!overlaps(r,other),'cards do not overlap');
      for(const control of controls)assert.ok(!overlaps(r,control),'corner controls do not hide cards: '+JSON.stringify({r,control}));
    });
  }
  async function galleryGeometry(){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const geometry=await page.locator('.cb-spread').evaluate(n=>{
      const rect=n=>n.getBoundingClientRect(),visible=n=>n.getClientRects().length>0&&getComputedStyle(n).visibility==='visible';
      const within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
      const separate=(a,b)=>a.right<=b.left+1||b.right<=a.left+1||a.bottom<=b.top+1||b.bottom<=a.top+1;
      const leaves=[...n.querySelectorAll(':scope > .cb-gallery-leaf')],pockets=[...n.querySelectorAll('.cb-pocket[data-card-id]')],bounds=rect(n),work=n.closest('.cb-workbench'),workBox=rect(work),viewport={left:0,top:0,right:innerWidth,bottom:innerHeight};
      const cards=pockets.map(p=>{
        const box=rect(p),caption=p.querySelector('.cb-caption'),stand=rect(caption),slot=p.querySelector('.cb-slot'),card=p.querySelector('.cb-card'),face=rect(card);
        const model=KALISTAR_DATA.cards.find(c=>c.id===p.dataset.cardId),name=caption.querySelector('h2');
        const favorite=p.querySelector('.cb-card-favorite'),copies=p.querySelector('.cb-card-copies');
        return {id:model.id,inside:within(box,rect(p.parentElement))&&within(box,workBox)&&within(box,viewport),
          art:!!slot&&card.parentElement===slot&&within(rect(slot),box)&&within(face,rect(slot))&&face.height>0&&Math.abs(face.width/face.height-797/1388)<.01,
          caption:within(stand,box)&&separate(stand,face)&&visible(name)&&name.textContent===model.name&&within(rect(name),stand),
          controls:!!favorite&&!!copies&&(!visible(copies)||within(rect(copies),rect(slot)))&&(!visible(favorite)||within(rect(favorite),rect(slot))&&(!visible(copies)||separate(rect(favorite),rect(copies)))),
          targets:[card,favorite].filter(visible).every(c=>{const b=rect(c);return c.contains(document.elementFromPoint(b.x+b.width/2,b.y+b.height/2));}),
          count:Number(copies.querySelector('b').textContent),expectedCount:KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,model.id).length};
      });
      return {count:n.querySelectorAll('.cb-pocket').length,filled:pockets.length,empty:n.querySelectorAll('.cb-pocket.is-empty').length,
        leaves:leaves.map(leaf=>({side:leaf.dataset.leaf,slots:leaf.querySelectorAll(':scope > .cb-pocket').length,columns:getComputedStyle(leaf).gridTemplateColumns.split(' ').length,rows:getComputedStyle(leaf).gridTemplateRows.split(' ').length})),
        cards,inside:within(bounds,workBox)&&within(workBox,viewport)&&leaves.every(leaf=>within(rect(leaf),bounds)),scroll:[document.documentElement,document.body,document.querySelector('#app'),work,n.closest('.cb-album')].map(c=>({node:c.id||c.className||c.tagName,overflow:c.scrollHeight-c.clientHeight,top:c.scrollTop}))};
    });
    assert(geometry.inside&&geometry.filled>0,JSON.stringify(geometry));
    assert.equal(geometry.count,12);assert.equal(geometry.filled+geometry.empty,12);
    assert.deepEqual(geometry.leaves.map(n=>n.side),['left','right']);
    const portrait=page.viewportSize().width<700&&page.viewportSize().height>500;
    assert(geometry.leaves.every(n=>n.slots===6&&n.columns===(portrait?2:3)&&n.rows===(portrait?3:2)),JSON.stringify(geometry));
    assert(geometry.scroll.every(c=>c.overflow<=1&&c.top===0),'gallery and document do not scroll: '+JSON.stringify(geometry.scroll));
    for(const card of geometry.cards){assert(card.inside&&card.art&&card.caption&&card.controls&&card.targets,JSON.stringify(card));assert.equal(card.count,card.expectedCount);}
    assert.equal(await page.locator('.cb-sheet').count(),0);
    await loaded();await withinViewport('.cb-pocket,.cb-card,.cb-caption,.cb-heading,.cb-toolbar,.cb-footer,.main-nav');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
  }
  async function readerGeometry(){
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
    const geometry=await page.locator('.cb-reader').evaluate(n=>{
      const rect=n=>n.getBoundingClientRect(),within=(a,b)=>a.left>=b.left-1&&a.right<=b.right+1&&a.top>=b.top-1&&a.bottom<=b.bottom+1;
      const visual=n.querySelector('.cb-visual'),notes=n.querySelector('.cb-reading'),window=n.querySelector('.cb-read-window'),work=n.closest('.cb-workbench');
      return {sides:[...n.querySelectorAll('.cb-spread > .cb-leaf')].map(n=>n.dataset.leaf),leftRight:rect(visual).right<rect(notes).left,
        inside:[visual,notes,visual.querySelector('.cb-hero-image')].every(c=>within(rect(c),rect(n)))&&within(rect(window),rect(notes)),
        scroll:[document.documentElement,document.body,document.querySelector('#app'),work,n,window].map(c=>({node:c.id||c.className||c.tagName,overflow:c.scrollHeight-c.clientHeight,top:c.scrollTop,left:c.scrollLeft})),
        overflow:getComputedStyle(work).overflowY,clipped:getComputedStyle(window).overflow};
    });
    assert.deepEqual(geometry.sides,['left','right']);assert(geometry.leftRight&&geometry.inside,JSON.stringify(geometry));
    assert.equal(geometry.overflow,'hidden');assert.equal(geometry.clipped,'hidden');
    assert(geometry.scroll.every(n=>n.overflow<=1&&n.top===0&&n.left===0),JSON.stringify(geometry.scroll));
    await withinViewport('.cb-hero-image,.cb-reading,.cb-read-window,.cb-reading-pager');
  }
  await page.goto(url + '/jeu/#collection');
  await page.locator('[data-startup-enter]:enabled').click({timeout:90000});
  await page.waitForFunction(() => window.KALISTAR_READY === true);
  await page.locator('.cb-album[data-album-mode=gallery] .cb-gallery-leaf').first().waitFor();
  await loaded();
  const touch = await context.newCDPSession(page);
  const leaf = await page.locator('.cb-workbench').boundingBox();
  const beforeVertical=await page.locator('.cb-page-label').textContent();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: leaf.x+leaf.width*.8, y: leaf.y+leaf.height*.8 }] });
  for(let i=1;i<=8;i++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: leaf.x+leaf.width*.8, y: leaf.y+leaf.height*(.8-i*.07) }] });
    await page.waitForTimeout(30);
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);await galleryGeometry();
  assert.equal(await page.locator('.cb-page-label').textContent(),beforeVertical,'vertical touch does not paginate');
  assert.equal(await page.locator('.cb-reader').count(),0,'vertical touch does not open a card');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: leaf.x+leaf.width*.8, y: leaf.y+leaf.height*.5 }] });
  for(let i=1;i<=8;i++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: leaf.x+leaf.width*(.8-i*.07), y: leaf.y+leaf.height*.5 }] });
    await page.waitForTimeout(30);
  }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForFunction(() => /^\s*02\s*\//.test(document.querySelector('.cb-page-label').textContent));
  await page.waitForTimeout(400);
  await page.locator('[data-binder-action=filters]').tap();
  await page.locator('.cb-overlay:modal [data-binder-filter=collection]').selectOption('final-fantasy');
  await page.locator('.cb-overlay:modal [data-binder-filter=faction]').selectOption('FF7');
  await page.locator('.cb-filter-actions [data-binder-action=close-overlay]').tap();
  await capture('ff7-after-swipe');
  await touch.detach();
  assert.ok(await page.locator('.cb-pocket[data-card-id]').evaluateAll(nodes => nodes.length>0&&nodes.every(n => KALISTAR_DATA.cards.find(c => c.id === n.dataset.cardId).faction === 'FF7'&&KALISTAR_DB.registry.owned(KALISTAR_ACTIVE_USER,n.dataset.cardId).length>0)));
  await page.locator('[data-binder-action=next-page]').last().tap();
  await page.waitForFunction(()=>/^\s*02\s*\//.test(document.querySelector('.cb-page-label').textContent));
  assert.match(await page.locator('.cb-page-label').textContent(), /^\s*02\s*\//);
  const galleryPage=await page.locator('.cb-page-label').textContent(),openedId=await page.locator('.cb-card').first().getAttribute('data-id');
  const galleryIds=await page.locator('.cb-pocket[data-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId));
  await page.locator('.cb-card').first().tap();
  await loaded(); await capture('reader-card');
  await readerGeometry();
  const selectedTitle=await page.evaluate(id=>KALISTAR_DATA.cards.find(c=>c.id===id).title,openedId);
  assert.equal(await page.locator('.cb-card-heading>p').textContent(),selectedTitle,'version title moves to the reader');
  for (const id of ['profile','career','copies','story']) {
    await page.locator('[data-binder-field=tab]').selectOption(id);await readerGeometry();
    assert.match(await page.locator('[data-reading-page]').textContent(),/^1 \/ [1-9]\d*$/);
    if(id==='profile')assert.deepEqual(await page.locator('.cb-identity-positions [data-position-icon]').evaluateAll(nodes=>nodes.map(n=>Number(n.dataset.positionIcon))),await page.evaluate(id=>KALISTAR_DATA.cards.find(c=>c.id===id).positions,openedId),'positions remain available in the profile');
  }
  const text=await page.locator('.cb-read-content').textContent(),pages=Number((await page.locator('[data-reading-page]').textContent()).split('/')[1]);
  assert(pages>=1,'phone narrative has a bounded text page count');
  assert(await page.locator('[data-binder-action=read-previous]').isDisabled());
  for(let i=1;i<pages;i++)await page.locator('[data-binder-action=read-next]').tap();
  assert.equal(await page.locator('[data-reading-page]').textContent(),pages+' / '+pages);
  assert(await page.locator('[data-binder-action=read-next]').isDisabled());
  assert.equal(await page.locator('.cb-read-content').textContent(),text,'paging preserves the whole narrative');
  assert.equal(await page.locator('.cb-reader-count').textContent(),(await page.locator('.cb-page-label').textContent()),'text paging never changes card selection');
  await readerGeometry();await capture('reader-notes');
  if(pages>1){
    await page.locator('[data-binder-action=read-previous]').tap();
    assert.equal(await page.locator('[data-reading-page]').textContent(),(pages-1)+' / '+pages);
  }else assert(await page.locator('[data-binder-action=read-previous]').isDisabled(),'short lore does not invent extra pages');
  await page.locator('[data-binder-action=back]').tap();
  assert.equal(await page.locator('.cb-page-label').textContent(),galleryPage,'reader returns to the same gallery page');
  assert.deepEqual(await page.locator('.cb-pocket[data-card-id]').evaluateAll(nodes=>nodes.map(n=>n.dataset.cardId)),galleryIds);
  assert(await page.locator(`.cb-card[data-id="${openedId}"]`).evaluate(n=>n===document.activeElement),'reader returns focus to the opened model');
  await page.locator('[data-binder-action=scope][data-id=owned]').tap();
  for (const [width, height] of [[390,844],[412,1007],[360,740],[430,932],[320,568],[844,390]]) {
    await page.setViewportSize({ width, height });
    await galleryGeometry();
    await capture('collection-' + width);
  }
  console.log('PASS: mobile Collection swipe, universe/faction/ownership filters, left/right paged reader, page/focus return and twelve-slot portrait/landscape albums.');
  await page.setViewportSize({width:390,height:844});
  await page.locator('.main-nav [data-view=decks]').tap();
  await page.locator('[data-deck-action=panel][data-id=board]').tap();
  await page.locator('[data-deck-action=captain][data-slot="0"]').tap();
  await page.locator('#deck-builder-root .kdb-play').tap();
  await page.locator('#game-mode').selectOption('local');
  await page.locator('#new-game-dialog [type=submit]').tap();
  await page.locator('.li-skip').tap({timeout:15000});
  await page.waitForFunction(()=>JSON.parse(localStorage.getItem('kalistar.v4.game'))?.phase==='choose');
  assert.equal(await page.locator('[data-action=start]').count(),0,'composed teams start directly in the duel selection phase');
  await loaded(); await capture('arena-choose');
  assert.equal(await page.locator('.brand').isVisible(),false,'no masthead in the phone arena');
  assert.equal(await page.locator('.arena-toolbar h1').isVisible(),false,'no location heading');
  for(const side of [0,1]){
    const r=await page.locator(`.formation[data-player="${side}"] .slot`).evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};}));
    assert.ok(Math.abs(r[0].x-r[2].x)<2&&Math.abs(r[4].x-r[2].x)<2,'vertical P1/P3/P5');
    assert.ok(side?r[4].y<r[2].y&&r[2].y<r[0].y:r[0].y<r[2].y&&r[2].y<r[4].y,'mirrored vertical order');
    assert.ok(side?r[3].x<r[2].x&&r[2].x<r[1].x:r[1].x<r[2].x&&r[2].x<r[3].x,'mirrored P2/P4 wings');
  }
  await noCardOverlap();
  await withinViewport('.team-right .slot-card,.team-left .slot-card,.duel-actions,.main-nav');
  const enemy = await page.locator('.team-right').boundingBox(), ally = await page.locator('.team-left').boundingBox();
  assert.ok(enemy.y + enemy.height < ally.y, 'opponent above player');
  await page.locator('.team-left [data-action=reserves]').tap();
  await capture('reserves');
  const reserveIds=await page.evaluate(()=>JSON.parse(localStorage.getItem('kalistar.v4.game')).players[0].reserve.map(u=>u.cardId).sort());
  assert.deepEqual((await page.locator('#detail-dialog .archive-list [data-action=detail]').evaluateAll(nodes=>nodes.map(n=>n.dataset.id))).sort(),reserveIds,'reserve inspection preserves every prepared model');
  assert.equal(await page.locator('[data-action=deploy-reserve]').count(),0,'reserve replacement is forbidden during duel selection');
  await page.locator('#detail-dialog [data-action=close]').tap();
  const beforeSelection = await page.locator('.slot-card').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  for(const position of [1,2,3,4]){
    await page.locator('.team-left .slot-card').nth(position).tap();
    await page.locator('.team-right .slot-card').nth(position).tap();
    await settledFormation();
    await noCardOverlap();
    await withinViewport('.slot-card,.slot .inspect,.duel-actions');
  }
  await page.locator('.team-left .slot-card').first().tap();
  await page.locator('.team-right .slot-card').first().tap();
  await settledFormation();
  await capture('arena-selection');
  const auras=await page.locator('.element-aura').evaluateAll(nodes=>nodes.map(canvas=>{
    const {width,height,ratio,scale}=canvas._size;
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let visible=0,reach=0;
    for(let i=3;i<pixels.length;i+=4)if(pixels[i]>20){
      const pixel=(i-3)/4,x=(pixel%canvas.width)/ratio,y=Math.floor(pixel/canvas.width)/ratio;
      visible++;
      reach=Math.max(reach,Math.max(24-x,x-(width-24),24-y,y-(height-24),0)*scale);
    }
    const card=canvas.closest('.slot').querySelector('.slot-card');
    return {visible,reach,outline:parseFloat(getComputedStyle(card).outlineWidth)*scale};
  }));
  assert.ok(auras.length,'selected elemental cards retain their aura');
  for(const aura of auras){
    assert.ok(aura.visible>0,'aura canvas is nonblank');
    assert.ok(aura.reach<18,'magic stays close to the card instead of growing with zoom');
    assert.ok(aura.outline<=3,'challenger outline stays thin on screen');
  }
  const afterSelection = await page.locator('.slot-card').evaluateAll(nodes => nodes.map(n => n.getBoundingClientRect().toJSON()));
  assert.ok(afterSelection[0].width>beforeSelection[0].width*1.5,'player challenger is substantially larger');
  assert.ok(afterSelection[5].width>beforeSelection[5].width*1.5,'opponent challenger is substantially larger');
  for(const side of [0,1]){
    const boxes=await page.locator(`.formation[data-player="${side}"] .slot`).evaluateAll(nodes=>nodes.map(n=>({selected:n.classList.contains('challenger'),...n.getBoundingClientRect().toJSON()})));
    const hero=boxes.find(n=>n.selected);
    assert.ok(boxes.filter(n=>!n.selected).every(n=>side?n.right<hero.left:n.left>hero.right),'hero and four allies occupy opposite sides');
  }
  await noCardOverlap();
  await withinViewport('.slot-card,.slot .inspect,.duel-actions');
  await page.locator('.team-left .challenger .inspect').tap();
  await page.waitForSelector('#detail-dialog[open]');
  await loaded();
  await capture('selected-card-detail');
  await page.locator('#detail-dialog [data-action=close]').tap();
  const dock = await page.locator('.duel-actions').boundingBox();
  assert.ok(dock.x>page.viewportSize().width*.6,'action sits in the lower-right corner');
  assert.ok(await page.locator('.dice-stage canvas').first().evaluate(canvas => {
    const copy=document.createElement('canvas');copy.width=canvas.width;copy.height=canvas.height;
    const ctx=copy.getContext('2d');ctx.drawImage(canvas,0,0);
    return ctx.getImageData(0,0,copy.width,copy.height).data.some((v,i)=>i%4===3&&v>0);
  }), 'mobile dice canvas is nonblank');
  await page.locator('[data-action=lock]').tap();
  await page.locator('[data-action=roll]:enabled').tap();
  await page.waitForFunction(() => document.querySelector('.duel-console')?.dataset.phase !== 'attack', null, { timeout: 30000 });
  for (let i=0; i<20; i++) {
    const phase = await page.locator('.duel-console').getAttribute('data-phase');
    if (phase === 'result') break;
    if (phase === 'kalistel') await page.locator('[data-action="accept-attack"]').tap();
    else if (['guard','clover','heart','potion','physical'].includes(phase)) await page.locator('.trait-eligible .slot-card').first().tap();
    else if (await page.locator('[data-action=roll]:enabled').count()) await page.locator('[data-action=roll]:enabled').tap();
    await page.waitForTimeout(500);
  }
  await page.waitForSelector('[data-action=next]:enabled', { timeout: 30000 });
  await capture('arena-result');
  await page.locator('[data-action=arena-menu]').tap();
  await page.locator('#mobile-dialog [data-action=duel-details]').tap();
  await capture('duel-details');
  await page.locator('#mobile-dialog [data-action=close]').tap();
  assert.equal(await page.locator('.duel-console').getAttribute('data-phase'), 'result', 'result waits for explicit next turn');
  await page.locator('[data-action=arena-menu]').tap();
  await page.locator('#mobile-dialog [data-action=journal]').tap();
  assert.equal(await page.locator('#mobile-dialog').evaluate(d => d.open), false);
  assert.equal(await page.locator('#journal-dialog').evaluate(d => d.open), true);
  await page.locator('#journal-dialog [data-action=close]').tap();
  for (const [width,height] of [[360,740],[375,667],[430,932],[320,568]]) {
    await page.setViewportSize({width,height});
    await settledFormation();
    await capture('arena-' + width);
    assert.ok(await page.evaluate(() => document.querySelector('.battlefield-viewport').scrollWidth <= innerWidth), JSON.stringify(await page.evaluate(()=>({width:innerWidth,scroll:document.querySelector('.battlefield-viewport').scrollWidth,outside:[...document.querySelectorAll('.battlefield *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({tag:n.className,right:n.getBoundingClientRect().right})).slice(0,12)}))));
    await noCardOverlap();
    if(height>=640)await withinViewport('.slot-card,.duel-actions');
    if(height<700){
      await page.locator('#app').evaluate(n=>{n.scrollTop=n.scrollHeight;});
      await capture('arena-' + width + '-player');
      await withinViewport('.team-left .slot-card,.team-left .inspect');
    }
  }
  await page.setViewportSize({ width: 844, height: 390 });
  await settledFormation();
  await capture('arena-landscape');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('#app').evaluate(n=>{n.scrollTop=0;});
  await page.locator('[data-action=exit-arena]').tap();
  await page.locator('.cb-page').waitFor();
  await page.locator('.main-nav [data-view=decks]').tap();
  await page.setViewportSize({ width: 390, height: 844 });
  await capture('decks');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.locator('.main-nav [data-view=home]').tap();
  await page.locator('[data-home-category=collection]').tap();
  await page.locator('[data-binder-action=scope][data-id=owned]').tap();
  await galleryGeometry();
  assert.deepEqual(failures, []);
  console.log('PASS: phone collection, local match preparation, mirrored crosses, corner controls, enlarged duel cards, reserve inspection, dice pixels, attack, explicit next turn, menu, portrait/landscape and decks.');
}
main().catch(e => { console.error(e); process.exitCode = 1; }).finally(async () => { await browser?.close(); });
